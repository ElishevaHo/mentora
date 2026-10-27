import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/500.css';
import '@fontsource/heebo/700.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/800.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { LiveProvider } from './context/LiveContext.jsx';
import { NoticeProvider } from './context/NoticeContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LiveProvider>
          <NoticeProvider>
            <App />
          </NoticeProvider>
        </LiveProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
