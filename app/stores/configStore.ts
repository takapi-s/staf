import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppConfig } from '../types';

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
  timeout: 30,
  outputFolder: '',
  logLevel: 'info',
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
          errors.push('APIキーが設定されていません');
        }
        
        if (config.concurrency < 1 || config.concurrency > 10) {
          errors.push('並列処理数は1-10の範囲で設定してください');
        }
        
        if (config.rateLimit < 1 || config.rateLimit > 1000) {
          errors.push('レート制限は1-1000の範囲で設定してください');
        }
        
        if (config.timeout < 5 || config.timeout > 300) {
          errors.push('タイムアウトは5-300秒の範囲で設定してください');
        }
        
        return {
          isValid: errors.length === 0,
          errors,
        };
      },
    }),
    {
      name: 'geminiscope-config',
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
