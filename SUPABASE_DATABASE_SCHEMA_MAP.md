# Supabase Database Schema Map

## Overview
This document provides a comprehensive map of the Meal Saver Dashboard Supabase database schema, including all tables, relationships, constraints, and authentication patterns.

## Database Architecture

### Schemas
- **`auth`**: Supabase authentication system tables (managed by Supabase)
- **`public`**: Application-specific tables and business logic

---

## Authentication Schema (`auth`)

### Core Authentication Tables

#### `auth.users`
**Primary user authentication table**
- **Primary Key**: `id` (uuid)
- **Purpose**: Stores user login data and authentication information
- **Key Columns**:
  - `id` (uuid, PK): Unique user identifier
  - `email` (varchar): User email address
  - `encrypted_password` (varchar): Hashed password
  - `email_confirmed_at` (timestamptz): Email confirmation timestamp
  - `created_at` (timestamptz): Account creation time
  - `raw_user_meta_data` (jsonb): Custom user metadata
  - `is_sso_user` (boolean): SSO account flag
  - `is_anonymous` (boolean): Anonymous user flag

#### `auth.sessions`
**Active user sessions**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `auth.users.id`
  - `oauth_client_id` → `auth.oauth_clients.id`
- **Purpose**: Manages user session data and authentication state

#### `auth.identities`
**User identity providers (OAuth, SSO)**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `user_id` → `auth.users.id`
- **Purpose**: Links users to external identity providers (Google, GitHub, etc.)

#### `auth.refresh_tokens`
**JWT refresh token storage**
- **Primary Key**: `id` (bigint)
- **Foreign Keys**: `session_id` → `auth.sessions.id`
- **Purpose**: Stores refresh tokens for JWT renewal

### MFA (Multi-Factor Authentication) Tables

#### `auth.mfa_factors`
**MFA factor configuration**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `user_id` → `auth.users.id`
- **Purpose**: Stores MFA factor metadata (TOTP, WebAuthn, phone)

#### `auth.mfa_challenges`
**MFA challenge requests**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `factor_id` → `auth.mfa_factors.id`
- **Purpose**: Tracks MFA challenge attempts

#### `auth.mfa_amr_claims`
**Authentication Method Reference claims**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `session_id` → `auth.sessions.id`
- **Purpose**: Stores AMR claims for MFA sessions

### OAuth & SSO Tables

#### `auth.oauth_clients`
**OAuth client applications**
- **Primary Key**: `id` (uuid)
- **Purpose**: Manages OAuth client registrations and configurations

#### `auth.oauth_authorizations`
**OAuth authorization grants**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `auth.users.id`
  - `client_id` → `auth.oauth_clients.id`
- **Purpose**: Tracks OAuth authorization flows

#### `auth.oauth_consents`
**OAuth consent records**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `auth.users.id`
  - `client_id` → `auth.oauth_clients.id`
- **Purpose**: Stores user consent for OAuth scopes

#### `auth.sso_providers`
**SSO identity providers**
- **Primary Key**: `id` (uuid)
- **Purpose**: Manages SSO provider configurations

#### `auth.sso_domains`
**SSO domain mappings**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `sso_provider_id` → `auth.sso_providers.id`
- **Purpose**: Maps email domains to SSO providers

#### `auth.saml_providers`
**SAML identity providers**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `sso_provider_id` → `auth.sso_providers.id`
- **Purpose**: Manages SAML provider configurations

#### `auth.saml_relay_states`
**SAML relay state storage**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `sso_provider_id` → `auth.sso_providers.id`
  - `flow_state_id` → `auth.flow_state.id`
- **Purpose**: Stores SAML relay state for SP-initiated logins

### Supporting Tables

#### `auth.flow_state`
**PKCE and OAuth flow state**
- **Primary Key**: `id` (uuid)
- **Purpose**: Manages OAuth PKCE flow state

#### `auth.one_time_tokens`
**One-time authentication tokens**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `user_id` → `auth.users.id`
- **Purpose**: Stores temporary tokens for password reset, email confirmation, etc.

#### `auth.audit_log_entries`
**Authentication audit trail**
- **Primary Key**: `id` (uuid)
- **Purpose**: Logs authentication events and user actions

#### `auth.instances`
**Multi-tenant instance management**
- **Primary Key**: `id` (uuid)
- **Purpose**: Manages users across multiple sites

