export type LogLevel = 'info' | 'debug' | 'error';

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      info: 1,
      debug: 2,
    };
    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  // ユーザー向けメッセージ変換
  getUserMessage(error: Error | any): string {
    if (error instanceof Error) {
      // 既知のエラーメッセージをユーザーフレンドリーに変換
      if (error.message.includes('API key')) {
        return 'APIキーが正しく設定されていません。設定画面でAPIキーを確認してください。';
      }
      if (error.message.includes('timeout')) {
        return 'リクエストがタイムアウトしました。ネットワーク接続を確認してください。';
      }
      if (error.message.includes('rate limit')) {
        return 'レート制限に達しました。しばらく待ってから再試行してください。';
      }
      if (error.message.includes('CSV')) {
        return 'CSVファイルの形式が正しくありません。ファイルを確認してください。';
      }
      if (error.message.includes('JSON')) {
        return 'APIからの応答を解析できませんでした。プロンプトを調整してください。';
      }
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return '不明なエラーが発生しました。';
  }
}

export const logger = Logger.getInstance();
