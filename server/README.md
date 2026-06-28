# Pawse server

The AI proxy for the Pawse app. Holds the **`FAL_KEY`** and turns a student's
class schedule + tasks into a verified weekly plan via Claude (and Gemini for
reading timetable photos) through fal.ai's `any-llm`. Built on Hono.

## Run

```bash
cp .env.example .env     # set FAL_KEY
npm install
npm run dev              # http://localhost:8787  (tsx watch)
```

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/health` | — | `{ ok, service }` |
| POST | `/api/plan` | `{ scheduleText?, scheduleImageBase64?, scheduleImageMime?, tasks[], preferences, nowISO }` | `Plan` (courses, events, summary, warnings, range, timezone) |
| POST | `/api/feedback` | `{ message, email?, platform?, appVersion? }` | `{ ok }` — forwards to `FEEDBACK_WEBHOOK_URL` (free Discord/Slack webhook), else logs |
| POST | `/api/chat` | `{ messages: {role, content}[] }` | `{ reply }` — kept for reuse; the current app has no chat UI |

Request/response shapes are validated with zod in `src/schema.ts` and mirror the
app's `src/types/plan.ts`.

## How a plan is built (`src/plan.ts`)

1. **OCR (only if a photo is sent):** the base64 image is uploaded to fal storage
   (→ public URL), then `fal-ai/any-llm/vision` (Gemini) extracts the recurring
   classes as JSON.
2. **Plan:** `fal-ai/any-llm` (Claude) gets the classes + typed schedule + tasks
   + preferences and returns a strict JSON schedule.
3. **Verify:** deterministically check that every task has ≥ its estimated study
   minutes scheduled and that no study block lands after its deadline (timezone
   compared via Node ICU).
4. **Repair:** if checks fail, one corrective LLM pass; whatever is still off
   becomes honest `warnings` shown in the app.

## Config (env)

| Var | Default | Notes |
|---|---|---|
| `FAL_KEY` | — | **required** |
| `PORT` | `8787` | |
| `PLAN_MODEL` | `anthropic/claude-3.5-sonnet` | any valid any-llm model id |
| `VISION_MODEL` | `google/gemini-2.0-flash-001` | proven vision id |
| `FEEDBACK_WEBHOOK_URL` | — | where in-app feedback goes; a **free** Discord/Slack incoming webhook (phone notifications at $0). Unset = log only. |

## Deploy

`Dockerfile` + `fly.toml` included. See [`../SHIP.md`](../SHIP.md) §2.
Build/start for any Node host: `npm run build` then `npm run start`.
