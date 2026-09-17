import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Intercept and silence native console.error/warn/log calls originating from Vite HMR/WebSocket
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

const isViteOrWSMessage = (...args: any[]) => {
  const messageStr = args.map(arg => {
    try {
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');

  return (
    messageStr.includes('[vite]') ||
    messageStr.includes('WebSocket connection') ||
    messageStr.includes('HMR') ||
    messageStr.includes('hmr') ||
    messageStr.includes('ws://') ||
    messageStr.includes('wss://')
  );
};

console.error = function (...args: any[]) {
  if (isViteOrWSMessage(...args)) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = function (...args: any[]) {
  if (isViteOrWSMessage(...args)) {
    return;
  }
  originalWarn.apply(console, args);
};

console.log = function (...args: any[]) {
  if (isViteOrWSMessage(...args)) {
    return;
  }
  originalLog.apply(console, args);
};

// Suppress benign development HMR WebSocket connection warnings from triggering error overlays
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason);
  if (
    message.includes('WebSocket') || 
    message.includes('vite') || 
    message.includes('HMR') ||
    message.includes('ws://')
  ) {
    event.preventDefault();
    console.debug('[Vite HMR] Ignored expected connection warning:', message);
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (
    message.includes('WebSocket') || 
    message.includes('vite') ||
    message.includes('HMR')
  ) {
    event.preventDefault();
    console.debug('[Vite HMR] Ignored expected connection error:', message);
  }
});

// Register PWA service worker for offline caching and synchronization
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[N-LINK 360 PWA] New version available.');
  },
  onOfflineReady() {
    console.log('[N-LINK 360 PWA] Offline capabilities enabled.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

