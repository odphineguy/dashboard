# 🎬 Splash Screen Usage Guide

The splash screen component is **fully reusable** and can be implemented in multiple ways simultaneously!

## ✅ Current Implementation

**Location:** `src/App.jsx`
**Behavior:** Shows on every app load for 3 seconds

---

## 🎯 Multiple Usage Patterns

### 1️⃣ **Every App Load** (Currently Active)

Shows splash screen every time the user opens the app.

```jsx
// src/App.jsx
import { useState } from 'react'
import SplashScreen from './components/SplashScreen'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          duration={3000}
        />
      )}
      {/* Your app content */}
    </>
  )
}
```

---

### 2️⃣ **First Visit Only** (Show Once Ever)

Shows splash only the very first time a user visits your app, then never again.

```jsx
import { useSplashScreen } from './hooks/useSplashScreen'
import SplashScreen from './components/SplashScreen'

function App() {
  const { showSplash } = useSplashScreen({
    showOnLoad: true,
    showOnceEver: true,  // ← Only once ever using localStorage
    duration: 3000
  })

  return (
    <>
      {showSplash && <SplashScreen duration={3000} />}
      {/* Your app content */}
    </>
  )
}
```

---

### 3️⃣ **Once Per Session**

Shows splash once per browser session (resets when browser closes).

```jsx
import { useSplashScreen } from './hooks/useSplashScreen'
import SplashScreen from './components/SplashScreen'

function App() {
  const { showSplash } = useSplashScreen({
    showOnLoad: true,
    showOnce: true,  // ← Once per session using sessionStorage
    duration: 3000
  })

  return (
    <>
      {showSplash && <SplashScreen duration={3000} />}
      {/* Your app content */}
    </>
  )
}
```

---

### 4️⃣ **On Login Success**

Shows splash after user successfully logs in.

```jsx
// In your login component or AuthContext
import { useState } from 'react'
import SplashScreen from './components/SplashScreen'

function LoginPage() {
  const [showSplash, setShowSplash] = useState(false)

  const handleLogin = async () => {
    await signIn(email, password)
    setShowSplash(true)  // ← Show splash after login
  }

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            setShowSplash(false)
            navigate('/dashboard')  // Then navigate
          }}
          duration={2000}  // Shorter duration for login
        />
      )}
      {/* Login form */}
    </>
  )
}
```

---

### 5️⃣ **As Loading State** (While Fetching Data)

Shows splash while loading initial data.

```jsx
import { useState, useEffect } from 'react'
import SplashScreen from './components/SplashScreen'

function Dashboard() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData()
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return <SplashScreen duration={99999} />  // Shows until loading completes
  }

  return <div>Dashboard content</div>
}
```

---

### 6️⃣ **Combining Multiple Triggers**

You can have splash screens in different parts of your app!

**Example: App Load + Login**

```jsx
// App.jsx - Shows on initial load
function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          duration={3000}
        />
      )}
      <Routes />
    </>
  )
}

// Login.jsx - Also shows after login
function Login() {
  const [showLoginSplash, setShowLoginSplash] = useState(false)

  const handleLogin = async () => {
    await signIn()
    setShowLoginSplash(true)  // Separate splash for login success
  }

  return (
    <>
      {showLoginSplash && (
        <SplashScreen
          onComplete={() => navigate('/dashboard')}
          duration={2000}
        />
      )}
      {/* Login form */}
    </>
  )
}
```

---

## 🎨 Customization Options

### **SplashScreen Component Props**

```jsx
<SplashScreen
  onComplete={() => {}}                      // Function called when splash finishes
  duration={3000}                            // How long to show (milliseconds)
  showText={true}                            // Show text below animation (default: true)
  title="Meal Saver"                         // Title text (default: "Meal Saver")
  subtitle="AI-Powered Pantry Management"    // Subtitle text (default: "AI-Powered Pantry Management")
/>

// Examples:
// 1. Full text (default)
<SplashScreen duration={3000} />

// 2. Custom loading text
<SplashScreen title="Loading..." subtitle="" duration={3000} />

// 3. No text at all (animation only)
<SplashScreen showText={false} duration={3000} />

// 4. Custom text
<SplashScreen
  title="Welcome Back!"
  subtitle="Loading your dashboard..."
  duration={2000}
/>
```

