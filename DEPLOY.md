# gutdiary — Deploy Guide
Free deployment in ~15 minutes on a Mac.

---

## 1. Install Node.js (if you don't have it)
```bash
brew install node
```
Check it worked: `node -v`

---

## 2. Create the React app
```bash
npx create-react-app gut-diary
cd gut-diary
```

---

## 3. Drop in the files

Replace / add these files:

| File | Where to put it |
|---|---|
| `GutDiary.jsx` | `src/App.jsx` (replace everything in App.jsx) |
| `index.html` | `public/index.html` (replace the existing one) |
| `manifest.json` | `public/manifest.json` (replace the existing one) |
| `gutdiary-icon.svg` | Keep handy — convert to PNG next |

---

## 4. Convert the SVG icon to PNG

You need two sizes. Easiest free way on Mac:

1. Open `gutdiary-icon.svg` in **Preview**
2. File → Export → Format: PNG, set width to **192**, save as `icon-192.png`
3. Repeat, set width to **512**, save as `icon-512.png`
4. Copy both PNG files into the `public/` folder

---

## 5. Test it locally
```bash
npm start
```
Opens at http://localhost:3000 — check everything looks right.

---

## 6. Build for production
```bash
npm run build
```
This creates a `build/` folder.

---

## 7. Deploy to Vercel (free forever)

1. Go to **vercel.com** and sign up with GitHub (free)
2. Install Vercel CLI:
```bash
npm install -g vercel
```
3. From inside the `gut-diary` folder:
```bash
vercel
```
4. Follow the prompts — accept all defaults
5. It gives you a URL like `gut-diary-abc123.vercel.app`

---

## 8. Send her the link + install instructions

Text her:
> "Hey, open this link in Safari on your phone: [your-url.vercel.app]
> Then tap the Share button (box with arrow at the bottom), scroll down and tap 'Add to Home Screen', then tap Add. That's it!"

---

## 9. Custom domain (optional, still free)

In Vercel dashboard → your project → Settings → Domains
You can add a free domain like `gutdiary.vercel.app` if the default URL is ugly.

---

## File structure when done

```
gut-diary/
├── public/
│   ├── index.html        ← PWA meta tags, apple-touch-icon
│   ├── manifest.json     ← app name, colors, icons
│   ├── icon-192.png      ← home screen icon (small)
│   └── icon-512.png      ← home screen icon (large)
└── src/
    ├── App.jsx           ← the entire gutdiary app
    └── main.jsx          ← untouched (create-react-app default)
```
