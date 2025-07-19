import { Service, Inject } from 'typedi';
import { IACStateRepository, ACStateRepository } from '../storage/ACStateRepository';
import { IIRCodeRepository, IRCodeRepository } from '../storage/IRCodeRepository';
import { ACState } from '../types/ACTypes';

@Service()
export class ACDataService {
  constructor(
    @Inject(() => ACStateRepository) private stateRepository: IACStateRepository,
    @Inject(() => IRCodeRepository) private irCodeRepository: IIRCodeRepository
  ) {}

  getCurrentState(acId: string): ACState | null {
    return this.stateRepository.getById(acId);
  }

  getAllStates(): Record<string, ACState> {
    return this.stateRepository.getAll();
  }

  saveState(acId: string, state: ACState): void {
    this.stateRepository.save(acId, state);
  }

  findIRCode(acId: string, targetState: Partial<ACState>): string | null {
    return this.irCodeRepository.findCode(acId, targetState);
  }

  getFriendlyName(acId: string): string {
    return this.irCodeRepository.getFriendlyName(acId);
  }

  getAvailableACs(): string[] {
    // Get ACs that have both state and IR codes
    const stateACs = this.stateRepository.getAvailableIds();
    const irACs = this.irCodeRepository.getAvailableACIds();
    
    return stateACs.filter(acId => irACs.includes(acId));
  }

  validateACExists(acId: string): boolean {
    const hasState = this.stateRepository.getById(acId) !== null;
    const hasIRCodes = this.irCodeRepository.getByACId(acId) !== null;
    
    return hasState && hasIRCodes;
  }
}