export type Temperature = number & { readonly __brand: 'Temperature' };

export interface ACState {
  power: boolean;
  temperature: number; // 16-30°C
  mode: ACMode;
  fan_speed: FanSpeed;
  last_updated: string;
}

export enum ACMode {
  AUTO = 'auto',
  COOL = 'cool',
  DRY = 'dry',
  HEAT = 'heat',
  FAN = 'fan_only',
  OFF = 'off'
}

export enum FanSpeed {
  AUTO = 'auto',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  QUIET = 'quiet'
}

export interface ACCommand {
  ac_id: string;
  power?: boolean;
  temperature?: number;
  mode?: ACMode;
  fan_speed?: FanSpeed;
}

export interface IRCode {
  power: boolean;
  temperature?: number; // Optional - not needed for power off
  mode?: ACMode; // Optional - not needed for power off
  fan_speed?: FanSpeed; // Optional - not needed for power off
  code: string; // base64 IR code
}

export interface ACConfig {
  ac_id: string;
  ir_device_id: string; // ZS06 device topic
  brand: string;
  model: string;
}

export const DEFAULT_AC_STATE: ACState = {
  power: false,
  temperature: 22,
  mode: ACMode.AUTO,
  fan_speed: FanSpeed.AUTO,
  last_updated: new Date().toISOString()
};

export const TEMPERATURE_RANGE = {
  MIN: 16,
  MAX: 30
} as const;

export function validateTemperature(temp: number): temp is Temperature {
  return Number.isInteger(temp) && temp >= TEMPERATURE_RANGE.MIN && temp <= TEMPERATURE_RANGE.MAX;
}

export function createTemperature(temp: number): Temperature {
  if (!validateTemperature(temp)) {
    throw new Error(`Temperature must be between ${TEMPERATURE_RANGE.MIN}-${TEMPERATURE_RANGE.MAX}°C, got: ${temp}`);
  }
  return temp as Temperature;
}