#### `auth.schema_migrations`
**Auth system migrations**
- **Primary Key**: `version` (varchar)
- **Purpose**: Tracks auth system schema updates

---

## Public Schema (Application Tables)

### User Management

#### `profiles`
**User profile information**
- **Primary Key**: `id` (text) - References `auth.users.id`
- **Purpose**: Extended user profile data beyond authentication
- **Key Columns**:
  - `id` (text, PK): User ID (matches auth.users.id)
  - `full_name` (text): User's display name
  - `email` (text): User's email address
  - `avatar_url` (text): Profile picture URL
  - `subscription_tier` (text): User's subscription level
  - `subscription_status` (text): Subscription status
  - `stripe_customer_id` (text): Stripe customer reference
  - `onboarding_completed` (boolean): Onboarding completion flag
  - `onboarding_data` (jsonb): Onboarding form data
  - `household_size` (integer): Number of household members
  - `dietary_preferences` (text[]): User's dietary restrictions

### Core Business Logic

#### `pantry_items`
**Food inventory items**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `household_id` → `households.id`
  - `storage_location_id` → `storage_locations.id`
- **Purpose**: Stores user's food inventory
- **Key Columns**:
  - `id` (uuid, PK): Unique item identifier
  - `user_id` (text): Owner of the item
  - `name` (text): Item name
  - `quantity` (numeric): Amount of item
  - `unit` (text): Unit of measurement
  - `category` (text): Food category
  - `expiry_date` (date): Expiration date
  - `storage_location_id` (uuid): Where item is stored
  - `household_id` (uuid): Shared household item
  - `fatsecret_food_id` (text): External API reference
  - `data_source` (text): How item was added (manual/barcode/fatsecret)
  - `brand` (text): Product brand
  - `purchase_date` (timestamptz): When item was purchased
  - `shelf_life_days` (integer): Expected shelf life
  - `shelf_life_source` (text): Source of shelf life data

#### `pantry_events`
**Item consumption and waste tracking**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `household_id` → `households.id`
- **Purpose**: Tracks when items are consumed or wasted
- **Key Columns**:
  - `id` (uuid, PK): Unique event identifier
  - `user_id` (text): User who logged the event
  - `item_id` (uuid): Related pantry item (nullable)
  - `type` (text): Event type ('consumed' or 'wasted')
  - `name` (text): Item name (for deleted items)
  - `quantity` (numeric): Amount consumed/wasted
  - `unit` (text): Unit of measurement
  - `category` (text): Food category
  - `at` (timestamptz): When event occurred

#### `activity_log`
**Comprehensive activity tracking**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `item_id` → `pantry_items.id`
  - `household_id` → `households.id`
- **Purpose**: Detailed audit trail of all user actions
- **Key Columns**:
  - `id` (uuid, PK): Unique log entry identifier
  - `user_id` (text): User who performed action
  - `item_id` (uuid): Related pantry item (nullable)
  - `action` (text): Action type ('add', 'consume', 'edit', 'expire', 'delete', 'restore')
  - `delta` (numeric): Quantity change
  - `meta` (jsonb): Additional metadata
  - `household_id` (uuid): Related household

### Storage Management

#### `storage_locations`
**Physical storage locations**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `household_id` → `households.id`
- **Purpose**: Defines where items are stored
- **Key Columns**:
  - `id` (uuid, PK): Unique location identifier
  - `user_id` (text): Owner of the location
  - `name` (text): Location name (e.g., "Main Fridge")
  - `description` (text): Location description
  - `location_type` (text): Type ('pantry', 'fridge', 'freezer', 'other')
  - `is_active` (boolean): Whether location is active
  - `sort_order` (integer): Display order
  - `household_id` (uuid): Shared household location

### Household Management

#### `households`
**Multi-user household groups**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `created_by` → `profiles.id`
- **Purpose**: Groups users into shared households
- **Key Columns**:
  - `id` (uuid, PK): Unique household identifier
  - `name` (text): Household name
  - `created_by` (text): User who created the household
  - `created_at` (timestamptz): Creation timestamp
  - `updated_at` (timestamptz): Last update timestamp

#### `household_members`
**Household membership**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `household_id` → `households.id`
  - `user_id` → `profiles.id`
- **Purpose**: Links users to households with roles
- **Key Columns**:
  - `id` (uuid, PK): Unique membership identifier
  - `household_id` (uuid): Household reference
  - `user_id` (text): User reference
  - `role` (text): User role ('admin', 'member')
  - `joined_at` (timestamptz): When user joined

