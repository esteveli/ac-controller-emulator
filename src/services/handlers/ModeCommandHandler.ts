import { Service } from 'typedi';
import { BaseCommandHandler } from './BaseCommandHandler';
import { ACMode, ACState } from '../../types/ACTypes';

interface ModeCommand {
  power: boolean;
  acMode?: ACMode;
}

@Service()
export class ModeCommandHandler extends BaseCommandHandler<ModeCommand> {

  async handleModeCommand(acId: string, mode: string): Promise<void> {
    return this.handleCommand(acId, mode);
  }

  protected validateCommand(command: string): ModeCommand {
    switch (command.toLowerCase()) {
      case 'off':
        return { power: false };
      case 'auto':
        return { power: true, acMode: ACMode.AUTO };
      case 'cool':
        return { power: true, acMode: ACMode.COOL };
      case 'heat':
        return { power: true, acMode: ACMode.HEAT };
      case 'dry':
        return { power: true, acMode: ACMode.DRY };
      case 'fan_only':
        return { power: true, acMode: ACMode.FAN };
      default:
        throw new Error(`Unknown mode: ${command}`);
    }
  }

  protected updateState(currentState: ACState, validatedCommand: ModeCommand): ACState {
    return {
      ...currentState,
      power: validatedCommand.power,
      mode: validatedCommand.acMode || currentState.mode,
      last_updated: new Date().toISOString()
    };
  }

  protected getLogContext(): string {
    return 'Mode';
  }
}