import { GoogleGenAI } from '@google/genai';
import type { GeminiResponse } from '../types';

export class GeminiClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // プロンプト生成用（grounded searchなし、JSON以外）
  async generateContent(prompt: string, timeout: number = 60000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const result = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      clearTimeout(timeoutId);

      if (!result.text) {
        throw new Error('Gemini APIからレスポンスが返されませんでした');
      }

      return result.text;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`リクエストがタイムアウトしました（${timeout}ms）`);
        }
        throw new Error(`Gemini API エラー: ${error.message}`);
      }
      
      throw new Error('不明なエラーが発生しました');
    }
  }

  async searchGrounded(prompt: string, timeout: number = 30000): Promise<GeminiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Google Search Groundingは必須機能として常に有効
      // 注意: grounding機能とJSON強制は互換性がないため、JSON強制は使用しない
      const result = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }], // Google Search Grounding有効化
          temperature: 0.1, // 安定性重視
        },
      });

      clearTimeout(timeoutId);

      if (!result.text) {
        throw new Error('Gemini APIからレスポンスが返されませんでした');
      }

      return {
        text: result.text,
        groundingMetadata: (result as any).groundingMetadata,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`リクエストがタイムアウトしました（${timeout}ms）`);
        }
        throw new Error(`Gemini API エラー: ${error.message}`);
      }
      
      throw new Error('不明なエラーが発生しました');
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.searchGrounded('test', 5000);
      return true;
    } catch (error) {
      return false;
    }
  }
}
