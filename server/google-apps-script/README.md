# Google Doc feedback receiver

This tiny Google Apps Script Web App receives Pawse's structured feedback
webhook and appends each note to a private Google Doc. Students never wait for
Google: `/api/feedback` returns HTTP 202 first, then the server retries delivery
in the background.

## One-time setup

1. Create or choose the private Google Doc that will hold feedback, and copy the
   id between `/d/` and `/edit` in its URL.
2. Open <https://script.google.com>, create a **New project**, and replace its
   `Code.gs` with the checked-in [`Code.gs`](./Code.gs).
3. In **Project Settings → Script properties**, add:
   - `PAWSE_FEEDBACK_DOC_ID` = the document id from step 1
   - `PAWSE_FEEDBACK_SECRET` = a long random value
4. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL ending in `/exec` and set these Render environment
   variables, then redeploy:
   - `FEEDBACK_WEBHOOK_URL` = the `/exec` URL
   - `FEEDBACK_WEBHOOK_SECRET` = the same random value from step 3

The Web App URL is public because the Pawse server must call it without a Google
login. The shared secret is required for every write, and the destination Doc
itself stays private.

## Smoke test

```bash
curl -X POST https://YOUR_PAWSE_SERVER/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"message":"Feedback pipeline test","email":"test@example.com","platform":"web","appVersion":"1.0.0"}'
```

The API should return HTTP 202 with `{ "ok": true, "queued": true, "id": "…" }`
quickly. A new timestamped entry should then appear at the bottom of the Doc.
