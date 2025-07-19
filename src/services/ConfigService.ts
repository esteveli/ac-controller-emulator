import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { MQTTConfig, DeviceConfig, UnifiedDeviceConfig, UnifiedAppConfig } from '../types/ConfigTypes';
import { DefaultConfigGenerator } from './DefaultConfigGenerator';

@Service()
export class ConfigService {
  private config!: UnifiedAppConfig;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      // Initialize default configurations if they don't exist
      DefaultConfigGenerator.initializeDefaultConfigurations();
      
      const configPath = DefaultConfigGenerator.getDevicesPath();
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Error loading config:', error);
      throw new Error('Failed to load configuration');
    }
  }

  getMQTTConfig(): MQTTConfig {
    return this.config.mqtt;
  }

  getDeviceConfig(acId: string): DeviceConfig | null {
    const unifiedConfig = this.config.devices[acId];
    if (!unifiedConfig) return null;
    
    return this.generateDeviceConfig(acId, unifiedConfig);
  }

  getAllDeviceConfigs(): Record<string, DeviceConfig> {
    const result: Record<string, DeviceConfig> = {};
    
    for (const [acId, unifiedConfig] of Object.entries(this.config.devices)) {
      result[acId] = this.generateDeviceConfig(acId, unifiedConfig);
    }
    
    return result;
  }

  private generateDeviceConfig(acId: string, unifiedConfig: UnifiedDeviceConfig): DeviceConfig {
    const appPrefix = 'accontroller';
    const topicPrefix = `${appPrefix}/${acId}`;
    
    return {
      ir_device_topic: unifiedConfig.ir_device_topic,
      mode_command_topic: `${topicPrefix}/mode/set`,
      mode_state_topic: `${topicPrefix}/mode`,
      temperature_command_topic: `${topicPrefix}/temperature/set`,
      temperature_state_topic: `${topicPrefix}/temperature`,
      current_temperature_topic: `${topicPrefix}/current_temperature`,
      fan_mode_command_topic: `${topicPrefix}/fan_mode/set`,
      fan_mode_state_topic: `${topicPrefix}/fan_mode`,
      action_topic: `${topicPrefix}/action`,
      error_topic: `${topicPrefix}/error`
    };
  }

  getAvailableDeviceIds(): string[] {
    return Object.keys(this.config.devices);
  }

  getUnifiedDeviceConfig(acId: string): UnifiedDeviceConfig | null {
    return this.config.devices[acId] || null;
  }

  getAllUnifiedDeviceConfigs(): Record<string, UnifiedDeviceConfig> {
    return this.config.devices;
  }
}