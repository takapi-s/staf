import pLimit, { type LimitFunction } from 'p-limit';
import { GeminiClient } from './geminiClient';
import { RateLimiter } from './rateLimiter';
import type { Row, ProcessedRow, ErrorRow, OutputColumn } from '../types';

export class ParallelProcessor {
  private limit: LimitFunction;
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
    outputColumns: OutputColumn[],
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
        const prompt = this.generatePrompt(promptTemplate, row, outputColumns);

        // Gemini API呼び出し（Google Search Grounding有効）
        console.log(`[Row ${index}] Step 1: Gemini API呼び出し開始`);
        const response = await this.geminiClient.searchGrounded(prompt, this.timeout);
        console.log(`[Row ${index}] Step 1: Gemini API レスポンス取得成功`);
        console.log(`[Row ${index}] Response text:`, response.text.substring(0, 200) + '...');

        // レスポンス解析
        console.log(`[Row ${index}] Step 2: JSON解析開始`);
        const parsedData = this.parseResponse(response.text);
        console.log(`[Row ${index}] Step 2: JSON解析完了`);
        console.log(`[Row ${index}] Parsed data:`, JSON.stringify(parsedData, null, 2));

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

  private generatePrompt(template: string, row: Row, outputColumns: OutputColumn[]): string {
    let prompt = template;

    // 変数を置換
    Object.keys(row).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, String(row[key]));
    });

    // 再帰的にスキーマを生成
    const generateSchema = (columns: OutputColumn[], indent = 2): string => {
      return columns.map(col => {
        const indentStr = ' '.repeat(indent);
        const desc = col.description ? ` // ${col.description}` : '';
        const type = col.type || 'string';
        const typeStr = type === 'string' ? 'string' : type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : type;
        
        if (type === 'object' && col.nestedColumns && col.nestedColumns.length > 0) {
          // ネストされたobjectの場合
          const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
          return `${indentStr}"${col.name}": {\n${nestedSchema}\n${indentStr}}${desc}`;
        } else if (type === 'array' && col.nestedColumns && col.nestedColumns.length > 0) {
          // 配列内にobjectがある場合
          const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
          return `${indentStr}"${col.name}": [\n${indentStr}  {\n${nestedSchema}\n${indentStr}  }\n${indentStr}]${desc}`;
        } else {
          return `${indentStr}"${col.name}": ${typeStr}${desc}`;
        }
      }).join(',\n');
    };

    // 出力カラムが定義されている場合、出力形式の指示を追加
    if (outputColumns.length > 0) {
      const outputSchema = generateSchema(outputColumns);
      const outputFormat = `\n\n【出力形式】\n以下のJSON形式で出力してください：\n{\n${outputSchema}\n}`;
      prompt += outputFormat;
    }

    return prompt;
  }

  private parseResponse(responseText: string): Record<string, any> {
    try {
      // まず、応答全体がJSONかチェック
      const trimmedText = responseText.trim();
      let parsed: any;
      
      // マークダウンコードブロック内のJSONを検出
      const jsonBlockMatch = trimmedText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonBlockMatch) {
        parsed = JSON.parse(jsonBlockMatch[1]);
      } else {
        // JSONブロックがない場合、全体を直接パース試行
        parsed = JSON.parse(trimmedText);
      }
      
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
