import { Service, Inject } from 'typedi';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';
import { ACDataService } from './ACDataService';

@Service()
export class StatePublisher {
  constructor(
    @Inject() private mqttClient: MQTTClient,
    @Inject() private configService: ConfigService,
    @Inject() private acDataService: ACDataService
  ) {}

  async publishState(acId: string): Promise<void> {
    try {
      const state = this.acDataService.getCurrentState(acId);
      const deviceConfig = this.configService.getDeviceConfig(acId);
      
      if (state && deviceConfig) {
        const hvacMode = state.power ? state.mode : "off";
        const hvacAction = state.power ? (state.mode === "cool" ? "cooling" : (state.mode === "heat" ? "heating" : "idle")) : "off";
        
        await this.mqttClient.publish(deviceConfig.mode_state_topic, hvacMode);
        await this.mqttClient.publish(deviceConfig.temperature_state_topic, state.temperature.toString());
        await this.mqttClient.publish(deviceConfig.current_temperature_topic, state.temperature.toString());
        await this.mqttClient.publish(deviceConfig.fan_mode_state_topic, state.fan_speed);
        await this.mqttClient.publish(deviceConfig.action_topic, hvacAction);
      }
    } catch (error) {
      console.error(`❌ Error publishing state for ${acId}:`, error);
      throw error;
    }
  }

  async publishAllStates(): Promise<void> {
    const availableACs = this.acDataService.getAvailableACs();
    
    for (const acId of availableACs) {
      try {
        await this.publishState(acId);
        console.log(`✅ State published for ${acId}`);
      } catch (error) {
        console.error(`❌ Error publishing state for ${acId}:`, error);
      }
    }
  }
}