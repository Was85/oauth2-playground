import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-muted mb-4">404</div>
        <h1 className="text-lg font-bold mb-2">Page Not Found</h1>
        <p className="text-xs text-muted leading-relaxed mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="px-4 py-2 text-xs font-semibold text-accent bg-accent/10
            border border-accent/30 rounded-md hover:bg-accent/20
            transition-colors inline-block"
        >
          Back to Flows
        </Link>
      </div>
    </div>
  )
}
