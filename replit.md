# Numerate - Daily Arithmetic Fluency Trainer

## Overview

Numerate is a mobile-first math training application designed to enhance adult arithmetic fluency through adaptive daily practice. It features an initial 3-minute assessment for level placement, followed by timed sessions with mixed arithmetic operations. The app employs a sophisticated, adaptive progression engine that adjusts difficulty based on performance while providing emotionally supportive feedback. The business vision is to provide an engaging and effective tool for adults to master fundamental math skills, fostering confidence and improving cognitive abilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Routing**: Wouter
- **State Management**: Zustand (with persist middleware for local storage)
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS (custom theme)
- **Animation**: Framer Motion
- **Data Fetching**: TanStack Query

### Backend
- **Framework**: Express.js (Node.js)
- **API Design**: RESTful (`/api/*`)
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Build System**: esbuild

### Data Storage
- **Database**: PostgreSQL
- **Schema**: `users`, `user_progress`, `sessions` tables
- **Client Persistence**: Zustand persist middleware for local state with periodic backend synchronization.

### Key Design Patterns

**Progression Engine**: A two-layer system managing curriculum gates (levels) and adaptive tuning (skill ratings) for difficulty adjustment. Question generation is level-based, controlling operation mix, operand ranges, and preventing repetition.

**Answer Validation**: Employs "Trust Rules" to ensure accurate and context-appropriate decimal handling and precision detection, avoiding unnecessary decimal input.

**XP and Scoring**: Features a multi-faceted XP system combining base XP, speed bonuses, streak multipliers, tier multipliers (stretch, core, review), mode multipliers, and excellence/elite bonuses. Fluency score is derived from accuracy, speed, consistency, and throughput. XP contributions from all game modes trigger level-ups with transparent bonus breakdowns.

**Audio Feedback**: Utilizes Web Audio API for zero-latency, performance-scaled sounds, including XP ticks, pops, bursts, and level-up fanfares that scale with milestones (10, 25, 50, 75, 100). Session completion sounds vary based on accuracy.

**Milestone Level Celebrations**: Special, progressively grander celebrations for levels 10, 25, 50, 75, and 100, featuring unique titles, praise copy, enhanced visual effects (gold/amber, confetti, radial glows), and extended durations.

**Notification Settings**: Device-local daily reminder toggles with time pickers, stored in local Zustand persist.

**Coaching System**: Detects weaknesses from session results and delivers animated strategy lessons (e.g., Place Value Split, Make Tens) after sessions, shown once per user.

### Quick Fire Mode
- Survival-style speed training with built-in difficulty ramp
- Starts with 5 seconds; each correct answer adds +5 seconds
- One wrong answer or timeout ends the run
- Difficulty increases every 3 correct answers by 3 levels (e.g., starting at L2: questions 1-3 at L2, 4-6 at L5, 7-9 at L8, etc.)
- In-game "Level X" pill indicator shows current effective difficulty
- Results screen shows highest level reached with scaled encouragement messages
- Uses standard XP system with 0.55x Quick Fire mode multiplier
- Key file: `QuickFire.tsx`

### Application Flow
The application guides users from a welcome screen through an assessment to daily training sessions, which include timed practice, session summaries, potential strategy lessons, and level-up celebrations. Skill Drills (Rounding, Doubling, Halving) and Quick Fire mode are also available.

### Skill Drill Game Modes
Rounding, Doubling, and Halving practice modes offer 3-minute timed sessions with tier-based difficulty scaling. They contribute to total XP and level-ups but do not affect global progress metrics.

### Progress Page System
- **Core Principle**: Focuses on "EVIDENCE OF IMPROVEMENT" from "daily" sessions only.
- **Metrics**: Displays time-bound (7D, 30D, All time) accuracy, speed (median with IQR), and throughput.
- **UI Sections**: Includes time range selection, adaptive insights, weekly insights (7D), journey comparison (All time), level journey, performance cards, skill breakdown dashboard, difficulty context, and personal bests.

### Personal Records System
Tracks best streak, fastest median response, highest accuracy, highest throughput, and highest fluency score, with backend persistence and in-session celebrations showing improvement against previous records.

### Daily Focus System
Provides personalized insights on strengths and focus areas before sessions, including estimated time to the next level.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: Database migration tool.

### Third-Party Libraries
- **@tanstack/react-query**: Server state management.
- **framer-motion**: UI animation.
- **recharts**: Charting library.
- **zod**: Schema validation.
- **drizzle-zod**: Zod schema generation from Drizzle.

### Backend User System
- **Auth Endpoints**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/apple`, `/api/auth/link-apple`.
- **Sync Endpoints**: `/api/sync/progress`, `/api/sync/session`.

### iOS Readiness Framework
- **Core Services**: `auth-service.ts`, `billing-service.ts`, `sync-service.ts`, `account-store.ts`.
- **Key Patterns**: Anonymous-first authentication, offline-first with sync queue.