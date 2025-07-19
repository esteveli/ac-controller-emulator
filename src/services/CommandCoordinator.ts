import { Service, Inject } from 'typedi';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from './ConfigService';
import { ACDataService } from './ACDataService';
import { StatePublisher } from './StatePublisher';
import { ErrorStatusService } from './ErrorStatusService';
import { MQTTSubscriptionManager } from './MQTTSubscriptionManager';
import { ModeCommandHandler } from './handlers/ModeCommandHandler';
import { TemperatureCommandHandler } from './handlers/TemperatureCommandHandler';
import { FanModeCommandHandler } from './handlers/FanModeCommandHandler';

@Service()
export class CommandCoordinator {
  constructor(
    @Inject(() => MQTTClient) private mqttClient: MQTTClient,
    @Inject(() => ConfigService) private configService: ConfigService,
    @Inject(() => ACDataService) private acDataService: ACDataService,
    @Inject(() => StatePublisher) private statePublisher: StatePublisher,
    @Inject(() => ErrorStatusService) private errorStatusService: ErrorStatusService,
    @Inject(() => ModeCommandHandler) private modeHandler: ModeCommandHandler,
    @Inject(() => TemperatureCommandHandler) private temperatureHandler: TemperatureCommandHandler,
    @Inject(() => FanModeCommandHandler) private fanModeHandler: FanModeCommandHandler,
    @Inject(() => MQTTSubscriptionManager) private subscriptionManager: MQTTSubscriptionManager
  ) {
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    console.log('🔧 Initializing command handlers...');
    // Handlers are now injected automatically via TypeDI
    console.log('✅ Command handlers initialized successfully');
  }

  setupCommandSubscriptions(): void {
    console.log('🔔 Setting up MQTT command subscriptions...');
    
    this.subscriptionManager.setupAllSubscriptions();
    
    const topics = this.subscriptionManager.getSubscribedTopics();
    console.log(`✅ Subscribed to ${topics.length} command topics`);
  }

  // Public methods for manual command execution (useful for testing)
  async executeMode(acId: string, mode: string): Promise<void> {
    return this.modeHandler.handleModeCommand(acId, mode);
  }

  async executeTemperature(acId: string, temperature: string): Promise<void> {
    return this.temperatureHandler.handleTemperatureCommand(acId, temperature);
  }

  async executeFanMode(acId: string, fanMode: string): Promise<void> {
    return this.fanModeHandler.handleFanModeCommand(acId, fanMode);
  }

  getSubscribedTopics(): string[] {
    return this.subscriptionManager.getSubscribedTopics();
  }
}