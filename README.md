# AuraXpress — Situational English Training for Modern Professionals

> **AI-powered spoken English coaching for Indian professionals.**
> Speak. Get evaluated. Hear a better version. Repeat.

---

## The Problem

Millions of Indian professionals are technically brilliant — but held back by communication confidence in English. Not by grammar. Not by vocabulary. By the gap between how they think and how they come across in a meeting, on a client call, or in a job interview.

**AuraXpress closes that gap.**

Not through drills. Not through textbooks. Through realistic, voice-first practice — evaluated by AI that actually understands your job, your industry, and what good communication looks like at your level.

---

## What Makes AuraXpress Different

### 🎙️ Voice Bio — AuraXpress Learns Who You Are

Speak for 60 seconds about your role, team, challenges, and goals. AuraXpress transcribes it and uses GPT-4o to extract a structured professional profile: your seniority, industry, who you speak with, and how you should be evaluated. A CTO practising board communication is held to a very different standard than a junior engineer on a standup.

### 📋 AI-Generated Scenarios Tailored to Your Role

AuraXpress doesn't give every user the same 10 exercises. After onboarding, it generates 5–6 practice categories and 15+ scenarios specific to your job — dynamically, using your profile. A startup founder gets investor pitch scenarios. A BPO agent gets empathy and de-escalation scenarios. A sales professional gets objection-handling and discovery call scenarios.

You can also **create any category by speaking**: *"I want to practise explaining technical debt to non-technical stakeholders"* → AuraXpress generates a full category with 3–4 realistic scenarios.

### 🧠 Evaluation That Actually Means Something

After you speak, AuraXpress evaluates your response across **6 dimensions**:

| Dimension | What it measures |
|---|---|
| **Clarity** | Was the message easy to understand? Word choice, sentence structure. |
| **Fluency** | Flow of speech. Filler words, restarts, unnatural pauses. |
| **Vocabulary** | Right words for the register? Any missed opportunities? |
| **Structure** | Logical beginning, middle, end. Did the answer go somewhere? |
| **Confidence** | Assertive delivery. No excessive hedging. |
| **Tone** | Did the tone match the situation — formal, semi-formal, or casual? |

You get **one focused improvement** per session (not five — no overwhelm), plus a **model response spoken back to you** in audio: what a confident professional at your level would have said.

### 🔊 Voice In, Voice Out

The entire experience is audio-first. You speak, AuraXpress listens, evaluates, and speaks back. No typing. No multiple choice. Just like having a coach — available 24/7.

Powered by **Deepgram nova-2 (en-IN)** for Indian English speech recognition with filler word detection, and **OpenAI TTS** for natural audio feedback.

### 🏆 Gamification That Builds the Habit

| Feature | How it works |
|---|---|
| **XP** | Earned per session, with bonuses for high scores and personal bests |
| **10 Levels** | From *First Word* to *Masterclass* |
| **Streaks** | Daily practice streak with shield mechanic (Pro) |
| **15 Badges** | Practice, skill, streak, and leaderboard categories |
| **Daily Challenge** | Same scenario for all users daily, +15 XP |
| **Monthly Leaderboard** | Opt-in ranking that resets on the 1st |

### 📊 Progress You Can Actually See

- Score trends across all 6 dimensions over time
- Filler word rate chart — watch it drop week by week
- Scenario mastery stars (1–5 ⭐) per scenario
- Session history table with all metrics
- XP history by month

### 💬 AI Coaching Chatbot

A floating coach powered by GPT-4o that knows your profile, your recent scores, and your weak areas. Ask anything: *"How do I sound less nervous on client calls?"*, *"Give me a tip for speaking to senior leadership"*, *"Why is my structure score low?"*. It answers with advice specific to you — not generic tips.

---

## Who AuraXpress Is For

| Who | What AuraXpress helps with |
|---|---|
| 💻 **IT Professionals** | International client calls, standups, sprint ceremonies |
| 🎓 **MBA Students & Freshers** | Group discussions, case interviews, placement prep |
| 📣 **Sales Professionals** | Discovery calls, pitching, objection handling |
| 🚀 **Founders** | Investor pitches, customer sales, all-hands talks |
| 🏢 **Managers & Leaders** | Performance conversations, leading meetings, speaking to leadership |
| 📞 **BPO & Customer Support** | Natural, empathetic, non-scripted call handling |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MySQL 8 (Docker for local, self-hosted for production) |
| Auth | NextAuth.js (email/password, JWT) |
| Speech-to-Text | Deepgram nova-2, `language: en-IN` |
| AI Evaluation | OpenAI GPT-4o |
| Text-to-Speech | OpenAI TTS (tts-1, nova voice) |
| Styling | Tailwind CSS |

