export {};

declare global {
  interface Window {
    __smokeTests?: {
      runAll: () => Promise<any>;
      configPing: () => Promise<any>;
      realtimeTest: () => Promise<any>;
      functionTest: (fn: string, body?: any) => Promise<any>;
      authProbe: () => Promise<any>;
    };
    __supabase?: any;
  }
}