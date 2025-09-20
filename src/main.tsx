import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { testComprehensiveSignalSystem } from './lib/testComprehensiveSystem'

// Auto-run comprehensive system test after app loads
setTimeout(() => {
  if (typeof window !== 'undefined') {
    testComprehensiveSignalSystem();
  }
}, 2000);

createRoot(document.getElementById("root")!).render(<App />);
