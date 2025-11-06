import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Row, ProcessedRow, ErrorRow, Template, OutputColumn } from '../types';

interface AppState {
  // CSV入力
  csvData: Row[];
  csvHeaders: string[];
  
  // プロンプト
  promptTemplate: string;
  savedTemplates: Template[];
  
  // 出力カラム設定
  outputColumns: OutputColumn[];
  
  // 実行状態
  isProcessing: boolean;
  progress: { current: number; total: number };
  activeRequests: number; // 進行中のリクエスト数
  results: ProcessedRow[];
  errors: ErrorRow[];
  
  // アクション
  setCsvData: (data: Row[], headers: string[]) => void;
  setPromptTemplate: (template: string) => void;
  setOutputColumns: (columns: OutputColumn[]) => void;
  addOutputColumn: (column: OutputColumn) => void;
  updateOutputColumn: (index: number, column: Partial<OutputColumn>) => void;
  deleteOutputColumn: (index: number) => void;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  loadTemplate: (id: string) => void;
  
  // 処理制御
  startProcessing: (total: number) => void;
  updateProgress: (current: number) => void;
  updateActiveRequests: (count: number) => void;
  addResult: (result: ProcessedRow) => void;
  addError: (error: ErrorRow) => void;
  finishProcessing: () => void;
  resetResults: () => void;
  
  // ユーティリティ
  clearAll: () => void;
}

// Template型のシリアライズ用（Dateを文字列に変換）
interface SerializedTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// シリアライズ用のヘルパー関数
const serializeTemplate = (template: Template): SerializedTemplate => ({
  ...template,
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

// デシリアライズ用のヘルパー関数
const deserializeTemplate = (template: SerializedTemplate): Template => ({
  ...template,
  createdAt: new Date(template.createdAt),
  updatedAt: new Date(template.updatedAt),
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初期状態
      csvData: [],
      csvHeaders: [],
      promptTemplate: '',
      savedTemplates: [],
      outputColumns: [],
      isProcessing: false,
      progress: { current: 0, total: 0 },
      activeRequests: 0,
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
  
  // 出力カラム関連
  setOutputColumns: (columns) => {
    set({ outputColumns: columns });
  },
  
  addOutputColumn: (column) => {
    set((state) => ({
      outputColumns: [...state.outputColumns, column],
    }));
  },
  
  updateOutputColumn: (index, updates) => {
    set((state) => ({
      outputColumns: state.outputColumns.map((col, i) =>
        i === index ? { ...col, ...updates } : col
      ),
    }));
  },
  
  deleteOutputColumn: (index) => {
    set((state) => ({
      outputColumns: state.outputColumns.filter((_, i) => i !== index),
    }));
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
      activeRequests: 0,
      results: [],
      errors: [],
    });
  },
  
  updateProgress: (current) => {
    set((state) => ({
      progress: { ...state.progress, current },
    }));
  },
  
  updateActiveRequests: (count) => {
    set({ activeRequests: count });
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
      activeRequests: 0,
    });
  },
  
  // ユーティリティ
  clearAll: () => {
    set({
      csvData: [],
      csvHeaders: [],
      promptTemplate: '',
      outputColumns: [],
      results: [],
      errors: [],
      progress: { current: 0, total: 0 },
      activeRequests: 0,
      isProcessing: false,
    });
  },
    }),
    {
      name: 'staf-templates',
      version: 1,
      // テンプレートのみを永続化（プロンプトや出力カラムは初期状態から開始）
      partialize: (state) => ({
        savedTemplates: state.savedTemplates.map(serializeTemplate),
      }),
      // 復元時にDateオブジェクトに変換し、不要なフィールドを初期化
      onRehydrateStorage: () => (state) => {
        if (state) {
          // テンプレートのDateオブジェクトを変換
          if (state.savedTemplates) {
            state.savedTemplates = state.savedTemplates.map((t: any) => {
              // 既にDateオブジェクトの場合はそのまま返す
              if (t.createdAt instanceof Date) {
                return t;
              }
              // 文字列の場合はDateオブジェクトに変換
              return deserializeTemplate(t as SerializedTemplate);
            });
          }
          // プロンプトと出力カラムは常に初期状態にリセット
          state.promptTemplate = '';
          state.outputColumns = [];
        }
      },
      // マージ戦略：partializeで指定したフィールドのみを復元
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          savedTemplates: (persistedState as any)?.savedTemplates || [],
        };
      },
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
