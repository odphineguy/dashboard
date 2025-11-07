import { useState, useEffect } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useAuth } from '../contexts/AuthContext'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { CheckCircle, XCircle, Loader2, Database } from 'lucide-react'

export default function DatabaseTest() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const testConnection = async () => {
    setTesting(true)
    setError(null)
    setResult(null)

    try {
      // Test 1: Check connection
      const { data: tables, error: tablesError } = await supabase
        .from('pantry_items')
        .select('*')
        .limit(1)

      if (tablesError) throw tablesError

      setResult({
        connected: true,
        user: user ? `Logged in as ${user.email}` : 'Not logged in (using anon key)',
        tables: 'pantry_items table accessible',
        message: 'Database connection successful! ✅'
      })
    } catch (err) {
      console.error('Database test error:', err)
      setError(err.message || 'Failed to connect to database')
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    // Auto-test on mount
    testConnection()
  }, [])

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Database Connection Test</h3>
        </div>

        <Button 
          onClick={testConnection}
          disabled={testing}
          variant="outline"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                  {result.message}
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-medium">Status:</dt>
                    <dd>Connected</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">User:</dt>
                    <dd>{result.user}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">Tables:</dt>
                    <dd>{result.tables}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                  Connection Failed
                </h4>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

