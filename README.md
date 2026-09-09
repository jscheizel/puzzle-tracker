# 🧩 Puzzle Tracker

A little app for people who time themselves doing jigsaw puzzles.

You keep a list of the puzzles you own, start a timer when you tip the box out, and the app works out how fast you actually are. Not just "that took three hours" — but **pieces per minute**, so a 500-piece puzzle and a 2000-piece puzzle can finally be compared honestly.

It runs entirely on your phone. No account, no sign-up, no internet needed, nothing sent anywhere.

## What it does

**⏱️ Time a session.** Start, pause, resume. The screen stays awake while the timer runs, and the time keeps counting correctly even if you put your phone down or switch apps. If you'd rather not have your phone out while you puzzle, you can just type the time in afterwards.

**🔀 Track the parts of a puzzle separately.** Tap *Flipping* when you've finished turning every piece face-up, and *Edge* when the border is done. Two taps, and you can see where your time actually goes.

**📚 Keep your collection.** Every puzzle gets a title, a brand, a piece count, an optional difficulty, and a photo of the box. Search it, and see your best time and best speed on each one at a glance.

**📊 See whether you're improving.** Total time, total pieces, best and average speed, your fastest puzzles, how much you got through each month, and your average speed broken down by puzzle size — so you can see whether you're genuinely quicker or just doing smaller puzzles.

**💾 Back it up.** Export everything to a single file, and import it back later or on another phone.

---

## Getting it on your phone

### Android

There are two ways. The first takes five minutes and is good for trying it out. The second gives you a real app that stays on your phone.

You'll need [Node.js](https://nodejs.org) installed on your computer either way, and the project folder on your computer. Open a terminal in that folder and run this once:

```bash
npm install
```

#### Option 1 — Try it now (5 minutes)

1. Install **Expo Go** from the Play Store on your phone.
2. Make sure your phone and your computer are on the **same Wi-Fi network**.
3. In the project folder on your computer, run:

```bash
npx expo start
```

4. A QR code appears in the terminal. Open Expo Go on your phone and scan it.

The app loads and works fully. Two things to know: your computer has to stay running for the app to open, and anything you enter is stored inside Expo Go — so if you uninstall Expo Go, your puzzle data goes with it. Good for a look around, not for real use.

#### Option 2 — Install it properly (30–40 minutes, mostly waiting)

This builds a real `.apk` file — a normal Android app that lives on your phone, works offline, and keeps your data safely.

1. Make a free account at [expo.dev](https://expo.dev).
2. On your computer, install the build tool and sign in:

```bash
npm install -g eas-cli
```

```bash
eas login
```

3. Start the build:

```bash
eas build --platform android --profile preview
```

4. It uploads the project and builds it on Expo's servers. This takes 15–30 minutes — you can close the terminal once it starts, the build carries on without you.
5. When it's done you get a link. Open that link **on your phone**, download the `.apk`, and tap it.
6. Android will ask whether to allow installing apps from this source. Say yes — this is the standard prompt for anything not from the Play Store, and you're installing your own app.

That's it. It's now a normal app in your app drawer.

> **Note:** the project is already linked to an existing Expo project ID. If you're building this under your own Expo account rather than the original one, run `eas init` first to link it to yours.

### iPhone / iPad

**Trying it out** works exactly the same as Android Option 1 — install **Expo Go** from the App Store, run `npx expo start`, and scan the QR code with your camera. Everything works.

**Installing it properly is harder**, and that's Apple's doing, not the app's. Apple doesn't let you download and install an app file the way Android does. To get a permanent app on an iPhone you need a [paid Apple Developer account](https://developer.apple.com/programs/) (currently $99/year) and you'd distribute it to yourself through TestFlight. The build itself runs on Expo's servers, so you don't need a Mac — just the developer account.

Honestly: on iOS, Expo Go is the practical answer unless you already have a developer account. The app hasn't been tested much on iOS.

---

## For developers

```bash
npm install          # install dependencies
npx expo start       # start the dev server
npx tsc --noEmit     # typecheck
npx expo lint        # lint
```

Built with [Expo](https://expo.dev) SDK 54, React Native 0.81 and expo-router. Data is stored locally with AsyncStorage.

If you're going to work on it, start with:

- **[CLAUDE.md](CLAUDE.md)** — architecture, data model and conventions in one page
- **[TECH_BACKLOG.md](TECH_BACKLOG.md)** — known bugs and technical work
- **[FEATURES.md](FEATURES.md)** — planned features

## A word on your data

Everything lives on your phone and nowhere else. That also means **nothing is backed up unless you back it up.** If you lose the phone, you lose your times.

Open the ⚙️ settings icon on the Dashboard and use **Export Data** now and then. It saves a single file you can put wherever you keep things safe, and **Import Data** brings it all back.
