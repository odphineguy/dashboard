import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card border border-border rounded-lg p-8">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
            <div className="bg-muted p-4 rounded mb-4">
              <p className="font-semibold mb-2">Error:</p>
              <pre className="text-sm overflow-auto text-red-600">
                {this.state.error?.toString()}
              </pre>
            </div>
            {this.state.errorInfo && (
              <div className="bg-muted p-4 rounded mb-4">
                <p className="font-semibold mb-2">Stack Trace:</p>
                <pre className="text-xs overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

