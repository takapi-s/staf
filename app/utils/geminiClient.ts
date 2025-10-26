import { GoogleGenAI } from '@google/genai';
import { GeminiResponse } from '../types';

export class GeminiClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async searchGrounded(prompt: string, timeout: number = 30000): Promise<GeminiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const result = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        tools: [{ googleSearch: {} }], // Google Search Grounding有効化
        config: {
          responseMimeType: 'application/json', // JSON強制
          temperature: 0.1, // 安定性重視
        },
      });

      clearTimeout(timeoutId);

      if (!result.text) {
        throw new Error('Gemini APIからレスポンスが返されませんでした');
      }

      return {
        text: result.text,
        groundingMetadata: result.groundingMetadata,
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
