# Kabon.Africa — Mobile (Expo / React Native)

v1 audience: **Project Owners** (landowners). Wallet/crypto is deferred. The app
talks to the existing backend over JWT — in dev, via the Next.js web server which
already proxies `/api/*` to every microservice.

## Prerequisites
- The backend running locally (`npm run dev` at the repo root — web on `:3000`)
- Expo Go app on your phone, or an Android/iOS emulator
- Your machine's LAN IP (phone and computer on the same Wi-Fi)

## First-time setup
```bash
# 1. Install workspace deps (from the repo root)
npm install

# 2. Reconcile native package versions for this Expo SDK
cd apps/mobile
npx expo install --fix

# 3. Point the app at your machine (NOT localhost — the phone can't reach that)
cp .env.example .env
#   then edit .env: EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000
#   find it on Windows with: ipconfig  → IPv4 Address
```

## Run
```bash
cd apps/mobile
npx expo start
# press 'a' for Android emulator, 'i' for iOS simulator,
# or scan the QR code with Expo Go on your phone
```

## What's here (foundation slice)
- `src/lib/config.ts` — API base URL + brand colors
- `src/lib/api.ts` — fetch wrapper; JWT in device keychain via `expo-secure-store`
- `src/lib/auth.tsx` — `AuthProvider`, bootstrap from `/api/auth/me`, sign in/out
- `app/_layout.tsx` — root + auth provider
- `app/index.tsx` — auth gate → routes by role (LANDOWNER → dashboard)
- `app/login.tsx` — email/password sign-in
- `app/dashboard.tsx` — the owner's projects (`/api/projects/me/projects`)
- `app/project/[id].tsx` — project detail (read)
- `app/project/new.tsx` — placeholder for the creation flow

## Next steps
1. Project creation: GPS auto-locate (`expo-location`), methodology picker, photos
   (`expo-image-picker` → IPFS), submit → `POST /api/projects`
2. Project detail: comment thread, satellite/NDVI + IoT readings, "list credits"
3. Push notifications (Expo) for approval / verification / sale events
4. Production: a stable public API gateway replaces the dev LAN-IP base URL