#### `household_invitations`
**Pending household invitations**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `household_id` → `households.id`
- **Purpose**: Manages household invitation workflow
- **Key Columns**:
  - `id` (uuid, PK): Unique invitation identifier
  - `household_id` (uuid): Household being invited to
  - `email` (text): Invited user's email
  - `invited_by` (text): User who sent invitation
  - `status` (text): Invitation status ('pending', 'accepted', 'declined')
  - `created_at` (timestamptz): Invitation timestamp

### Subscription & Payment System

#### `subscriptions`
**Stripe subscription management**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `user_id` → `profiles.id`
- **Purpose**: Tracks user subscriptions and billing
- **Key Columns**:
  - `id` (uuid, PK): Unique subscription identifier
  - `user_id` (text): Subscriber user
  - `stripe_customer_id` (text): Stripe customer reference
  - `stripe_subscription_id` (text): Stripe subscription reference
  - `stripe_price_id` (text): Stripe price reference
  - `plan_tier` (text): Subscription tier ('free', 'premium', 'household_premium')
  - `billing_interval` (text): Billing frequency ('month', 'year')
  - `status` (text): Subscription status
  - `current_period_start` (timestamptz): Current billing period start
  - `current_period_end` (timestamptz): Current billing period end
  - `cancel_at_period_end` (boolean): Cancel at period end flag
  - `canceled_at` (timestamptz): Cancellation timestamp
  - `trial_end` (timestamptz): Trial period end

#### `payment_history`
**Payment transaction log**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `user_id` → `profiles.id`
- **Purpose**: Audit trail of all payments
- **Key Columns**:
  - `id` (uuid, PK): Unique payment identifier
  - `user_id` (text): Paying user
  - `stripe_payment_intent_id` (text): Stripe payment intent
  - `stripe_invoice_id` (text): Stripe invoice reference
  - `stripe_charge_id` (text): Stripe charge reference
  - `amount` (integer): Payment amount in cents
  - `currency` (text): Payment currency (default: 'usd')
  - `status` (text): Payment status ('succeeded', 'failed', 'pending')
  - `description` (text): Payment description
  - `receipt_url` (text): Stripe receipt URL

#### `stripe_webhooks_log`
**Stripe webhook event log**
- **Primary Key**: `id` (uuid)
- **Purpose**: Logs all Stripe webhook events for debugging
- **Key Columns**:
  - `id` (uuid, PK): Unique log identifier
  - `event_id` (text): Stripe event ID (unique)
  - `event_type` (text): Stripe event type
  - `payload` (jsonb): Full webhook payload
  - `processed` (boolean): Whether event was processed
  - `processed_at` (timestamptz): Processing timestamp
  - `error` (text): Error message if processing failed

### Recipe & AI Features

#### `recipe_suggestions`
**AI-generated recipe suggestions**
- **Primary Key**: `id` (uuid)
- **Purpose**: Stores AI-generated recipe recommendations
- **Key Columns**:
  - `id` (uuid, PK): Unique suggestion identifier
  - `user_id` (text): User who received suggestion
  - `title` (text): Recipe title
  - `url` (text): Recipe URL (nullable)
  - `source` (text): Recipe source
  - `ingredients` (jsonb): Recipe ingredients list
  - `items_snapshot` (jsonb): Pantry items used
  - `model` (text): AI model used
  - `prompt` (text): AI prompt used

#### `ai_saved_recipes`
**User-saved AI recipes**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `household_id` → `households.id`
- **Purpose**: Stores user-saved AI-generated recipes
- **Key Columns**:
  - `id` (uuid, PK): Unique recipe identifier
  - `user_id` (text): User who saved recipe
  - `household_id` (uuid): Shared household recipe
  - `recipe_data` (jsonb): Complete recipe data
  - `created_at` (timestamptz): Save timestamp

#### `user_saved_recipes`
**External recipe bookmarks**
- **Primary Key**: `id` (uuid)
- **Foreign Keys**: `household_id` → `households.id`
- **Purpose**: User-saved external recipes
- **Key Columns**:
  - `id` (uuid, PK): Unique bookmark identifier
  - `user_id` (text): User who saved recipe
  - `fatsecret_recipe_id` (text): External recipe ID
  - `saved_at` (timestamptz): Save timestamp
  - `category` (text): Recipe category
  - `user_notes` (text): User's notes
  - `household_id` (uuid): Shared household recipe

### Achievement System

