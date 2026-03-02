# Run on Replit and Docker Server

## Replit
This repo is already configured for Replit in `.replit`.

### Replit env vars
Set these in Replit Secrets:
- `DATABASE_URL`
- `VITE_LIFF_ID`
- `LINE_CHANNEL_ID`
- `VITE_LIFF_AUTO_LOGIN` (`false` or `true`)

### Replit run
- Development: `npm run dev`
- Deployment build command: `npm run build`
- Deployment run command: `node ./dist/index.cjs`

---

## Docker (your own server)

### Option A: docker compose (recommended)
1. Create `.env` from `.env.example` and set:
   - `VITE_LIFF_ID`
   - `LINE_CHANNEL_ID`
   - `VITE_LIFF_AUTO_LOGIN`
2. Run:
```bash
docker compose up -d --build
```
3. App URL:
- `http://<your-server-ip>:5000`

### Option B: Docker only (no compose)
Use your own Postgres and set env manually:
```bash
docker build -t toast-app .
docker run -d \
  --name toast-app \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e DATABASE_URL='postgres://user:pass@host:5432/toast' \
  -e VITE_LIFF_ID='your-liff-id' \
  -e LINE_CHANNEL_ID='your-line-channel-id' \
  -e VITE_LIFF_AUTO_LOGIN='false' \
  toast-app
```

---

## Post-deploy checks
1. Health: open `/api/restaurants`
2. LINE verify endpoint:
   - `GET /api/auth/line/verify` with header `Authorization: Bearer <liff_id_token>`
3. Profile page login + sync works in LIFF client
