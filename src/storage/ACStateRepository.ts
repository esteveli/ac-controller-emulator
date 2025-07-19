import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { ACState } from '../types/ACTypes';
import { DefaultConfigGenerator } from '../services/DefaultConfigGenerator';

export interface IACStateRepository {
  getAll(): Record<string, ACState>;
  getById(acId: string): ACState | null;
  save(acId: string, state: ACState): void;
  getAvailableIds(): string[];
}

@Service()
export class ACStateRepository implements IACStateRepository {
  private statesFile: string;

  constructor() {
    this.statesFile = DefaultConfigGenerator.getStatesPath();
  }

  getAll(): Record<string, ACState> {
    try {
      const data = fs.readFileSync(this.statesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading AC states:', error);
      return {};
    }
  }

  getById(acId: string): ACState | null {
    const states = this.getAll();
    return states[acId] || null;
  }

  save(acId: string, state: ACState): void {
    const states = this.getAll();
    states[acId] = { ...state, last_updated: new Date().toISOString() };
    
    try {
      fs.writeFileSync(this.statesFile, JSON.stringify(states, null, 2));
    } catch (error) {
      console.error('Error saving AC state:', error);
      throw error;
    }
  }

  getAvailableIds(): string[] {
    const states = this.getAll();
    return Object.keys(states);
  }
}