#### `achievements_catalog`
**Available achievements**
- **Primary Key**: `id` (bigint)
- **Purpose**: Defines all possible user achievements
- **Key Columns**:
  - `id` (bigint, PK): Unique achievement identifier
  - `key` (text): Achievement key (unique)
  - `title` (text): Achievement title
  - `description` (text): Achievement description
  - `tier` (text): Achievement tier ('gold', 'silver', 'bronze')
  - `rule_type` (text): Achievement rule type
  - `rule_value` (integer): Rule threshold value
  - `unit` (text): Rule unit of measurement

#### `user_achievements`
**User achievement progress**
- **Primary Key**: `id` (bigint)
- **Foreign Keys**: 
  - `user_id` → `profiles.id`
  - `achievement_key` → `achievements_catalog.key`
- **Purpose**: Tracks user achievement progress and unlocks
- **Key Columns**:
  - `id` (bigint, PK): Unique progress identifier
  - `user_id` (text): User earning achievement
  - `achievement_key` (text): Achievement reference
  - `unlocked_at` (timestamptz): When achievement was unlocked
  - `progress` (integer): Current progress value
  - `requirement` (integer): Required value to unlock

### External Integrations

#### `user_integrations`
**Third-party service integrations**
- **Primary Key**: `id` (bigint)
- **Foreign Keys**: `user_id` → `profiles.id`
- **Purpose**: Manages user connections to external services
- **Key Columns**:
  - `id` (bigint, PK): Unique integration identifier
  - `user_id` (text): User with integration
  - `provider` (text): Integration provider ('gmail')
  - `access_token` (text): OAuth access token
  - `refresh_token` (text): OAuth refresh token
  - `expires_at` (timestamptz): Token expiration
  - `created_at` (timestamptz): Integration creation

#### `user_food_entries`
**External food logging entries**
- **Primary Key**: `id` (uuid)
- **Purpose**: Logs food consumption from external sources
- **Key Columns**:
  - `id` (uuid, PK): Unique entry identifier
  - `user_id` (text): User who logged entry
  - `fatsecret_food_id` (text): External food reference
  - `fatsecret_serving_id` (text): External serving reference
  - `quantity` (numeric): Amount consumed
  - `unit` (text): Unit of measurement
  - `date_logged` (timestamptz): When food was consumed
  - `entry_method` (text): How entry was made ('photo', 'text', 'search', 'barcode')
  - `entry_metadata` (jsonb): Additional entry data

#### `user_foods`
**User's custom food database**
- **Primary Key**: `id` (bigint)
- **Purpose**: User-defined food items
- **Key Columns**:
  - `id` (bigint, PK): Unique food identifier
  - `user_id` (text): Food owner
  - `name` (text): Food name
  - `expiration_date` (date): Food expiration date

### Backup Tables

#### `pantry_items_backup`
**Backup of pantry items**
- **Purpose**: Backup table for pantry items data
- **Key Columns**: Same as `pantry_items` plus `backup_created_at`

#### `pantry_events_backup`
**Backup of pantry events**
- **Purpose**: Backup table for pantry events data
- **Key Columns**: Same as `pantry_events` plus `backup_created_at`

#### `user_foods_backup`
**Backup of user foods**
- **Purpose**: Backup table for user foods data
- **Key Columns**: Same as `user_foods` plus `backup_created_at`

---

## Key Relationships

### Authentication Flow
```
auth.users (1) ←→ (1) profiles
auth.users (1) ←→ (many) auth.sessions
auth.users (1) ←→ (many) auth.identities
auth.sessions (1) ←→ (many) auth.refresh_tokens
```

### Core Business Logic
```
profiles (1) ←→ (many) pantry_items
profiles (1) ←→ (many) pantry_events
profiles (1) ←→ (many) activity_log
profiles (1) ←→ (many) storage_locations
```

### Household Management
```
profiles (1) ←→ (many) households (as creator)
households (1) ←→ (many) household_members
households (1) ←→ (many) household_invitations
households (1) ←→ (many) pantry_items (shared items)
households (1) ←→ (many) storage_locations (shared locations)
```

### Subscription System
```
profiles (1) ←→ (1) subscriptions
profiles (1) ←→ (many) payment_history
subscriptions (1) ←→ (many) stripe_webhooks_log
```

### Recipe System
```
profiles (1) ←→ (many) recipe_suggestions
profiles (1) ←→ (many) ai_saved_recipes
profiles (1) ←→ (many) user_saved_recipes
households (1) ←→ (many) ai_saved_recipes (shared recipes)
```

