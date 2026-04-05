# Meal Saver iOS Rebuild Guide

> **Purpose**: Comprehensive technical guide for rebuilding the Meal Saver React web app as a native iOS Swift application. Written for an AI agent or developer to follow. Based on a full audit of the existing React codebase, database schema, and security posture.
>
> **Date**: April 4, 2026
> **Source**: React app at https://github.com/odphineguy/dashboard
> **Production URL**: https://app.mealsaver.app/

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues to Fix BEFORE Rebuilding](#2-critical-issues-to-fix-before-rebuilding)
3. [Current App Feature Map](#3-current-app-feature-map)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Recommended iOS Architecture](#5-recommended-ios-architecture)
6. [Feature-by-Feature Implementation Guide](#6-feature-by-feature-implementation-guide)
7. [Authentication Strategy](#7-authentication-strategy)
8. [Subscription & Payments (StoreKit 2)](#8-subscription--payments-storekit-2)
9. [AI Integration (Google Gemini)](#9-ai-integration-google-gemini)
10. [Push Notifications](#10-push-notifications)
11. [Data Layer & Offline Support](#11-data-layer--offline-support)
12. [Testing Strategy](#12-testing-strategy)
13. [App Store Readiness](#13-app-store-readiness)
14. [Migration Checklist](#14-migration-checklist)

---

## 1. Executive Summary

### What Meal Saver Does
A food pantry management app that helps users track grocery inventory, reduce food waste, and get AI-powered recipe suggestions. Users can scan receipts/barcodes, track expiration dates, manage household members, and view analytics on their consumption/waste patterns.

### Current Tech Stack (React Web)
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | Clerk (JWT-based, Google + Apple Sign In) |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | Stripe (Checkout + Customer Portal) |
| AI | Google Gemini 2.0 Flash (Vision + Text) |
| Email | Resend API (via Supabase Edge Functions) |
| Hosting | Vercel |

### Recommended iOS Stack
| Layer | Technology |
|-------|-----------|
| UI | SwiftUI (iOS 17+) |
| Auth | Supabase Auth (Email + Sign in with Apple + Google) |
| Database | Supabase Swift SDK (same backend) |
| Payments | StoreKit 2 (In-App Purchases) |
| AI | Gemma 4 on-device (2B or 4B via Core ML / MediaPipe) |
| Notifications | APNs (Apple Push Notification service) |
| Local Cache | SwiftData or Core Data |

### Key Architectural Decisions for iOS
1. **Keep the same Supabase backend** — no need to rebuild the database
2. **Replace Stripe with StoreKit 2** — Apple requires IAP for digital subscriptions
3. **Replace Clerk with Supabase Auth** — eliminates a paid dependency, simplifies RLS, uses `auth.uid()` natively
4. **On-device AI with Gemma 4** — no API keys to manage, works offline, genuine privacy story
5. **Add offline support** — mobile users expect it, web app doesn't have it
6. **Use SwiftUI exclusively** — no UIKit unless necessary for camera

### Privacy & Marketing Positioning

> **This is a key competitive differentiator. Build the marketing around it.**

**Privacy claim**: *"AI processing stays on your device. Your data is encrypted and synced securely."*

**Architecture that supports this claim**:
- **On-device AI (Gemma 4)**: Recipe generation and scanner OCR run entirely on the user's iPhone. No food data is ever sent to AI servers (Google, OpenAI, etc.). This is a genuine, verifiable claim.
- **Supabase for sync only**: Cloud storage is used for cross-device sync, household sharing, and subscription management. Data is encrypted in transit (TLS) and at rest (Supabase uses AES-256). Users can see exactly what is synced.
- **No third-party AI data sharing**: Competitors using OpenAI/Google APIs send user food data to external servers for processing. Meal Saver does not.

**Marketing angles**:
- *"Your groceries. Your recipes. Your device. We never send your food data to AI servers."*
- *"Private by design — AI runs on your iPhone, not in the cloud."*
- *"Unlike other food apps, your pantry data never trains someone else's AI model."*
- Highlight in App Store description, screenshots, and privacy nutrition labels
- Use Apple's "Processed on Device" badge if applicable

**What makes this honest (not greenwashing)**:
- Recipe generation: Gemma runs locally, no network call
- Scanner: On-device Vision framework + Gemma for OCR/extraction, no server round-trip
- Supabase sync: Only structured data (item names, quantities, dates) — never raw images or AI prompts
- Users who don't sign in could theoretically use the app fully offline (future enhancement)

---

## 2. Critical Issues to Fix BEFORE Rebuilding

These issues exist in the current codebase and backend. Fix them before the iOS app connects to the same Supabase instance.

### 2.1 CRITICAL: Service Role Key Exposed in Frontend

**Problem**: The Supabase service role key is stored as `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env` and used directly in the browser (in `AuthContext.jsx` line 42-44) to bypass RLS during profile creation.

**Impact**: Anyone who inspects the browser bundle can extract this key and get FULL unrestricted access to the entire database — read, write, delete any user's data.

**Fix**:
1. Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env` immediately
2. Create a Supabase Edge Function for profile creation that uses the service role server-side
3. Rotate the service role key in Supabase Dashboard → Settings → API
4. The iOS app must NEVER contain the service role key

### 2.2 CRITICAL: .env File in Git History

**Problem**: The `.env` file with all secrets (Google API key, Google Client Secret, Stripe keys, Supabase keys) has been committed to git.

**Fix**:
1. Add `.env` to `.gitignore` (verify it's there)
2. Use `git filter-repo` or BFG Repo Cleaner to purge from history
3. Rotate ALL exposed keys:
   - Google Generative AI API key
   - Google OAuth Client Secret
   - Supabase anon key (regenerate)
   - Stripe keys (if needed)
4. For iOS: store secrets in Xcode configuration files (`.xcconfig`) excluded from git, or use a secrets manager

### 2.3 CRITICAL: Google Gemini API Key in Client Bundle (Web)

**Problem**: `VITE_GOOGLE_GENAI_API_KEY` is bundled into the JavaScript. Anyone can extract it and run up API charges.

**iOS resolution**: This issue does not apply to the iOS app because we're using **Gemma 4 on-device** instead of the Gemini cloud API. No API key needed — all AI runs locally. However, the web app still needs this fixed (proxy through an Edge Function or remove).

### 2.4 HIGH: Client-Side Subscription Enforcement Only

**Problem**: Subscription tier checks (`checkFeatureAccess`, `canAddPantryItem`) are frontend-only. Users can bypass them via browser DevTools.

**Fix**:
1. Add RLS policies that enforce subscription limits at the database level:
```sql
-- Example: Enforce 50-item limit for basic tier
CREATE POLICY "Enforce item limit" ON pantry_items
  FOR INSERT WITH CHECK (
    (SELECT subscription_tier FROM profiles WHERE id = auth.uid()) != 'basic'
    OR (SELECT count(*) FROM pantry_items WHERE user_id = auth.uid()) < 50
  );
```
2. The iOS app benefits automatically once RLS enforces limits server-side

### 2.5 MEDIUM: Remove Clerk, Standardize Auth Functions

**Problem**: Three different auth function versions exist across migrations because of Clerk:
- `public.clerk_user_id()` (migration 20251022)
- `auth.jwt()->>'sub'` (migration 20251023)
- `public.clerk_user_id()` again (migration 20251128)

**Fix**: Since we're replacing Clerk with Supabase Auth for iOS (and eventually web too), standardize ALL RLS policies to use `auth.uid()`. Write a single migration that drops `clerk_user_id()` and rewrites all policies. See Section 7 for the full auth migration plan.

### 2.6 MEDIUM: Household INSERT Policy Missing Ownership Check

**Problem**: The INSERT policy on `pantry_items` only checks `user_id` but doesn't validate that the user is actually a member of the `household_id` they're inserting into.

**Fix**:
```sql
CREATE POLICY "Users can insert own or household items"
  ON pantry_items FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      household_id IS NULL
      OR household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );
```

---

## 3. Current App Feature Map

### Pages & Features (What to Rebuild)

| Page | Features | Priority | Complexity |
|------|----------|----------|------------|
| **Dashboard** | Metrics cards (inventory count, expiring today/soon, waste reduction %), expiring items list (top 4), waste reduction trend chart (6-month), recent activity feed (last 10 events), consume/waste/delete actions | P0 | Medium |
| **Inventory** | Full CRUD for pantry items, search/filter by name/category/storage, bulk actions, consume/waste buttons per item, add item modal, category dropdown, expiry date picker | P0 | High |
| **Grocery List** | Add/remove items, check/uncheck, clear checked, filter (all/to buy/purchased), low stock alerts suggesting items with qty <= 3 | P0 | Low |
| **Recipes** | AI recipe generation from expiring ingredients (next 7 days), 6 recipes per generation, recipe cards with ingredients/instructions/cook time | P1 | Medium |
| **AI Scanner** | Barcode scanning (camera → Gemini Vision → product ID), receipt scanning (photo → Gemini Vision → item extraction), add scanned items to pantry | P1 | High |
| **Analytics** | KPI cards (consumed/wasted/waste rate/CO2 saved), consumption & waste trends chart (7d/30d/90d), items by category pie chart, inventory by category bar chart | P1 | Medium |
| **Household** | Create household, invite members by email, manage members (remove, change role), switch between personal/household views | P2 | High |
| **Storage Locations** | CRUD for storage areas (Pantry/Fridge/Freezer/custom), tier-based limits (basic=3, premium=6, household=unlimited) | P2 | Low |
| **Profile** | View/edit profile, subscription management, notification preferences, achievement badges, personal goals, data export (JSON), account deletion | P1 | Medium |
| **Achievements** | 14 badge types across 4 categories (waste reduction, recipes, consistency, streaks), progress tracking, celebration modal with confetti, social sharing | P2 | Medium |

### Features NOT to Rebuild (Deprecated/Broken)
- **Gmail Connect** — stub page, never implemented
- **ScannerTest** — test component used as placeholder for real scanner page
- **ClearDataButton** — dev tool marked "REMOVE AFTER TESTING"
- **SplashScreen** — web-only, iOS has its own launch screen

---

## 4. Database Schema (Supabase)

The iOS app will connect to the **same Supabase instance**. Here's the actual schema as it exists today.

### 4.1 Core Tables

```
profiles
├── id TEXT PK (Clerk user ID like "user_34rGFx...")
├── email TEXT
├── full_name TEXT
├── avatar_url TEXT
├── subscription_tier TEXT ('basic'|'premium'|'household_premium')
├── subscription_status TEXT ('active'|'trialing'|'past_due'|'canceled')
├── stripe_customer_id TEXT
├── personal_goals JSONB
├── notification_preferences JSONB
├── created_at TIMESTAMPTZ
└── updated_at TIMESTAMPTZ

pantry_items
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── household_id UUID FK→households.id (nullable)
├── name TEXT NOT NULL
├── quantity NUMERIC
├── unit TEXT
├── category TEXT
├── expiry_date DATE
├── storage_location_id UUID FK→storage_locations.id (nullable)
├── brand TEXT
├── data_source TEXT
├── fatsecret_food_id TEXT
├── fatsecret_serving_id TEXT
└── created_at TIMESTAMPTZ

pantry_events
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── item_id UUID FK→pantry_items.id
├── type TEXT ('consumed'|'wasted')
├── name TEXT
├── quantity NUMERIC
├── unit TEXT
├── category TEXT
├── at TIMESTAMPTZ
├── household_id UUID
├── data_source TEXT
├── fatsecret_food_id TEXT
├── fatsecret_serving_id TEXT
└── created_at TIMESTAMPTZ

grocery_list_items
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── household_id UUID (nullable)
├── name TEXT NOT NULL
├── is_checked BOOLEAN DEFAULT false
├── source TEXT ('manual'|'low_stock')
└── created_at TIMESTAMPTZ

storage_locations
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── household_id UUID (nullable)
├── name TEXT NOT NULL
├── location_type TEXT ('pantry'|'fridge'|'freezer'|'other')
└── created_at TIMESTAMPTZ

households
├── id UUID PK
├── name TEXT NOT NULL
├── created_by TEXT FK→profiles.id
└── created_at TIMESTAMPTZ

household_members
├── id UUID PK
├── household_id UUID FK→households.id
├── user_id TEXT FK→profiles.id
├── role TEXT ('owner'|'admin'|'member')
└── joined_at TIMESTAMPTZ

household_invitations
├── id UUID PK
├── household_id UUID FK→households.id
├── email TEXT NOT NULL
├── status TEXT ('pending'|'accepted'|'declined')
└── created_at TIMESTAMPTZ

subscriptions
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── stripe_subscription_id TEXT
├── stripe_customer_id TEXT
├── plan_tier TEXT
├── status TEXT
├── current_period_start TIMESTAMPTZ
├── current_period_end TIMESTAMPTZ
├── billing_interval TEXT ('month'|'year')
└── created_at TIMESTAMPTZ

payment_history
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── stripe_payment_intent_id TEXT
├── amount INTEGER
├── currency TEXT
├── status TEXT
└── created_at TIMESTAMPTZ

user_achievements
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── achievement_key TEXT
├── unlocked_at TIMESTAMPTZ
└── progress NUMERIC

ai_saved_recipes
├── id UUID PK
├── user_id TEXT FK→profiles.id
├── recipe_data JSONB
└── created_at TIMESTAMPTZ
```

### 4.2 Schema Issues to Address

| Issue | Description | Recommendation |
|-------|-------------|----------------|
| `profiles.id` is TEXT (Clerk ID) | Supabase Auth `auth.uid()` returns UUID, not Clerk-style text IDs | For iOS: use UUID as `profiles.id` for new users. Write a migration to change the `id` column type from TEXT to UUID, or create a new clean profiles table for iOS users. Existing web users with Clerk IDs will need migration when web app switches to Supabase Auth too. |
| `pantry_events.at` vs `created_at` | Redundant timestamp fields cause confusion | Use `created_at` as the canonical timestamp, drop `at` |
| `subscriptions` tied to Stripe | iOS uses StoreKit, not Stripe | Add `apple_transaction_id`, `apple_product_id` columns; or create a separate `ios_subscriptions` table |
| No `device_token` column | Needed for push notifications | Add `device_tokens JSONB` to `profiles` (array of {token, platform, created_at}) |
| Missing indexes on `expiry_date` | Frequent queries for expiring items | Add `CREATE INDEX idx_pantry_items_expiry ON pantry_items(expiry_date)` |
| `notification_preferences` is JSONB | Works but not type-safe | Fine for now, but define a clear schema in app code |

### 4.3 RLS Policy Summary

RLS is enabled on all tables. Current policies use `clerk_user_id()` function. If switching auth providers for iOS, policies need updating (see Section 7).

---

## 5. Recommended iOS Architecture

### 5.1 Project Structure

```
MealSaver/
├── App/
│   ├── MealSaverApp.swift          # @main entry point
│   ├── AppState.swift              # Global observable state
│   └── ContentView.swift           # Root view with tab navigation
│
├── Models/
│   ├── PantryItem.swift            # Codable structs matching Supabase
│   ├── PantryEvent.swift
│   ├── GroceryItem.swift
│   ├── Recipe.swift
│   ├── UserProfile.swift
│   ├── Household.swift
│   ├── StorageLocation.swift
│   ├── Achievement.swift
│   └── Subscription.swift
│
├── Services/
│   ├── SupabaseService.swift       # Supabase client singleton
│   ├── AuthService.swift           # Sign in with Apple + session management
│   ├── PantryService.swift         # CRUD for pantry items & events
│   ├── GroceryService.swift        # Grocery list operations
│   ├── RecipeService.swift         # AI recipe generation
│   ├── ScannerService.swift        # Gemini Vision API calls
│   ├── HouseholdService.swift      # Household management
│   ├── AchievementService.swift    # Badge checking & awarding
│   ├── SubscriptionService.swift   # StoreKit 2 integration
│   └── NotificationService.swift   # APNs registration & handling
│
├── ViewModels/
│   ├── DashboardViewModel.swift
│   ├── InventoryViewModel.swift
│   ├── GroceryListViewModel.swift
│   ├── RecipesViewModel.swift
│   ├── ScannerViewModel.swift
│   ├── AnalyticsViewModel.swift
│   ├── HouseholdViewModel.swift
│   ├── ProfileViewModel.swift
│   └── OnboardingViewModel.swift
│
├── Views/
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── MetricsCardView.swift
│   │   ├── ExpiringItemRow.swift
│   │   └── WasteReductionChartView.swift
│   ├── Inventory/
│   │   ├── InventoryView.swift
│   │   ├── ItemRow.swift
│   │   ├── AddItemSheet.swift
│   │   └── ItemDetailView.swift
│   ├── GroceryList/
│   │   ├── GroceryListView.swift
│   │   └── LowStockAlertView.swift
│   ├── Recipes/
│   │   ├── RecipesView.swift
│   │   └── RecipeCardView.swift
│   ├── Scanner/
│   │   ├── ScannerView.swift        # Camera + Gemini Vision
│   │   └── ScanResultView.swift
│   ├── Analytics/
│   │   ├── AnalyticsView.swift
│   │   ├── KPICardView.swift
│   │   └── TrendsChartView.swift
│   ├── Household/
│   │   ├── HouseholdView.swift
│   │   └── InviteMemberSheet.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── SubscriptionView.swift
│   │   ├── AchievementsView.swift
│   │   └── NotificationSettingsView.swift
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── OnboardingView.swift
│   └── Shared/
│       ├── LoadingView.swift
│       ├── EmptyStateView.swift
│       ├── BadgeCelebrationView.swift
│       └── SubscriptionGuard.swift
│
├── Utilities/
│   ├── DateFormatters.swift
│   ├── Constants.swift             # Tier limits, feature flags
│   └── Extensions/
│       ├── Date+Extensions.swift
│       ├── Color+Theme.swift
│       └── View+Modifiers.swift
│
├── Resources/
│   ├── Assets.xcassets
│   ├── Localizable.xcstrings       # en, es-MX at minimum
│   └── Config.xcconfig             # API keys (git-ignored)
│
└── Configuration/
    ├── Debug.xcconfig
    └── Release.xcconfig
```

### 5.2 Architecture Pattern: MVVM + Services

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  Views    │ ──> │  ViewModels  │ ──> │    Services      │
│ (SwiftUI) │ <── │ (@Observable)│ <── │ (Supabase/APIs)  │
└──────────┘     └──────────────┘     └─────────────────┘
                                              │
                                              v
                                     ┌─────────────────┐
                                     │  Supabase DB     │
                                     │  (PostgreSQL)    │
                                     └─────────────────┘
```

- **Views**: Pure SwiftUI, no business logic. Bind to ViewModel `@Observable` properties.
- **ViewModels**: `@Observable` classes. Orchestrate service calls, hold UI state, transform data for views.
- **Services**: Stateless singletons or injected dependencies. Handle Supabase queries, API calls, StoreKit, etc.
- **Models**: `Codable` structs that map 1:1 to Supabase table rows.

### 5.3 Key Dependencies (Swift Packages)

```swift
// Package.swift or Xcode SPM
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
    .package(url: "https://github.com/googlesamples/mediapipe", from: "0.10.0"),  // For Gemma on-device inference
]
```

**Notes**:
- iOS 17+ includes Swift Charts natively — no third-party chart library needed
- Gemma 4 model file (~1.5-3GB) should be downloaded on first launch, NOT bundled in the app binary
- No Google Generative AI SDK needed — all AI runs on-device

### 5.4 Navigation Structure

Use `TabView` with 5 tabs (iOS convention — max 5 tabs):

```
Tab 1: Dashboard (home)
Tab 2: Inventory
Tab 3: Scanner (center, prominent)
Tab 4: Recipes
Tab 5: Profile (includes Analytics, Settings, Achievements)
```

Secondary pages accessible via `NavigationStack`:
- Grocery List → from Dashboard or Inventory
- Household → from Profile
- Storage Locations → from Inventory settings
- Analytics → from Profile or Dashboard
- Achievements → from Profile

---

## 6. Feature-by-Feature Implementation Guide

### 6.1 Dashboard

**Data needed on load**:
```swift
// 1. Metrics
let totalItems = try await supabase.from("pantry_items")
    .select("*", head: true, count: .exact)
    .eq("user_id", userId)
    .execute().count

let expiringToday = try await supabase.from("pantry_items")
    .select("*")
    .eq("user_id", userId)
    .eq("expiry_date", today)
    .execute().value

// 2. Events for waste reduction calculation
let events = try await supabase.from("pantry_events")
    .select("type, quantity, created_at")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.iso8601)
    .execute().value

// 3. Expiring items (next 3 days, limit 4)
let expiring = try await supabase.from("pantry_items")
    .select("*")
    .eq("user_id", userId)
    .gte("expiry_date", today)
    .lte("expiry_date", threeDaysFromNow)
    .order("expiry_date")
    .limit(4)
    .execute().value

// 4. Recent activity (last 10 events)
let recentEvents = try await supabase.from("pantry_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", ascending: false)
    .limit(10)
    .execute().value
```

**Metrics calculations** (same as React app):
- Waste Reduction Rate: `consumed / (consumed + wasted) * 100`
- CO2 Saved: `consumed * 0.5 * 2.5` (kg estimate)
- Change vs previous period: compare current 30d vs previous 30d

**Actions**: Consume, Waste, Delete from expiring items list (same logic as Inventory).

### 6.2 Inventory

**Core CRUD**:
```swift
// INSERT
let item = PantryItem(
    userId: userId,
    householdId: isPersonal ? nil : currentHouseholdId,
    name: name,
    quantity: quantity,
    unit: unit,
    category: category,
    expiryDate: expiryDate,
    storageLocationId: storageLocationId
)
try await supabase.from("pantry_items").insert(item).execute()

// UPDATE
try await supabase.from("pantry_items")
    .update(["quantity": newQuantity])
    .eq("id", itemId)
    .execute()

// DELETE
try await supabase.from("pantry_items")
    .delete()
    .eq("id", itemId)
    .execute()

// CONSUME (compound action)
// 1. Insert pantry_event
try await supabase.from("pantry_events").insert(PantryEvent(
    userId: userId,
    itemId: item.id,
    type: "consumed",
    quantity: 1,
    at: Date().iso8601
)).execute()
// 2. Decrement quantity or delete if zero
if item.quantity <= 1 {
    try await supabase.from("pantry_items").delete().eq("id", item.id).execute()
} else {
    try await supabase.from("pantry_items")
        .update(["quantity": item.quantity - 1])
        .eq("id", item.id).execute()
}
// 3. Check badges
await achievementService.checkBadges(userId: userId, action: .itemConsumed)
```

**Filters**: Name search (client-side filter on loaded items), category picker, storage location picker.

**Categories** (from existing data):
`Fruits, Vegetables, Dairy, Meat & Fish, Pantry Items, Beverages, Snacks, Frozen Foods, Bakery, Condiments, Other`

### 6.3 Grocery List

Simple checklist — straightforward SwiftUI `List` with `ForEach`:

```swift
// Toggle checked
try await supabase.from("grocery_list_items")
    .update(["is_checked": !item.isChecked])
    .eq("id", item.id).execute()

// Clear all checked
try await supabase.from("grocery_list_items")
    .delete()
    .eq("user_id", userId)
    .eq("is_checked", true).execute()
```

**Low Stock Alerts**: Query `pantry_items` where `quantity <= 3`, exclude items already on grocery list.

### 6.4 Recipes (AI Generation — On-Device)

Recipes are generated using Gemma 4 running locally on the device. See Section 9 for full implementation details.

```swift
// In RecipesViewModel
func generateRecipes() async {
    guard gemmaService.isModelReady else {
        showModelDownloadPrompt = true
        return
    }

    isGenerating = true
    let expiringNames = expiringItems.map { $0.name }

    do {
        recipes = try await gemmaService.generateRecipes(ingredients: expiringNames)
    } catch AIError.parseFailure {
        // Retry once with stricter prompt
        recipes = try? await gemmaService.generateRecipes(ingredients: expiringNames)
        if recipes == nil { errorMessage = "Couldn't generate recipes. Try again." }
    } catch {
        errorMessage = "Recipe generation failed: \(error.localizedDescription)"
    }
    isGenerating = false
}
```

**Key advantage over React app**: No API quota limits, no 429 errors, no API key management. Works offline.

### 6.5 AI Scanner (On-Device)

**This is the most iOS-native feature** — real camera + on-device processing. Two-step pipeline:

**Step 1: Apple Vision framework** extracts text from the image (OCR — fast, reliable, no AI model needed)
**Step 2: Gemma 4** interprets the extracted text to identify products/items (runs locally)

```swift
// In ScannerViewModel
func processCapture(image: UIImage, mode: ScanMode) async {
    isProcessing = true
    do {
        let items = try await gemmaService.parseImage(image: image, mode: mode)
        scannedItems = items
    } catch {
        errorMessage = "Couldn't read that. Try a clearer photo."
    }
    isProcessing = false
}
```

**iOS advantages over React web app**:
- Real camera viewfinder (AVCaptureSession), not file upload
- Vision framework OCR is fast and accurate — no network needed
- No Gemini Vision 500 errors (the web app's biggest scanner bug)
- Works offline (both OCR and Gemma inference are local)
- Can use `VNDetectBarcodesRequest` for actual barcode detection (UPC lookup)

### 6.6 Analytics

Use **Swift Charts** (iOS 16+):

```swift
import Charts

struct TrendsChartView: View {
    let events: [PantryEvent]
    @State private var timeRange: TimeRange = .sevenDays

    var body: some View {
        Chart {
            ForEach(chartData) { dataPoint in
                AreaMark(
                    x: .value("Date", dataPoint.date),
                    y: .value("Count", dataPoint.consumed)
                )
                .foregroundStyle(.green.opacity(0.3))

                AreaMark(
                    x: .value("Date", dataPoint.date),
                    y: .value("Count", dataPoint.wasted)
                )
                .foregroundStyle(.red.opacity(0.3))
            }
        }
    }
}
```

**KPI calculations** (same formulas as React):
- Total Consumed this week: sum of `consumed` event quantities
- Total Wasted this week: sum of `wasted` event quantities
- Waste Reduction Rate: `consumed / (consumed + wasted) * 100`
- CO2 Saved: `consumed * 0.5 * 2.5` kg (hardcoded estimate)

### 6.7 Household Management

Same Supabase queries as React. Key flows:
1. **Create household**: Insert into `households`, then `household_members` with role `owner`
2. **Invite member**: Insert into `household_invitations` with email + status `pending`
3. **Accept invitation**: Insert into `household_members`, update invitation status
4. **Switch view**: Toggle `isPersonal` flag, filter all queries by `household_id`
5. **Remove member**: Delete from `household_members` (admin only)

### 6.8 Profile & Achievements

**14 badges** (same as React app — see `services/achievements.js`):

| Badge | Requirement |
|-------|-------------|
| Waste Warrior | 50 items consumed |
| Eco Champion | 3 consecutive weeks with 50%+ waste reduction |
| Zero Waste Week | 1 full week with no wasted items |
| Sustainability Champion | 100kg CO2 saved (estimate) |
| Food Saver Pro | 500 items consumed |
| Recipe Novice | 5 recipes generated |
| Culinary Explorer | 25 recipes generated |
| Master Chef | 100 recipes generated |
| Week Streak | 7 consecutive days of activity |
| Month Streak | 30 consecutive days |
| Year Streak | 365 consecutive days |
| Early Adopter | Account active for 30 days |
| Perfect Week | 7 consecutive days with no waste |
| Money Saver | $200 estimated savings |

**Badge checking** should run after: consume action, waste action, recipe generation, login.

---

## 7. Authentication Strategy

### Supabase Auth (Email + Apple + Google) — No Clerk

Clerk is being removed entirely. Supabase Auth handles everything natively with zero extra dependencies.

### Why This Is Better
- **No paid dependency** — Clerk charges per MAU; Supabase Auth is included free
- **Native RLS integration** — `auth.uid()` works out of the box, no custom `clerk_user_id()` functions
- **Simpler codebase** — no JWT template gymnastics, no custom fetch wrappers
- **Built-in providers** — Apple, Google, email/password all supported natively
- **Apple requires Sign in with Apple** — if you offer Google Sign-In, Apple mandates their own

### Implementation

```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://qrkkcrkxpydosxwkdeve.supabase.co")!,
    supabaseKey: "your_anon_key"
)

// Email + Password Sign Up
let session = try await supabase.auth.signUp(
    email: email,
    password: password,
    data: ["full_name": .string(fullName)]  // stored in user_metadata
)

// Email + Password Sign In
let session = try await supabase.auth.signIn(
    email: email,
    password: password
)

// Sign in with Apple
let credential = // from ASAuthorizationController
let session = try await supabase.auth.signInWithIdToken(
    credentials: .init(provider: .apple, idToken: credential.identityToken)
)

// Sign in with Google
let session = try await supabase.auth.signInWithIdToken(
    credentials: .init(provider: .google, idToken: googleCredential.idToken)
)

// Get current user ID (works directly in RLS)
let userId = supabase.auth.currentUser?.id  // UUID
```

### Supabase Dashboard Setup
1. **Enable providers**: Auth → Providers → Enable Email, Apple, Google
2. **Apple config**: Add Service ID, Team ID, Key ID, Private Key from Apple Developer Portal
3. **Google config**: Add Client ID and Client Secret from Google Cloud Console
4. **Email templates**: Customize confirmation and password reset emails

### RLS Policy Migration

Write a single migration to standardize all policies:

```sql
-- Drop the old Clerk function
DROP FUNCTION IF EXISTS public.clerk_user_id();

-- Rewrite all policies to use auth.uid()
-- Example for pantry_items:
DROP POLICY IF EXISTS "Users can view own items" ON pantry_items;
CREATE POLICY "Users can view own items" ON pantry_items
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()::text
    )
  );

-- Repeat for all tables: pantry_events, grocery_list_items,
-- storage_locations, households, household_members, etc.
```

**Note**: `auth.uid()` returns UUID, but existing `user_id` columns are TEXT. Use `auth.uid()::text` for compatibility, or migrate columns to UUID type for a clean start.

### Profile Creation (Server-Side)

Instead of using the service role key client-side (the critical vulnerability), use a Supabase database trigger:

```sql
-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, subscription_tier, subscription_status)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'basic',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This eliminates the need for the service role key entirely — profiles are created automatically by the database.

---

## 8. Subscription & Payments (StoreKit 2)

### Why StoreKit Instead of Stripe

Apple **requires** apps to use In-App Purchase (IAP) for digital subscriptions. You cannot use Stripe for subscriptions sold within an iOS app. Apple takes a 15-30% commission.

### Product Setup in App Store Connect

```
Products to create:
├── com.mealsaver.premium.monthly      ($14.99/month)
├── com.mealsaver.premium.yearly       ($99.99/year)
├── com.mealsaver.household.monthly    ($14.99/month)
└── com.mealsaver.household.yearly     ($149.99/year)
```

### StoreKit 2 Implementation

```swift
import StoreKit

class SubscriptionService {
    func purchase(_ product: Product) async throws -> Transaction {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await updateSupabaseSubscription(transaction)
            await transaction.finish()
            return transaction
        case .userCancelled:
            throw SubscriptionError.cancelled
        case .pending:
            throw SubscriptionError.pending
        @unknown default:
            throw SubscriptionError.unknown
        }
    }

    func updateSupabaseSubscription(_ transaction: Transaction) async {
        // Sync subscription state to Supabase
        try await supabase.from("subscriptions").upsert([
            "user_id": userId,
            "apple_product_id": transaction.productID,
            "apple_transaction_id": String(transaction.id),
            "plan_tier": tierFromProductId(transaction.productID),
            "status": "active",
            "current_period_end": transaction.expirationDate?.iso8601
        ]).execute()

        // Update profile tier
        try await supabase.from("profiles")
            .update(["subscription_tier": tierFromProductId(transaction.productID),
                      "subscription_status": "active"])
            .eq("id", userId).execute()
    }

    // Listen for transaction updates (renewals, cancellations)
    func listenForTransactions() async {
        for await result in Transaction.updates {
            if let transaction = try? checkVerified(result) {
                await updateSupabaseSubscription(transaction)
                await transaction.finish()
            }
        }
    }
}
```

### Server-Side Receipt Validation (Recommended)

Create a Supabase Edge Function to validate Apple receipts server-side using the App Store Server API. This prevents users from faking subscription status.

### Database Changes for StoreKit

```sql
ALTER TABLE subscriptions
    ADD COLUMN apple_product_id TEXT,
    ADD COLUMN apple_transaction_id TEXT,
    ADD COLUMN apple_original_transaction_id TEXT;
```

---

## 9. AI Integration (Gemma 4 On-Device)

### Why On-Device Instead of Cloud API

| | Cloud API (Gemini) | On-Device (Gemma 4) |
|---|---|---|
| Privacy | Food data sent to Google servers | Data never leaves the device |
| Cost | Per-request API charges | Free after model download |
| Latency | 1-3s network round-trip | ~0.5-2s local inference |
| Offline | Requires internet | Works anywhere |
| API Keys | Must secure/rotate/proxy keys | No keys needed |
| Rate Limits | Quota/429 errors possible | Unlimited local usage |

### Model Selection

- **Gemma 4 2B (E2B-it)**: ~1.5GB, faster inference, good for recipe generation and simple extraction tasks. Recommended starting point.
- **Gemma 4 4B (E4B-it)**: ~3GB, higher quality output, better for complex receipt parsing. Use if 2B quality is insufficient.

Both models are instruction-tuned (`-it`) which is what you need for structured prompts.

### Model Delivery Strategy

**Do NOT bundle the model in the app binary** (would make the app 1.5-3GB to download from App Store).

Instead, download on first use:
```swift
class GemmaModelManager: ObservableObject {
    @Published var isDownloaded = false
    @Published var downloadProgress: Double = 0

    private let modelURL = URL(string: "https://your-cdn.com/gemma-4-2b-it.mlmodelc.zip")!
    private var localModelPath: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("gemma-4-2b-it.mlmodelc")
    }

    func downloadModelIfNeeded() async throws {
        if FileManager.default.fileExists(atPath: localModelPath.path) {
            isDownloaded = true
            return
        }

        // Download with progress tracking
        let (tempURL, _) = try await URLSession.shared.download(from: modelURL)
        // Unzip and move to localModelPath
        try FileManager.default.moveItem(at: tempURL, to: localModelPath)
        isDownloaded = true
    }
}
```

**Hosting options for the model file**:
- Supabase Storage (free tier has limits)
- Cloudflare R2 (free egress)
- Apple's On-Demand Resources (ODR) — built into Xcode, Apple hosts the files

### Inference with MediaPipe LLM Inference API

```swift
import MediaPipeTasksGenAI

class GemmaService {
    private var llmInference: LlmInference?

    func loadModel() throws {
        let options = LlmInference.Options(modelPath: localModelPath.path)
        options.maxTokens = 1024
        options.temperature = 0.7
        llmInference = try LlmInference(options: options)
    }

    // Recipe generation
    func generateRecipes(ingredients: [String]) async throws -> [Recipe] {
        let prompt = """
        Generate 6 creative recipes using these expiring ingredients: \(ingredients.joined(separator: ", "))

        Return ONLY valid JSON:
        {"recipes": [{"title": "...", "description": "...", "cookTime": 30, "servings": 4, "difficulty": "Easy", "ingredients": ["..."], "instructions": ["..."], "usedIngredients": ["..."]}]}
        """

        let response = try llmInference?.generateResponse(inputText: prompt)
        // Parse JSON from response
        guard let jsonData = response?.data(using: .utf8),
              let result = try? JSONDecoder().decode(RecipeResponse.self, from: jsonData) else {
            throw AIError.parseFailure
        }
        return result.recipes
    }

    // Receipt/barcode parsing
    func parseImage(image: UIImage, mode: ScanMode) async throws -> [ScannedItem] {
        // Convert image to text using Vision framework first
        let recognizedText = try await extractText(from: image)

        let prompt: String
        switch mode {
        case .receipt:
            prompt = """
            Extract grocery items from this receipt text:
            \(recognizedText)
            Return JSON: {"items": [{"name": "...", "quantity": 1, "category": "..."}]}
            """
        case .barcode:
            prompt = """
            This is text from a product label/barcode area:
            \(recognizedText)
            Identify the product. Return JSON: {"name": "...", "brand": "...", "category": "...", "estimatedExpiry": "YYYY-MM-DD"}
            """
        }

        let response = try llmInference?.generateResponse(inputText: prompt)
        // Parse and return
    }

    // Use Apple Vision framework for OCR (no AI API needed)
    private func extractText(from image: UIImage) async throws -> String {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        let handler = VNImageRequestHandler(cgImage: image.cgImage!)
        try handler.perform([request])
        return request.results?.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n") ?? ""
    }
}
```

### Alternative: Core ML Direct

If MediaPipe doesn't support Gemma 4 yet at build time, convert the model to Core ML format:

```bash
# Convert Gemma model to Core ML (using coremltools)
pip install coremltools
python -c "
import coremltools as ct
# Load and convert the Gemma model
# See Google's documentation for exact conversion steps
"
```

Then use `MLModel` directly in Swift. Check Google's latest documentation for Gemma 4 iOS deployment at build time — the ecosystem is evolving quickly.

### Graceful Degradation

If the model hasn't been downloaded yet, or if the device doesn't have enough RAM:
- Show a prompt to download the AI model (with size warning)
- Offer a "basic mode" without AI features
- For very old devices (iPhone 8, etc.), skip AI entirely and show manual-only interface

---

## 10. Push Notifications

Replace the web-based email notifications with APNs.

### Setup
1. Enable Push Notifications capability in Xcode
2. Create APNs key in Apple Developer Portal
3. Store APNs key in Supabase secrets
4. Register device token on app launch

### Notification Types (Same as Web)
| Type | Trigger | Content |
|------|---------|---------|
| Daily Digest | 8 AM cron | "You have X items expiring in the next 3 days" |
| Critical Alert | 7 AM & 6 PM cron | "X items expire TODAY — use or freeze them!" |
| Weekly Summary | Monday 8 AM cron | "Last week: X consumed, Y wasted. Waste rate: Z%" |

### Implementation
```swift
// Register for push on launch
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    Task {
        try await supabase.from("profiles")
            .update(["device_token": token])
            .eq("id", userId).execute()
    }
}
```

Create a Supabase Edge Function (or use `pg_cron` + `pg_net`) to send push notifications via APNs HTTP/2 API.

---

## 11. Data Layer & Offline Support

### Local Caching with SwiftData

```swift
@Model
class CachedPantryItem {
    var id: UUID
    var name: String
    var quantity: Double
    var category: String?
    var expiryDate: Date?
    var lastSynced: Date

    // Sync status
    var needsSync: Bool = false
    var pendingAction: String? // "insert", "update", "delete"
}
```

### Sync Strategy
1. **On launch**: Fetch all items from Supabase, update local cache
2. **On action**: Write to local cache immediately (optimistic), then sync to Supabase
3. **On network restore**: Push any pending local changes
4. **Conflict resolution**: Server wins (last-write-wins with timestamp comparison)

### What to Cache
- Pantry items (full list)
- Grocery list items
- Storage locations
- User profile & subscription status
- Recent events (last 30 days)

### What NOT to Cache
- Recipes (generated on-demand)
- Achievement progress (lightweight, always fetch)
- Household members (changes infrequently, always fetch)

---

## 12. Testing Strategy

### Unit Tests
- All ViewModel business logic (calculations, data transformations)
- Service layer with mocked Supabase responses
- Date calculations (expiry logic, streak counting)
- Subscription tier checks

### UI Tests
- Core user flows: add item → consume → check analytics
- Onboarding flow
- Purchase flow (StoreKit testing in Xcode)

### Integration Tests
- Supabase queries against test database
- Edge Function calls
- StoreKit 2 sandbox testing

---

## 13. App Store Readiness

### Required for Submission
- [ ] Sign in with Apple implemented (required since Google Sign-In is offered)
- [ ] StoreKit 2 for all subscriptions (no Stripe)
- [ ] Privacy nutrition labels configured
- [ ] App Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Camera usage description (NSCameraUsageDescription) for scanner
- [ ] Photo library usage description (NSPhotoLibraryUsageDescription) for receipt scanning
- [ ] Push notification entitlement
- [ ] App icons (all sizes)
- [ ] Launch screen (storyboard or SwiftUI)
- [ ] Screenshots for all required device sizes

### Privacy Nutrition Labels
Data collected:
- **Contact Info**: Email (for account)
- **Identifiers**: User ID
- **Usage Data**: Product interaction (analytics)
- **Purchases**: Purchase history (subscriptions)
- **User Content**: Photos (scanner — processed on-device only, never uploaded)

Data NOT collected (marketing differentiator):
- No food/dietary data sent to third-party AI services
- No tracking across apps
- Photos are processed locally and discarded after extraction

### Review Guidelines to Watch
- **4.3 Spam**: Make sure the app is distinct from web version in functionality
- **3.1.1 IAP**: All digital subscriptions must use IAP
- **5.1.1 Data Collection**: Disclose Supabase data sync in privacy policy. On-device AI is a positive here — Apple favors on-device processing.
- **2.1 App Completeness**: All features must work (no stubs)
- **2.3.3 On-Demand Resources**: If using ODR for Gemma model delivery, follow Apple's guidelines for download size and user communication

---

## 14. Migration Checklist

### Phase 1: Backend Prep (Before iOS Development)
- [ ] Fix service role key exposure — remove from `.env`, create DB trigger for profile creation (Section 2.1)
- [ ] Remove `.env` from git history (Section 2.2)
- [ ] Rotate all exposed API keys
- [ ] Remove Clerk — write migration to drop `clerk_user_id()`, rewrite all RLS policies to use `auth.uid()` (Section 7)
- [ ] Enable Supabase Auth providers: Email, Apple, Google (Supabase Dashboard)
- [ ] Add subscription limit enforcement to RLS policies (Section 2.4)
- [ ] Fix household INSERT policy (Section 2.6)
- [ ] Add `apple_product_id` / `apple_transaction_id` columns to subscriptions
- [ ] Add `device_token` column to profiles
- [ ] Add index on `pantry_items.expiry_date`

### Phase 2: Core iOS App (MVP)
- [ ] Project setup (SwiftUI, SPM dependencies — supabase-swift, mediapipe)
- [ ] Auth: Supabase Auth (email + Sign in with Apple + Google)
- [ ] Supabase client configuration
- [ ] Tab navigation structure
- [ ] Dashboard view
- [ ] Inventory CRUD
- [ ] Grocery list
- [ ] Profile view

### Phase 3: AI & Premium Features
- [ ] Gemma 4 model download manager (on-demand, ~1.5GB)
- [ ] On-device recipe generation
- [ ] On-device scanner (Vision OCR + Gemma extraction)
- [ ] StoreKit 2 subscriptions
- [ ] Analytics with Swift Charts
- [ ] Push notifications (APNs)

### Phase 4: Social & Polish
- [ ] Household management
- [ ] Achievement system with badge celebrations
- [ ] Offline support (SwiftData cache)
- [ ] Storage locations
- [ ] Onboarding flow
- [ ] Privacy marketing copy in App Store listing
- [ ] App Store submission

---

## Appendix: Subscription Tier Limits Reference

| Feature | Basic (Free) | Premium ($14.99/mo) | Household Premium ($14.99/mo) |
|---------|-------------|--------------------|-----------------------------|
| Pantry items | 50 | Unlimited | Unlimited |
| AI scans/month | 10 | Unlimited | Unlimited |
| Recipes/week | 3 | Unlimited | Unlimited |
| Storage locations | 3 | 6 | Unlimited |
| Household members | 1 (self) | 3 | Unlimited |
| Analytics | Basic | Advanced | Advanced + Household |
| Email notifications | None | All types | All types |

---

*Generated from full codebase audit of https://github.com/odphineguy/dashboard*
*For questions about this guide, refer to the source React codebase and CLAUDE.md*
