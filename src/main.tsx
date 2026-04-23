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
