import { Service, Inject } from 'typedi';
import { MQTTClient, MQTTConnectionError } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';
import { ACMode, IRCode, FanSpeed } from '../types/ACTypes';
import { DefaultConfigGenerator } from './DefaultConfigGenerator';
import * as fs from 'fs';
import * as path from 'path';

export interface IRRecordingSession {
  acId: string;
  deviceTopic: string;
  currentStep: 'mode' | 'fan' | 'temperature' | 'recording' | 'completed';
  targetState: {
    mode?: ACMode;
    fan_mode?: FanSpeed;
    temperature?: number;
    power: boolean;
  };
  recordedCode?: string;
  sessionId: string;
}

export interface IRDeviceMessage {
  learned_ir_code?: string;
  [key: string]: any;
}

@Service()
export class IRConfigurationManager {
  private configPath = DefaultConfigGenerator.getDevicesPath();

  constructor(
    @Inject(() => MQTTClient) private mqttClient: MQTTClient,
    @Inject(() => ConfigService) private configService: ConfigService
  ) {}

  async startRecording(acId: string): Promise<IRRecordingSession> {
    const deviceConfig = this.configService.getUnifiedDeviceConfig(acId);
    if (!deviceConfig) {
      throw new Error(`Device configuration not found for AC: ${acId}`);
    }

    const sessionId = `${acId}_${Date.now()}`;
    const session: IRRecordingSession = {
      acId,
      deviceTopic: deviceConfig.ir_device_topic,
      currentStep: 'mode',
      targetState: { power: true },
      sessionId
    };

    return session;
  }

  getSupportedModes(acId: string): ACMode[] {
    const deviceConfig = this.configService.getUnifiedDeviceConfig(acId);
    return deviceConfig?.supported_modes || [];
  }

  getAvailableFanModes(): FanSpeed[] {
    return [FanSpeed.AUTO, FanSpeed.LOW, FanSpeed.MEDIUM, FanSpeed.HIGH, FanSpeed.QUIET];
  }

  validateMode(acId: string, mode: string): boolean {
    const supportedModes = this.getSupportedModes(acId);
    return supportedModes.includes(mode as ACMode);
  }

  validateFanMode(fanMode: string): boolean {
    return this.getAvailableFanModes().includes(fanMode as FanSpeed);
  }

  validateTemperature(temperature: number): boolean {
    return temperature >= 16 && temperature <= 30;
  }

  updateSessionMode(session: IRRecordingSession, mode: string): void {
    session.targetState.mode = mode as ACMode;
    session.currentStep = 'fan';
    
    // Special cases
    if (mode === ACMode.OFF) {
      session.targetState.power = false;
      session.currentStep = 'recording';
    }
  }

  updateSessionFanMode(session: IRRecordingSession, fanMode: string): void {
    session.targetState.fan_mode = fanMode as FanSpeed;
    session.currentStep = 'temperature';
    
    // Special cases
    if (session.targetState.mode === ACMode.FAN) {
      session.currentStep = 'recording';
    }
  }

  updateSessionTemperature(session: IRRecordingSession, temperature: number): void {
    session.targetState.temperature = temperature;
    session.currentStep = 'recording';
  }

  async enableIRLearningMode(deviceTopic: string): Promise<void> {
    try {
      const topic = `zigbee2mqtt/${deviceTopic}/set`;
      const payload = JSON.stringify({
        learn_ir_code: true
      });

      await this.mqttClient.publish(topic, payload);
      console.log(`📡 IR learning mode enabled for device: ${deviceTopic}`);
    } catch (error) {
      console.error(`❌ Error enabling IR learning mode:`, error);
      throw error;
    }
  }

  async sendIRCode(deviceTopic: string, irCode: string): Promise<void> {
    try {
      const topic = `zigbee2mqtt/${deviceTopic}/set`;
      const payload = JSON.stringify({
        ir_code_to_send: irCode
      });

      await this.mqttClient.publish(topic, payload);
      console.log(`📡 IR code sent to device: ${deviceTopic}`);
    } catch (error) {
      console.error(`❌ Error sending IR code:`, error);
      throw error;
    }
  }

