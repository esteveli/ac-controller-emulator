import { Service, Inject } from 'typedi';
import { MQTTClient } from '../../mqtt/MQTTClient';
import { ConfigService } from '../ConfigService';
import { ACDataService } from '../ACDataService';
import { StatePublisher } from '../StatePublisher';
import { ErrorStatusService } from '../ErrorStatusService';
import { ACState } from '../../types/ACTypes';

@Service()
export abstract class BaseCommandHandler<T> {
  constructor(
    @Inject(() => MQTTClient) protected mqttClient: MQTTClient,
    @Inject(() => ConfigService) protected configService: ConfigService,
    @Inject(() => ACDataService) protected acDataService: ACDataService,
    @Inject(() => StatePublisher) protected statePublisher: StatePublisher,
    @Inject(() => ErrorStatusService) protected errorStatusService: ErrorStatusService
  ) {}

  protected abstract validateCommand(command: string): T;
  protected abstract updateState(currentState: ACState, validatedCommand: T): ACState;
  protected abstract getLogContext(): string;

  async handleCommand(acId: string, command: string): Promise<void> {
    try {
      console.log(`📱 ${this.getLogContext()} command for ${acId}: ${command}`);
      
      if (!this.acDataService.validateACExists(acId)) {
        throw new Error(`AC ${acId} not found or not properly configured`);
      }

      const currentState = this.acDataService.getCurrentState(acId);
      if (!currentState) {
        throw new Error(`AC ${acId} state not found`);
      }

      const validatedCommand = this.validateCommand(command);
      const newState = this.updateState(currentState, validatedCommand);

      await this.executeStateChange(acId, newState);
      this.errorStatusService.clearError(acId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to handle ${this.getLogContext().toLowerCase()} command for ${acId}: ${errorMessage}`);
      this.errorStatusService.setError(acId, errorMessage);
      throw error;
    }
  }

  private async executeStateChange(acId: string, newState: ACState): Promise<void> {
    console.log(`🔄 Executing state change for ${acId}:`, newState);
    
    const irCode = this.acDataService.findIRCode(acId, newState);
    if (!irCode) {
      throw new Error(`No IR code found for the requested state`);
    }

    const deviceConfig = this.configService.getDeviceConfig(acId);
    if (!deviceConfig) {
      throw new Error(`No device configuration found for ${acId}`);
    }

    console.log(`🎯 Found IR code for ${acId} - State: Power=${newState.power}, Mode=${newState.mode}, Temp=${newState.temperature}°C, Fan=${newState.fan_speed}`);
    
    await this.mqttClient.sendIRCode(deviceConfig.ir_device_topic, irCode);
    
    this.acDataService.saveState(acId, newState);
    await this.statePublisher.publishState(acId);
    
    console.log(`✅ ${this.getLogContext()} command executed successfully for ${acId}`);
  }
}