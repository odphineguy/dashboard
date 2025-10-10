# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meal Saver Dashboard** is a React-based food pantry management application that helps users track inventory, reduce food waste, and get AI-powered recipe suggestions. The app uses Supabase for backend services and Google Gemini for AI features.

> **Note on Project Name:** This project was initially named "smart_pantry" and you may see this name referenced in:
> - Google Cloud Console (OAuth client names, API configurations)
> - Supabase project settings and database names
> - Git history and legacy documentation
> - The reference project directory at `~/Documents/smart_pantry`
>
> The project has been renamed to "Meal Saver" but external services retain the original name for compatibility.

## Development Commands

```bash
# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Lint code
npm run lint
```

## Environment Setup

Required environment variables in `.env`:

```bash
# Supabase (Backend & Auth)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI (Scanner & Recipe Generation)
VITE_GOOGLE_GENAI_API_KEY=your_google_ai_key
```

**Note:** All environment variables must be prefixed with `VITE_` to be accessible in the React app.

## Architecture

### Routing & Layout Structure

The app uses React Router with a centralized routing configuration in `src/Routes.jsx`:

- **MainLayout Component**: Provides consistent layout with sidebar, header, and search bar
- **ProtectedRoute Component**: Wraps authenticated pages, redirects to login if not authenticated
- All routes except `/login` are protected and wrapped in MainLayout

**Route Pattern:**
```jsx
<Route path="/page" element={
  <ProtectedRoute element={
    <MainLayout>
      <PageComponent />
    </MainLayout>
  } />
} />
```

### Authentication Flow

Managed by `AuthContext` (`src/contexts/AuthContext.jsx`):
- Uses Supabase Auth for user management
- Provides `user`, `loading`, `signUp`, `signIn`, `signOut` via context
- Auto-handles session restoration on app load
- All components access auth via `useAuth()` hook

### Database Architecture (Supabase)

**Key Tables:**
- `pantry_items` - User's food inventory (name, quantity, expiry_date, category, user_id, household_id)
- `pantry_events` - Consumption/waste tracking (type: 'consumed'|'wasted', quantity, at, user_id)
- `profiles` - User profiles (full_name, avatar)
- `households` - Multi-user household groups (planned, not yet implemented)

**Data Access Pattern:**
```javascript
// Always filter by user_id for personal items
const { data } = await supabase
  .from('pantry_items')
  .select('*')
  .eq('user_id', user.id)
```

### Page Structure

Each page follows this pattern:
```
src/pages/PageName/
  ├── index.jsx              # Main page component with logic
  └── components/            # Page-specific components
      ├── ComponentA.jsx
      └── ComponentB.jsx
```

**Current Pages:**
1. **Dashboard** (`/`) - Home page with overview, metrics, expiring items, charts
2. **Analytics** (`/analytics`) - Detailed charts and KPIs using existing chart components
3. **Inventory** (`/inventory`) - Full CRUD for pantry items with search, filters, bulk actions
4. **Recipes** (`/recipes`) - AI-generated recipes based on expiring ingredients
5. **Scanner** (`/scanner`) - AI-powered barcode/receipt scanning (dedicated page)

### AI Integration

**Two AI Systems:**

1. **Google Gemini Vision API** (Scanner - `/scanner` page)
   - Barcode scanning → product identification via OpenFoodFacts
   - Receipt scanning → item extraction from grocery receipts
   - Uses browser file input (no native plugins needed)
   - Configured in `src/ai/` directory with Genkit flows

2. **Google Gemini Text API** (Recipes - `/recipes` page)
   - Generates 6 recipes based on expiring ingredients
   - Returns structured JSON with ingredients, instructions, cook time
   - More reliable than Vision API (text-only, no image processing)

**Important:** Scanner modals should NOT be integrated into other pages due to API stability issues. Keep scanner on dedicated `/scanner` page.

### Email Notifications

**Status:** ✅ Implemented (Email only - no SMS or Push)

**Architecture:**
- **Edge Function**: `supabase/functions/send-email-notifications/index.ts`
- **Email Service**: Resend API (free tier: 3,000 emails/month)
- **Scheduling**: Supabase pg_cron for automated sending
- **Templates**: Responsive HTML emails with item tables

**Notification Types:**
1. **Daily Digest** - Items expiring in 0-3 days (8 AM daily)
2. **Critical Alerts** - Items expiring today (7 AM & 6 PM)
3. **Weekly Summary** - Items expiring in next 7 days (Monday 8 AM)

