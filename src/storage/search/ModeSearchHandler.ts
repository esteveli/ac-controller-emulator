import { Service } from 'typedi';
import { IRCode, ACState, FanSpeed } from '../../types/ACTypes';

export interface ModeSearchHandler {
  canHandle(mode: string): boolean;
  findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null;
}

@Service()
export abstract class BaseModeSearchHandler implements ModeSearchHandler {
  abstract canHandle(mode: string): boolean;
  abstract findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null;

  /**
   * Helper method to find exact match
   */
  protected findExactMatch(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    const match = codes.find(code => 
      code.power === targetState.power &&
      code.temperature === targetState.temperature &&
      code.mode === targetState.mode &&
      code.fan_speed === targetState.fan_speed
    );

    if (match) {
      console.log(`✅ Found exact match for ${targetState.mode}:`, targetState);
      return match;
    }

    return null;
  }

  /**
   * Helper method to find match with auto fan speed
   */
  protected findWithAutoFan(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    const match = codes.find(code => 
      code.power === targetState.power &&
      code.temperature === targetState.temperature &&
      code.mode === targetState.mode &&
      code.fan_speed === FanSpeed.AUTO
    );

    if (match) {
      console.log(`✅ Found match with auto fan for ${targetState.mode}:`, { ...targetState, fan_speed: FanSpeed.AUTO });
      return match;
    }

    return null;
  }

  /**
   * Helper method to get available temperatures for a mode
   */
  protected getAvailableTemperatures(codes: IRCode[], targetState: Partial<ACState>): number[] {
    const modeMatches = codes.filter(code => 
      code.power === targetState.power &&
      code.mode === targetState.mode
    );

    const temperatures = modeMatches
      .map(code => code.temperature)
      .filter((temp): temp is number => temp !== undefined)
      .sort((a, b) => a - b);

    return Array.from(new Set(temperatures)); // Remove duplicates
  }

  /**
   * Helper method to get available fan speeds for a mode and temperature
   */
  protected getAvailableFanSpeeds(codes: IRCode[], targetState: Partial<ACState>): FanSpeed[] {
    const modeMatches = codes.filter(code => 
      code.power === targetState.power &&
      code.mode === targetState.mode &&
      code.temperature === targetState.temperature
    );

    const fanSpeeds = modeMatches
      .map(code => code.fan_speed)
      .filter((speed): speed is FanSpeed => speed !== undefined);

    return Array.from(new Set(fanSpeeds)); // Remove duplicates
  }
}