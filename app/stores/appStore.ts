import { create } from 'zustand';
import { Row, ProcessedRow, ErrorRow, Template } from '../types';

interface AppState {
  // CSV入力
  csvData: Row[];
  csvHeaders: string[];
  
  // プロンプト
  promptTemplate: string;
  savedTemplates: Template[];
  
  // 実行状態
  isProcessing: boolean;
  progress: { current: number; total: number };
  results: ProcessedRow[];
  errors: ErrorRow[];
  
  // アクション
  setCsvData: (data: Row[], headers: string[]) => void;
  setPromptTemplate: (template: string) => void;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  loadTemplate: (id: string) => void;
  
  // 処理制御
  startProcessing: (total: number) => void;
  updateProgress: (current: number) => void;
  addResult: (result: ProcessedRow) => void;
  addError: (error: ErrorRow) => void;
  finishProcessing: () => void;
  resetResults: () => void;
  
  // ユーティリティ
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初期状態
  csvData: [],
  csvHeaders: [],
  promptTemplate: '',
  savedTemplates: [],
  isProcessing: false,
  progress: { current: 0, total: 0 },
  results: [],
  errors: [],
  
  // CSV関連
  setCsvData: (data, headers) => {
    set({ csvData: data, csvHeaders: headers });
  },
  
  // プロンプト関連
  setPromptTemplate: (template) => {
    set({ promptTemplate: template });
  },
  
  addTemplate: (templateData) => {
    const template: Template = {
      ...templateData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state) => ({
      savedTemplates: [...state.savedTemplates, template],
    }));
  },
  
  updateTemplate: (id, updates) => {
    set((state) => ({
      savedTemplates: state.savedTemplates.map((template) =>
        template.id === id
          ? { ...template, ...updates, updatedAt: new Date() }
          : template
      ),
    }));
  },
  
  deleteTemplate: (id) => {
    set((state) => ({
      savedTemplates: state.savedTemplates.filter((template) => template.id !== id),
    }));
  },
  
  loadTemplate: (id) => {
    const template = get().savedTemplates.find((t) => t.id === id);
    if (template) {
      set({ promptTemplate: template.content });
    }
  },
  
  // 処理制御
  startProcessing: (total) => {
    set({
      isProcessing: true,
      progress: { current: 0, total },
      results: [],
      errors: [],
    });
  },
  
  updateProgress: (current) => {
    set((state) => ({
      progress: { ...state.progress, current },
    }));
  },
  
  addResult: (result) => {
    set((state) => ({
      results: [...state.results, result],
    }));
  },
  
  addError: (error) => {
    set((state) => ({
      errors: [...state.errors, error],
    }));
  },
  
  finishProcessing: () => {
    set({ isProcessing: false });
  },
  
  resetResults: () => {
    set({
      results: [],
      errors: [],
      progress: { current: 0, total: 0 },
    });
  },
  
  // ユーティリティ
  clearAll: () => {
    set({
      csvData: [],
      csvHeaders: [],
      promptTemplate: '',
      results: [],
      errors: [],
      progress: { current: 0, total: 0 },
      isProcessing: false,
    });
  },
}));
