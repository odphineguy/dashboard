import React from 'react'
import SplashScreen from '../components/SplashScreen'

/**
 * Test page to demonstrate different SplashScreen text configurations
 * Navigate to /test-splash to see this page
 */
const TestSplash = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        SplashScreen Text Customization Test
      </h1>

      <div className="space-y-12">
        {/* Example 1: Default Text */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            1. Default Text (App Load)
          </h2>
          <p className="text-muted-foreground mb-4">
            Shows: "Meal Saver" title + "AI-Powered Pantry Management" subtitle
          </p>
          <div className="relative h-64 bg-card rounded border border-border">
            <SplashScreen duration={99999} />
          </div>
        </div>

        {/* Example 2: Custom Loading Text */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            2. Custom Loading Text
          </h2>
          <p className="text-muted-foreground mb-4">
            Shows: "Loading..." title only, no subtitle
          </p>
          <div className="relative h-64 bg-card rounded border border-border">
            <SplashScreen
              title="Loading..."
              subtitle=""
              duration={99999}
            />
          </div>
        </div>

        {/* Example 3: No Text */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            3. No HTML Text (Animation Only)
          </h2>
          <p className="text-muted-foreground mb-4">
            Shows: Just the spinning fork animation, no HTML text below it
          </p>
          <div className="relative h-64 bg-card rounded border border-border">
            <SplashScreen
              showText={false}
              duration={99999}
            />
          </div>
        </div>

        {/* Example 4: Custom Welcome */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            4. Custom Welcome Message
          </h2>
          <p className="text-muted-foreground mb-4">
            Shows: "Welcome Back!" + "Loading your dashboard..."
          </p>
          <div className="relative h-64 bg-card rounded border border-border">
            <SplashScreen
              title="Welcome Back!"
              subtitle="Loading your dashboard..."
              duration={99999}
            />
          </div>
        </div>
      </div>

      {/* Important Note */}
      <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          📌 Important Note About Animation Text
        </h3>
        <p className="text-blue-800 dark:text-blue-200 mb-2">
          The <strong>Lottie animation file itself</strong> (spinning-fork.json) contains embedded text
          that says "Meal Saver" and "AI-powered pantry manager" as part of the animation graphics.
        </p>
        <p className="text-blue-800 dark:text-blue-200 mb-2">
          The props we added control the <strong>HTML text that appears BELOW the animation</strong>,
          not the text inside the animation file.
        </p>
        <p className="text-blue-800 dark:text-blue-200">
          If you want different text in the animation itself, you would need to:
          <br />
          1. Edit the spinning-fork.json file in a Lottie editor (like LottieFiles)
          <br />
          2. Create multiple versions (spinning-fork-loading.json, spinning-fork-default.json, etc.)
          <br />
          3. Or use an animation without embedded text
        </p>
      </div>
    </div>
  )
}

export default TestSplash
