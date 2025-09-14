// Command processor for special commands like /rebuild
export class CommandProcessor {
  private static instance: CommandProcessor;
  private commands: Map<string, () => void> = new Map();

  private constructor() {
    this.setupCommands();
    this.setupGlobalListener();
  }

  public static getInstance(): CommandProcessor {
    if (!CommandProcessor.instance) {
      CommandProcessor.instance = new CommandProcessor();
    }
    return CommandProcessor.instance;
  }

  private setupCommands() {
    // Register the /rebuild command
    this.commands.set('/rebuild', () => {
      console.log('🚀 Executing /rebuild command');
      // Set rebuild flag and redirect
      localStorage.setItem('rebuildCommand', 'true');
      // Immediately trigger rebuild
      window.location.href = '/rebuild?rebuild=true';
    });

    // Register other potential commands
    this.commands.set('/help', () => {
      console.log('📖 Available commands:');
      console.log('- /rebuild: Rebuild entire system from GitHub documentation');
      console.log('- /status: Show system status');
      console.log('- /validate: Validate system integrity');
    });

    this.commands.set('/status', () => {
      console.log('📊 System Status:');
      console.log('- Frontend: React 18.3.1 + TypeScript');
      console.log('- Backend: Supabase with 144 Edge Functions');
      console.log('- Database: PostgreSQL with RLS');
      console.log('- Trading: Bybit integration active');
    });

    this.commands.set('/validate', () => {
      console.log('🔍 Validating system...');
      window.location.href = '/rebuild#validation';
    });
  }

  private setupGlobalListener() {
    // Listen for commands in console
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (typeof message === 'string' && message.startsWith('/')) {
        this.processCommand(message);
      }
      originalLog.apply(console, args);
    };

    // Listen for URL-based commands
    window.addEventListener('popstate', () => {
      this.checkURLCommands();
    });

    // Check on initial load
    this.checkURLCommands();
  }

  private checkURLCommands() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    if (path === '/rebuild' || search.includes('rebuild=true')) {
      console.log('🚀 Rebuild command detected from URL');
    }
  }

  public processCommand(command: string): boolean {
    const cmd = command.trim().toLowerCase();
    const handler = this.commands.get(cmd);
    
    if (handler) {
      handler();
      return true;
    }
    
    console.log(`❌ Unknown command: ${command}`);
    console.log('💡 Type /help for available commands');
    return false;
  }

  public registerCommand(command: string, handler: () => void) {
    this.commands.set(command, handler);
  }
}

// Initialize command processor
export const commandProcessor = CommandProcessor.getInstance();

// Export convenience function for manual command execution
export function executeCommand(command: string): boolean {
  return commandProcessor.processCommand(command);
}

// Make commands available globally for console access
if (typeof window !== 'undefined') {
  (window as any).executeCommand = executeCommand;
  (window as any).rebuild = () => executeCommand('/rebuild');
  (window as any).help = () => executeCommand('/help');
  (window as any).status = () => executeCommand('/status');
  (window as any).validate = () => executeCommand('/validate');
}