### **useSplashScreen Hook Options**

```javascript
const { showSplash, setShowSplash, resetSplash } = useSplashScreen({
  showOnLoad: true,        // Show on mount (default: true)
  showOnce: false,         // Show once per session (default: false)
  showOnceEver: false,     // Show once ever (default: false)
  duration: 3000,          // Duration in ms (default: 3000)
  storageKey: 'custom-key' // Storage key (default: 'meal-saver-splash-seen')
})
```

### **Manual Control**

```jsx
const { showSplash, setShowSplash, resetSplash } = useSplashScreen()

// Show splash manually
setShowSplash(true)

// Hide splash manually
setShowSplash(false)

// Reset and show again (clears localStorage/sessionStorage)
resetSplash()
```

---

## 📊 Common Use Cases

| Use Case | Configuration |
|----------|--------------|
| **Every visit** | `showOnLoad: true` (default) |
| **First visit only** | `showOnceEver: true` |
| **Once per session** | `showOnce: true` |
| **On login** | Manual `setShowSplash(true)` after auth |
| **Loading state** | Show while `loading === true` |
| **Route transitions** | Show on specific route changes |

---

## 🔧 Advanced Example: Multiple Contexts

```jsx
// App.jsx
function App() {
  // Global app load splash (first visit only)
  const { showSplash: showAppSplash } = useSplashScreen({
    showOnceEver: true,
    duration: 3000
  })

  return (
    <AuthProvider>
      {showAppSplash && <SplashScreen duration={3000} />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </AuthProvider>
  )
}

// Dashboard.jsx
function Dashboard() {
  // Data loading splash (every visit to dashboard)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    loadDashboardData().then(() => setDataLoading(false))
  }, [])

  if (dataLoading) {
    return <SplashScreen duration={99999} />
  }

  return <div>Dashboard</div>
}
```

---

## 🎯 Recommended Setup

For most apps, I recommend:

1. **App Load**: Show once per session
2. **Login**: Show briefly after successful login
3. **Data Loading**: Show while fetching critical data

```jsx
// App.jsx
const { showSplash } = useSplashScreen({
  showOnce: true,  // Once per session
  duration: 3000
})

// Login.jsx
const [showLoginSplash, setShowLoginSplash] = useState(false)
// Show after login success

// Dashboard.jsx
const [loading, setLoading] = useState(true)
// Show while loading data
```

---

## 🎯 Text Configuration Examples

### **App Load Splash (Keep Default Text)**
The animation has "Meal Saver" and "AI-powered pantry manager" text, which matches perfectly:
```jsx
// App.jsx
<SplashScreen
  onComplete={() => setShowSplash(false)}
  duration={3000}
  // Uses defaults: title="Meal Saver", subtitle="AI-Powered Pantry Management"
/>
```

### **Loading/Fetching Data (Show "Loading...")**
When loading data, you want different text:
```jsx
// Dashboard.jsx
{loading && (
  <SplashScreen
    title="Loading..."
    subtitle=""  // No subtitle
    duration={99999}  // Shows until loading completes
  />
)}
```

### **Loading Data (No Text)**
Just the spinning fork animation:
```jsx
// Any component
{loading && (
  <SplashScreen
    showText={false}  // No text at all
    duration={99999}
  />
)}
```

### **Login Success (Custom Welcome Text)**
```jsx
// Login.jsx
{showLoginSplash && (
  <SplashScreen
    title="Welcome Back!"
    subtitle="Loading your dashboard..."
    duration={2000}
  />
)}
```

---

## 📝 Notes

- The splash screen has a smooth fade-out animation
- Falls back to a spinner if animation doesn't load
- Fully accessible (keyboard navigation works during splash)
- Blocks all interaction while visible (z-index: 50)
- Works with both light and dark themes

---

## 🎬 Animation Files

Place your Lottie JSON files here:
- `/public/animations/spinning-fork.json` - Splash screen animation
- `/public/animations/recipe-book.json` - Onboarding animation

Make sure the fork animation uses your brand color **#0EA5E9**!
