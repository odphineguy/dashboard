import { useState, useEffect } from 'react'
import { Camera, Receipt, Upload, Loader2, CheckCircle, XCircle, Save, Mail, RefreshCw, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useBadgeAwarder } from '../hooks/useBadgeAwarder'
import BadgeCelebration from './BadgeCelebration'
import { toast } from 'sonner'

export default function ScannerTest() {
  const { user } = useAuth()
  const { checkBadges, celebrationBadge, closeCelebration } = useBadgeAwarder(user?.id)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [receiptResult, setReceiptResult] = useState(null)
  const [barcodeError, setBarcodeError] = useState(null)
  const [receiptError, setReceiptError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Gmail integration state
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailSyncing, setGmailSyncing] = useState(false)
  const [gmailOrders, setGmailOrders] = useState([])
  const [lastSynced, setLastSynced] = useState(null)

  // Check Gmail connection status on mount
  useEffect(() => {
    const checkGmailConnection = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('user_integrations')
          .select('id, provider, expires_at, created_at')
          .eq('user_id', user.id)
          .eq('provider', 'gmail')
          .maybeSingle()

        if (error) throw error
        setGmailConnected(Boolean(data?.id))
      } catch (error) {
        console.error('Error checking Gmail connection:', error)
      }
    }

    checkGmailConnection()
  }, [user?.id])

  // Initialize Google AI
  const getAI = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      throw new Error('API key not found. Please add VITE_GOOGLE_GENAI_API_KEY to your .env file')
    }
    return new GoogleGenerativeAI(apiKey)
  }

  // Convert file to base64 for Gemini API
  const fileToGenerativePart = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve({
          inlineData: {
            data: base64,
            mimeType: file.type,
          },
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Save scanned item to database
  const saveItemToInventory = async (item) => {
    setSaving(true)
    setSaveSuccess(false)
    setBarcodeError(null)
    
    try {
      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        throw new Error('You must be logged in to save items')
      }

      // Calculate expiration date
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + (item.suggestedExpirationDays || 7))

      // Match Smart_Pantry's exact schema
      const insertData = {
        user_id: currentUser.id, // Explicitly set user_id
        name: item.name || 'Unknown Item',
        category: item.category || null,
        brand: item.brand || null,
        quantity: 1,
        unit: item.defaultUnit || 'units',
        expiry_date: expirationDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      }

      const { data, error } = await supabase
        .from('pantry_items')
        .insert([insertData])
        .select()

      if (error) {
        console.error('Save error:', error)
        const errorMsg = error.message || error.code || 'Unknown error'
        setBarcodeError(`Failed to save: ${errorMsg}`)
        throw error
      }

      console.log('Saved successfully:', data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      // Show success toast
      toast.success('Item saved to inventory!', {
        description: `${item.name} has been added to your pantry`,
        duration: 4000,
      })

      // Check for inventory badges after successful save
      await checkBadges('inventory_updated')

      return data
    } catch (error) {
      console.error('Save error details:', error)
      const errorMsg = `Save failed: ${error.message || 'Unknown error'}`
      setBarcodeError(errorMsg)

      // Show error toast
      toast.error('Failed to save item', {
        description: error.message || 'Please try again',
        duration: 4000,
      })
    } finally {
      setSaving(false)
    }
  }

  // Look up product info from OpenFoodFacts by barcode
  const lookupProductByBarcode = async (barcode) => {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
      const data = await response.json()
      
      if (data.status === 1 && data.product) {
        const product = data.product
        return {
          name: product.product_name || product.product_name_en || 'Unknown Product',
          category: product.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || 'Food',
          defaultUnit: 'units',
          barcode: barcode,
          brand: product.brands || null,
          quantity: product.quantity || null,
          imageUrl: product.image_url || null,
          source: 'OpenFoodFacts'
        }
      }
      return null
    } catch (error) {
      console.error('OpenFoodFacts lookup failed:', error)
      return null
    }
  }

  const handleBarcodeUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBarcodeLoading(true)
    setBarcodeError(null)
    setBarcodeResult(null)

    try {
      const genAI = getAI()
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const imagePart = await fileToGenerativePart(file)
      
      // Step 1: Use AI to read the barcode number
      const barcodePrompt = `You are a barcode reader and food safety expert. Look at this image and extract the barcode number (UPC or EAN).

Identify the food item and suggest an expiration date based on standard food safety guidelines.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "barcode": "123456789012",
  "productName": "Product Name from Label (if visible)",
  "category": "Category guess",
  "suggestedExpirationDays": 7
}

suggestedExpirationDays should be the number of days from today until the item typically expires (e.g., 7 for fresh produce, 30 for canned goods, 365 for dry goods).

If you cannot read a barcode, return {"barcode": "unknown", "productName": "visible product name", "category": "guess", "suggestedExpirationDays": 7}`

      const result = await model.generateContent([barcodePrompt, imagePart])
      const response = await result.response
      const text = response.text()
      
      // Parse AI response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }
      
      const aiData = JSON.parse(jsonMatch[0])
      
      // Step 2: If we got a barcode, look it up in OpenFoodFacts
      let productData = null
      if (aiData.barcode && aiData.barcode !== 'unknown') {
        productData = await lookupProductByBarcode(aiData.barcode)
      }
      
      // Step 3: Use OpenFoodFacts data if available, otherwise use AI data
      if (productData) {
        // Add AI's expiration suggestion to OpenFoodFacts data
        setBarcodeResult({
          ...productData,
          suggestedExpirationDays: aiData.suggestedExpirationDays || 7
        })
      } else {
        // Fallback to AI's best guess
        setBarcodeResult({
          name: aiData.productName || 'Unknown Product',
          category: aiData.category || 'Food',
          defaultUnit: 'units',
          barcode: aiData.barcode || 'unknown',
          suggestedExpirationDays: aiData.suggestedExpirationDays || 7,
          source: 'AI'
        })
      }
    } catch (error) {
      console.error('Barcode scan error:', error)
      setBarcodeError(error.message || 'Failed to scan barcode')
    } finally {
      setBarcodeLoading(false)
      // Reset input
      event.target.value = ''
    }
  }

  //Gmail OAuth handlers
  const handleConnectGmail = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/gmail-connect`
    const state = btoa(JSON.stringify({ uid: user?.id || null, ts: Date.now() }))

    if (!clientId) {
      toast.error('Gmail integration not configured', {
        description: 'Please contact support to enable this feature'
      })
      return
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', state)

    window.location.href = url.toString()
  }

  const handleDisconnectGmail = async () => {
    if (!user?.id) return

    setGmailLoading(true)
    try {
      await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'gmail')

      setGmailConnected(false)
      setGmailOrders([])
      toast.success('Gmail disconnected successfully')
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
      toast.error('Failed to disconnect Gmail')
    } finally {
      setGmailLoading(false)
    }
  }

  const handleSyncGmail = async () => {
    setGmailSyncing(true)
    setGmailOrders([])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!resp.ok) {
        const errorData = await resp.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const result = await resp.json()
      setLastSynced(new Date().toISOString())
      setGmailOrders(result.orders || [])

      if (result.ordersFound > 0) {
        toast.success(`Found ${result.ordersFound} grocery orders!`, {
          description: 'Check the results below'
        })
      } else {
        toast.info('No recent grocery orders found', {
          description: 'Try connecting to a different email or check back later'
        })
      }
    } catch (error) {
      console.error('Gmail sync error:', error)
      toast.error('Sync failed', {
        description: error.message || 'Please try again'
      })
    } finally {
      setGmailSyncing(false)
    }
  }

  const handleReceiptUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setReceiptLoading(true)
    setReceiptError(null)
    setReceiptResult(null)

    try {
      const genAI = getAI()
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const imagePart = await fileToGenerativePart(file)

      const prompt = `You are a receipt parser and food safety expert. Analyze this grocery receipt image and extract all FOOD items.

