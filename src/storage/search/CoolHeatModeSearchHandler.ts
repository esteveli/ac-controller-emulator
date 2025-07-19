import { Service } from 'typedi';
import { IRCode, ACState } from '../../types/ACTypes';
import { BaseModeSearchHandler } from './ModeSearchHandler';

@Service()
export class CoolHeatModeSearchHandler extends BaseModeSearchHandler {
  canHandle(mode: string): boolean {
    return mode === 'cool' || mode === 'heat';
  }

  findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    console.log(`🔍 ${targetState.mode?.toUpperCase()} mode search for:`, targetState);

    // Step 1: Try exact match
    let match = this.findExactMatch(codes, targetState);
    if (match) return match;

    // Step 2: Try with auto fan speed if specific fan speed not found
    match = this.findWithAutoFan(codes, targetState);
    if (match) return match;

    // If no match found, provide helpful error message
    const availableTemperatures = this.getAvailableTemperatures(codes, targetState);
    const availableFanSpeeds = this.getAvailableFanSpeeds(codes, targetState);

    let errorMessage = `${targetState.mode?.toUpperCase()} mode not available`;
    
    if (availableTemperatures.length === 0) {
      errorMessage += ` for this AC`;
    } else if (!availableTemperatures.includes(targetState.temperature || 22)) {
      errorMessage += ` at ${targetState.temperature}°C. Available temperatures: ${availableTemperatures.join(', ')}°C`;
    } else if (availableFanSpeeds.length === 0) {
      errorMessage += ` at ${targetState.temperature}°C`;
    } else {
      errorMessage += ` with ${targetState.fan_speed} fan speed. Available speeds: ${availableFanSpeeds.join(', ')}`;
    }

    throw new Error(errorMessage);
  }
}