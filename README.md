# Roadly

An interactive, Quizlet-style site for learning UK (Highway Code) road signs and road safety, designed for young learners.

- **Flashcards**: flip and learn; missed cards go back to the end of the queue (keyboard: Space, ←, →)
- **Quick Quiz**: 10 questions, combo bonus XP, topic selection
- **Match Up**: sign ↔ meaning against the clock, with a personal best
- **Safety Facts**: stopping distances, alcohol, seat belts, etc., plus a quiz
- **XP / levels / daily streak** and confetti 🎉
- **Guest mode** (progress in `localStorage`) and **accounts** (email + password stored in Neon, leaderboard)
- XP and cards earned as a guest are moved into the account on login
- All signs are SVG drawn in code (no external images, no licensing issues)

Stack: Next.js 14 (App Router) · TypeScript · Neon Postgres (`@neondatabase/serverless`) · JWT cookie session (`jose`) · `bcryptjs`.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

Without `DATABASE_URL` the site runs in **guest mode** (login and leaderboard show as unavailable). To try accounts:

```bash
cp .env.example .env.local   # fill in DATABASE_URL and AUTH_SECRET
```

Tables are created automatically on first use (`lib/db.ts`). Reference schema: `db/schema.sql`.

## Deploy: Neon + Vercel

1. Create a project at [neon.tech](https://neon.tech) and copy the **connection string**.
2. Push the repo to GitHub and **Import** it in Vercel (framework: Next.js, no settings needed).
3. Vercel → Settings → Environment Variables:
   - `DATABASE_URL` = the Neon connection string
   - `AUTH_SECRET` (required, at least 16 characters; sessions refuse to work in production without it) = output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Deploy. (Vercel's Neon integration can add `DATABASE_URL` for you.)

## Adding content

- Sign: add `{id, cat, frame, icon, en, tip}` to `SIGNS` in `lib/signs.ts` (100x100 SVG).
- Safety fact + quiz question: `lib/facts.ts`.

> Content follows the UK Highway Code; signs in other Commonwealth countries are similar but can differ. For study only. Check current official sources for your real test.

## Sign images

Optimized sign images live in `public/signs/<id>.jpg` (max 360 px). `lib/signImages.ts` lists which ids have an image; signs without one fall back to the SVG drawing in `lib/signs.ts`.
To add an image: drop `<id>.jpg` into `public/signs/` and add the id to `lib/signImages.ts`. The raw dump folder `levhalar/` is git-ignored.

## Dashboard warning lights & question types

`lib/dashboard.ts` holds 42 dashboard warning lights (name, colour, tip); images are `public/signs/dash-*.jpg`, cropped from a 7x6 grid.
Quiz question types (`lib/deck.ts`): sign to name, name to sign, sign to "what should you do", sign to group, true/false, light colour urgency, plus fact questions from `lib/facts.ts` and `lib/questions.ts`.

## Accounts, password reset and legal pages

- **Forgot password** emails a one-hour, single-use link (only a hash of the token is stored). It needs an email provider; the code uses the [Resend](https://resend.com) HTTP API. Set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain you verified in Resend). Without them the page tells users that reset isn't set up yet, and everything else keeps working.
- **Sign-up confirmation** uses the same email setup: a new account is only created after the person opens the emailed 24-hour, single-use link (until then only a pending record with hashed password and token exists). Without an email provider, sign-up works directly with no confirmation, so set `RESEND_API_KEY`, `EMAIL_FROM` and `SITE_URL` before opening the site to the public. Note that Resend's `onboarding@resend.dev` sender only delivers to your own Resend account address; a verified domain is needed for real users.
- Reset and confirmation links use `SITE_URL` (or Vercel's `VERCEL_PROJECT_PRODUCTION_URL`), never the request's Host header.
- **Delete my account** (account page) removes the user and all their data immediately.
- `/legal` holds privacy, terms and credits. Set `NEXT_PUBLIC_CONTACT_EMAIL` so people can reach you for data requests and image removal (it needs a redeploy to take effect). Review the text for your situation: it is a plain-English template, not legal advice.
- `GET /api/health` returns 200 when the app (and database, if configured) is healthy and 503 when the database fails. Point an uptime monitor (UptimeRobot, Better Stack, ...) at it.
- Fonts are self-hosted (`next/font`), so visitors' browsers make no request to Google.

## Tests

```bash
npm test
```

Runs the content checks (unique ids, images exist, every quiz question well-formed over thousands of generated rounds), unit tests (nickname filter, tokens, levels) and end-to-end tests of the real API routes against an in-process Postgres (register and email confirmation, login throttle, sessions, XP cap, password reset, account deletion, leaderboard). No database or network is needed.
