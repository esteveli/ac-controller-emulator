import * as mqtt from 'mqtt';
import { MQTTConfig } from '../types/ConfigTypes';

export class MQTTConnectionError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'MQTTConnectionError';
  }
}

export class MQTTClient {
  private client!: mqtt.MqttClient;
  private readonly config: MQTTConfig;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void>;
  private clientIdPrefix: string;

  constructor(config: MQTTConfig, clientType: 'service' | 'cli' = 'service') {
    this.config = config;
    this.clientIdPrefix = clientType === 'cli' ? 'ac-config' : 'ac-controller';
    this.connectionPromise = this.connect();
  }

  private async connect(): Promise<void> {
    const connectUrl = `mqtt://${this.config.host}:${this.config.port}`;
    
    console.log(`🔗 Connecting to MQTT broker: ${connectUrl}`);
    
    const clientId = `${this.clientIdPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connectionOptions: mqtt.IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 0, // Disable automatic reconnection - fail fast
    };
    
    console.log(`🆔 Client ID: ${clientId}`);

    // Add authentication if provided
    if (this.config.username?.trim()) {
      connectionOptions.username = this.config.username;
      console.log(`🔐 Using username: ${this.config.username}`);
    }
    if (this.config.password?.trim()) {
      connectionOptions.password = this.config.password;
      console.log(`🔐 Using password: [HIDDEN]`);
    }

    this.client = mqtt.connect(connectUrl, connectionOptions);

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.client.end();
        reject(new MQTTConnectionError(
          `Failed to connect to MQTT broker at ${connectUrl} within 10 seconds`
        ));
      }, 10000);

      this.client.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Connected to MQTT broker');
        this.isConnected = true;
        this.setupEventHandlers();
        resolve();
      });

      this.client.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('❌ MQTT connection error:', error);
        this.isConnected = false;
        reject(new MQTTConnectionError(
          `Failed to connect to MQTT broker at ${connectUrl}`,
          error
        ));
      });
    });
  }

  private setupEventHandlers(): void {
    this.client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('offline', () => {
      console.log('📡 MQTT client offline');
      this.isConnected = false;
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT error after connection:', error);
      this.isConnected = false;
    });
  }

  async sendIRCode(deviceTopic: string, irCode: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      const topic = `zigbee2mqtt/${deviceTopic}/set`;
      const payload = JSON.stringify({
        ir_code_to_send: irCode
      });

      console.log(`📡 Sending IR code to device: ${deviceTopic}`);
      console.log(`📤 MQTT Topic: ${topic}`);
      console.log(`📜 IR Code: ${irCode.substring(0, 50)}${irCode.length > 50 ? '...' : ''}`);
      
      this.client.publish(topic, payload, (error) => {
        if (error) {
          console.error(`❌ Error sending IR code to ${deviceTopic}:`, error);
          reject(error);
        } else {
          console.log(`✅ IR code successfully sent to ${deviceTopic}`);
          resolve();
        }
      });
    });
  }

  subscribe(topic: string, callback: (topic: string, message: string) => void): void {
    this.ensureConnected();
    
    console.log(`📥 Subscribing to ${topic}`);
    this.client.subscribe(topic, (error) => {
      if (error) {
        console.error(`❌ Error subscribing to ${topic}:`, error);
        throw error;
      } else {
        console.log(`✅ Subscribed to ${topic}`);
      }
    });

    this.client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        callback(receivedTopic, message.toString());
      }
    });
  }

  publish(topic: string, message: string): Promise<void> {
    this.ensureConnected();
    
    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, (error) => {
        if (error) {
          console.error(`❌ Error publishing to ${topic}:`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async waitForConnection(): Promise<void> {
    return this.connectionPromise;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new MQTTConnectionError('MQTT client is not connected');
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting from MQTT broker...');
    this.isConnected = false;
    this.client.end();
  }
}