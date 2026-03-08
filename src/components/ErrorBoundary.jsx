import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text font-mono flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">&#x26A0;</div>
            <h1 className="text-lg font-bold text-danger mb-2">Something went wrong</h1>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-4 py-2 text-xs font-semibold text-accent bg-accent/10
                border border-accent/30 rounded-md hover:bg-accent/20
                transition-colors cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