---

## Getting Started Locally

### Prerequisites

- Node.js 18+
- Docker Desktop

### 1. Clone and install

```bash
git clone https://github.com/shantanu77/bolo.git
cd bolo
npm install
```

### 2. Start MySQL

```bash
docker compose up -d
```

This starts a MySQL 8 container on port `3306`, runs the schema migration, and seeds 10 scenarios and 15 badges automatically.

### 3. Configure environment

Create `.env.local` in the project root:

```bash
DATABASE_URL="mysql://bolo_user:bolo_pass@localhost:3306/bolo_english"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this"

DEEPGRAM_API_KEY="your-deepgram-api-key"
OPENAI_API_KEY="your-openai-api-key"

EMAIL_FROM="helloaura@auraxpress.com"
EMAIL_USER="your-gmail-login@email.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"

STORAGE_PATH="./storage"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Admin Usage Report

The repo includes a daily admin summary email for product usage, growth, subscription, revenue, and AI cost metrics.

Add these env vars if you want to override the defaults:

```bash
ADMIN_REPORT_EMAIL="shantanu@mobileyug.com"
ADMIN_REPORT_TIMEZONE="Asia/Kolkata"
ADMIN_REPORT_APP_NAME="AuraXpress"
ADMIN_REPORT_USD_INR="83.5"
```

Commands:

```bash
npm run report:test
npm run report:daily
npm run report:install-cron
```

The cron installer schedules the report for `00:05` every day and logs to `/tmp/auraxpress-usage-report.log`.

---

## Project Structure

```
bolo/
├── app/
│   ├── (marketing)/          # Public website — landing, features, pricing, about
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth + registration
│   │   ├── bio/              # Voice bio capture and AI structuring
│   │   ├── chat/             # AI coaching chatbot
│   │   ├── generate/         # AI category and scenario generation
│   │   ├── session/          # Practice session start + evaluation
│   │   ├── stream/           # Deepgram audio transcription
│   │   └── ...
│   ├── dashboard/            # App home
│   ├── practice/             # Scenario picker + live session
│   ├── progress/             # Analytics dashboard
│   └── leaderboard/          # Monthly rankings
├── components/
│   ├── bio/                  # Voice bio modal
│   ├── marketing/            # Nav, footer
│   └── CoachChat.tsx         # Floating AI coaching chatbot
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── db.ts                 # MySQL connection pool
│   ├── gamification.ts       # XP, streaks, badges, levels
│   ├── levels.ts             # Level definitions (client-safe)
│   └── openai.ts             # Evaluation + TTS
├── sql/
│   ├── schema.sql            # Full DB schema
│   ├── seed.sql              # 10 scenarios + 15 badges
│   └── migrate_*.sql         # Incremental migrations
└── docker-compose.yml        # Local MySQL setup
```

---

## Key API Routes

| Method | Route | What it does |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/persona` | Save/update persona |
| `POST` | `/api/bio` | Voice bio → Deepgram → GPT-4o structure |
| `POST` | `/api/generate/categories` | Generate AI scenario categories for user |
| `POST` | `/api/generate/scenarios` | Create custom category from voice/text request |
| `POST` | `/api/session/start` | Start a practice session |
| `POST` | `/api/session/evaluate` | Submit transcript → evaluate → TTS feedback |
| `POST` | `/api/stream` | Deepgram audio transcription |
| `POST` | `/api/chat` | AI coaching chatbot |
| `GET` | `/api/progress` | Full progress and analytics data |
| `GET` | `/api/leaderboard` | Monthly XP leaderboard |

---

## Pricing

| Plan | Price | What's included |
|---|---|---|
| **Free** | ₹0/month | 5 sessions/month, 3 scenarios, basic scorecard |
| **Pro** | ₹499/month | Unlimited sessions, AI-generated categories, full analytics, streak shield, leaderboard |
| **Teams** | ₹299/seat/month | Everything in Pro + admin dashboard, team leaderboard, custom scenarios |

---

## Philosophy

AuraXpress does not try to make Indian professionals sound American or British. **Indian English is valid English.** The goal is clarity, confidence, and appropriateness — in whatever room you are in.

We flag what reduces clarity or sounds out of register. We leave everything else alone.

---

## License

MIT

---

*Made with ♥ in India, for India.*
