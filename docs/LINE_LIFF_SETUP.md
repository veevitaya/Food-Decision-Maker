# LINE LIFF Setup

## 1. Create LIFF app
1. Open LINE Developers Console.
2. Create/select your provider and channel.
3. Add a LIFF app.
4. Set Endpoint URL to your web app URL (dev/prod).
5. Copy the generated LIFF ID.

## 2. Configure environment
Set these values in your `.env` file:

```env
VITE_LIFF_ID=your-liff-id
LINE_CHANNEL_ID=your-line-channel-id
VITE_LIFF_AUTO_LOGIN=false
```

Notes:
- `VITE_LIFF_ID` enables LIFF features.
- `LINE_CHANNEL_ID` is required for backend LINE ID token verification.
- `VITE_LIFF_AUTO_LOGIN=true` will automatically call LIFF login when not authenticated.

## 3. Behavior in this project
- App pre-initializes LIFF in `client/src/main.tsx`.
- Profile login/logout uses LIFF SDK via `client/src/hooks/use-line-profile.ts`.
- Profile API calls are protected by server-side ID token verification in `server/routes.ts`.
- Invite/share uses LIFF `shareTargetPicker` when available and falls back to LINE message URL.
- Non-LIFF browsers still work with graceful fallback.

## 3.1 Verify endpoint
You can test token validity with:
- `GET /api/auth/line/verify`
- Header: `Authorization: Bearer <liff_id_token>`

## 4. Production checklist
- Add your production domain in LIFF endpoint allowlist.
- Ensure HTTPS is enabled.
- Verify login redirect returns to the same page.
- Verify profile fetch and invite flows inside LINE app.
