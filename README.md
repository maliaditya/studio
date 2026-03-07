# DOCK
![alt text](image.png)
A full-stack personal execution system that connects daily scheduling, botherings/mindset, skill growth, deep work, resources, and strategic planning into one operating loop.

## What This App Does

DOCK helps you move from intention to execution:
1. Capture friction (`Botherings`, urges/resistances, rules, priorities).
2. Link friction to routines and actionable tasks.
3. Execute in time slots across your day.
4. Log completion and learning output.
5. Review weekly signals and rebalance routines.
6. Feed strategy layers (productization/offerization) from actual execution data.

## Live Web App

- https://vdock.vercel.app

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
- Ask Shiv (curated + open modes) with local-first retrieval pipeline

### Shiv V2 (Offline-First) Upgrades

- Hybrid retrieval:
  - BM25-style lexical retrieval
  - Local semantic vector retrieval (hashed embeddings, in-memory vector cache)
  - Local reranker stage for top candidates
- Strict citation mode:
  - App-data answers include `Sources: ...`
  - Weak evidence paths clarify/refuse instead of hallucinating
- Structured output contracts:
  - Critical intents (`schedule`, `days remaining`, `weight`, `tasks`) are validated
  - Auto-retry once on weak AI fallback output
  - Safe repair fallback if still invalid
- Observability:
  - Route: `GET /api/ai/shiv-observability`
  - Page: `/shiv-observability`
  - Tracks mode/path/confidence/latency + voice budget (`stt`, `llm`, `tts`)
  - Includes simple open-vs-curated recommendation signal
- Golden-eval quality gate:
  - `src/lib/shiv/__tests__/golden-eval.test.ts`
  - Fails if score drops below threshold

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

## Kokoro Desktop TTS Setup (Docker)

Use this to enable PDF read-aloud with Kokoro voices in the desktop app.

### 1) Prerequisites

- Docker Desktop must be installed and fully running.
- For GPU mode: NVIDIA GPU, recent NVIDIA driver, and Docker GPU support.
- Keep Docker Desktop open while testing Kokoro startup from the app.

Quick checks:
```powershell
docker --version
docker info
docker context show
```

GPU checks:
```powershell
nvidia-smi -L
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If the GPU test container fails, Kokoro GPU will fail too. Use CPU mode first.

### 2) Pull required images

CPU image (recommended baseline):
```powershell
docker pull ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

GPU image (optional, very large, first pull can take a long time):
```powershell
docker pull ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

Verify pulls:
```powershell
docker image ls ghcr.io/remsky/kokoro-fastapi-cpu:latest
docker image ls ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

### 3) Start one mode manually (diagnostics)

Always stop/remove existing container before switching mode:
```powershell
docker rm -f studio-kokoro-tts
```

Start CPU:
```powershell
docker run -d --name studio-kokoro-tts -p 127.0.0.1:8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
```

Start GPU:
```powershell
docker run -d --gpus all --name studio-kokoro-tts -p 127.0.0.1:8880:8880 ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

Health + logs:
```powershell
curl.exe http://127.0.0.1:8880/health
docker logs --tail 200 studio-kokoro-tts
```

Expected `/health` response should include `healthy`.

### 4) Use from desktop app

1. Launch desktop app (`npm run desktop:dev` in development).
2. Open `Settings -> AI Settings`.
3. Set `Kokoro Local TTS (Desktop only)` URL to `http://127.0.0.1:8880`.
4. Open a PDF and select a `Kokoro_*` voice in the voice dropdown.
5. Click `Read`.

Notes:
- App auto-start attempts Kokoro on launch when Docker is reachable.
- PDF toolbar shows Kokoro status with mode label (`kokoro-cpu` or `kokoro-gpu`).

### 5) App startup controls (environment variables)

Use PowerShell syntax:

Force CPU:
```powershell
$env:ELECTRON_KOKORO_FORCE_CPU="1"
```

Force GPU:
```powershell
$env:ELECTRON_KOKORO_FORCE_GPU="1"
```

Disable auto-start:
```powershell
$env:ELECTRON_KOKORO_AUTO_START="0"
```

Custom base URL:
```powershell
$env:ELECTRON_KOKORO_BASE_URL="http://127.0.0.1:8880"
```

Then restart the desktop app process after changing env vars.

### 6) Common failure cases

- `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`:
  - Docker Desktop is not running, or engine is still starting.
- `health check timeout`:
  - Container started but model initialization is still in progress.
  - Check logs and wait longer on first run.
- GPU image appears stuck at `Pulling fs layer`:
  - This is still downloading; GPU image is large.
  - Keep terminal open until pull completes.
