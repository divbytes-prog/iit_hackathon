import { Component } from 'react';
import Icon from './Icon.jsx';

/**
 * The last line of defence.
 *
 * A render-time exception anywhere below this point would otherwise unmount
 * the tree and leave a white page — which is both the worst possible user
 * experience and an explicit disqualifier in the brief. Here it becomes a
 * readable apology with a way out.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In a real deployment this is where Sentry et al. would be called.
    console.error('Hearthlog crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash" role="alert">
        <div className="crash__card">
          <span className="crash__icon" aria-hidden="true">
            <Icon name="alert" size={26} />
          </span>

          <h1 className="crash__title">Something fell off the shelf</h1>

          <p className="crash__body">
            The page hit an error it could not recover from. Your intentions and
            progress are safe on the server — nothing has been lost.
          </p>

          <div className="crash__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            <a className="btn" href="/app">
              Back to the desk
            </a>
          </div>

          {import.meta.env.DEV ? (
            <pre className="crash__detail">{String(error?.stack ?? error)}</pre>
          ) : null}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
