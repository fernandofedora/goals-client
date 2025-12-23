import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
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

