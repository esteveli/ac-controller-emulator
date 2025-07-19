import { Service } from 'typedi';
import { IRCode, ACState } from '../../types/ACTypes';
import { BaseModeSearchHandler } from './ModeSearchHandler';

@Service()
export class PowerOffModeSearchHandler extends BaseModeSearchHandler {
  canHandle(mode: string): boolean {
    // Handle power off regardless of mode
    return true; // This handler can handle any mode when power is false
  }

  findCode(codes: IRCode[], targetState: Partial<ACState>): IRCode | null {
    // Only handle power off states
    if (targetState.power !== false) {
      return null;
    }

    console.log(`🔍 POWER OFF search for:`, targetState);

    // For power off, find any OFF code (mode/temperature/fan don't matter)
    const offCode = codes.find(code => code.power === false);

    if (offCode) {
      console.log(`✅ Found OFF code: ${offCode.code}`);
      return offCode;
    }

    console.log(`❌ No OFF code found`);
    return null;
  }
}