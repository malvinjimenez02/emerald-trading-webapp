import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element with id "root" was not found.');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  const rootElement = document.getElementById('root');
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown initialization error.';

  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif; color: #b91c1c;">
        <h1 style="margin: 0 0 8px;">Application failed to start</h1>
        <p style="margin: 0;">${message}</p>
      </div>
    `;
  }

  console.error('Fatal application initialization error:', error);
}