- TTS API returns `500` from app:
  - Kokoro URL is wrong, container is unhealthy, or no container running on `127.0.0.1:8880`.

Quick diagnostics:
```powershell
docker ps -a --filter "name=studio-kokoro-tts"
docker inspect studio-kokoro-tts --format "{{.State.Status}}"
docker logs --tail 200 studio-kokoro-tts
curl.exe http://127.0.0.1:8880/health
```

## Local STT with faster-whisper (Offline)

Shiv mic input is local-first and works with a local STT server.  
`faster-whisper` is recommended for better speed/accuracy on CPU/GPU compared to baseline whisper implementations.

### 1) Prerequisites

- Docker Desktop installed and running.
- At least 4 GB free RAM for `tiny/base` models (more for larger models).
- Keep Docker Desktop open while testing mic in desktop app.

Quick checks:
```powershell
docker --version
docker info
docker context show
```

### 2) Pull required image

The desktop app default STT image is:
```powershell
docker pull onerahmet/openai-whisper-asr-webservice:latest
```

Verify:
```powershell
docker image ls onerahmet/openai-whisper-asr-webservice:latest
```

### 3) Start STT container manually (diagnostics)

Always remove old container first:
```powershell
docker rm -f studio-local-stt
```

Start CPU (stable baseline):
```powershell
docker run -d --name studio-local-stt -p 127.0.0.1:9890:9000 -e ASR_MODEL=base.en -e ASR_ENGINE=openai_whisper onerahmet/openai-whisper-asr-webservice:latest
```

Start faster-whisper mode (if your image tag supports it):
```powershell
docker run -d --name studio-local-stt -p 127.0.0.1:9890:9000 -e ASR_MODEL=base.en -e ASR_ENGINE=faster_whisper onerahmet/openai-whisper-asr-webservice:latest
```

Health + logs:
```powershell
docker ps -a --filter "name=studio-local-stt"
docker logs --tail 200 studio-local-stt
curl.exe -X POST "http://127.0.0.1:9890/asr?output=json" -F "audio_file=@C:\Windows\Media\ding.wav" -F "task=transcribe" -F "language=en"
```

### 4) Use from desktop app

1. Launch desktop app (`npm run desktop:dev`).
2. Open `Settings -> AI Settings`.
3. Set `Local STT Server URL` to `http://127.0.0.1:9890`.
4. Open Ask Shiv and click mic.
5. Check Shiv Voice popup status shows Local STT `running(...)`.

DOCK STT route auto-tries:
- `/transcribe`
- `/v1/audio/transcriptions`
- `/asr`

### 5) App startup controls (environment variables)

Use PowerShell syntax:

Disable STT auto-start:
```powershell
$env:ELECTRON_STT_AUTO_START="0"
```

Set preferred base URL:
```powershell
$env:LOCAL_STT_BASE_URL="http://127.0.0.1:9890"
```

Override Docker image:
```powershell
$env:ELECTRON_STT_DOCKER_IMAGE="onerahmet/openai-whisper-asr-webservice:latest"
```

Override model used by auto-start:
```powershell
$env:ELECTRON_STT_MODEL="base.en"
```

Use custom local start command instead of Docker:
```powershell
$env:ELECTRON_STT_START_COMMAND="your_stt_server_command_using_$env:STT_PORT"
```

Then restart desktop app process after changing env vars.

### 6) Common failure cases

- `No STT container exists` / `offline`:
  - STT container not running yet.
- `Local STT endpoint returned 404`:
  - Wrong base URL or endpoint path mismatch.
- `Local STT endpoint returned 500`:
  - STT backend crashed or model missing.
- `Local STT returned empty transcript`:
  - Very short/noisy audio, mic permissions denied, or server returned empty text.
- `fetch failed`:
  - STT server not reachable on configured host/port.

Quick diagnostics:
```powershell
docker ps -a --filter "name=studio-local-stt"
docker inspect studio-local-stt --format "{{.State.Status}}"
docker logs --tail 200 studio-local-stt
curl.exe -X POST "http://127.0.0.1:9890/asr?output=json" -F "audio_file=@C:\Windows\Media\ding.wav" -F "task=transcribe" -F "language=en"
```

### Request compatibility

DOCK sends multipart form-data with broad compatibility keys:
- audio file fields: `audio`, `file`, `audio_file`
- optional hints: `task=transcribe`, `language=en`, `output=json`, `temperature=0`, `best_of=5`, `beam_size=5`

### Desktop behavior

- Desktop auto-checks STT health and can auto-start managed STT.
- If local STT is offline or misconfigured, mic transcription returns a clear error.
- OpenAI STT fallback is disabled; only local STT is used.

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

