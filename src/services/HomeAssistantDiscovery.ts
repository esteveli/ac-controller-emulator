import { Service, Inject } from 'typedi';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';
import { ACDataService } from './ACDataService';
import { ErrorStatusService } from './ErrorStatusService';
import { ACMode, FanSpeed } from '../types/ACTypes';
import { IRCodeRepository } from '../storage/IRCodeRepository';

export interface ClimateDiscoveryConfig {
  name: string;
  unique_id: string;
  object_id: string;
  device_class: string;
  temperature_unit: string;
  temp_step: number;
  min_temp: number;
  max_temp: number;
  modes: string[];
  fan_modes: string[];
  current_temperature_topic: string;
  temperature_command_topic: string;
  temperature_state_topic: string;
  mode_command_topic: string;
  mode_state_topic: string;
  fan_mode_command_topic: string;
  fan_mode_state_topic: string;
  action_topic: string;
  availability_topic: string;
  payload_available: string;
  payload_not_available: string;
  device: {
    identifiers: string[];
    name: string;
    model: string;
    manufacturer: string;
    sw_version: string;
  };
}

@Service()
export class HomeAssistantDiscovery {
  constructor(
    @Inject() private mqttClient: MQTTClient,
    @Inject() private configService: ConfigService,
    @Inject() private acDataService: ACDataService,
    @Inject() private irCodeRepository: IRCodeRepository,
    @Inject() private errorStatusService: ErrorStatusService
  ) {}

  async publishDiscoveryConfigs(): Promise<void> {
    const availableACs = this.acDataService.getAvailableACs();
    
    for (const acId of availableACs) {
      try {
        await this.publishACDiscovery(acId);
        console.log(`✅ Discovery config published for ${acId}`);
      } catch (error) {
        console.error(`❌ Error publishing discovery config for ${acId}:`, error);
      }
    }
  }

  private async publishACDiscovery(acId: string): Promise<void> {
    const deviceConfig = this.configService.getDeviceConfig(acId);
    const friendlyName = this.acDataService.getFriendlyName(acId);
    
    if (!deviceConfig) {
      throw new Error(`Device config not found for ${acId}`);
    }

    const discoveryTopic = `homeassistant/climate/${acId}/config`;
    
    // Get AC-specific supported modes
    const supportedModes = this.irCodeRepository.getSupportedModes(acId);
    const supportedModeStrings = supportedModes.map(mode => mode.toString());
    
    const discoveryConfig: ClimateDiscoveryConfig = {
      name: friendlyName,
      unique_id: `ac_controller_${acId}`,
      object_id: acId,
      device_class: "climate",
      temperature_unit: "C",
      temp_step: 1,
      min_temp: 16,
      max_temp: 30,
      modes: ["off", ...supportedModeStrings],
      fan_modes: Object.values(FanSpeed),
      current_temperature_topic: deviceConfig.current_temperature_topic,
      temperature_command_topic: deviceConfig.temperature_command_topic,
      temperature_state_topic: deviceConfig.temperature_state_topic,
      mode_command_topic: deviceConfig.mode_command_topic,
      mode_state_topic: deviceConfig.mode_state_topic,
      fan_mode_command_topic: deviceConfig.fan_mode_command_topic,
      fan_mode_state_topic: deviceConfig.fan_mode_state_topic,
      action_topic: deviceConfig.action_topic,
      availability_topic: `accontroller/${acId}/availability`,
      payload_available: "online",
      payload_not_available: "offline",
      device: {
        identifiers: [`ac_controller_${acId}`],
        name: friendlyName,
        model: "IR Remote Emulator",
        manufacturer: "AC Controller",
        sw_version: "1.0.0"
      }
    };

    this.mqttClient.publish(discoveryTopic, JSON.stringify(discoveryConfig));
    
    // Publish availability as online
    this.mqttClient.publish(`accontroller/${acId}/availability`, "online");
    
    // Publish error sensor discovery
    this.errorStatusService.publishErrorDiscovery(acId, friendlyName);
  }

  async removeDiscoveryConfigs(): Promise<void> {
    const availableACs = this.acDataService.getAvailableACs();
    
    for (const acId of availableACs) {
      try {
        const discoveryTopic = `homeassistant/climate/${acId}/config`;
        this.mqttClient.publish(discoveryTopic, ""); // Empty payload removes the config
        
        // Remove error sensor discovery
        this.errorStatusService.removeErrorDiscovery(acId);
        
        console.log(`✅ Discovery config removed for ${acId}`);
      } catch (error) {
        console.error(`❌ Error removing discovery config for ${acId}:`, error);
      }
    }
  }
}