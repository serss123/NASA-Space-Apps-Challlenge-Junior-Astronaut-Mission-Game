// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// If drawing the interface fails, show a friendly paper card instead of a blank screen.
// The saved game is untouched: back at the menu the player can press "Continue".
// (A class component: React has no hook for error boundaries. It reads the language from <html lang>.)
import { Component } from 'react';
import Icon from './Icon.jsx';
import './errorboundary.css';

const TEXT = {
  es: {
    title: '¡Uy! Algo se ha roto',
    body: 'Tu partida está guardada en este dispositivo. Vuelve al menú y pulsa «Continuar».',
    button: 'Volver al menú'
  },
  en: {
    title: 'Oops! Something broke',
    body: 'Your game is saved on this device. Go back to the menu and press “Continue”.',
    button: 'Back to the menu'
  }
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Only in this browser's console (nothing is sent anywhere).
    console.error('Sol a Sol · UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
    const t = TEXT[lang];
    return (
      <main className="error-screen" role="alert">
        <section className="error-card paper anim-pop-in">
          <span className="error-art" aria-hidden="true">
            <Icon name="satellite" size={72} />
            <Icon name="warning" size={34} className="error-art-badge" />
          </span>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            <Icon name="home" />
            {t.button}
          </button>
        </section>
      </main>
    );
  }
}
