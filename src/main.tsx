import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isNativeApp } from './services/platform';
import './styles.css';
import './workflow.css';
import './pages.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

// Versione web (iPhone, browser): funzionamento offline e dati meno esposti alla pulizia automatica.
if (!isNativeApp() && import.meta.env.PROD) {
  if ('serviceWorker' in navigator)
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    });
  void navigator.storage?.persist?.().catch(() => undefined);
}
