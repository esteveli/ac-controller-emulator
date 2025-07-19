import { Service } from 'typedi';
import { IRCode, ACState, FanSpeed } from '../../types/ACTypes';
import { BaseModeSearchHandler } from './ModeSearchHandler';

@Service()
export class FanOnlyModeSearchHandler extends BaseModeSearchHandler {
  private static readonly DEFAULT_TEMPERATURE = 22;

  canHandle(mode: string): boolean {
    return mode === 'fan_only';
  }

  findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    console.log(`🔍 FAN_ONLY mode search for:`, targetState);

    // Step 1: Try exact match first
    let match = this.findExactMatch(codes, targetState);
    if (match) return match;

    // Step 2: Try with default temperature (22°C) for FAN_ONLY mode
    const defaultTempState = { 
      ...targetState, 
      temperature: FanOnlyModeSearchHandler.DEFAULT_TEMPERATURE 
    };
    console.log(`🔧 FAN_ONLY mode: using default temperature ${FanOnlyModeSearchHandler.DEFAULT_TEMPERATURE}°C`);
    
    match = this.findExactMatch(codes, defaultTempState);
    if (match) return match;

    // Step 3: For FAN_ONLY, temperature is less important than fan speed
    // Try to find any temperature with the requested fan speed
    const anyTempMatch = codes.find(code => 
      code.power === targetState.power &&
      code.mode === targetState.mode &&
      code.fan_speed === targetState.fan_speed
    );
    
    if (anyTempMatch) {
      console.log(`🔧 FAN_ONLY mode: found with any temperature (${anyTempMatch.temperature}°C)`);
      return anyTempMatch;
    }

    // Step 4: Try default temperature with auto fan
    match = this.findWithAutoFan(codes, defaultTempState);
    if (match) return match;

    // Step 5: Find any temperature with auto fan (temperature doesn't matter for fan only)
    const autoFanMatch = codes.find(code => 
      code.power === targetState.power &&
      code.mode === targetState.mode &&
      code.fan_speed === FanSpeed.AUTO
    );
    
    if (autoFanMatch) {
      console.log(`🔧 FAN_ONLY mode: found with auto fan (temp: ${autoFanMatch.temperature}°C)`);
      return autoFanMatch;
    }

    // If no match found, provide helpful error message
    const availableFanSpeeds = codes
      .filter(code => code.power === targetState.power && code.mode === targetState.mode)
      .map(code => code.fan_speed)
      .filter((speed): speed is FanSpeed => speed !== undefined);

    const uniqueFanSpeeds = Array.from(new Set(availableFanSpeeds));

    let errorMessage = `FAN_ONLY mode not available`;
    
    if (uniqueFanSpeeds.length === 0) {
      errorMessage += ` for this AC`;
    } else {
      errorMessage += ` with ${targetState.fan_speed} fan speed. Available speeds: ${uniqueFanSpeeds.join(', ')}`;
    }

    throw new Error(errorMessage);
  }
}