import { Service } from 'typedi';
import { BaseCommandHandler } from './BaseCommandHandler';
import { ACState, createTemperature } from '../../types/ACTypes';

@Service()
export class TemperatureCommandHandler extends BaseCommandHandler<number> {

  async handleTemperatureCommand(acId: string, temperatureStr: string): Promise<void> {
    return this.handleCommand(acId, temperatureStr);
  }

  protected validateCommand(command: string): number {
    const temperature = parseFloat(command);
    
    if (isNaN(temperature)) {
      throw new Error(`Invalid temperature value: ${command}`);
    }
    
    return createTemperature(temperature);
  }

  protected updateState(currentState: ACState, validatedCommand: number): ACState {
    return {
      ...currentState,
      temperature: validatedCommand,
      last_updated: new Date().toISOString()
    };
  }

  protected getLogContext(): string {
    return 'Temperature';
  }
}