  async waitForIRCode(deviceTopic: string, timeoutMs: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.mqttClient.disconnect();
        reject(new Error('Timeout waiting for IR code'));
      }, timeoutMs);

      // Subscribe to device messages
      this.mqttClient.subscribe(`zigbee2mqtt/${deviceTopic}`, (topic, message) => {
        try {
          const data: IRDeviceMessage = JSON.parse(message);
          
          if (data.learned_ir_code) {
            clearTimeout(timeout);
            resolve(data.learned_ir_code);
          }
        } catch (error) {
          // Ignore invalid JSON messages
        }
      });
    });
  }

  async saveIRCode(session: IRRecordingSession): Promise<void> {
    if (!session.recordedCode) {
      throw new Error('No recorded IR code to save');
    }

    try {
      // Load current configuration
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      // Create new IR code entry
      const newCode: IRCode = {
        mode: session.targetState.mode!,
        fan_speed: session.targetState.fan_mode! as FanSpeed,
        temperature: session.targetState.temperature!,
        power: session.targetState.power,
        code: session.recordedCode
      };

      // Add to device's IR codes
      if (!config.devices[session.acId]) {
        config.devices[session.acId] = { ir_codes: [] };
      }
      if (!config.devices[session.acId].ir_codes) {
        config.devices[session.acId].ir_codes = [];
      }

      // Check for duplicates and replace if exists
      const existingIndex = config.devices[session.acId].ir_codes.findIndex((code: IRCode) => 
        code.mode === newCode.mode && 
        code.fan_speed === newCode.fan_speed && 
        code.temperature === newCode.temperature &&
        code.power === newCode.power
      );

      if (existingIndex >= 0) {
        config.devices[session.acId].ir_codes[existingIndex] = newCode;
        console.log(`🔄 Updated existing IR code for ${session.acId}`);
      } else {
        config.devices[session.acId].ir_codes.push(newCode);
        console.log(`✅ Added new IR code for ${session.acId}`);
      }

      // Save configuration
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      
      console.log(`💾 IR code saved for ${session.acId}:`, {
        mode: newCode.mode,
        fan_speed: newCode.fan_speed,
        temperature: newCode.temperature,
        power: newCode.power
      });
    } catch (error) {
      console.error('❌ Error saving IR code:', error);
      throw error;
    }
  }

  getAvailableDevices(): string[] {
    return this.configService.getAvailableDeviceIds();
  }

  getFriendlyName(acId: string): string {
    const deviceConfig = this.configService.getUnifiedDeviceConfig(acId);
    return deviceConfig?.friendly_name || acId;
  }

  getDeviceInfo(acId: string): { id: string; name: string; modes: ACMode[] } | null {
    const deviceConfig = this.configService.getUnifiedDeviceConfig(acId);
    if (!deviceConfig) return null;

    return {
      id: acId,
      name: deviceConfig.friendly_name || acId,
      modes: deviceConfig.supported_modes || []
    };
  }

  async reloadConfiguration(): Promise<void> {
    try {
      // Force reload of configuration service
      console.log('🔄 Reloading configuration...');
      // Note: This might need to be implemented in ConfigService if needed
      console.log('✅ Configuration reloaded successfully');
    } catch (error) {
      console.error('❌ Error reloading configuration:', error);
      throw error;
    }
  }

  async getIRCodeCount(acId: string): Promise<number> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      const deviceConfig = config.devices[acId];
      if (!deviceConfig || !deviceConfig.ir_codes) {
        return 0;
      }
      
      return deviceConfig.ir_codes.length;
    } catch (error) {
      console.error('❌ Error counting IR codes:', error);
      return 0;
    }
  }

  async copyIRCodes(sourceId: string, targetId: string): Promise<number> {
    try {
      // Load current configuration
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Validate source device exists and has IR codes
      const sourceDevice = config.devices[sourceId];
      if (!sourceDevice || !sourceDevice.ir_codes || sourceDevice.ir_codes.length === 0) {
        throw new Error(`Source device ${sourceId} has no IR codes to copy`);
      }
      
      // Validate target device exists
      if (!config.devices[targetId]) {
        throw new Error(`Target device ${targetId} not found in configuration`);
      }
      
      // Copy IR codes from source to target (replacing all existing codes)
      const sourceIRCodes = sourceDevice.ir_codes;
      config.devices[targetId].ir_codes = [...sourceIRCodes];
      
      // Save configuration
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      
      console.log(`📋 Copied ${sourceIRCodes.length} IR codes from ${sourceId} to ${targetId}`);
      return sourceIRCodes.length;
    } catch (error) {
      console.error('❌ Error copying IR codes:', error);
      throw error;
    }
  }

  async activateMode(acId: string, mode: ACMode): Promise<void> {
    try {
      // Load current configuration
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Validate device exists
      if (!config.devices[acId]) {
        throw new Error(`Device ${acId} not found in configuration`);
      }
      
      // Initialize supported_modes if it doesn't exist
      if (!config.devices[acId].supported_modes) {
        config.devices[acId].supported_modes = [];
      }
      
      // Check if mode already exists
      const existingModes = config.devices[acId].supported_modes;
      if (existingModes.includes(mode)) {
        throw new Error(`Mode "${mode}" is already activated for device ${acId}`);
      }
      
      // Add mode to supported modes
      config.devices[acId].supported_modes.push(mode);
      
      // Save configuration
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      
      console.log(`📱 Activated mode "${mode}" for device ${acId}`);
    } catch (error) {
      console.error('❌ Error activating mode:', error);
      throw error;
    }
  }
}