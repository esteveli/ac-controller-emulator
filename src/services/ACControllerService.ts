import { Service, Inject } from 'typedi';
import { MQTTClient, MQTTConnectionError } from '../mqtt/MQTTClient';
import { StatePublisher } from './StatePublisher';
import { ACDataService } from './ACDataService';
import { HomeAssistantDiscovery } from './HomeAssistantDiscovery';
import { CommandCoordinator } from './CommandCoordinator';
import { ACState } from '../types/ACTypes';

@Service()
export class ACControllerService {
  private availabilityInterval?: NodeJS.Timeout;
  private stateInterval?: NodeJS.Timeout;
  private discoveryInterval?: NodeJS.Timeout;

  constructor(
    @Inject(() => MQTTClient) private mqttClient: MQTTClient,
    @Inject(() => ACDataService) private acDataService: ACDataService,
    @Inject(() => StatePublisher) private statePublisher: StatePublisher,
    @Inject(() => HomeAssistantDiscovery) private haDiscovery: HomeAssistantDiscovery,
    @Inject(() => CommandCoordinator) private commandCoordinator: CommandCoordinator
  ) {
    this.setupCommandSubscriptions();
    this.startPeriodicUpdates();
    this.setupConfigurationReload();
  }

  private setupCommandSubscriptions(): void {
    console.log('🔧 Setting up command subscriptions...');
    this.commandCoordinator.setupCommandSubscriptions();
    
    const topics = this.commandCoordinator.getSubscribedTopics();
    console.log(`✅ Command subscriptions setup complete. Subscribed to ${topics.length} topics.`);
  }

  async publishState(acId: string): Promise<void> {
    await this.statePublisher.publishState(acId);
  }

  async publishAllStates(): Promise<void> {
    await this.statePublisher.publishAllStates();
  }

  getCurrentState(acId: string): ACState | null {
    return this.acDataService.getCurrentState(acId);
  }

  getAllStates(): Record<string, ACState> {
    return this.acDataService.getAllStates();
  }

  getAvailableACs(): string[] {
    return this.acDataService.getAvailableACs();
  }

  getFriendlyName(acId: string): string {
    return this.acDataService.getFriendlyName(acId);
  }

  async publishHomeAssistantDiscovery(): Promise<void> {
    await this.haDiscovery.publishDiscoveryConfigs();
  }

  async removeHomeAssistantDiscovery(): Promise<void> {
    await this.haDiscovery.removeDiscoveryConfigs();
  }

  // Public methods for manual command execution
  async executeMode(acId: string, mode: string): Promise<void> {
    return this.commandCoordinator.executeMode(acId, mode);
  }

  async executeTemperature(acId: string, temperature: string): Promise<void> {
    return this.commandCoordinator.executeTemperature(acId, temperature);
  }

  async executeFanMode(acId: string, fanMode: string): Promise<void> {
    return this.commandCoordinator.executeFanMode(acId, fanMode);
  }

  private setupConfigurationReload(): void {
    // Subscribe to configuration reload requests
    this.mqttClient.subscribe('accontroller/config/reload', async (topic, message) => {
      console.log('📋 Configuration reload requested via MQTT');
      try {
        // Reinitialize services that depend on configuration
        await this.reinitializeServices();
        
        await this.mqttClient.publish('accontroller/config/reload/status', 
          JSON.stringify({
            status: 'success',
            message: 'Configuration reloaded successfully',
            timestamp: new Date().toISOString()
          }));
        
        console.log('✅ Configuration reloaded successfully');
      } catch (error) {
        console.error('❌ Error reloading configuration:', error);
        await this.mqttClient.publish('accontroller/config/reload/status', 
          JSON.stringify({
            status: 'error',
            message: `Error reloading configuration: ${error}`,
            timestamp: new Date().toISOString()
          }));
      }
    });
  }

  private async reinitializeServices(): Promise<void> {
    // This method would reinitialize services that depend on configuration
    // For now, we'll just log the reload request
    console.log('🔄 Reinitializing services with new configuration...');
    
    // In a more complete implementation, you might:
    // 1. Reload ConfigService
    // 2. Reinitialize ACDataService with new data
    // 3. Update command subscriptions
    // 4. Republish Home Assistant discovery configs
    
    // For now, just republish discovery configs
    await this.haDiscovery.publishDiscoveryConfigs();
  }

  private startPeriodicUpdates(): void {
    // Publish availability every 30 seconds
    this.availabilityInterval = setInterval(async () => {
      await this.publishAvailability();
    }, 30000);

    // Publish state every 60 seconds
    this.stateInterval = setInterval(async () => {
      await this.publishAllStates();
    }, 60000);

    // Publish Home Assistant discovery every 60 seconds (1 minute)
    this.discoveryInterval = setInterval(async () => {
      await this.publishHomeAssistantDiscovery();
    }, 60000);
  }

  private async publishAvailability(): Promise<void> {
    const availableACs = this.acDataService.getAvailableACs();
    
    for (const acId of availableACs) {
      try {
        await this.mqttClient.publish(`accontroller/${acId}/availability`, "online");
      } catch (error) {
        console.error(`❌ Error publishing availability for ${acId}:`, error);
        // Re-throw MQTT connection errors to trigger application shutdown
        if (error instanceof MQTTConnectionError) {
          throw error;
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.availabilityInterval) {
      clearInterval(this.availabilityInterval);
    }
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
    }
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    const availableACs = this.acDataService.getAvailableACs();
    for (const acId of availableACs) {
      try {
        await this.mqttClient.publish(`accontroller/${acId}/availability`, "offline");
      } catch (error) {
        console.error(`❌ Error publishing offline availability for ${acId}:`, error);
        // Don't re-throw MQTT connection errors during shutdown
        // as the application is already shutting down
      }
    }
  }
}