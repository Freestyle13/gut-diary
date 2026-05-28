# gutdiary

A personal gut health tracking PWA for iOS.

## Run locally
```bash
npm install
npm start
```
Opens at http://localhost:5173

## Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## Icon setup (before deploying)
1. Open `public/gutdiary-icon.svg` in Mac Preview
2. Export as PNG at 192×192 → save as `public/icon-192.png`
3. Export as PNG at 512×512 → save as `public/icon-512.png`

## Add to iPhone home screen
1. Open your Vercel URL in Safari
2. Tap Share → Add to Home Screen
3. Done — opens fullscreen like a native app
