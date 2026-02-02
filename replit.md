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

### Application Flow
1. Welcome → Assessment (3-minute placement test) → Starting level assignment
2. Daily Training → Timed sessions (1, 2, or 3 minutes) → Session summary with animated results
3. Progress tracking → Time-bound metrics, level journey, performance insights

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
3. Level Journey Card (start vs current level)
4. Performance Cards: Accuracy, Speed (with IQR), Throughput
5. Difficulty Context Copy (static reassurance about dips)
6. Personal Bests (quiet, no pressure)

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

### No External Auth Service
- Current implementation uses simple auto-login for MVP
- Firebase Auth was specified in requirements but not yet implemented
- Backend generates UUIDs for user identification