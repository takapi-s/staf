import type { GeminiResponse } from '../types';
import { invoke } from '@tauri-apps/api/core';

export class GeminiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // プロンプト生成用（grounded searchなし、JSON以外）
  async generateContent(prompt: string, timeout: number = 60000): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`リクエストがタイムアウトしました（${timeout}ms）`));
      }, timeout);
    });

    const call = invoke<{ text: string }>('gemini_generate_with_search', {
      apiKey: this.apiKey,
      prompt,
    });

    const result = await Promise.race([call, timeoutPromise]) as { text: string };
    if (!result?.text) throw new Error('Gemini APIからレスポンスが返されませんでした');
    return result.text;
  }

  async searchGrounded(prompt: string, timeout: number = 30000): Promise<GeminiResponse> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`リクエストがタイムアウトしました（${timeout}ms）`));
      }, timeout);
    });

    const call = invoke<GeminiResponse>('gemini_generate_with_search', {
      apiKey: this.apiKey,
      prompt,
    });

    const result = await Promise.race([call, timeoutPromise]) as GeminiResponse;
    if (!result?.text) throw new Error('Gemini APIからレスポンスが返されませんでした');
    return result;
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
