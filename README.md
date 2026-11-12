# LevhaLab 🚦

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
   - `AUTH_SECRET` = output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Deploy. (Vercel's Neon integration can add `DATABASE_URL` for you.)

## Adding content

- Sign: add `{id, cat, frame, icon, en, tip}` to `SIGNS` in `lib/signs.ts` (100x100 SVG).
- Safety fact + quiz question: `lib/facts.ts`.

> Content follows the UK Highway Code; signs in other Commonwealth countries are similar but can differ. For study only. Check current official sources for your real test.
