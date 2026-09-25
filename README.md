# Portfolio Backend

Express API — two routes, deployed standalone on Northflank. Talks to Resend
(email) and Upstash (Redis) for its two features.

## Routes

- `POST /api/contact` — sends an email via Resend
- `POST /api/visits` — increments a persistent counter in Upstash Redis
- `GET /health` — simple health check

## Local development

```bash
npm install
cp .env.example .env   # fill in real values
npm run dev
```
Runs on `http://localhost:3000`.

## Deploy on Northflank (free tier)

1. Push this folder to its own GitHub repo (e.g. `portfolio-backend`) — separate
   from the frontend repo.
2. Sign up free at [northflank.com](https://northflank.com).
3. New Project → New Service → **Deployment** → connect your GitHub repo.
4. Build type: Northflank should detect the `Dockerfile` automatically and
   build from it. If it offers a buildpack option instead, either works —
   the Dockerfile is the more predictable choice.
5. Set the port to `3000` (matches `EXPOSE 3000` in the Dockerfile and the
   server's default `PORT`).
6. Add environment variables (Northflank → your service → Environment):
   - `RESEND_API_KEY`
   - `CONTACT_TO_EMAIL`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `FRONTEND_URL` — your Vercel frontend's URL once deployed, e.g.
     `https://arfan-portfolio.vercel.app` (no trailing slash). Required for
     CORS — without it, the frontend's requests will be blocked.
7. Deploy. Northflank gives you a public URL, e.g.
   `https://portfolio-backend--xxxxx.code.run` — this is what the frontend
   will call.

**Check it's alive:** open `<your-northflank-url>/health` in a browser — you
should see `{"status":"ok"}`.

**A note on sleeping:** unlike Render's free tier, Northflank's free
"Developer Sandbox" is container-based rather than dyno-based, which in
practice tends not to force the same aggressive idle spin-down. Test it
yourself though — deploy, wait 20+ minutes with no traffic, then hit
`/health` again and see how it behaves, rather than assuming.

## Connecting the frontend

Once this is deployed, copy its URL into the **frontend's** environment
variable `VITE_API_URL` on Vercel (see the frontend README) — that's the only
change needed on that side to point it at this backend.
