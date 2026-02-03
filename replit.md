# Numerate - Daily Arithmetic Fluency Trainer

## Overview

Numerate is a mobile-first math training application designed to help adults improve their arithmetic fluency through adaptive daily practice sessions. The app features a 3-minute initial assessment to place users at an appropriate starting level, followed by timed training sessions with mixed operations (addition, subtraction, multiplication, division). The system uses a sophisticated progression engine that adapts difficulty based on user performance while maintaining emotionally safe feedback to encourage continued practice.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand with persist middleware for local storage persistence
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables matching the app's logo aesthetic
- **Animation**: Framer Motion for micro-interactions and feedback animations
- **Data Fetching**: TanStack Query for server state management

### Backend Architecture
- **Framework**: Express.js (v5) running on Node.js
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Build System**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema**: Three main tables - `users`, `user_progress`, `sessions`
- **Client Persistence**: Zustand persist middleware stores progression state locally
- **Sync Strategy**: Client maintains local state with periodic backend sync

### Key Design Patterns

**Progression Engine (Two-Layer System)**:
1. Curriculum Gates (Level) - Controls what question types are available based on user level
2. Adaptive Tuning (Skill Ratings) - Adjusts difficulty within allowed templates based on performance

**Question Generation (Level-Based System)**:
- Level directly controls operation mix via `getOperationWeights(level)`:
  - L1-5: 80% add, 20% sub
  - L6-12: 55% add, 45% sub
  - L13-20: 40% add, 35% sub, 25% mul
  - L21-30: 30% add, 30% sub, 25% mul, 15% div
  - L31+: 25% add, 25% sub, 30% mul, 20% div
- Level controls operand ranges via `getDifficultyParams(level)`:
  - maxAddSub = 10 + level * 4 (L10 = 50, L30 = 130)
  - Multiplication unlocks at level 13
  - Division unlocks at level 21 (integer results only)
- Repetition guards to avoid asking the same question patterns repeatedly
- Key files: `difficulty.ts` (weights/params), `generator_adapter.ts` (question generation)

**XP and Scoring**:
- Base XP per question plus performance bonuses
- Fluency score computed from accuracy, speed, consistency, and throughput
- Level thresholds increase progressively (harder to level up over time)

**Audio Feedback**:
- Web Audio API synthesized sounds for zero-latency playback
- Short, unobtrusive sounds for correct/incorrect feedback
- Respects user sound toggle preferences

**Coaching System (Strategy Lessons)**:
- Weakness detection analyzes session question results for patterns
- 6 animated strategy lessons: Place Value Split, Make Tens, Count Up, Compensation, Distributive Split, Nines Trick
- Lessons appear after session results (before level up) when weakness detected
- Each strategy shown only once per user (tracked in seenStrategies)
- Key files: `weakness-detector.ts`, `strategy-content.ts`, `StrategyLesson.tsx`

### Application Flow
1. Welcome → Assessment (3-minute placement test) → Starting level assignment
2. Daily Training → Daily Challenge Intro → Timed session (3 minutes) → Session summary → Strategy Lesson (if weakness detected) → Level Up celebration → Reassurance/Paywall (first session)
3. Skill Drills → Rounding, Doubling (L13+), Halving (L21+) practice modes
4. Progress tracking → Time-bound metrics, level journey, performance insights

### Skill Drill Game Modes
**Rounding Practice** (`/rounding`):
- Available to all users after assessment
- 3-minute timed sessions practicing rounding technique for addition/subtraction
- Shows hint system with step-by-step breakdown (e.g., "Round to 80 + 45 = 125, adjust by -2")
- Level-appropriate operand ranges
- Key file: `RoundingGame.tsx`

**Doubling Practice** (`/doubling`):
- Unlocks at Level 13 (when multiplication introduced)
- 3-minute timed sessions practicing doubling technique for multiplication
- Shows hint system with doubling steps (e.g., "6 × 2 = 12, 12 × 2 = 24, 24 × 2 = 48")
- Uses powers of 2 as multipliers (2, 4, 8, 16)
- Key file: `DoublingGame.tsx`

**Halving Practice** (`/halving`):
- Unlocks at Level 21 (when division introduced)
- 3-minute timed sessions practicing halving technique for division
- Shows hint system with halving steps (e.g., "48 ÷ 2 = 24, 24 ÷ 2 = 12")
- Uses powers of 2 as divisors (2, 4, 8)
- Key file: `HalvingGame.tsx`

**Skill Drill Session Types**: rounding_practice, doubling_practice, halving_practice
- These do NOT count toward Progress page metrics (daily sessions only)
- Award XP for practice motivation

### Progress Page System (Core System - Locked)
**Foundational Principles**:
- Progress shows EVIDENCE OF IMPROVEMENT, not raw stats
- Daily sessions are the ONLY source of global progress metrics
- Quick Fire and Assessment NEVER pollute progress metrics
- All views are TIME-BOUND (7D default, 30D, All time)

