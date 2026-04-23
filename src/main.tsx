import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Online/Offline Detection
window.addEventListener("offline", () => {
  console.log("You are offline");
});

window.addEventListener("online", () => {
  console.log("Back online — syncing data");
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        console.log("Service Worker registered");
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error);
      });
  });
}
