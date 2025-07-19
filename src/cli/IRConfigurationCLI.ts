import inquirer from 'inquirer';
import { Container } from 'typedi';
import { IRConfigurationManager, IRRecordingSession } from '../services/IRConfigurationManager';
import { ACMode, FanSpeed } from '../types/ACTypes';
import chalk from 'chalk';

export class IRConfigurationCLI {
  private configManager: IRConfigurationManager;

  constructor() {
    this.configManager = Container.get(IRConfigurationManager);
  }

  async start(): Promise<void> {
    console.log(chalk.blue.bold('\n🏠 AC Controller IR Configuration Assistant'));
    console.log(chalk.gray('This tool will help you record IR codes for your AC devices.\n'));

    try {
      const action = await this.selectAction();
      
      switch (action) {
        case 'record':
          await this.recordIRCode();
          break;
        case 'list':
          await this.listDevices();
          break;
        case 'copy':
          await this.copyIRCodes();
          break;
        case 'reload':
          await this.reloadConfiguration();
          break;
        case 'exit':
          console.log(chalk.green('👋 Goodbye!'));
          process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async selectAction(): Promise<string> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📱 Record IR code for device', value: 'record' },
          { name: '📋 List available devices', value: 'list' },
          { name: '📋 Copy IR codes between devices', value: 'copy' },
          { name: '🔄 Reload configuration', value: 'reload' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);

    return action;
  }

  private async recordIRCode(): Promise<void> {
    // Step 1: Select device
    const deviceId = await this.selectDevice();
    if (!deviceId) return;

    console.log(chalk.blue(`\n🎯 Recording IR code for: ${this.configManager.getFriendlyName(deviceId)}`));

    // Step 2: Create session
    const session = await this.configManager.startRecording(deviceId);

    // Step 3: Configure target state
    await this.configureTargetState(session);

    // Step 4: Record IR code
    await this.recordAndSaveIRCode(session);

    // Step 5: Ask if user wants to continue
    await this.askToContinue();
  }

  private async selectDevice(): Promise<string | null> {
    const devices = this.configManager.getAvailableDevices();
    
    if (devices.length === 0) {
      console.log(chalk.yellow('⚠️  No devices found in configuration.'));
      return null;
    }

    const deviceChoices = devices.map(deviceId => {
      const info = this.configManager.getDeviceInfo(deviceId);
      return {
        name: `${info?.name || deviceId} (${deviceId}) - Modes: ${info?.modes.join(', ')}`,
        value: deviceId
      };
    });

    const { deviceId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deviceId',
        message: 'Select AC device:',
        choices: deviceChoices
      }
    ]);

    return deviceId;
  }

  private async configureTargetState(session: IRRecordingSession): Promise<void> {
    // Step 1: Select mode
    const mode = await this.selectMode(session.acId);
    this.configManager.updateSessionMode(session, mode);

    // Special case: Mode 'off' goes directly to recording
    if (mode === 'off') {
      return;
    }

    // Step 2: Select fan mode
    const fanMode = await this.selectFanMode();
    this.configManager.updateSessionFanMode(session, fanMode);

    // Special case: Mode 'fan_only' goes directly to recording
    if (session.targetState.mode === 'fan_only') {
      return;
    }

    // Step 3: Select temperature
    const temperature = await this.selectTemperature();
    this.configManager.updateSessionTemperature(session, temperature);
  }

