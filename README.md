# IRENGlish

IRENGlish is a mobile-first English learning application built with React, Vite and Capacitor. It is designed to run as a responsive web app and can be packaged for Android and iOS.

## What is included

- Five CEFR levels: A1, A2, B1, B2 and C1.
- 25 modules and 100 seeded lessons (20 lessons per level).
- Ten English example sentences with Turkish translations in every seeded lesson.
- Four multiple-choice questions per seeded lesson, with explanations.
- Sequential lesson unlocking, level progress and XP; by default, the next CEFR level requires all 20 lessons plus a 70% level-exam result (locally configurable in the admin area).
- 56 seeded vocabulary items with review scheduling, favourites and learned status.
- Reading, listening, speaking and writing practice areas.
- Twelve conversation scenarios for everyday, travel, work and discussion contexts.
- Browser text-to-speech; speech recognition when the browser/WebView supports it.
- Placement test, level test, exam history and progress reports.
- Local admin area to add/edit/delete custom lessons and words, plus JSON content import/export.
- Local data backup and restore.
- Light, dark and system theme; font scaling; daily goal and free-study mode.
- Responsive layout, safe-area spacing, keyboard/touch support, reduced-motion handling and a service worker for cached app assets.

## Requirements

- Node.js 22 or newer.
- npm.
- For Android packaging: Android Studio and an Android SDK (API 24 or newer for Capacitor 8).
- For iOS packaging: macOS, Xcode 26 or newer and an Apple signing setup for distribution.

Capacitor 8's current environment requirements are documented by the Capacitor team: [Environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [Android](https://capacitorjs.com/docs/android), [iOS](https://capacitorjs.com/docs/ios).

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`).

## Verify seeded learning content

```bash
npm run verify:content
```

## Production web build

```bash
npm run build
npm run preview
```

The production web assets are written to `dist/`.

## Android APK

Run these commands from the project root:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, select the app configuration and use **Build > Build Bundle(s) / APK(s) > Build APK(s)** for a debug APK. For distribution, use **Build > Generate Signed Bundle / APK** and create/select a signing key. After web code changes, run `npm run build` and `npx cap sync android` again.

## iOS app / IPA

iOS packaging requires macOS and Xcode:

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode, select the App target, configure the Bundle Identifier and Signing & Capabilities, then use **Product > Archive**. An installable/distributable IPA must be signed using an appropriate Apple provisioning profile/certificate. Windows alone cannot run Xcode locally.

## GitHub Actions

Two manual workflows are included under `.github/workflows/`:

- `build-android.yml` builds a debug APK and uploads it as a workflow artifact.
- `build-ios-unsigned.yml` packages an unsigned device build as an IPA artifact on a macOS runner. The unsigned IPA is not App Store ready; use a valid signing setup for distribution or sign it with a supported sideloading workflow.

For the iOS build, open the repository's **Actions** tab, select **Build IRENGlish unsigned iOS IPA**, and press **Run workflow**. Wait for the run to finish successfully, open that run, then download the **IRENGlish-unsigned-IPA** artifact. Extract the downloaded ZIP to get `IRENGlish-unsigned.ipa`. The repository root must contain `.github/`, `src/`, `package.json` and `capacitor.config.ts` directly; do not upload the whole project as an extra nested folder.

The workflow uses a GitHub-hosted `macos-26` runner and current Node 24-compatible GitHub Actions releases. It builds an **unsigned** device IPA. It does not require Apple signing certificates, but the resulting IPA is not ready for App Store submission and cannot be installed on an iPhone until it is signed with a valid method. For personal testing, sign it on Windows with a sideloading tool such as Sideloadly. A free Apple Developer account normally needs the app to be re-signed every 7 days; paid developer signing can provide a longer validity period. See the [Sideloadly FAQ](https://sideloadly.io/faq).

## Local data and privacy

The current release stores the learner profile, lesson progress, vocabulary state, preferences and exam history in the browser/WebView's local storage. There is no account backend, cloud sync, remote analytics or server-side admin authentication. Clearing app/browser data removes local progress unless the learner exports a JSON backup first.

The admin PIN is a convenience lock for the local interface only. It is not a security boundary and must not be used to protect confidential or multi-user content.

## Voice feature notes

- Listening playback uses the device/browser's built-in `SpeechSynthesis` voices. It is generated speech, not a prerecorded native speaker recording.
- Speaking transcription uses `SpeechRecognition` / `webkitSpeechRecognition` only when available. Unsupported browsers show a text-based fallback.
- Voice availability, language voices and microphone permission behavior differ across browsers and native WebViews.

## Quality checks performed for this source package

- Confirmed the seeded curriculum contains 5 levels, 25 modules and 100 lessons.
- Confirmed each seeded lesson has 10 example entries, 4 quiz questions, a rule and an explanation.
- Parsed the React JSX source with the installed TypeScript parser.
- Parsed the CSS with PostCSS.
- Checked the standalone data and storage JavaScript files with Node's syntax checker.

A full Vite production build and physical-device QA could not be run in this environment because npm package registry access failed (`EAI_AGAIN`). No physical Android/iPhone/tablet compatibility test is claimed. Run the build and test the listed viewport widths and real devices before publishing.
