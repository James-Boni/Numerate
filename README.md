# Numerate

Serious daily arithmetic training for measurable cognitive improvement.

Numerate is an iOS mathematics training application designed to improve arithmetic fluency, processing speed, and numerical confidence through structured progression and strict correctness guarantees.

This repository is the canonical source of truth for the Numerate product.

---

## Product Overview

Numerate is built to help users improve everyday arithmetic through short, focused daily sessions.

The system adapts to user ability, increases difficulty intelligently, and tracks measurable progress over time.

The goal is simple:

- Improve speed.
- Improve accuracy.
- Build numerical confidence.
- Make progress visible.

Numerate is designed as a long-term training system, not a casual game.

---

## Core Principles

### 1. Trust First

Correctness is the foundation of the product.

- The app must never incorrectly mark a correct answer wrong.
- Decimal logic must always be explicit.
- Rounding rules must be clearly defined.
- The keypad always includes:
  - 0–9
  - Decimal point (`.`)
  - Negative sign (`-`)

If a decimal answer is required, only the correct decimal is accepted.

The question generator, UI, and validator share the same metadata structure:

```ts
{
  dpRequired: 0 | 1 | 2,
  roundingMode: "exact" | "round",
  allowNegative: boolean
}
```

If the UI cannot accept a format, the generator must not produce it.

Trust is non-negotiable.

---

### 2. Structured Difficulty Scaling

Difficulty is level-driven and capability-bound.

Each level defines:

- Allowed number ranges
- Decimal permissions
- Negative permissions
- Division modes
- Percent and fraction unlocks

Difficulty increases steadily through magnitude, complexity, and concept introduction.

Level progression should feel intentional and earned.

---

### 3. Meaningful Progression

XP is based on:

- Accuracy
- Speed
- Consistency
- Throughput

XP never decreases.

Post-session feedback clearly shows:

- XP gained
- Progress toward the next level
- Level advancement when earned

Improvement must be visible and proportional to effort.

---

## Feature Overview

### Initial Assessment
- 3-minute placement test
- Determines starting level
- No XP awarded
- Skill-based grouping

### Daily Challenge
- Core training mode
- Dynamic difficulty scaling
- Deterministic validation
- XP-based progression

### Quick Fire Mode
- Speed-focused training
- Separate statistics
- Designed to improve reaction and fluency
- Does not distort long-term progression metrics

### Progress Tracking
- Time-bound insights (7-day / 30-day)
- Highest daily performance
- Daily averages
- Level trajectory
- Accuracy and speed evolution

---

## Technical Architecture

### Frontend
- React Native (Expo-style architecture)
- TypeScript
- Modular game logic layer
- Deterministic validation system

### Backend
- Supabase (Postgres)
- Structured schema
- Version-controlled migrations

### iOS Distribution
- Xcode builds
- TestFlight staging
- App Store distribution

### Authentication (Planned)
- Sign in with Apple
- UUID-based identity
- No password storage

### Monetisation (Planned)
- Single subscription tier
- Apple In-App Purchase
- Entitlement model as single source of truth

---

## Development Workflow

- GitHub is the canonical source of truth.
- `main` must always be releasable.
- Feature branches for all development.
- Replit is used as the development environment.
- Supabase migrations are version-controlled.
- No secrets committed.
- Environment variables handled securely.

Architecture principle:

> Deterministic logic first.  
> Visual refinement second.  
> Expansion third.

---

## Supabase Setup Philosophy

- Explicit schema design
- Migration-driven updates
- No manual production-only changes
- Row-level security enforced
- Entitlements verified server-side

Game logic remains deterministic on the client.

---

## Environment Variables

Example:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE=
```

Never commit:
- API keys
- Service role keys
- Apple secrets
- Stripe secrets

---

## Roadmap

- Finalise deterministic decimal validation
- Perfect post-session reward flow
- Strengthen difficulty ramp beyond level 30
- Implement Apple Sign In
- Integrate Apple IAP
- Harden analytics layer
- Prepare App Store submission

Expansion will only occur after correctness and trust are fully stable.

---

## Contribution Guidelines

- All logic changes must preserve validation determinism.
- Generator changes must respect capability profiles.
- UI must never introduce answer ambiguity.
- No silent logic alterations.

Correctness over velocity.

---

## License

License to be determined.

---

## Contact

Contact: [your email here]

---

Numerate is designed to train deliberately.

If users feel sharper, see measurable improvement, and trust every result, the product has achieved its goal.
