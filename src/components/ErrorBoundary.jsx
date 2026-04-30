import { Component } from 'react';

/**
 * Detects if an error was likely caused by browser translation extensions
 * (Google Translate, etc.) modifying the DOM that React manages.
 */
function isTranslationError(error) {
  if (!error) return false;
  const msg = error.message || '';
  // "removeChild" / "insertBefore" on nodes React doesn't expect
  if (
    msg.includes('removeChild') ||
    msg.includes('insertBefore') ||
    msg.includes('The node to be removed is not a child of this node') ||
    msg.includes('Failed to execute') && msg.includes('on \'Node\'')
  ) {
    return true;
  }
  return false;
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    // If the error is caused by browser translation, silently recover
    if (isTranslationError(error)) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // If it's a translation error, attempt auto-recovery
    if (isTranslationError(error)) {
      console.warn(
        '[ErrorBoundary] Suppressed DOM error likely caused by browser translation.',
        error.message
      );
      // Force re-render to recover
      this.setState({ hasError: false, error: null });
      return;
    }
    // Log real application errors
    console.error('[ErrorBoundary]', error, errorInfo);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'Error inesperado';
      return (
        <div className="max-w-6xl mx-auto p-6">
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
            <div className="text-rose-700 font-semibold mb-2">Se produjo un error</div>
            <div className="text-sm text-rose-600 mb-3">{message}</div>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 text-sm font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors" onClick={() => window.location.reload()}>Recargar página</button>
              <button className="px-3 py-2 text-sm font-medium rounded-md border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors" onClick={this.handleReset}>Intentar de nuevo</button>
              
              <a 
                href={`https://github.com/fernandofedora/goals-client/issues/new?labels=bug,crash,user-reported&title=[CRASH] ${encodeURIComponent((this.state.error?.message || '').slice(0, 80))}&body=${encodeURIComponent(`## Problem Description\n\nThe application stopped unexpectedly.\n\n## Error Message\n\`\`\`\n${this.state.error?.message}\n\`\`\`\n\n## Stack Trace\n<details><summary>Click to view</summary>\n\n\`\`\`\n${this.state.error?.stack || 'No stack trace available'}\n\`\`\`\n</details>\n\n## Steps to Reproduce\n\n1. \n2. \n`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 ml-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                Reportar en GitHub
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
