#!/usr/bin/env node

import 'reflect-metadata';
import { Container } from 'typedi';
import { IRConfigurationCLI } from './IRConfigurationCLI';
import { MQTTClient } from '../mqtt/MQTTClient';
import { ConfigService } from '../services/ConfigService';
import chalk from 'chalk';

async function main() {
  try {
    console.log(chalk.blue.bold('🔧 AC Controller Configuration CLI'));
    console.log(chalk.gray('Setting up services...'));

    // Initialize services
    const configService = Container.get(ConfigService);
    const mqttConfig = configService.getMQTTConfig();
    
    // Create MQTT client and set it in container
    const mqttClient = new MQTTClient(mqttConfig, 'cli');
    mqttClientInstance = mqttClient; // Store for graceful shutdown
    Container.set(MQTTClient, mqttClient);
    
    // Wait for MQTT connection
    console.log(chalk.gray('Connecting to MQTT broker...'));
    await mqttClient.waitForConnection();
    console.log(chalk.green('✅ Connected to MQTT broker'));

    // Start CLI
    const cli = new IRConfigurationCLI();
    await cli.start();
    
    // Graceful shutdown
    console.log(chalk.gray('Disconnecting from MQTT broker...'));
    mqttClient.disconnect();
    console.log(chalk.green('✅ Disconnected successfully'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize CLI:'), error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('MQTT')) {
      console.error(chalk.yellow('\n💡 Make sure:'));
      console.error(chalk.yellow('   • MQTT broker is running'));
      console.error(chalk.yellow('   • Configuration in data/devices.json is correct'));
      console.error(chalk.yellow('   • Network connectivity is working'));
    }
    
    // Cleanup MQTT connection on error
    if (mqttClientInstance) {
      mqttClientInstance.disconnect();
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
let mqttClientInstance: MQTTClient | null = null;

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down...'));
  if (mqttClientInstance) {
    mqttClientInstance.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n👋 Shutting down...'));
  if (mqttClientInstance) {
    mqttClientInstance.disconnect();
  }
  process.exit(0);
});

main().catch(error => {
  console.error(chalk.red('💥 Unexpected error:'), error);
  process.exit(1);
});