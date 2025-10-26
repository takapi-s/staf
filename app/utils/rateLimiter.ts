export class RateLimiter {
  private requestCount = 0;
  private lastReset = Date.now();
  private rateLimit: number;

  constructor(rateLimit: number) {
    this.rateLimit = rateLimit;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // 1分経過したらリセット
    if (now - this.lastReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    // レート制限に達している場合は待機
    if (this.requestCount >= this.rateLimit) {
      const waitTime = 60000 - (now - this.lastReset);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastReset = Date.now();
      }
    }

    this.requestCount++;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      return this.rateLimit;
    }
    return Math.max(0, this.rateLimit - this.requestCount);
  }

  getResetTime(): number {
    return this.lastReset + 60000;
  }
}
