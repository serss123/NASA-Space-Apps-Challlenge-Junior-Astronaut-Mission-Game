// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Entry point: fonts (bundled, no network), the design system and the app with its two providers
// (language and glossary).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/buttons.css';
import './styles/motion.css';
import App from './App.jsx';
import { LangProvider } from './i18n.jsx';
import { GlossaryProvider } from './ui/components/Glossary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <GlossaryProvider>
        <App />
      </GlossaryProvider>
    </LangProvider>
  </StrictMode>
);
