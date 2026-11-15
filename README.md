# UPIC — Universal Password and Identity Custodian

A mobile app (Expo / React Native) that combines a **password vault**, **one-tap MFA approval** and a **private email relay** in one place. It's built from the findings of our Phase 1 user study for the *Usable Security and Privacy* course.

## Team

**Group 17**, Usable Security and Privacy (USS) Project

| Name | Roll No. |
|------|----------|
| Deepak Meena | 2023188 |
| Vaibhav Sorot | 2023573 |
| Kartik Haritwal | 2023275 |
| Aishwary Singh Panwar | 2023055 |
| Yuvraj Rajput | 2023616 |

**Supervisor:** Prof. Arun Balaji

## Screens (from the Phase 1 lo-fi design)

| Area | Screens |
|------|---------|
| Onboarding & access | Welcome, Create account, Master password, Recovery key, Biometric setup, Log in, Unlock, Forgot master password, Forgot username, Walkthrough |
| Passwords | Home (security overview), My vault, Password details, Add / edit password, Generator, Password health, Import & export |
| MFA | Login requests (approve / deny), MFA history |
| Email relay | Intro, Temporary emails dashboard, Create temporary email, Temporary email details |
| Privacy & settings | Privacy dashboard, How UPIC protects you, Settings, Recovery, Change master password, Appearance, About, Log-out confirmation |

## How the study findings shaped the app

| Finding (Phase 1) | What UPIC does |
|---|---|
| Security score was unclear and differed between screens | One score, computed in one place, with a "What is this score based on?" breakdown |
| Password health should explain and fix | Each issue shows its reason, sorted by severity, with a **Fix** button that generates a new password |
| Fear of losing access / forgotten master password | Recovery key (any device) plus email/phone recovery on a trusted device |
| Master password after the account password was confusing | Explained once at setup; afterwards unlock with the master password **or** biometrics only |
| "Alias" was not understood | Called **temporary email** everywhere, with an intro screen and the website each address belongs to |
| Accidental MFA approval | Approve and Deny are the same size; new devices need biometrics or press-and-hold |
| Text too small, missing badges | Larger base text and a text-size setting; badge for pending MFA requests; visible MFA history |
| Users want to know what is stored | Privacy dashboard ("What UPIC stores") and a "How UPIC protects you" explainer |
| Would start with a few low-risk accounts | CSV import from browsers and password managers, plus export |
| Automatic locking rated important | Auto-lock after inactivity (Immediately / 1 / 5 / 15 min) and lock when the app goes to the background |

## Security

- **Vault encryption:** AES-256-GCM (authenticated) via `@noble/ciphers`, with a fresh random IV on every save.
- **Key derivation:** PBKDF2-HMAC-SHA256 (75,000 rounds, random salt per user) via `@noble/hashes`.
- **Key wrapping:** a random 256-bit data key encrypts the vault. That key is wrapped separately by the master password, by the recovery key, and optionally by a device-only escrow key kept in the Keychain / Keystore.
- **Zero-knowledge:** everything is encrypted on the device; nothing is uploaded in this version.
- **Biometric unlock:** the data key is released from secure hardware after a biometric check. The master password itself is never stored.
- Salted PBKDF2 hashes for account passwords; constant-time comparisons; back-off after repeated wrong master passwords.
- Copied passwords are cleared from the clipboard after 30 seconds. No third-party favicon requests, so nobody learns which sites you use.
- Older vaults (from the previous version) are migrated automatically on first unlock.

## Design

- Onboarding and sign-in screens use white backgrounds, bold black type and doodle illustrations.
- The main app uses a black background with colour-pop cards.
- Every saved website gets its own brand colour (for example Netflix red or Discord blue). The password detail header and Save button use that colour.
- Light and dark themes, plus Standard / Large / Extra-large text.

## Run it

```bash
npm install
npx expo start            # scan the QR code with Expo Go (Android or iOS)
npx expo start --web      # browser preview
```

## Build an Android APK

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

Or build in the cloud with `eas build --platform android --profile preview` (needs a free Expo account).

## Project structure

```
App.tsx                 fonts, providers, auto-lock activity tracking
navigation/             auth / locked / main navigators and the tab bar
screens/                auth, home, passwords, mfa, relay, privacy, settings, onboarding
components/ui/          design-system components (Button, TextField, GlassCard, ScoreRing, …)
components/brand/       logo and illustrations
contexts/               AuthContext (unlock, auto-lock, biometrics), ThemeContext
services/               fileStorage (encrypted vault), crypto, securityScore, preferences, …
theme/tokens.ts         colours, type scale, spacing
utils/                  password strength, generator, brand colours, CSV import
backend/                optional Node/Express API (not required by the app)
```

## License

Private — academic project.
