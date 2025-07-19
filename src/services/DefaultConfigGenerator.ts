import * as fs from 'fs';
import * as path from 'path';
import { UnifiedAppConfig, MQTTConfig } from '../types/ConfigTypes';
import { ACState, ACMode, FanSpeed } from '../types/ACTypes';

export class DefaultConfigGenerator {
  private static readonly DATA_DIR = 'data';
  private static readonly DEVICES_FILE = 'devices.json';
  private static readonly STATES_FILE = 'states.json';

  static getDataDir(): string {
    return path.join(process.cwd(), this.DATA_DIR);
  }

  static getDevicesPath(): string {
    return path.join(this.getDataDir(), this.DEVICES_FILE);
  }

  static getStatesPath(): string {
    return path.join(this.getDataDir(), this.STATES_FILE);
  }

  static ensureDataDirectory(): void {
    const dataDir = this.getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    }
  }

  static generateDefaultConfig(): UnifiedAppConfig {
    const defaultMQTTConfig: MQTTConfig = {
      host: process.env.MQTT_HOST || 'localhost',
      port: parseInt(process.env.MQTT_PORT || '1883'),
      ...(process.env.MQTT_USERNAME && { username: process.env.MQTT_USERNAME }),
      ...(process.env.MQTT_PASSWORD && { password: process.env.MQTT_PASSWORD })
    };

    return {
      mqtt: defaultMQTTConfig,
      devices: {
        // Example device configuration
        example_ac: {
          friendly_name: "Example AC Unit",
          ir_device_topic: "zigbee2mqtt/ir_device",
          supported_modes: [
            ACMode.OFF,
            ACMode.COOL,
            ACMode.HEAT,
            ACMode.DRY,
            ACMode.FAN,
            ACMode.AUTO
          ],
          ir_codes: []
        }
      }
    };
  }

  static generateDefaultStates(): Record<string, ACState> {
    return {
      example_ac: {
        power: false,
        temperature: 22,
        mode: ACMode.OFF,
        fan_speed: FanSpeed.AUTO,
        last_updated: new Date().toISOString()
      }
    };
  }

  static createDefaultDevicesConfig(): void {
    const devicesPath = this.getDevicesPath();
    
    if (!fs.existsSync(devicesPath)) {
      const defaultConfig = this.generateDefaultConfig();
      fs.writeFileSync(devicesPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`📄 Created default devices config: ${devicesPath}`);
      console.log(`🔧 Default MQTT broker: ${defaultConfig.mqtt.host}:${defaultConfig.mqtt.port}`);
      console.log(`📱 Example device created: example_ac`);
    } else {
      console.log(`📄 Devices config already exists: ${devicesPath}`);
    }
  }

  static createDefaultStatesConfig(): void {
    const statesPath = this.getStatesPath();
    
    if (!fs.existsSync(statesPath)) {
      const defaultStates = this.generateDefaultStates();
      fs.writeFileSync(statesPath, JSON.stringify(defaultStates, null, 2));
      console.log(`📊 Created default states config: ${statesPath}`);
    } else {
      console.log(`📊 States config already exists: ${statesPath}`);
    }
  }

  static validateConfigStructure(configPath: string): boolean {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData) as UnifiedAppConfig;
      
      // Check required top-level properties
      if (!config.mqtt || !config.devices) {
        return false;
      }
      
      // Check MQTT config structure
      return !(!config.mqtt.host || !config.mqtt.port);

    } catch (error) {
      return false;
    }
  }

  static validateStatesStructure(statesPath: string): boolean {
    try {
      const statesData = fs.readFileSync(statesPath, 'utf8');
      const states = JSON.parse(statesData);
      
      // Should be an object (can be empty)
      return typeof states === 'object' && states !== null && !Array.isArray(states);
    } catch (error) {
      return false;
    }
  }

  static initializeDefaultConfigurations(): void {
    console.log('🔧 Initializing default configurations...');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Check and create devices.json
    const devicesPath = this.getDevicesPath();
    if (!fs.existsSync(devicesPath) || !this.validateConfigStructure(devicesPath)) {
      if (fs.existsSync(devicesPath)) {
        console.log('⚠️  Invalid devices.json structure detected, backing up and recreating...');
        const backupPath = `${devicesPath}.backup.${Date.now()}`;
        fs.copyFileSync(devicesPath, backupPath);
        console.log(`💾 Backup created: ${backupPath}`);
      }
      this.createDefaultDevicesConfig();
    }
    
    // Check and create states.json
    const statesPath = this.getStatesPath();
    if (!fs.existsSync(statesPath) || !this.validateStatesStructure(statesPath)) {
      if (fs.existsSync(statesPath)) {
        console.log('⚠️  Invalid states.json structure detected, backing up and recreating...');
        const backupPath = `${statesPath}.backup.${Date.now()}`;
        fs.copyFileSync(statesPath, backupPath);
        console.log(`💾 Backup created: ${backupPath}`);
      }
      this.createDefaultStatesConfig();
    }
    
    console.log('✅ Default configurations initialized successfully');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Configure your MQTT broker settings if needed');
    console.log('   2. Run the configuration CLI to add your AC devices');
    console.log('   3. Use the IR learning feature to record device codes');
    console.log('');
  }
}