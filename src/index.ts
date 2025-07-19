import 'reflect-metadata';
import { Container } from 'typedi';
import { MQTTClient, MQTTConnectionError } from './mqtt/MQTTClient';
import { ACControllerService } from './services/ACControllerService';
import { ConfigService } from './services/ConfigService';

class ACControllerApp {
  private mqttClient!: MQTTClient;
  private acController!: ACControllerService;
  private configService!: ConfigService;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔌 Initializing AC Controller Emulator...');
    
    try {
      // Initialize config service
      console.log('📋 Loading configuration...');
      this.configService = Container.get(ConfigService);
      
      // Initialize MQTT client and connect
      console.log('⏳ Connecting to MQTT broker...');
      this.mqttClient = new MQTTClient(this.configService.getMQTTConfig());
      Container.set(MQTTClient, this.mqttClient);
      await this.mqttClient.waitForConnection();
      
      const mqttConfig = this.configService.getMQTTConfig();
      console.log(`📡 Connected to MQTT broker at ${mqttConfig.host}:${mqttConfig.port}`);
      
      // Initialize AC controller service
      console.log('🏠 Initializing AC controller service...');
      this.acController = Container.get(ACControllerService);
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Log available ACs
      const availableACs = this.acController.getAvailableACs();
      console.log(`🏠 Available ACs: ${availableACs.length}`);
      availableACs.forEach(acId => {
        const friendlyName = this.acController.getFriendlyName(acId);
        const currentState = this.acController.getCurrentState(acId);
        console.log(`  - ${acId} (${friendlyName}): ${currentState?.power ? 'ON' : 'OFF'} - ${currentState?.temperature}°C - ${currentState?.mode}`);
      });

      // Publish Home Assistant discovery configs
      await this.publishHomeAssistantDiscovery();

      // Publish initial states to Home Assistant
      await this.publishInitialStates();
      
      console.log('✅ AC Controller Emulator started successfully');
      
    } catch (error) {
      await this.handleInitializationError(error);
    }
  }

  private async handleInitializationError(error: unknown): Promise<void> {
    if (error instanceof MQTTConnectionError) {
      console.error('❌ MQTT Connection Failed:');
      console.error(`   ${error.message}`);
      if (error.originalError) {
        console.error(`   Original error: ${error.originalError.message}`);
      }
      console.error('');
      console.error('💡 Possible solutions:');
      console.error('   • Check if MQTT broker is running');
      console.error('   • Verify MQTT broker address and port in config');
      console.error('   • Check network connectivity');
      console.error('   • Verify username/password if authentication is enabled');
    } else {
      console.error('❌ Initialization failed:', error);
    }
    
    console.error('');
    console.error('🔌 Application cannot continue without MQTT connection. Exiting...');
    process.exit(1);
  }

  private async publishHomeAssistantDiscovery(): Promise<void> {
    console.log('🔍 Publishing Home Assistant discovery configs...');
    
    try {
      await this.acController.publishHomeAssistantDiscovery();
    } catch (error) {
      console.error('❌ Error publishing Home Assistant discovery:', error);
    }
  }

  private async publishInitialStates(): Promise<void> {
    console.log('📤 Publishing initial states to Home Assistant...');
    
    try {
      await this.acController.publishAllStates();
    } catch (error) {
      console.error('❌ Error publishing initial states:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      console.log('\n🔌 Shutting down AC Controller Emulator...');
      
      if (this.acController) {
        await this.acController.shutdown();
      }
      
      if (this.mqttClient) {
        this.mqttClient.disconnect();
      }
      
      console.log('✅ AC Controller Emulator stopped');
      process.exit(0);
    };

    // Handle runtime MQTT connection errors
    const handleMQTTError = (error: Error) => {
      if (error instanceof MQTTConnectionError) {
        console.error('\n❌ MQTT Connection Error during runtime:');
        console.error(`   ${error.message}`);
        if (error.originalError) {
          console.error(`   Original error: ${error.originalError.message}`);
        }
        console.error('');
        console.error('🔌 Application cannot continue without MQTT connection. Exiting...');
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', handleMQTTError);
    process.on('unhandledRejection', (reason) => {
      if (reason instanceof MQTTConnectionError) {
        handleMQTTError(reason);
      } else {
        console.error('❌ Unhandled promise rejection:', reason);
        process.exit(1);
      }
    });
  }
}

// Start the application
new ACControllerApp();