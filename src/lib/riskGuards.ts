export type RiskGuardConfig = {
  maxDailyLossPct: number;
  maxOpenPositions: number;
  blockIf1m: boolean;
};

export type RiskCheckResult = {
  ok: boolean;
  reason?: string;
  details?: any;
};

class RiskPanel {
  private static dailyPnL = 0; // Would need to fetch from API
  private static openPositions = 0; // Would need to fetch from API

  static async check(config: RiskGuardConfig): Promise<RiskCheckResult> {
    try {
      // Daily loss check
      if (this.dailyPnL <= -config.maxDailyLossPct) {
        return {
          ok: false,
          reason: `Daily loss limit reached: ${this.dailyPnL.toFixed(2)}%`,
          details: { dailyPnL: this.dailyPnL, limit: config.maxDailyLossPct }
        };
      }

      // Max positions check
      if (this.openPositions >= config.maxOpenPositions) {
        return {
          ok: false,
          reason: `Max positions limit reached: ${this.openPositions}/${config.maxOpenPositions}`,
          details: { current: this.openPositions, limit: config.maxOpenPositions }
        };
      }

      return { ok: true };
    } catch (error: any) {
      return {
        ok: false,
        reason: `Risk check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  static updateDailyPnL(pnl: number) {
    this.dailyPnL = pnl;
  }

  static updateOpenPositions(count: number) {
    this.openPositions = count;
  }

  static reset() {
    this.dailyPnL = 0;
    this.openPositions = 0;
  }
}

export { RiskPanel };