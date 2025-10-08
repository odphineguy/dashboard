import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '../../components/ui/card'

export default function GmailConnectCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Connecting to Gmail...')
  const [error, setError] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const errorParam = params.get('error')

        if (errorParam) {
          setError(true)
          setStatus(`Authorization error: ${errorParam}`)
          return
        }

        if (!code) {
          setError(true)
          setStatus('Missing authorization code')
          return
        }

        setStatus('Exchanging authorization code...')

        // Call the Supabase edge function to exchange code for tokens
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const resp = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        })

        const json = await resp.json().catch(() => ({}))

        if (!resp.ok) {
          throw new Error(json?.error || `OAuth exchange failed with status ${resp.status}`)
        }

        setStatus('Gmail connected successfully! Redirecting...')

        // Redirect back to scanner page after 2 seconds
        setTimeout(() => {
          navigate('/scanner')
        }, 2000)
      } catch (error) {
        console.error('Gmail callback error:', error)
        setError(true)
        setStatus(`Failed: ${error.message}`)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-4 flex justify-center">
          {error ? (
            <XCircle className="h-12 w-12 text-red-500" />
          ) : status.includes('successfully') ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          )}
        </div>
        <p className={`text-lg ${error ? 'text-red-600' : 'text-foreground'}`}>
          {status}
        </p>
        {error && (
          <button
            onClick={() => navigate('/scanner')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Return to Scanner
          </button>
        )}
      </Card>
    </div>
  )
}