For each item, provide:
- name: The product name
- quantity: Number of items (default 1 if not shown)
- unit: "units", "lbs", "oz", "each", or "pieces"
- price: The price as a number, or null if not visible
- category: Best guess category ("Produce", "Dairy", "Meat", "Bakery", "Beverages", "Canned Goods", "Frozen", "Snacks")
- suggestedExpirationDays: Number of days from today until typical expiration based on food safety guidelines

Also extract:
- storeName: The store name from the top of the receipt
- date: The purchase date

Focus ONLY on food items. Skip non-food items like bags, cleaning supplies, etc.

Expiration guidelines:
- Fresh produce: 3-7 days
- Dairy: 7-14 days
- Meat (fresh): 1-3 days
- Bakery: 2-5 days
- Frozen: 90-180 days
- Canned goods: 365+ days
- Beverages (non-dairy): 30-90 days

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "items": [
    {
      "name": "Bananas",
      "quantity": 2,
      "unit": "lbs",
      "price": 1.29,
      "category": "Produce",
      "suggestedExpirationDays": 5
    }
  ],
  "storeName": "Whole Foods",
  "date": "2024-01-15"
}`

      const result = await model.generateContent([prompt, imagePart])
      const response = await result.response
      const text = response.text()
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0])
        setReceiptResult(data)
      } else {
        throw new Error('Could not parse AI response')
      }
    } catch (error) {
      console.error('Receipt scan error:', error)
      setReceiptError(error.message || 'Failed to scan receipt')
    } finally {
      setReceiptLoading(false)
      // Reset input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">AI Scanner</h2>
        <p className="text-muted-foreground">
          Scan barcodes and receipts to quickly add items to your inventory. Works on web, iOS Safari, and Android Chrome!
        </p>
        {!user && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
            ⚠️ Not logged in - items will be saved anonymously
          </p>
        )}
      </div>

      {/* Barcode Scanner */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Barcode Scanner</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Take a photo of a product barcode or upload an existing image. The AI will read the barcode and identify the product.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="relative"
              disabled={barcodeLoading}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBarcodeUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={barcodeLoading}
              />
              {barcodeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="relative"
              disabled={barcodeLoading}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleBarcodeUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={barcodeLoading}
              />
              {barcodeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </div>

          {/* Barcode Result */}
          {barcodeResult && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-700 dark:text-green-400">
                      Product Found!
                    </h4>
                    {barcodeResult.source && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {barcodeResult.source === 'OpenFoodFacts' ? '🌍 Database' : '🤖 AI'}
                      </span>
                    )}
                  </div>
                  <dl className="space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="font-medium min-w-[100px]">Product:</dt>
                      <dd className="flex-1">{barcodeResult.name}</dd>
                    </div>
                    {barcodeResult.brand && (
                      <div className="flex gap-2">
                        <dt className="font-medium min-w-[100px]">Brand:</dt>
                        <dd className="flex-1">{barcodeResult.brand}</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="font-medium min-w-[100px]">Category:</dt>
                      <dd className="flex-1 capitalize">{barcodeResult.category}</dd>
                    </div>
                    {barcodeResult.quantity && (
                      <div className="flex gap-2">
                        <dt className="font-medium min-w-[100px]">Quantity:</dt>
                        <dd className="flex-1">{barcodeResult.quantity}</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="font-medium min-w-[100px]">Unit:</dt>
                      <dd className="flex-1">{barcodeResult.defaultUnit}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium min-w-[100px]">Barcode:</dt>
                      <dd className="font-mono flex-1">{barcodeResult.barcode}</dd>
                    </div>
                    {barcodeResult.suggestedExpirationDays && (
                      <div className="flex gap-2">
                        <dt className="font-medium min-w-[100px]">Expires in:</dt>
                        <dd className="flex-1">{barcodeResult.suggestedExpirationDays} days</dd>
                      </div>
                    )}
                  </dl>
                  {barcodeResult.imageUrl && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <img 
                        src={barcodeResult.imageUrl} 
                        alt={barcodeResult.name}
                        className="w-24 h-24 object-contain rounded"
                      />
                    </div>
                  )}
                  
                  {/* Save to Inventory Button */}
                  <div className="mt-4 pt-4 border-t border-green-500/20">
                    <Button
                      onClick={() => saveItemToInventory(barcodeResult)}
                      disabled={saving || saveSuccess}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Saved to Inventory!
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save to Inventory
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {barcodeError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                    Scan Failed
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-300">{barcodeError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Receipt Scanner */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Receipt Scanner</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Take a photo of a grocery receipt or upload an existing image. The AI will extract all food items.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="relative"
              disabled={receiptLoading}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={receiptLoading}
              />
              {receiptLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="relative"
              disabled={receiptLoading}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={receiptLoading}
              />
              {receiptLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>
          </div>

          {/* Receipt Result */}
          {receiptResult && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                    Receipt Scanned!
                  </h4>
                  
                  {receiptResult.storeName && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Store:</span> {receiptResult.storeName}
                    </p>
                  )}
                  
                  {receiptResult.date && (
                    <p className="text-sm mb-3">
                      <span className="font-medium">Date:</span> {receiptResult.date}
                    </p>
                  )}

                  <p className="text-sm font-medium mb-2">
                    Found {receiptResult.items?.length || 0} items:
                  </p>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {receiptResult.items?.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 bg-background/50 rounded border border-border text-sm"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground text-xs mt-1 flex gap-3 flex-wrap">
                          <span>Qty: {item.quantity} {item.unit}</span>
                          {item.category && <span>Category: {item.category}</span>}
                          {item.price && <span>Price: ${item.price.toFixed(2)}</span>}
                          {item.suggestedExpirationDays && <span className="text-orange-600 dark:text-orange-400">Expires in: {item.suggestedExpirationDays} days</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {receiptError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">
                    Scan Failed
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-300">{receiptError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Gmail Receipt Scanner */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Gmail Receipt Scanner</h3>
            {gmailConnected && (
              <span className="ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-600 text-white">
                Connected
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Connect your Gmail to automatically scan for grocery receipts from Instacart, DoorDash, Walmart, Grub Hub, UberEats, Amazon, and more!
          </p>

          {!gmailConnected ? (
            <div className="space-y-3">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  We'll scan your email for order confirmations from popular grocery and food delivery services.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>• Searches last 7 days of emails</li>
                  <li>• Only reads order confirmation emails</li>
                  <li>• No emails are stored or shared</li>
                  <li>• You can disconnect anytime</li>
                </ul>
              </div>
              <Button onClick={handleConnectGmail} disabled={gmailLoading}>
                <Mail className="h-4 w-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleSyncGmail} disabled={gmailSyncing}>
                  {gmailSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning Emails...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Scan My Emails
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDisconnectGmail} disabled={gmailLoading}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>

              {lastSynced && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(lastSynced).toLocaleString()}
                </p>
              )}

              {/* Gmail Orders Results */}
              {gmailOrders.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                        Found {gmailOrders.length} Grocery Orders!
                      </h4>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {gmailOrders.map((order, index) => (
                          <div
                            key={index}
                            className="p-3 bg-background/50 rounded border border-border"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium capitalize">{order.store.replace('.com', '')}</div>
                                <div className="text-xs text-muted-foreground">{order.date}</div>
                              </div>
                              <div className="text-sm font-medium">{order.total}</div>
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Items detected:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {order.items.map((item, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground mt-2">
                              Order ID: {order.orderId}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-green-500/20">
                        <p className="text-xs text-muted-foreground">
                          💡 Order summaries have been saved to your analytics. For detailed item extraction, use the Receipt Scanner above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Info Section */}
      <Card className="p-6 bg-blue-500/5 border-blue-500/20">
        <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">
          💡 How It Works
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Barcode Scanner:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 🤖 AI reads barcode number from image</li>
              <li>• 🌍 OpenFoodFacts database lookup (2M+ products)</li>
              <li>• ✨ Fallback to AI if product not in database</li>
              <li>• 📸 Works on any device with camera</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Receipt Scanner:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 🤖 AI extracts all items from receipt</li>
              <li>• 📊 Gets names, quantities, categories, prices</li>
              <li>• 🏪 Identifies store and date</li>
              <li>• ⚡ Processes multiple items in seconds</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Gmail Scanner:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 📧 Scans last 7 days of order confirmations</li>
              <li>• 🛒 Supports 15+ stores (Instacart, Walmart, etc.)</li>
              <li>• 🔒 Secure OAuth • Read-only access</li>
              <li>• 📊 Auto-saves order summaries to analytics</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-blue-500/20">
            <p className="text-xs text-muted-foreground">
              No native plugins • Works on iOS Safari • No App Store needed
            </p>
          </div>
        </div>
      </Card>

      {/* Badge Celebration Modal */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onClose={closeCelebration}
          userName={user?.email?.split('@')[0] || 'User'}
        />
      )}
    </div>
  )
}
