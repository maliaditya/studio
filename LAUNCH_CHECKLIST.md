# DOCK Launch Checklist

## Purpose

This document is the release gate for DOCK desktop and web launch readiness.

Use it as the source of truth before:
- private beta
- closed beta
- public launch

A task is not done because code exists. It is done when it is verified in a real build and the failure mode is acceptable.

---

## Launch Stages

### Stage 1: Private Beta

Goal:
- usable by a small number of trusted users with direct support

Exit criteria:
- installation works
- local AI stack can be set up
- core flows are usable without constant manual fixes

### Stage 2: Closed Beta

Goal:
- usable by external users with limited support

Exit criteria:
- onboarding is self-serve for most users
- desktop runtime is stable
- backups and diagnostics exist

### Stage 3: Public Launch

Goal:
- normal users can install, understand, and use DOCK without you being present

Exit criteria:
- onboarding, reliability, recovery, product positioning, and release process are all production-ready

---

## Must-Have Before Private Beta

### 1. Desktop onboarding works

- [ ] First-launch readiness screen appears when required services are missing
- [ ] Docker install/run status is detected correctly
- [ ] Ollama install/run status is detected correctly
- [ ] Ollama configured model presence is detected correctly
- [ ] Kokoro status is detected correctly
- [ ] Local STT status is detected correctly
- [ ] Microphone permission state is detected correctly
- [ ] Each missing dependency has a clear action:
  - install
  - start
  - retry
  - open logs

Verification:
- [ ] Test on a clean Windows machine or VM
- [ ] Test with Docker missing
- [ ] Test with Docker installed but not running
- [ ] Test with Ollama missing
- [ ] Test with model missing
- [ ] Test with mic permission denied

### 2. Local AI services start and stop correctly

- [ ] Kokoro can start from the app
- [ ] STT can start from the app
- [ ] STT warm-up is shown clearly
- [ ] App updates STT base URL if fallback port is used
- [ ] Closing the app stops Kokoro
- [ ] Closing the app stops STT

Verification:
- [ ] Confirm no `studio-kokoro-tts` container after app close
- [ ] Confirm no `studio-local-stt` container after app close
- [ ] Confirm no listeners remain on service ports after app close

### 3. Core product flows are stable

- [ ] Dashboard loads reliably
- [ ] Timesheet loads reliably
- [ ] Botherings AI report works
- [ ] Canvas AI explanation works
- [ ] PDF explain / read-aloud works
- [ ] Weekly review AI enhance works
- [ ] Login flow works
- [ ] Local AI unavailable states degrade cleanly

Verification:
- [ ] Run through each flow end-to-end on desktop
- [ ] Run through each flow once with local AI available
- [ ] Run through each flow once with local AI unavailable

### 4. Error visibility exists

- [ ] Desktop logs can be opened from the app
- [ ] AI failures show actionable messages
- [ ] Service startup failures do not silently fail
- [ ] Stuck warm-up states are distinguishable from hard failures

---

## Must-Have Before Closed Beta

### 5. Product scope is clear

- [ ] One primary positioning statement is chosen
- [ ] One primary user type is chosen
- [ ] Navigation and first impression support that positioning
- [ ] README and landing copy match the actual product

Recommended positioning format:
- `DOCK`
- `Your daily operating system for thinking and execution`

### 6. Data safety is acceptable

- [ ] Export works reliably
- [ ] Import or restore path exists, or there is a documented backup strategy
- [ ] Local persistence survives app restart
- [ ] Critical user data is not easy to lose through normal use
- [ ] Schema or local-storage migrations are handled safely

Verification:
- [ ] Create data, close app, reopen app
- [ ] Export data, clear local state, restore data
- [ ] Upgrade from older app build to newer build without corruption

### 7. Settings are understandable

- [ ] AI settings show active provider clearly
- [ ] Ollama base URL is visible
- [ ] Active model is visible
- [ ] Kokoro base URL/status is visible
- [ ] STT base URL/status is visible
- [ ] Desktop-only capabilities are clearly labeled

### 8. Release packaging is repeatable

- [ ] `desktop:dist` produces an installable Windows build
- [ ] Installed app launches correctly
- [ ] Installed app icon/name/metadata are correct
- [ ] Installed app can find bundled runtime assets
- [ ] Installed app logs to the expected location

Verification:
- [ ] Fresh install test
- [ ] Upgrade install test
- [ ] Uninstall and reinstall test

### 9. Core UX polish is sufficient

- [ ] Loading states are intentional
- [ ] Empty states are intentional
- [ ] Error states are intentional
- [ ] Scroll behavior is stable
- [ ] Dialogs are readable and consistent
- [ ] Buttons are disabled when actions are in progress
- [ ] Desktop-only AI actions are not shown on unsupported surfaces

