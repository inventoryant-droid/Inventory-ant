import './utils/fetchInterceptor';
import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#e11d48', background: '#fff1f2', border: '1px solid #fecdd3', margin: '40px auto', borderRadius: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 600, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px 0' }}>Something went wrong</h2>
          <p style={{ fontSize: '0.875rem', color: '#9f1239', margin: '0 0 20px 0', lineHeight: 1.5 }}>An unexpected application error occurred. Please try reloading the page.</p>
          <pre style={{ padding: 20, background: '#fff', border: '1px solid #ffe4e6', borderRadius: 12, overflowX: 'auto', fontSize: '0.75rem', color: '#be123c', margin: 0 }}>{this.state.error?.stack || this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <HashRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HashRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
