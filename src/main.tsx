import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary.tsx'

createRoot(document.getElementById("root")!).render(
  <SimpleErrorBoundary>
    <App />
  </SimpleErrorBoundary>
);
