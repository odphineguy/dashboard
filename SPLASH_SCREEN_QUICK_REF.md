# 🎬 Splash Screen Quick Reference

## Common Use Cases

### 1. App Load (Current - Default Text)
```jsx
// src/App.jsx - Already implemented!
<SplashScreen
  onComplete={() => setShowSplash(false)}
  duration={3000}
/>
```
**Shows:** "Meal Saver" + "AI-Powered Pantry Management"

---

### 2. Loading Data (Show "Loading...")
```jsx
{loading && (
  <SplashScreen
    title="Loading..."
    subtitle=""
    duration={99999}
  />
)}
```
**Shows:** Just "Loading..." text

---

### 3. Loading Data (No Text)
```jsx
{loading && (
  <SplashScreen
    showText={false}
    duration={99999}
  />
)}
```
**Shows:** Just the spinning fork animation, no text

---

### 4. Custom Welcome Message
```jsx
<SplashScreen
  title="Welcome Back!"
  subtitle="Loading your dashboard..."
  duration={2000}
/>
```
**Shows:** Custom welcome message

---

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onComplete` | Function | - | Called when splash finishes |
| `duration` | Number | 3000 | How long to show (ms) |
| `showText` | Boolean | true | Show/hide all text |
| `title` | String | "Meal Saver" | Main title text |
| `subtitle` | String | "AI-Powered Pantry Management" | Subtitle text |

---

## Quick Copy-Paste Examples

### Loading State (No Text)
```jsx
import SplashScreen from './components/SplashScreen'

function MyComponent() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return <SplashScreen showText={false} duration={99999} />
  }

  return <div>Content</div>
}
```

### Loading State (With "Loading..." Text)
```jsx
import SplashScreen from './components/SplashScreen'

function MyComponent() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return <SplashScreen title="Loading..." subtitle="" duration={99999} />
  }

  return <div>Content</div>
}
```

### Post-Login Splash
```jsx
import SplashScreen from './components/SplashScreen'

function Login() {
  const [showSplash, setShowSplash] = useState(false)

  const handleLogin = async () => {
    await signIn()
    setShowSplash(true)
  }

  return (
    <>
      {showSplash && (
        <SplashScreen
          title="Welcome Back!"
          subtitle=""
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

## 💡 Pro Tips

1. **Duration = 99999** → Use for loading states (controlled by data loading)
2. **showText={false}** → Best for loading spinners (animation only)
3. **title="Loading..." subtitle=""** → Clear loading indicator
4. **Default props** → Perfect for app load splash (matches animation text)

---

## 📁 Animation File Location

```
/public/animations/spinning-fork.json
```

Make sure your animation file is in this exact location!
