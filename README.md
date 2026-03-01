# LifeOS

A full-stack personal execution system that connects daily scheduling, botherings/mindset, skill growth, deep work, resources, and strategic planning into one operating loop.

## What This App Does

LifeOS helps you move from intention to execution:
1. Capture friction (`Botherings`, urges/resistances, rules, priorities).
2. Link friction to routines and actionable tasks.
3. Execute in time slots across your day.
4. Log completion and learning output.
5. Review weekly signals and rebalance routines.
6. Feed strategy layers (productization/offerization) from actual execution data.

## Core Product Flow

### 1) Daily Planning and Execution
- Plan your day by time slots (`Late Night`, `Dawn`, `Morning`, `Afternoon`, `Evening`, `Night`).
- Add activities/tasks directly in slots.
- Track completion and focus-session progress.
- Keep schedule history by date.

### 2) Botherings and Mindset Loop
- Create `External`, `Mismatch`, and `Constraint` botherings.
- Link botherings to routine tasks.
- View only botherings relevant to current schedule logic.
- Track bothering consistency and completion pressure.
- Open bothering details inline from card actions.

### 3) Skill + Deep Work Integration
- Define upskill and deep work tasks.
- Connect tasks to broader domains/specializations.
- Log time and outcomes.
- Reuse resources during execution.

### 4) Resource System
- Organize resources in folders.
- Support cards/links/code/markdown/media/PDF/paint canvas.
- Open resources in popup workflows.
- Use in-context notes and references while executing tasks.

### 5) Weekly Review and Rebalance
- Analyze misses, completion rates, and slot pressure.
- Generate guarded routine rebalance suggestions.
- Apply suggestions with safety checks.
- Record learning history from applied changes.

### 6) Strategic Planning Layer
- Map execution to higher-level planning.
- Maintain productization/offerization structures.
- Connect tactical output to long-term goals.

## Major Feature Areas

- Authentication and local session ownership.
- Persistent user state and backup flow.
- Advanced schedule + recurrence handling.
- Mindset/botherings with task linking and filtering.
- Deep work and upskill logging.
- Resource vault with rich content types.
- Weekly review analytics and guarded apply.
- AI-assisted features (provider-configurable).
- Desktop runtime (Electron) and web runtime (Next.js).

## AI System

AI settings support:
- Provider: `Ollama` or `OpenAI`
- Model selection
- Provider endpoint/API key configuration

AI currently powers:
- PDF selection explanation flow
- Routine rebalance enhancement flow
- Bothering sentence rephrase helpers

## Tech Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind + Radix UI components
- Electron wrapper for desktop runtime
- Local/browser persistence + backup utilities
- Optional cloud sync modules (GitHub/Vercel Blob/Supabase integrations present in app settings)

## Local Development

Install dependencies:
```bash
npm install
```

Run web app:
```bash
npm run dev
```

Run desktop app (Next + Electron together):
```bash
npm run desktop:dev
```

## Production Builds

Web build:
```bash
npm run build
npm run start
```

Desktop distributable:
```bash
npm run desktop:dist
```

Desktop packaging notes:
- Uses bundled local Next server for runtime.
- Supports optional startup URL fallback with `ELECTRON_START_URL`.
- To force desktop to use hosted web origin (recommended for shared cloud auth/session):
  - Set `ELECTRON_START_URL=https://vdock.vercel.app`
  - Set `ELECTRON_FORCE_REMOTE=1`
- To keep local desktop runtime but use hosted cloud auth APIs (recommended hybrid mode):
  - Set `ELECTRON_AUTH_BASE_URL=https://vdock.vercel.app`
  - (Optional for web builds) set `NEXT_PUBLIC_AUTH_BASE_URL=https://vdock.vercel.app`

## Data and Sync Notes

- App state is auto-persisted per user.
- Export/import JSON backup is supported.
- Sync-related settings can be configured from the Settings modal.
- Secrets/API keys are managed according to runtime and configured providers.

## Repository Structure (high level)

- `src/app/*`: route pages and API routes
- `src/components/*`: UI modules and cards
- `src/contexts/AuthContext.tsx`: central app state and actions
- `src/types/*`: shared type contracts
- `electron/*`: desktop entry/runtime scripts

## Scripts

- `npm run dev` - web development server
- `npm run build` - production web build
- `npm run start` - run production web build
- `npm run typecheck` - TypeScript no-emit checks
- `npm run desktop:dev` - desktop development runtime
- `npm run desktop:build` - desktop Next build target
- `npm run desktop:dist` - desktop installer/distribution build