**Session Filtering**:
- Include ONLY: sessionType === "daily"
- Exclude ALWAYS: quick_fire, assessment

**Daily Aggregation**:
- Accuracy: weighted (totalCorrect / totalAttempted per day)
- Speed: median response time with IQR band (25th-75th percentile)
- Throughput: questions per minute (active time only)

**UI Sections**:
1. Time Range Selector (7D default, 30D, All time)
2. Adaptive Insight Line (one explanatory sentence)
3. Weekly Insights Card (7D view only) - shows week's highlights, avg accuracy/speed, best streak, XP earned, week-over-week comparison
4. Journey Comparison Card (All time view only) - Day 1 vs Today comparison with improvement badges
5. Level Journey Card (start vs current level)
6. Performance Cards: Accuracy, Speed (with IQR), Throughput
7. Skill Breakdown Dashboard - star ratings per operation type (add/sub/mul/div) based on accuracy, speed, practice volume
8. Difficulty Context Copy (static reassurance about dips)
9. Personal Bests (quiet, no pressure)

**Personal Records System**:
- Tracked metrics: best streak, fastest median response, highest accuracy, highest throughput, highest fluency score
- Backend persistence via personalBests JSONB column in user_progress table
- Celebrated in session results with PersonalRecordCelebration component when records are beaten
- Key files: `PersonalRecordCelebration.tsx`, store's `checkAndUpdatePersonalBests()`

**Daily Focus System (Train Page)**:
- Personalized insights shown before session start
- Identifies strengths (high accuracy, fast responses) and focus areas (weak operations)
- Shows ETA to next level based on average XP earned
- Key file: `DailyFocus.tsx`

**Exclusions**:
- No Quick Fire data, no Assessment data
- No XP charts, no raw session lists
- No streak pressure

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migration tool (`drizzle-kit push` for schema sync)

### Third-Party Libraries (Key)
- **@tanstack/react-query**: Server state management and caching
- **framer-motion**: Animation library for UI transitions
- **recharts**: Chart library for progress visualization
- **zod**: Schema validation for API data
- **drizzle-zod**: Zod schema generation from Drizzle tables

### Development Tools
- **Vite**: Development server with HMR, production bundling
- **Replit Plugins**: Cartographer, dev banner, runtime error overlay (dev only)
- **Vitest**: Testing framework (configured but tests not extensively implemented)

### Session Storage
- **connect-pg-simple**: PostgreSQL session store (available but not currently used for auth)

### Backend User System
**Database Schema** (users table):
- `id`: Internal UUID (primary key)
- `auth_token`: Unique token for Bearer authentication
- `apple_subject_id`: For future Sign in with Apple linking
- `email`: Optional, from Apple or user input
- `entitlement_tier/status/source`: Premium subscription tracking
- `entitlement_expires_at`, `original_transaction_id`: IAP receipt data

**Auth Endpoints** (`server/routes.ts`):
- `POST /api/auth/register` - Creates guest user with auth token
- `POST /api/auth/login` - Login with existing auth token
- `GET /api/auth/me` - Get current user (requires Bearer token)
- `POST /api/auth/apple` - Placeholder for future SIWA
- `POST /api/auth/link-apple` - Placeholder for linking Apple to guest

**Sync Endpoints** (token-authenticated):
- `POST /api/sync/progress` - Upload progress (partial updates supported)
- `GET /api/sync/progress` - Fetch user's progress and sessions
- `POST /api/sync/session` - Save completed session

### iOS Readiness Framework (Scaffolding)
**Location**: `client/src/lib/services/`

Scaffolding for future iOS integration (SIWA + IAP):

**Core Services**:
- `types.ts`: Canonical UserAccount and Entitlement models
- `auth-service.ts`: Connects to backend /api/auth/register, persists auth token
- `billing-service.ts`: BillingService interface with MockBillingService (dev entitlement controls)
- `storage-service.ts`: Secure storage abstraction (localStorage now, SecureStore for Expo later)
- `sync-service.ts`: Offline-first sync with retry queue for failed requests
- `api-client.ts`: Backend API contract with LocalApiClient mock
- `account-store.ts`: Zustand store for account/entitlement state
- `ios-config.ts`: iOS/Expo configuration placeholders

**Security Rules**:
- Never store passwords, payment card data, or Apple identity tokens
- Production builds cannot toggle premium via dev methods
- Entitlement displayed only from BillingService.getEntitlement()

**UI Surfaces**:
- Settings: Account section (Guest/Apple status), Premium section (Restore Purchases)
- DevMenu: Entitlement controls (toggle premium, set status, simulate expiry)

**Key Patterns**:
- Anonymous-first, link Apple later
- Internal UUID as primary key (not Apple subject identifier)
- Entitlement status derived from entitlement fields only
- Offline-first with sync queue for failed network requests