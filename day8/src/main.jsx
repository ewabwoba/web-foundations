import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './presentation/App.jsx';
import { AppProvider } from './presentation/AppContext.jsx';
import { createContainer } from './infrastructure/container.js';
import './presentation/styles.css';

// The only place in the UI that touches the composition root.
const container = createContainer();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider container={container}>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