---

## Row Level Security (RLS) Policies

### Authentication Integration
- **Clerk Integration**: Most policies use `clerk_user_id()` function to identify current user
- **Service Role Access**: Many tables allow `service_role` for administrative operations
- **Household Access**: Users can access shared household data through `household_members` relationship

### Key Policy Patterns

#### User Data Access
```sql
-- Users can only access their own data
clerk_user_id() = user_id
```

#### Household Data Access
```sql
-- Users can access household data if they're members
household_id IN (
  SELECT household_members.household_id
  FROM household_members
  WHERE household_members.user_id = clerk_user_id()
)
```

#### Service Role Access
```sql
-- Service role can access all data
current_setting('role'::text, true) = 'service_role'::text
```

---

## Custom Functions

### Authentication Functions
- `clerk_user_id()`: Returns current user ID from JWT claims
- `user_belongs_to_household(household_uuid)`: Checks if user belongs to household

### Subscription Functions
- `get_subscription_limits(user_id)`: Returns user's subscription limits
- `has_feature_access(user_id, feature)`: Checks if user has access to feature
- `can_add_pantry_item(user_id)`: Checks if user can add more pantry items
- `get_user_subscription(user_id)`: Gets user's active subscription
- `update_user_subscription_tier(user_id, tier, status, customer_id)`: Updates user subscription

### Data Management Functions
- `get_pantry_items_with_status(user_id)`: Returns pantry items with expiry status
- `create_default_storage_locations()`: Creates default storage locations for new users
- `sync_subscription_to_profile()`: Syncs subscription data to profile
- `refresh_user_achievements()`: Updates user achievement progress

### External Integration Functions
- `get_cached_fatsecret_data(cache_key)`: Retrieves cached external API data
- `cache_fatsecret_data(cache_key, data, expires_hours)`: Caches external API data
- `clean_expired_fatsecret_cache()`: Cleans up expired cache entries
- `get_or_create_fatsecret_reference()`: Manages external API references

### Utility Functions
- `handle_updated_at()`: Updates `updated_at` timestamp
- `restore_from_backup()`: Restores data from backup tables
- `rollback_migration()`: Rolls back database migrations

---

## Database Constraints

### Primary Keys
- All tables have UUID primary keys (except some with bigint)
- Composite primary keys for junction tables

### Foreign Key Constraints
- All foreign keys properly reference parent tables
- Cascade deletes where appropriate
- Nullable foreign keys for optional relationships

### Check Constraints
- Enum-like constraints for status fields
- Data validation constraints (e.g., positive quantities)
- Subscription tier validation

### Unique Constraints
- Email addresses are unique where applicable
- Stripe subscription IDs are unique
- User-household memberships are unique
- Achievement progress per user is unique

---

## Migration History

### Recent Migrations
1. `20251011175316` - Add onboarding completed flag
2. `20251013230000` - Create profile trigger
3. `20251016000000` - Add subscription system
4. `20251016000001` - Add subscription functions
5. `20251021000000` - Add default storage locations
6. `20251022000000` - Clerk compatibility
7. `20251023000000` - Fix profile RLS for Clerk
8. `20251023120000` - Clerk native integration
9. `20251027072747` - Standardize user ID columns to text
10. `20251027072804` - Update remaining RLS policies to Clerk

---

## Security Considerations

### Data Protection
- All user data is protected by RLS policies
- Sensitive data (tokens, payment info) is properly secured
- Audit trails for all critical operations

### Authentication Security
- Multi-factor authentication support
- OAuth and SSO integration
- Session management with refresh tokens
- Anonymous user support

### Business Logic Security
- Subscription-based feature access control
- Household data sharing with proper permissions
- Payment processing with Stripe integration
- External API integration with proper token management

---

## Performance Considerations

### Indexing
- Primary keys are automatically indexed
- Foreign key columns should be indexed for joins
- Frequently queried columns (user_id, household_id) are indexed

### Query Optimization
- Use proper JOIN strategies for household data
- Leverage RLS policies for data filtering
- Consider materialized views for complex analytics

### Caching
- External API data is cached with expiration
- User subscription data is cached in profiles table
- Achievement progress is calculated on-demand

---

This schema supports a comprehensive food pantry management application with multi-user households, subscription-based features, AI-powered recommendations, and robust authentication and payment systems.
