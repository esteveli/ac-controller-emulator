import { Service } from 'typedi';
import { IRCode, ACState } from '../../types/ACTypes';
import { BaseModeSearchHandler } from './ModeSearchHandler';

@Service()
export class DryModeSearchHandler extends BaseModeSearchHandler {
  private static readonly DEFAULT_TEMPERATURE = 24;

  canHandle(mode: string): boolean {
    return mode === 'dry';
  }

  findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    console.log(`🔍 DRY mode search for:`, targetState);

    // Step 1: Try exact match first
    let match = this.findExactMatch(codes, targetState);
    if (match) return match;

    // Step 2: Try with default temperature (24°C) for DRY mode
    const defaultTempState = { 
      ...targetState, 
      temperature: DryModeSearchHandler.DEFAULT_TEMPERATURE 
    };
    console.log(`🔧 DRY mode: using default temperature ${DryModeSearchHandler.DEFAULT_TEMPERATURE}°C`);
    
    match = this.findExactMatch(codes, defaultTempState);
    if (match) return match;

    // Step 3: Try default temperature with auto fan
    match = this.findWithAutoFan(codes, defaultTempState);
    if (match) return match;

    // If no match found, provide helpful error message
    const availableTemperatures = this.getAvailableTemperatures(codes, targetState);
    const availableFanSpeeds = this.getAvailableFanSpeeds(codes, targetState);

    let errorMessage = `DRY mode not available`;
    
    if (availableTemperatures.length === 0) {
      errorMessage += ` for this AC`;
    } else if (!availableTemperatures.includes(targetState.temperature || 24)) {
      errorMessage += ` at ${targetState.temperature}°C. Available temperatures: ${availableTemperatures.join(', ')}°C`;
    } else if (availableFanSpeeds.length === 0) {
      errorMessage += ` at ${targetState.temperature}°C`;
    } else {
      errorMessage += ` with ${targetState.fan_speed} fan speed. Available speeds: ${availableFanSpeeds.join(', ')}`;
    }

    throw new Error(errorMessage);
  }
}