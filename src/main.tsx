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

// Unregister all Service Workers to fix white screen/cache issues
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
