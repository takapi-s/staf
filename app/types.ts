// 共通型定義

export interface Row {
  [key: string]: string | number | undefined;
}

export interface ProcessedRow extends Row {
  _status: 'success' | 'error';
  _error?: string;
  _rawResponse?: string;
}

export interface ErrorRow extends Row {
  _error: string;
  _rowIndex: number;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  apiKey: string;
  concurrency: number;
  rateLimit: number;
  timeout: number;
  outputFolder: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableWebSearch: boolean;
}

// 出力カラム設定
export interface OutputColumn {
  name: string;
  description?: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  nestedColumns?: OutputColumn[]; // ネストされたカラム（object/array用）
}

export interface ProcessResult {
  success: ProcessedRow[];
  errors: ErrorRow[];
  totalProcessed: number;
  totalErrors: number;
}

export interface AppState {
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
  results: ProcessedRow[];
  errors: ErrorRow[];
  
  // 設定
  config: AppConfig;
}

export interface GeminiResponse {
  text: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web: {
        uri: string;
        title: string;
      };
    }>;
  };
}
