import { Service, Inject } from 'typedi';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';
import { DeviceConfig } from '../types/ConfigTypes';
import { ModeCommandHandler } from './handlers/ModeCommandHandler';
import { TemperatureCommandHandler } from './handlers/TemperatureCommandHandler';
import { FanModeCommandHandler } from './handlers/FanModeCommandHandler';

@Service()
export class MQTTSubscriptionManager {
  constructor(
    @Inject(() => MQTTClient) private mqttClient: MQTTClient,
    @Inject(() => ConfigService) private configService: ConfigService,
    @Inject(() => ModeCommandHandler) private modeHandler: ModeCommandHandler,
    @Inject(() => TemperatureCommandHandler) private temperatureHandler: TemperatureCommandHandler,
    @Inject(() => FanModeCommandHandler) private fanModeHandler: FanModeCommandHandler
  ) {}

  setupAllSubscriptions(): void {
    const devices = this.configService.getAllDeviceConfigs();
    
    Object.keys(devices).forEach(acId => {
      const deviceConfig = devices[acId];
      this.setupSubscriptionsForDevice(acId, deviceConfig);
    });
  }

  private setupSubscriptionsForDevice(acId: string, deviceConfig: DeviceConfig): void {
    console.log(`🔔 Setting up MQTT subscriptions for ${acId}`);

    // Subscribe to mode command topic
    this.mqttClient.subscribe(deviceConfig.mode_command_topic, async (topic, message) => {
      console.log(`📥 Mode command received on ${topic}: ${message}`);
      try {
        await this.modeHandler.handleModeCommand(acId, message);
      } catch (error) {
        console.error(`❌ Failed to handle mode command for ${acId}:`, error);
      }
    });

    // Subscribe to temperature command topic
    this.mqttClient.subscribe(deviceConfig.temperature_command_topic, async (topic, message) => {
      console.log(`📥 Temperature command received on ${topic}: ${message}`);
      try {
        await this.temperatureHandler.handleTemperatureCommand(acId, message);
      } catch (error) {
        console.error(`❌ Failed to handle temperature command for ${acId}:`, error);
      }
    });

    // Subscribe to fan mode command topic
    this.mqttClient.subscribe(deviceConfig.fan_mode_command_topic, async (topic, message) => {
      console.log(`📥 Fan mode command received on ${topic}: ${message}`);
      try {
        await this.fanModeHandler.handleFanModeCommand(acId, message);
      } catch (error) {
        console.error(`❌ Failed to handle fan mode command for ${acId}:`, error);
      }
    });

    console.log(`✅ MQTT subscriptions setup completed for ${acId}`);
    console.log(`   - Mode: ${deviceConfig.mode_command_topic}`);
    console.log(`   - Temperature: ${deviceConfig.temperature_command_topic}`);
    console.log(`   - Fan Mode: ${deviceConfig.fan_mode_command_topic}`);
  }

  getSubscribedTopics(): string[] {
    const devices = this.configService.getAllDeviceConfigs();
    const topics: string[] = [];

    Object.values(devices).forEach(deviceConfig => {
      topics.push(
        deviceConfig.mode_command_topic,
        deviceConfig.temperature_command_topic,
        deviceConfig.fan_mode_command_topic
      );
    });

    return topics;
  }
}