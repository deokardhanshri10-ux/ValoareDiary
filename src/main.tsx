import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppWrapper } from './AppWrapper.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppWrapper />
    </ErrorBoundary>
  </StrictMode>
);
