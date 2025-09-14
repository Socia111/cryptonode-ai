import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/commandProcessor'

// Trigger rebuild if requested
if (window.location.search.includes('rebuild=true') || localStorage.getItem('rebuildCommand') === 'true') {
  localStorage.setItem('rebuildCommand', 'true');
  window.location.href = '/rebuild?rebuild=true';
}

createRoot(document.getElementById("root")!).render(<App />);