  private async selectMode(acId: string): Promise<string> {
    const supportedModes = this.configManager.getSupportedModes(acId);
    
    const modeChoices = supportedModes.map(mode => {
      const labels: Record<string, string> = {
        'auto': '🔄 Auto',
        'cool': '❄️ Cool',
        'heat': '🔥 Heat',
        'dry': '💨 Dry',
        'fan_only': '🌪️ Fan Only',
        'off': '⚫ Off'
      };
      
      return {
        name: labels[mode] || `📱 ${mode}`,
        value: mode
      };
    });

    // Add option to activate an available mode
    const availableModes = this.getAvailableModesToActivate(acId);
    if (availableModes.length > 0) {
      modeChoices.push({
        name: '➕ Activate available mode',
        value: 'ACTIVATE_MODE' as any
      });
    }

    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select AC mode:',
        choices: modeChoices
      }
    ]);

    // Handle mode activation
    if (mode === 'ACTIVATE_MODE') {
      return await this.activateMode(acId);
    }

    return mode as string;
  }

  private getAvailableModesToActivate(acId: string): ACMode[] {
    const supportedModes = this.configManager.getSupportedModes(acId);
    const allModes = Object.values(ACMode);
    
    return allModes.filter(mode => !supportedModes.includes(mode));
  }

  private async activateMode(acId: string): Promise<string> {
    console.log(chalk.blue('\n➕ Activating available mode'));
    console.log(chalk.gray('Select a mode to activate for this device'));
    
    const availableModes = this.getAvailableModesToActivate(acId);
    
    if (availableModes.length === 0) {
      console.log(chalk.yellow('⚠️  All modes are already activated for this device'));
      return await this.selectMode(acId);
    }
    
    const modeChoices = availableModes.map(mode => {
      const labels: Record<string, string> = {
        [ACMode.AUTO]: '🔄 Auto',
        [ACMode.COOL]: '❄️ Cool',
        [ACMode.HEAT]: '🔥 Heat',
        [ACMode.DRY]: '💨 Dry',
        [ACMode.FAN]: '🌪️ Fan Only',
        [ACMode.OFF]: '⚫ Off'
      };
      
      return {
        name: labels[mode] || `📱 ${mode}`,
        value: mode
      };
    });
    
    const { selectedMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedMode',
        message: 'Select mode to activate:',
        choices: modeChoices
      }
    ]);
    
    // Show confirmation
    console.log(chalk.blue(`\n📱 Mode to activate: "${selectedMode}"`));
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Activate this mode for the device?',
        default: true
      }
    ]);
    
    if (confirm) {
      try {
        await this.configManager.activateMode(acId, selectedMode);
        console.log(chalk.green(`✅ Mode "${selectedMode}" activated successfully!`));
      } catch (error) {
        console.error(chalk.red('❌ Error activating mode:'), error instanceof Error ? error.message : error);
        // Retry or return to mode selection
        const { retry } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Would you like to try activating a different mode?',
            default: true
          }
        ]);
        
        if (retry) {
          return await this.activateMode(acId);
        } else {
          // Return to mode selection
          return await this.selectMode(acId);
        }
      }
    } else {
      console.log(chalk.yellow('❌ Mode not activated, returning to mode selection...'));
      return await this.selectMode(acId);
    }
    
    return selectedMode;
  }

  private async selectFanMode(): Promise<string> {
    const fanModes = this.configManager.getAvailableFanModes();
    
    const fanChoices = fanModes.map(fan => {
      const labels: Record<string, string> = {
        'auto': '🔄 Auto',
        'low': '🌬️ Low',
        'medium': '💨 Medium',
        'high': '🌪️ High',
        'quiet': '🤫 Quiet'
      };
      
      return {
        name: labels[fan] || fan,
        value: fan
      };
    });

    const { fanMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fanMode',
        message: 'Select fan mode:',
        choices: fanChoices
      }
    ]);

    return fanMode;
  }

  private async selectTemperature(): Promise<number> {
    const { temperature } = await inquirer.prompt({
      type: 'number',
      name: 'temperature',
      message: 'Enter target temperature (16-30°C):',
      default: 24,
      validate: (input: number | undefined) => {
        if (input === undefined || isNaN(input)) {
          return 'Please enter a valid number';
        }
        if (this.configManager.validateTemperature(input)) {
          return true;
        }
        return 'Please enter a temperature between 16 and 30°C';
      }
    });

    return temperature;
  }

  private async recordAndSaveIRCode(session: IRRecordingSession): Promise<void> {
    console.log(chalk.blue('\n📡 Preparing to record IR code...'));
    
    // Display target state
    this.displayTargetState(session);

    // Enable IR learning mode
    await this.configManager.enableIRLearningMode(session.deviceTopic);

    // Wait for user confirmation
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Point your AC remote at the IR receiver and press ENTER when ready to record',
        default: true
      }
    ]);

    console.log(chalk.yellow('🎯 Recording... Point your remote and press the button with the above settings!'));
    console.log(chalk.gray('⏳ Waiting for IR code (30 seconds timeout)...'));

    try {
      // Wait for IR code
      const irCode = await this.configManager.waitForIRCode(session.deviceTopic, 30000);
      
      session.recordedCode = irCode;
      console.log(chalk.green(`✅ IR code captured! (${irCode.length} characters)`));
      
      // Test the captured IR code
      const testResult = await this.testIRCode(session);
      
      if (testResult) {
        await this.configManager.saveIRCode(session);
        console.log(chalk.green('💾 IR code saved successfully!'));
      } else {
        console.log(chalk.yellow('⚠️  IR code discarded - trying again...'));
        await this.recordAndSaveIRCode(session);
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to record IR code:'), error instanceof Error ? error.message : error);
      
      // Ask if user wants to retry
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to try again?',
          default: true
        }
      ]);

      if (retry) {
        await this.recordAndSaveIRCode(session);
      }
    }
  }

  private displayTargetState(session: IRRecordingSession): void {
    console.log(chalk.blue('\n📋 Target State:'));
    console.log(chalk.gray(`   Power: ${session.targetState.power ? 'ON' : 'OFF'}`));
    console.log(chalk.gray(`   Mode: ${session.targetState.mode}`));
    if (session.targetState.fan_mode) {
      console.log(chalk.gray(`   Fan: ${session.targetState.fan_mode}`));
    }
    if (session.targetState.temperature) {
      console.log(chalk.gray(`   Temperature: ${session.targetState.temperature}°C`));
    }
    console.log();
  }

  private async testIRCode(session: IRRecordingSession): Promise<boolean> {
    console.log(chalk.blue('\n🧪 Testing captured IR code...'));
    
    // Ask user if they want to test the code
    const { testCode } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'testCode',
        message: 'Do you want to test this IR code on your AC?',
        default: true
      }
    ]);

    if (!testCode) {
      // If user doesn't want to test, ask if they want to save directly
      const { saveWithoutTest } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveWithoutTest',
          message: 'Save this IR code without testing?',
          default: false
        }
      ]);
      
      return saveWithoutTest;
    }

    try {
      // Send the captured IR code to test it
      console.log(chalk.blue('📡 Sending IR code to your AC device...'));
      await this.configManager.sendIRCode(session.deviceTopic, session.recordedCode!);
      
      console.log(chalk.green('✅ IR code sent successfully!'));
      console.log(chalk.gray('Please check your AC device to see if it changed to the expected state:'));
      
      // Show expected state again
      this.displayTargetState(session);
      
      // Wait a moment for the AC to respond
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ask user if it worked
      const { worked } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'worked',
          message: 'Did your AC change to the expected state correctly?',
          default: true
        }
      ]);

      if (worked) {
        console.log(chalk.green('🎉 Great! The IR code works correctly.'));
        return true;
      } else {
        console.log(chalk.yellow('⚠️  The IR code didn\'t work as expected.'));
        console.log(chalk.gray('We\'ll capture a new IR code. Make sure to:'));
        console.log(chalk.gray('  • Point the remote directly at the IR receiver'));
        console.log(chalk.gray('  • Use the exact settings shown above'));
        console.log(chalk.gray('  • Press the button firmly and hold briefly'));
        
        return false;
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to send IR code for testing:'), error instanceof Error ? error.message : error);
      
      // Ask if user wants to save anyway
      const { saveAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveAnyway',
          message: 'Could not test the IR code. Save it anyway?',
          default: false
        }
      ]);
      
      return saveAnyway;
    }
  }

  private async listDevices(): Promise<void> {
    const devices = this.configManager.getAvailableDevices();
    
    if (devices.length === 0) {
      console.log(chalk.yellow('⚠️  No devices found in configuration.'));
      return;
    }

    console.log(chalk.blue('\n📋 Available Devices:'));
    
    devices.forEach(deviceId => {
      const info = this.configManager.getDeviceInfo(deviceId);
      console.log(chalk.white(`\n🏠 ${info?.name || deviceId}`));
      console.log(chalk.gray(`   ID: ${deviceId}`));
      console.log(chalk.gray(`   Supported modes: ${info?.modes.join(', ')}`));
    });

    await this.askToContinue();
  }

  private async copyIRCodes(): Promise<void> {
    console.log(chalk.blue('\n📋 Copy IR codes between devices'));
    console.log(chalk.gray('This will copy all IR codes from source device to target device.\n'));

    const devices = this.configManager.getAvailableDevices();
    
    if (devices.length < 2) {
      console.log(chalk.yellow('⚠️  Need at least 2 devices to copy IR codes.'));
      await this.askToContinue();
      return;
    }

    // Step 1: Select source device
    const sourceDevice = await this.selectDeviceWithInfo('Select SOURCE device (copy FROM):');
    if (!sourceDevice) return;

    // Step 2: Select target device
    const targetDevice = await this.selectDeviceWithInfo('Select TARGET device (copy TO):', sourceDevice);
    if (!targetDevice) return;

    // Step 3: Show preview and confirm
    const sourceInfo = this.configManager.getDeviceInfo(sourceDevice);
    const targetInfo = this.configManager.getDeviceInfo(targetDevice);
    const sourceCodeCount = await this.configManager.getIRCodeCount(sourceDevice);

    console.log(chalk.blue('\n📋 Copy Summary:'));
    console.log(chalk.white(`   FROM: ${sourceInfo?.name || sourceDevice} (${sourceDevice})`));
    console.log(chalk.white(`   TO:   ${targetInfo?.name || targetDevice} (${targetDevice})`));
    console.log(chalk.gray(`   IR codes to copy: ${sourceCodeCount}`));
    console.log(chalk.yellow('\n⚠️  This will REPLACE all existing IR codes in the target device!'));

    const { confirmCopy } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCopy',
        message: 'Are you sure you want to proceed?',
        default: false
      }
    ]);

    if (!confirmCopy) {
      console.log(chalk.yellow('📋 Copy operation cancelled.'));
      await this.askToContinue();
      return;
    }

    // Step 4: Perform the copy
    try {
      console.log(chalk.blue('📋 Copying IR codes...'));
      const copiedCount = await this.configManager.copyIRCodes(sourceDevice, targetDevice);
      
      console.log(chalk.green(`✅ Successfully copied ${copiedCount} IR codes!`));
      console.log(chalk.gray(`   From: ${sourceDevice} → To: ${targetDevice}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to copy IR codes:'), error instanceof Error ? error.message : error);
    }

    await this.askToContinue();
  }

  private async selectDeviceWithInfo(message: string, excludeDevice?: string): Promise<string | null> {
    const devices = this.configManager.getAvailableDevices()
      .filter(device => device !== excludeDevice);
    
    if (devices.length === 0) {
      console.log(chalk.yellow('⚠️  No devices available for selection.'));
      return null;
    }

    const deviceChoices = devices.map(deviceId => {
      const info = this.configManager.getDeviceInfo(deviceId);
      return {
        name: `${info?.name || deviceId} (${deviceId}) - Modes: ${info?.modes.join(', ')}`,
        value: deviceId
      };
    });

    const { deviceId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deviceId',
        message: message,
        choices: deviceChoices
      }
    ]);

    return deviceId;
  }

  private async reloadConfiguration(): Promise<void> {
    console.log(chalk.blue('🔄 Reloading configuration...'));
    
    try {
      await this.configManager.reloadConfiguration();
      console.log(chalk.green('✅ Configuration reloaded successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to reload configuration:'), error instanceof Error ? error.message : error);
    }

    await this.askToContinue();
  }

  private async askToContinue(): Promise<void> {
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to do something else?',
        default: true
      }
    ]);

    if (shouldContinue) {
      await this.start();
    } else {
      console.log(chalk.green('👋 Goodbye!'));
      process.exit(0);
    }
  }
}