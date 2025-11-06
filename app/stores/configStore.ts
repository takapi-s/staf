import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig } from '../types';

interface ConfigState {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  resetConfig: () => void;
  validateConfig: () => { isValid: boolean; errors: string[] };
}

const defaultConfig: AppConfig = {
  apiKey: '',
  concurrency: 3,
  rateLimit: 60,
  timeout: 60,
  outputFolder: '',
  logLevel: 'info',
  enableWebSearch: true,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },
      
      resetConfig: () => {
        set({ config: defaultConfig });
      },
      
      validateConfig: () => {
        const { config } = get();
        const errors: string[] = [];
        
        if (!config.apiKey.trim()) {
          errors.push('API key is not set');
        }
        
        if (config.concurrency < 1 || config.concurrency > 1500) {
          errors.push('Concurrency must be between 1 and 1500');
        }
        
        if (config.rateLimit < 1 || config.rateLimit > 1500) {
          errors.push('Rate limit must be between 1 and 1500 RPM');
        }
        
        if (config.timeout < 5 || config.timeout > 300) {
          errors.push('Timeout must be between 5 and 300 seconds');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      },
    }),
    {
      name: 'staf-config',
      version: 1,
      storage: {
        getItem: (name) => {
          const item = localStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
