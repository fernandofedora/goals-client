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
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-md bg-rose-600 text-white" onClick={() => window.location.reload()}>Recargar</button>
              <button className="px-3 py-2 rounded-md border" onClick={this.handleReset}>Intentar de nuevo</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