**User Control:**
- Profile → Notification Preferences (email-only checkboxes)
- Preferences stored in `profiles.notification_preferences` (JSONB)
- Function respects user preferences before sending

**Setup & Testing:**
- See `EMAIL_NOTIFICATIONS_SETUP.md` for full deployment guide
- Test script: `./test-email-notification.sh [daily|critical|weekly]`
- Deploy: `supabase functions deploy send-email-notifications`

**Key Files:**
- `supabase/functions/send-email-notifications/index.ts` - Main edge function
- `src/pages/Profile/components/NotificationPreferences.jsx` - UI component
- `EMAIL_NOTIFICATIONS_SETUP.md` - Complete setup documentation

### Component Library

**UI Components** (`src/components/ui/`):
- Built with Radix UI primitives + Tailwind CSS
- Includes: Button, Input, Checkbox, Label, etc.
- Follow shadcn/ui patterns for consistency

**Chart Components** (existing in `src/components/`):
- `KPICards.jsx` - Metric cards
- `AdvancedChartRecharts.jsx` - Line/area charts
- `PieChart.jsx`, `PieChart2.jsx` - Category breakdowns
- `BarChart.jsx`, `BarChart2.jsx` - Comparative charts
- All use Recharts library

### Theme System

Managed by `ThemeContext` (`src/contexts/ThemeContext.jsx`):
- Supports light/dark modes
- CSS variables defined in `src/index.css`
- Theme toggle in Header component

## Common Development Patterns

### Adding a New Page

1. Create page directory: `src/pages/NewPage/`
2. Create main component: `src/pages/NewPage/index.jsx`
3. Add route in `src/Routes.jsx`:
```jsx
import NewPage from './pages/NewPage'

<Route path="/newpage" element={
  <ProtectedRoute element={
    <MainLayout><NewPage /></MainLayout>
  } />
} />
```
4. Update sidebar: `src/components/AppSidebar.jsx`
```jsx
<NavLink to="/newpage" onClick={onClose} className={...}>
  <Icon className="h-5 w-5" />
  <span className="text-sm">New Page</span>
</NavLink>
```

### Working with Supabase Data

**Standard Pattern:**
```javascript
const { user } = useAuth()
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadData = async () => {
    if (!user?.id) return

    try {
      const { data: rows, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setData(rows || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  loadData()
}, [user?.id])
```

### AI Recipe Generation Pattern

```javascript
const generateRecipes = async () => {
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GENAI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `Generate recipes using: ${ingredients.join(', ')}

  Return ONLY valid JSON (no markdown):
  {
    "recipes": [
      {
        "title": "...",
        "description": "...",
        "cookTime": 30,
        "servings": 4,
        "difficulty": "Easy",
        "ingredients": ["..."],
        "instructions": ["..."],
        "usedIngredients": ["..."]
      }
    ]
  }`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const data = JSON.parse(jsonMatch[0])
  return data.recipes
}
```

## Known Issues & Limitations

1. **Scanner Integration**: Do NOT attempt to integrate scanner modals into Inventory or other pages. Google Gemini Vision API returns 500 errors when called from modal contexts. Keep scanner on dedicated `/scanner` page.

2. **Household Management**: Database tables exist but feature is not yet implemented. When building:
   - Filter data by `household_id` when `isPersonal = false`
   - Always include `user_id` for ownership tracking
   - Add household context to all pantry operations

3. **Missing Features**:
   - User profile page
   - Storage location management (tables exist, UI incomplete)
   - Bulk operations for inventory
   - Export/import functionality

## Reference Project

A previous implementation exists at `~/Documents/smart_pantry` which can be referenced for:
- Complete household management implementation
- Storage location UI patterns
- Additional UI components
- Service layer patterns

However, note that smart_pantry used Capacitor plugins which were problematic. This project intentionally uses web-based solutions.

## File Naming Conventions

- **Components**: PascalCase (e.g., `RecipeCard.jsx`)
- **Pages**: Index pattern (e.g., `src/pages/Recipes/index.jsx`)
- **Utilities/Services**: camelCase (e.g., `supabaseClient.js`)
- **Contexts**: PascalCase + "Context" (e.g., `AuthContext.jsx`)

## Critical Database Fields

When working with `pantry_items`:
- `expiry_date` (NOT expirationDate) - stored as ISO date string
- `user_id` - always required, links to auth.users
- `household_id` - nullable, for shared items
- `storage_location_id` - nullable, foreign key to storage_locations

Map to frontend using camelCase:
```javascript
{
  expirationDate: item.expiry_date,
  addedDate: item.created_at,
  storageLocationId: item.storage_location_id
}
```