---

## Must-Have Before Public Launch

### 10. Onboarding is self-serve

- [ ] A normal user can install and set up the app without your direct help
- [ ] The readiness panel is enough for the main dependency issues
- [ ] Missing prerequisites are explained in plain language
- [ ] The user always knows the next action

Hard gate:
- [ ] At least 3 external users complete installation and setup successfully without live intervention

### 11. Reliability is production-grade

- [ ] No known reproducible startup blocker remains
- [ ] No core feature has a known high-frequency crash
- [ ] No critical service gets stuck in a false status state
- [ ] Recovery paths exist for:
  - stale dev/build assets
  - failed AI service startup
  - invalid local config
  - missing dependency

### 12. Security and privacy posture is explicit

- [ ] Document what data stays local
- [ ] Document what data goes to cloud APIs
- [ ] Secure token storage is reviewed
- [ ] Electron security posture is reviewed
- [ ] CSP and unsafe settings are understood and minimized for production
- [ ] Sensitive values are not leaked to logs or renderer unnecessarily

### 13. Performance is acceptable

- [ ] App startup time is reasonable
- [ ] Timesheet interaction stays responsive
- [ ] Canvas remains usable with realistic diagrams
- [ ] PDF viewer remains usable with realistic documents
- [ ] No obvious memory spikes during common workflows

Verification:
- [ ] Test on a mid-range Windows machine
- [ ] Test with local AI services running
- [ ] Test with large user data

### 14. Public-facing materials are ready

- [ ] README is accurate and launch-grade
- [ ] Install guide exists
- [ ] Troubleshooting guide exists
- [ ] App screenshots are current
- [ ] Branding is consistent:
  - DOCK
  - dockflow.life or final chosen domain
- [ ] Privacy / support / changelog pages are aligned with shipped product

### 15. Release operations exist

- [ ] Versioning strategy is defined
- [ ] Changelog process exists
- [ ] Rollback plan exists
- [ ] Release checklist is repeatable
- [ ] Known issues list exists for launch

Hard gate:
- [ ] You can produce, test, ship, and if needed roll back a release in one controlled cycle

---

## Verification Matrix

### Desktop runtime scenarios

- [ ] Docker missing
- [ ] Docker installed, daemon stopped
- [ ] Ollama missing
- [ ] Ollama installed, server stopped
- [ ] Ollama running, model missing
- [ ] Kokoro unavailable
- [ ] STT unavailable
- [ ] Mic denied
- [ ] App closed while services running
- [ ] App reopened after prior abnormal shutdown

### User scenarios

- [ ] First install
- [ ] Returning user
- [ ] Offline local-only usage
- [ ] Cloud fallback usage
- [ ] Export before upgrade
- [ ] Restore after reinstall

### Product scenarios

- [ ] Explain a canvas
- [ ] Read explanation aloud
- [ ] Explain a PDF selection
- [ ] Generate botherings AI report
- [ ] Run weekly review AI enhance
- [ ] Use voice chat / STT

---

## Known Current Risks

These should be actively tracked until resolved:

- [ ] Kokoro shutdown behavior must be re-tested in updated runtime
- [ ] STT fallback-port behavior is functional but may confuse users
- [ ] Dev chunk invalidation can still happen during local development; release path must remain unaffected
- [ ] Broad feature surface may weaken launch clarity without a tighter primary story

---

## Launch Decision Rules

### Do not launch publicly if any of these are true

- [ ] Users cannot self-serve onboarding
- [ ] Core data can be lost without recovery
- [ ] Local AI service states are misleading or unreliable
- [ ] Installed desktop build differs materially from what was tested in dev
- [ ] You cannot diagnose user failures from logs and reproduction steps

### Safe to run private beta if all of these are true

- [ ] Desktop setup is mostly working
- [ ] Core features are usable
- [ ] Logs and manual support are enough
- [ ] You are ready to actively support users

### Safe to run public launch if all of these are true

- [ ] Onboarding is self-serve
- [ ] Core runtime is stable
- [ ] Backups and recovery exist
- [ ] Security/privacy messaging is explicit
- [ ] Release packaging is repeatable
- [ ] External users have already succeeded without your help

---

## Immediate Priorities

If you want the shortest path to launch, do these next:

1. Re-test desktop shutdown for Kokoro and STT in the updated packaged runtime
2. Clean up port-selection messaging for local STT
3. Finalize onboarding copy and recovery actions
4. Write install + troubleshooting docs
5. Run external user setup tests
6. Lock launch positioning and branding

