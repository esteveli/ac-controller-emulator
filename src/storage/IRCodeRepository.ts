import { Service, Inject } from 'typedi';
import { IRCode, ACState, ACMode } from '../types/ACTypes';
import { ConfigService } from '../services/ConfigService';
import { ModeSearchHandler } from './search/ModeSearchHandler';
import { AutoModeSearchHandler } from './search/AutoModeSearchHandler';
import { CoolHeatModeSearchHandler } from './search/CoolHeatModeSearchHandler';
import { DryModeSearchHandler } from './search/DryModeSearchHandler';
import { FanOnlyModeSearchHandler } from './search/FanOnlyModeSearchHandler';
import { PowerOffModeSearchHandler } from './search/PowerOffModeSearchHandler';

export interface ACIRData {
  friendly_name: string;
  supported_modes: ACMode[];
  codes: IRCode[];
}

export interface IIRCodeRepository {
  getAll(): Record<string, ACIRData>;
  getByACId(acId: string): ACIRData | null;
  findCode(acId: string, targetState: Partial<ACState>): string | null;
  getFriendlyName(acId: string): string;
  getAvailableACIds(): string[];
  getSupportedModes(acId: string): ACMode[];
  isModeSupported(acId: string, mode: ACMode): boolean;
}

@Service()
export class IRCodeRepository implements IIRCodeRepository {
  private modeHandlers!: ModeSearchHandler[];

  constructor(
    @Inject(() => ConfigService) private configService: ConfigService,
    @Inject(() => PowerOffModeSearchHandler) private powerOffHandler: PowerOffModeSearchHandler,
    @Inject(() => AutoModeSearchHandler) private autoHandler: AutoModeSearchHandler,
    @Inject(() => CoolHeatModeSearchHandler) private coolHeatHandler: CoolHeatModeSearchHandler,
    @Inject(() => DryModeSearchHandler) private dryHandler: DryModeSearchHandler,
    @Inject(() => FanOnlyModeSearchHandler) private fanOnlyHandler: FanOnlyModeSearchHandler
  ) {
    this.initializeModeHandlers();
  }

  private initializeModeHandlers(): void {
    this.modeHandlers = [
      this.powerOffHandler,  // Check power off first
      this.autoHandler,
      this.coolHeatHandler,
      this.dryHandler,
      this.fanOnlyHandler
    ];
  }

  getAll(): Record<string, ACIRData> {
    const allDevices = this.configService.getAllUnifiedDeviceConfigs();
    const result: Record<string, ACIRData> = {};
    
    for (const [acId, deviceConfig] of Object.entries(allDevices)) {
      result[acId] = {
        friendly_name: deviceConfig.friendly_name,
        supported_modes: deviceConfig.supported_modes,
        codes: deviceConfig.ir_codes
      };
    }
    
    return result;
  }

  getByACId(acId: string): ACIRData | null {
    const deviceConfig = this.configService.getUnifiedDeviceConfig(acId);
    if (!deviceConfig) return null;
    
    return {
      friendly_name: deviceConfig.friendly_name,
      supported_modes: deviceConfig.supported_modes,
      codes: deviceConfig.ir_codes
    };
  }

  findCode(acId: string, targetState: Partial<ACState>): string | null {
    const acData = this.getByACId(acId);
    
    if (!acData) {
      throw new Error(`No IR codes found for AC: ${acId}`);
    }

    // Check if the requested mode is supported (except for power off)
    if (targetState.power !== false && targetState.mode && !acData.supported_modes.includes(targetState.mode)) {
      throw new Error(`Mode ${targetState.mode} is not supported by AC ${acId}. Supported modes: ${acData.supported_modes.join(', ')}`);
    }

    // Try each handler in order until one succeeds
    for (const handler of this.modeHandlers) {
      try {
        const match = handler.findCode(acData.codes, targetState);
        if (match) {
          return match.code;
        }
      } catch (error) {
        // Re-throw handler errors (these contain specific error messages)
        throw error;
      }
    }

    // If no handler found a match (should not happen with current logic)
    throw new Error(`No matching IR code found for AC ${acId} with state: ${JSON.stringify(targetState)}`);
  }

  getFriendlyName(acId: string): string {
    const acData = this.getByACId(acId);
    return acData?.friendly_name || acId;
  }

  getAvailableACIds(): string[] {
    return this.configService.getAvailableDeviceIds();
  }

  getSupportedModes(acId: string): ACMode[] {
    const acData = this.getByACId(acId);
    return acData?.supported_modes || [];
  }

  isModeSupported(acId: string, mode: ACMode): boolean {
    const supportedModes = this.getSupportedModes(acId);
    return supportedModes.includes(mode);
  }
}