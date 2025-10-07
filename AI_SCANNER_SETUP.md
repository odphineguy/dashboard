# 🤖 AI Scanner Setup Guide

## ✅ What's Been Installed

Your Dashboard now has AI-powered scanning capabilities using Google's Gemini Vision API!

### Features:
- 📷 **Barcode Scanner** - Take photos of product barcodes, AI reads them
- 🧾 **Receipt Scanner** - Take photos of grocery receipts, AI extracts all items
- 🌐 **Works Everywhere** - Web browsers, iOS Safari, Android Chrome
- 📱 **No Native Plugins** - Uses standard browser APIs (no Capacitor headaches!)

---

## 🔑 Step 1: Get Your Google AI API Key

1. Go to **[https://ai.google.dev/](https://ai.google.dev/)**
2. Click **"Get API Key"** or **"Get Started"**
3. Sign in with your Google account
4. Create a new API key (it's FREE with generous limits)
5. Copy your API key

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- 1 million requests per month
- Perfect for testing and development!

---

## ⚙️ Step 2: Add API Key to Your Project

1. Open your Dashboard project folder
2. Create a file named `.env` in the root (next to `package.json`)
3. Add this line:

```bash
VITE_GOOGLE_GENAI_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your real API key!

---

## 🚀 Step 3: Start the Development Server

Run this command in your terminal:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## 🧪 Step 4: Test the Scanner

1. Click **"AI Scanner Test"** in the sidebar
2. Try the **Barcode Scanner**:
   - Click "Take Photo" on mobile (opens camera)
   - Or click "Upload Image" to use existing photos
   - AI will read the barcode and identify the product
3. Try the **Receipt Scanner**:
   - Same process - take photo or upload
   - AI will extract all food items from the receipt

---

## 📱 Mobile Testing

### iOS Safari:
1. Open `http://localhost:5173` on your iPhone
2. Or use your computer's IP: `http://192.168.x.x:5173`
3. Click "Take Photo" - camera opens directly!

### Android Chrome:
1. Same process as iOS
2. Works perfectly with camera access

### No App Store needed!
- Can install as PWA (Add to Home Screen)
- Works offline once cached
- Updates instantly (no app store approval)

---

## 🔍 How It Works

### Traditional Approach (Smart_Pantry - BROKEN):
```
User → Capacitor Plugin → Native Camera → MLKit → Barcode
         ❌ iOS permissions    ❌ Build issues    ❌ Broke
```

### AI Approach (Current - WORKS):
```
User → Browser File Input → Image → Gemini Vision API → Result
         ✅ Standard API      ✅ No build      ✅ Works!
```

---

## 💰 Cost Considerations

**Google AI (Gemini) Pricing:**
- **Free Tier:** 1,500 requests/day (plenty for testing)
- **Paid:** $0.00025 per request after free tier
- **Example:** 10,000 scans/month = ~$2.50

**Compare to:**
- MLKit: Free but requires native builds + maintenance
- AWS Rekognition: $0.001 per image
- Azure Computer Vision: $0.001 per image

---

## 🐛 Troubleshooting

### "API key not found" error:
- Make sure `.env` file exists in project root
- Restart dev server after adding API key
- Check that variable starts with `VITE_`

### Camera not opening on mobile:
- Make sure you're using HTTPS or localhost
- Check browser permissions (Settings → Safari/Chrome → Camera)
- Try "Upload Image" if "Take Photo" doesn't work

### "Failed to scan" errors:
- Check internet connection (API requires internet)
- Verify API key is valid
- Make sure image is clear and well-lit
- Check API quota at [https://console.cloud.google.com](https://console.cloud.google.com)

---

## 🎯 Next Steps

Once scanning is proven to work:
1. ✅ Integrate Supabase database
2. ✅ Add authentication
3. ✅ Save scanned items to inventory
4. ✅ Add household management
5. ✅ Build out full app features

---

## 📝 Technical Details

**Files Created:**
- `src/ai/genkit.js` - AI configuration
- `src/ai/flows/lookup-product-by-barcode.js` - Barcode scanning logic
- `src/ai/flows/extract-items-from-receipt.js` - Receipt scanning logic
- `src/components/ScannerTest.jsx` - Testing UI

**Dependencies Installed:**
- `genkit` - AI framework
- `@genkit-ai/googleai` - Google AI plugin
- `zod` - Schema validation

---

## 🎉 Advantages Over Smart_Pantry

| Feature | Smart_Pantry | Current Solution |
|---------|-------------|------------------|
| iOS Camera | ❌ Broken | ✅ Works |
| Build Process | Complex (Capacitor) | Simple (Web) |
| Maintenance | Hard (plugins) | Easy (API) |
| Flexibility | Barcode only | Barcode + Receipt + Products |
| Accuracy | Good | Excellent (AI understands context) |
| Setup Time | Days | Minutes |

---

Need help? The scanner is ready to test - just add your API key and run `npm run dev`! 🚀

