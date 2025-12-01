
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Failed to render the app:", e);
    container.innerHTML = '<div style="color:red; padding: 20px;">Failed to initialize application. Check console for details.</div>';
  }
} else {
  console.error("Root element not found");
}
