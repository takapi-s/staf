import pLimit, { PLimitFunction } from 'p-limit';
import { GeminiClient } from './geminiClient';
import { RateLimiter } from './rateLimiter';
import { Row, ProcessedRow, ErrorRow } from '../types';

export class ParallelProcessor {
  private limit: PLimitFunction;
  private rateLimiter: RateLimiter;
  private geminiClient: GeminiClient;
  private timeout: number;
  private abortController: AbortController | null = null;

  constructor(
    geminiClient: GeminiClient,
    concurrency: number,
    rateLimit: number,
    timeout: number
  ) {
    this.limit = pLimit(concurrency);
    this.rateLimiter = new RateLimiter(rateLimit);
    this.geminiClient = geminiClient;
    this.timeout = timeout;
  }

  async processRows(
    rows: Row[],
    promptTemplate: string,
    onProgress: (current: number, total: number) => void,
    onAbort?: () => void
  ): Promise<{ success: ProcessedRow[]; errors: ErrorRow[] }> {
    this.abortController = new AbortController();
    const success: ProcessedRow[] = [];
    const errors: ErrorRow[] = [];

    const processRow = async (row: Row, index: number): Promise<void> => {
      if (this.abortController?.signal.aborted) {
        throw new Error('処理が中断されました');
      }

      try {
        // レート制限チェック
        await this.rateLimiter.waitIfNeeded();

        // プロンプト生成
        const prompt = this.generatePrompt(promptTemplate, row);

        // Gemini API呼び出し
        const response = await this.geminiClient.searchGrounded(prompt, this.timeout);

        // レスポンス解析
        const parsedData = this.parseResponse(response.text);

        // 成功結果を追加
        const processedRow: ProcessedRow = {
          ...row,
          ...parsedData,
          _status: 'success',
          _rawResponse: response.text,
        };
        success.push(processedRow);

      } catch (error) {
        // エラー結果を追加
        const errorRow: ErrorRow = {
          ...row,
          _error: error instanceof Error ? error.message : '不明なエラー',
          _rowIndex: index,
        };
        errors.push(errorRow);
      }
    };

    try {
      // 並列処理実行
      const tasks = rows.map((row, index) =>
        this.limit(() => processRow(row, index))
      );

      let completed = 0;
      const total = rows.length;

      // 進捗監視
      const progressInterval = setInterval(() => {
        onProgress(completed, total);
      }, 100);

      // 全タスク完了を待機
      await Promise.allSettled(tasks);
      completed = total;

      clearInterval(progressInterval);
      onProgress(completed, total);

    } catch (error) {
      if (this.abortController?.signal.aborted) {
        onAbort?.();
      }
      throw error;
    } finally {
      this.abortController = null;
    }

    return { success, errors };
  }

  private generatePrompt(template: string, row: Row): string {
    let prompt = template;

    // 変数を置換
    Object.keys(row).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, String(row[key]));
    });

    return prompt;
  }

  private parseResponse(responseText: string): Record<string, any> {
    try {
      // JSON解析を試行
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch (error) {
      // JSON解析に失敗した場合はテキストをそのまま返す
      return { result: responseText };
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }
}
