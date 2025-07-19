import { Service, Inject } from 'typedi';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';

@Service()
export class ErrorStatusService {
  private errorStates: Record<string, string> = {};

  constructor(
    @Inject() private mqttClient: MQTTClient,
    @Inject() private configService: ConfigService
  ) {}

  /**
   * Set an error message for a specific AC
   */
  setError(acId: string, errorMessage: string): void {
    console.log(`❌ Error for ${acId}: ${errorMessage}`);
    this.errorStates[acId] = errorMessage;
    this.publishErrorState(acId).catch(error => {
      console.error(`Failed to publish error state for ${acId}:`, error);
    });
  }

  /**
   * Clear the error state for a specific AC
   */
  clearError(acId: string): void {
    if (this.errorStates[acId]) {
      console.log(`✅ Error cleared for ${acId}`);
      delete this.errorStates[acId];
      this.publishErrorState(acId).catch(error => {
        console.error(`Failed to publish error state for ${acId}:`, error);
      });
    }
  }

  /**
   * Clear all error states
   */
  clearAllErrors(): void {
    for (const acId of Object.keys(this.errorStates)) {
      this.clearError(acId);
    }
  }

  /**
   * Get current error state for an AC
   */
  getError(acId: string): string | null {
    return this.errorStates[acId] || null;
  }

  /**
   * Check if an AC has an error
   */
  hasError(acId: string): boolean {
    return acId in this.errorStates;
  }

  /**
   * Publish error state to MQTT
   */
  private async publishErrorState(acId: string): Promise<void> {
    try {
      const deviceConfig = this.configService.getDeviceConfig(acId);
      if (!deviceConfig) return;

      const errorMessage = this.errorStates[acId] || '';
      
      await this.mqttClient.publish(deviceConfig.error_topic, errorMessage);
    } catch (error) {
      console.error(`Failed to publish error state for ${acId}:`, error);
    }
  }

  /**
   * Publish error discovery config to Home Assistant
   */
  async publishErrorDiscovery(acId: string, friendlyName: string): Promise<void> {
    try {
      const deviceConfig = this.configService.getDeviceConfig(acId);
      if (!deviceConfig) return;

      const discoveryTopic = `homeassistant/sensor/${acId}_error/config`;
      
      const discoveryConfig = {
        name: `${friendlyName} Error`,
        unique_id: `ac_controller_${acId}_error`,
        object_id: `${acId}_error`,
        state_topic: deviceConfig.error_topic,
        availability_topic: `accontroller/${acId}/availability`,
        payload_available: "online",
        payload_not_available: "offline",
        icon: "mdi:alert-circle",
        device: {
          identifiers: [`ac_controller_${acId}`],
          name: friendlyName,
          model: "IR Remote Emulator",
          manufacturer: "AC Controller",
          sw_version: "1.0.0"
        }
      };

      await this.mqttClient.publish(discoveryTopic, JSON.stringify(discoveryConfig));
      await this.publishErrorState(acId);
    } catch (error) {
      console.error(`Failed to publish error discovery for ${acId}:`, error);
    }
  }

  /**
   * Remove error discovery config from Home Assistant
   */
  async removeErrorDiscovery(acId: string): Promise<void> {
    try {
      const discoveryTopic = `homeassistant/sensor/${acId}_error/config`;
      await this.mqttClient.publish(discoveryTopic, "");
    } catch (error) {
      console.error(`Failed to remove error discovery for ${acId}:`, error);
    }
  }
}