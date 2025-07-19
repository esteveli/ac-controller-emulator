import { Service } from 'typedi';
import { BaseCommandHandler } from './BaseCommandHandler';
import { FanSpeed, ACState } from '../../types/ACTypes';

@Service()
export class FanModeCommandHandler extends BaseCommandHandler<FanSpeed> {

  async handleFanModeCommand(acId: string, fanModeStr: string): Promise<void> {
    return this.handleCommand(acId, fanModeStr);
  }

  protected validateCommand(command: string): FanSpeed {
    if (Object.values(FanSpeed).includes(command as FanSpeed)) {
      return command as FanSpeed;
    }
    
    throw new Error(`Unknown fan mode: ${command}. Valid options: ${Object.values(FanSpeed).join(', ')}`);
  }

  protected updateState(currentState: ACState, validatedCommand: FanSpeed): ACState {
    return {
      ...currentState,
      fan_speed: validatedCommand,
      last_updated: new Date().toISOString()
    };
  }

  protected getLogContext(): string {
    return 'Fan mode';
  }
}