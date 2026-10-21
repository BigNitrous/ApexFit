# ApexFit — installable web app

This folder is the standalone version of ApexFit, an evidence-based coaching app for serious lifters: loads prescribed from estimated maxes and reps in reserve, readiness checks, a program editor, measured expenditure with weekly check-ins, and strength, volume and nutrition analytics.

Hosted on any HTTPS static host it installs to the home screen (PWA) and works offline.

## Food logging
- Add food by search (built-in library of about 135 staples, your foods, recipes and saved meals), barcode scan, quick add, or online search of USDA FoodData Central and Open Food Facts.
- Lists for Recent, Frequent (logged 2+ times in 60 days), Favorites (star any food), My foods, Meals and Recipes. The + on any row logs one serving instantly; "Add & keep adding" logs several foods in a row.
- Measure by any serving size, grams or ounces; switching units keeps the same amount.
- Tap a logged food to change the amount, move it to another meal, duplicate or remove it.
- Meal tools (⋯): copy or move a meal, save it as a one-tap meal, clear it. Copy any meal or whole day from the last four weeks.
- Recipes: add ingredients in grams, set servings and (optionally) the cooked weight, then log by the serving.
- Water tracker, per-meal protein targets, and Breakfast/Lunch/Dinner/Snacks or Meal 1–6 naming (Settings → Nutrition).

## Barcode scanning
Tap Scan and the camera opens inside the app. Point it at a UPC or EAN barcode: it reads the code on its own (no shutter button, no photo), double-checks it, and opens the serving screen with the nutrition already filled in. Tap Add.

- The reader is zxing-cpp compiled to WebAssembly (`vendor/`), bundled with the app so it loads instantly and works offline. On Android Chrome the phone's built-in barcode detector is used.
- Nutrition comes from Open Food Facts first; if it doesn't have the product within a moment, USDA FoodData Central (US branded foods, label data from manufacturers) is asked too, and the first complete answer wins.
- Every product you scan is saved, so later scans are instant and need no internet.
- USDA's shared demo key allows about 30 lookups an hour. For more, get a free key at api.data.gov and paste it in Settings → Nutrition.
- If neither database has a product, a form opens with the barcode filled in; enter it once from the label and it scans instantly from then on.
- Camera access needs HTTPS (GitHub Pages provides it).

The Claude-powered features (coach chat, meal estimates, label reading) only work inside the Claude artifact version, and Claude's app doesn't allow live camera access or database lookups, so live scanning lives here.

## Put it on GitHub Pages
1. Create a new repository (for example `apexfit`) and upload every file in this folder to its root.
2. In the repository: Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the app is live at `https://<your-username>.github.io/apexfit/`.
4. On a phone, open that link and use "Add to Home Screen" (iPhone: Safari → Share) or "Install app" (Android/Chrome).

## Where data lives
Everything is stored on the device (localStorage). Use Settings → Export backup to save a copy or move to another device, and Restore backup to load it. Settings also exports workouts, food and body data as CSV for spreadsheets. A backup from the Claude artifact version (or from Two Plates) restores here too.

## Files
- `index.html` — the whole app (HTML, CSS and JavaScript in one file)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — install metadata
- `sw.js` — offline caching
- `vendor/zxing-reader.js`, `vendor/zxing_reader.wasm` — barcode reader (zxing-wasm 3.1.4, Apache-2.0)

Food data: built-in foods use typical USDA FoodData Central values; barcode lookups use Open Food Facts (community data, ODbL license) and USDA FoodData Central (public domain, CC0).
General fitness education, not medical advice.

## Apple Health live sync (Health Auto Export + your own free relay)

Web apps can't read Apple Health, so a small relay sits in between. The Health Auto Export iOS app pushes your Health data to the relay on a schedule, and ApexFit pulls it from the relay whenever you open it. Brings in body weight, body fat, steps and active calories.

**1. Create the relay (free Cloudflare account, about 5 minutes).**
1. dash.cloudflare.com → Workers & Pages → Create → Create Worker. Name it `apexfit-health`, deploy, then Edit code and paste in `worker/health-relay.js`. Deploy.
2. Storage & Databases → KV → Create a namespace named `apexfit-health`.
3. Back in the Worker: Settings → Bindings → Add → KV namespace. Variable name `HEALTH`, pick the namespace you made.
4. Settings → Variables and Secrets → Add a **Secret** named `TOKEN` and make its value a long random password.
5. Your relay address is the Worker's `https://apexfit-health.<you>.workers.dev` URL.

**2. Point Health Auto Export at it.** In the app (paid "Premium" plan needed for automations): Automations → New → REST API.
- URL: your relay address. Method: POST. Format: JSON.
- Header: `Authorization` = `Bearer ` followed by your token.
- Data: Health Metrics → Body Mass (weight), Body Fat Percentage, Step Count, Active Energy. Aggregate by **Days**, Summarize **on**.
- Pick a schedule (hourly works). Use Manual Export once to test.

**3. Connect ApexFit.** Settings → Apple Health sync → paste the relay address and token → Sync now. It then syncs quietly each time you open the app.
