import { IRCode, ACMode } from './ACTypes';

export interface MQTTConfig {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
}

export interface DeviceConfig {
  readonly ir_device_topic: string;
  readonly mode_command_topic: string;
  readonly mode_state_topic: string;
  readonly temperature_command_topic: string;
  readonly temperature_state_topic: string;
  readonly current_temperature_topic: string;
  readonly fan_mode_command_topic: string;
  readonly fan_mode_state_topic: string;
  readonly action_topic: string;
  readonly error_topic: string;
}

export interface UnifiedDeviceConfig {
  friendly_name: string;
  ir_device_topic: string;
  supported_modes: ACMode[];
  ir_codes: IRCode[];
}

export interface UnifiedAppConfig {
  mqtt: MQTTConfig;
  devices: Record<string, UnifiedDeviceConfig>;
}