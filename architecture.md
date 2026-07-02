# Improve Your English App — Phase 1 MVP Specification

**Version:** 0.2
**Phase:** MVP
**Target Users:** Indian professionals who want to improve spoken workplace English
**Core Stack:** Next.js 14 · Deepgram · OpenAI · MySQL · NextAuth · Local Storage · Razorpay optional

---

## 1. Product Purpose

The app helps Indian professionals improve spoken English through short, scenario-based speaking practice.

The user selects or receives a workplace scenario, speaks their answer, gets a live transcript, and then receives structured feedback on clarity, fluency, grammar, vocabulary, filler words, and confidence.

The MVP should focus on one core loop:

```text
Select scenario
→ Listen/read prompt
→ Speak answer
→ See transcript
→ Get feedback
→ Hear/read improved model answer
→ Try again
```

The product should not try to become a full English learning platform in Phase 1. It should focus specifically on **spoken workplace communication**.

---

## 2. Phase 1 MVP Scope

### 2.1 In Scope

Phase 1 should include:

1. User signup and login
2. Basic user profile / persona setup
3. Scenario selection
4. Live speaking practice
5. Deepgram real-time transcription
6. Filler word detection
7. Basic fluency metrics
8. OpenAI-based evaluation
9. Model answer generation
10. Text-to-speech playback of model answer
11. Session history
12. Basic progress dashboard
13. Local audio storage, optional and temporary
14. Admin-managed scenario library

---

### 2.2 Out of Scope for Phase 1

Do not include these in MVP:

1. Team plans
2. Coach marketplace
3. Human review
4. Advanced pronunciation scoring
5. Mobile app
6. Complex gamification
7. Full weekly AI reports
8. Certificate generation
9. Enterprise admin dashboard
10. Multi-language explanation engine
11. S3 storage
12. Sarvam/Azure TTS integration unless OpenAI TTS is unacceptable
13. Complex subscription lifecycle management

Razorpay can be integrated in Phase 1 only if the MVP will be opened to paying users immediately. For private beta, defer payment integration.

---

## 3. System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                        Browser / Next.js                     │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ Mic Capture  │   │ Live         │   │ Playback          │ │
│  │ Web Audio    │   │ Transcript   │   │ Audio Element     │ │
│  └──────┬───────┘   └──────▲───────┘   └────────▲─────────┘ │
└─────────│──────────────────│────────────────────│───────────┘
          │                  │                    │
          │ WebSocket         │ Transcript events  │ TTS audio URL/file
          ▼                  │                    │
┌──────────────────────────────────────────────────────────────┐
│                    Next.js Backend / API Layer                │
│                                                              │
│  /api/auth/*                                                 │
│  /api/session/start                                          │
│  /api/session/evaluate                                       │
│  /api/stream/audio                                           │
│  /api/tts/speak                                              │
│  /api/persona                                                │
│  /api/scenarios                                              │
│  /api/progress                                               │
└─────────┬──────────────────────┬───────────────────┬────────┘
          │                      │                   │
          ▼                      ▼                   ▼
┌─────────────────┐    ┌─────────────────┐   ┌────────────────┐
│ Deepgram         │    │ OpenAI           │   │ MySQL           │
│ Streaming STT    │    │ Evaluation + TTS │   │ App Data        │
└─────────────────┘    └─────────────────┘   └────────────────┘
                                                    │
                                                    ▼
                                           ┌────────────────┐
                                           │ Local Storage   │
                                           │ Audio Files     │
                                           └────────────────┘
```

---

## 4. Technology Choices

## 4.1 Frontend — Next.js 14

Use Next.js 14 with App Router.

### Responsibilities

Server Components:

1. Landing page
2. Pricing page
3. Dashboard shell
4. Session history page
5. Progress page

Client Components:

1. Practice session UI
2. Microphone capture
3. Audio visualizer
4. Live transcript
5. Recording controls
6. Feedback display
7. Model answer playback
8. Retry flow

### Styling

Use Tailwind CSS.

### Deployment

## Infrastructure and Deployment — Phase 1

The Phase 1 MVP will be hosted on a self-managed server using the domain:

```text
bolo.omnihire.in
```

The application server will be accessed over SSH using the configured SSH key.

The MySQL database server is hosted separately on the same internal network and is reachable at:

```text
10.0.0.3:3306
```

The same SSH key can be used for server-level access where required.

---

### Application Server

The application server will run:

```text
Next.js 14 application
Node.js backend APIs
WebSocket audio streaming service
Deepgram streaming proxy
OpenAI evaluation service
OpenAI TTS service
Local file storage
Scheduled cleanup jobs
```

Recommended runtime:

```text
Node.js 20 LTS
PM2 for process management
Nginx as reverse proxy
Ubuntu Linux
```

---

### Database Server

The MySQL database will run on the internal network.

```text
Host: 10.0.0.3
Port: 3306
Database: bolo_english
```

The application should connect to MySQL using an internal network connection only.

The MySQL port should not be exposed publicly.

Example database connection string:

```bash
DATABASE_URL="mysql://bolo_user:strong_password@10.0.0.3:3306/bolo_english"
```


---

### Reverse Proxy

Nginx should terminate HTTPS and proxy requests to the Next.js/Node.js application. understand current deployments (there are already many app there. according to them add your configuration)

Recommended public endpoint:

```text
https://bolo.omnihire.in
```

Nginx should support:

```text
HTTP to HTTPS redirect
WebSocket upgrade headers
Static asset caching
Large enough request body for audio uploads
Timeouts suitable for streaming
```

---

### WebSocket Streaming

Unlike Vercel deployment, the self-hosted setup can directly support WebSocket audio streaming.

The browser will send audio chunks to:

```text
wss://bolo.omnihire.in/api/stream/audio
```

The backend will proxy the audio stream to Deepgram and send transcript events back to the browser.

The Deepgram API key must remain only on the server.

---

### Local Storage

Since the app is hosted on your own server, local storage can be used for Phase 1.

Recommended storage paths:

```text
/var/www/bolo/storage/audio
/var/www/bolo/storage/tts
/var/www/bolo/storage/temp
```

File structure:

```text
/storage/audio/{userId}/{sessionId}/{attemptId}.webm
/storage/tts/{sessionId}/{attemptId}.mp3
/storage/temp/{uploadId}
```

Retention:

```text
Audio recordings: delete after 7 days by default
TTS files: delete after 7 days or regenerate when required
Transcripts and evaluation scores: keep in MySQL
```

A daily cron job should clean old audio files.

---

### Process Management

Use PM2 to run the app.

Recommended process name:

```text
bolo-app
```

Example commands:

```bash
pm2 start npm --name bolo-app -- start
pm2 save
pm2 startup
```

For WebSocket reliability, keep the app running as a long-lived Node process rather than relying on serverless functions.

---

### Deployment Flow

Recommended deployment flow:

```text
Developer machine / GitHub
        │
        ▼
SSH into bolo.omnihire.in
        │
        ▼
git pull latest code
        │
        ▼
npm install
        │
        ▼
npx prisma migrate deploy
        │
        ▼
npm run build
        │
        ▼
pm2 restart bolo-app
```

Later, this can be automated through GitHub Actions.

---

### Environment Variables

Production `.env` should include:

```bash
# App
NEXT_PUBLIC_APP_URL=https://bolo.omnihire.in
NODE_ENV=production

# Database
DATABASE_URL=mysql://bolo_user:strong_password@10.0.0.3:3306/bolo_english

# Auth
NEXTAUTH_URL=https://bolo.omnihire.in
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Deepgram
DEEPGRAM_API_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_EVALUATION_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=

# Local Storage
LOCAL_STORAGE_PATH=/var/www/bolo/storage
AUDIO_RETENTION_DAYS=7

# Razorpay - optional
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---



---

### Monitoring

Minimum monitoring for MVP:

```text
PM2 process status
Nginx access/error logs
Application logs
Disk usage
MySQL connectivity
Deepgram/OpenAI API errors
```

Important alerts:

```text
App process down
Disk usage above 80%
Database connection failure
High API error rate
Storage cleanup failure
```

---

### Production Constraint

Because local storage is used, the Phase 1 deployment should run on a single application server.

Do not horizontally scale the app until storage is moved to S3/R2 or shared storage.

---

## 4.2 Speech-to-Text — Deepgram

Deepgram is the primary STT provider for Phase 1.

### Model

```text
Deepgram nova-2
language: en-IN
```

If Nova-3 is available and performs better for Indian English, keep provider configuration flexible.

### Mode

Use streaming mode during live practice.

Batch transcription can be added later for uploaded audio or deeper playback analysis.

### Required Deepgram Features

```text
filler_words: true
punctuate: true
smart_format: true
utterances: true
interim_results: true
endpointing: 1500
language: en-IN
```

### Why Deepgram Is Used

Deepgram is retained because this product needs:

1. Real-time transcription
2. Indian English accuracy
3. Low-latency transcript display
4. Filler word detection
5. Utterance segmentation
6. Endpointing based on silence

These are important for a speaking-practice product.

---

## 4.3 LLM — OpenAI

Use OpenAI instead of Claude.

### Primary Uses

OpenAI will be used for:

1. Evaluating user response
2. Generating model answer
3. Generating short coaching feedback
4. Suggesting one improvement area
5. Generating simple practice drills
6. Creating scenario variants later

### Recommended Model Split

For Phase 1:

```text
Evaluation: GPT-4.1 mini or GPT-5 mini
Model answer: GPT-4.1 mini or GPT-5 mini
Light formatting: GPT-4o mini
Premium/deep evaluation later: GPT-4.1 / GPT-5
```

The exact model can be configured through environment variables.

### Important Design Decision

All evaluation responses should use structured JSON.

Do not rely on free-form text for scoring.

The backend should validate the OpenAI output before saving it into MySQL.

---

## 4.4 Text-to-Speech — OpenAI

Use OpenAI TTS for Phase 1.

### Use Cases

TTS is used for:

1. Scenario question playback
2. Model answer playback
3. Optional short coaching note playback

### Phase 1 Recommendation

Only generate TTS for:

```text
model_response
scenario_prompt, if needed
```

Do not generate full audio feedback in Phase 1. Text feedback is enough.

### Optional Future Provider

Sarvam AI can be added later if Indian English voice quality becomes a strong product differentiator.

The system should use a provider interface so that TTS can later switch between:

```text
openai
sarvam
azure
```

---

## 4.5 Database — MySQL

Use MySQL instead of Supabase/Postgres.

### Recommended Setup

For MVP:

```text
MySQL 8
Prisma ORM
```

Recommended hosting options:

```text
Local MySQL for development
Railway / PlanetScale / AWS RDS for staging and production
```

For a serious production setup, AWS RDS MySQL is preferable.

---

## 4.6 Authentication — NextAuth / Auth.js

Use Auth.js / NextAuth instead of Supabase Auth.

### Login Methods for MVP

```text
Google OAuth
Email magic link or credentials login
```

For Phase 1, Google OAuth alone is also acceptable if you want to move fast.

### User Roles

```text
user
admin
```

Do not add team roles in Phase 1.

---

## 4.7 Storage — Local Storage for Phase 1

Use local filesystem storage for audio files in Phase 1.

### Storage Path Example

```text
/storage/audio/{userId}/{sessionId}/{attemptId}.webm
/storage/tts/{sessionId}/{attemptId}.mp3
```

### Important Limitation

Local storage is acceptable only for:

1. Local development
2. Internal demo
3. Private beta with limited users

It is not suitable for horizontal scaling or serverless-only deployment.

### Retention Policy

For MVP:

```text
Audio recordings are optional.
Default retention: 7 days.
User can disable audio storage.
Transcripts and scores remain stored.
```

### Future Migration

Move to S3 or Cloudflare R2 in Phase 2.

---

## 4.8 Payments — Razorpay

Razorpay is the right payment provider for Indian users.

### MVP Decision

Payment integration is optional in Phase 1.

If the MVP is private beta, defer payments.

If paid launch is required, implement only:

```text
Create order
Verify payment
Mark user as pro
Webhook for payment success/failure
```

Do not implement complex subscription management in the first version unless required.

---

# 5. Phase 1 User Flow

## 5.1 Onboarding Flow

```text
User signs in
→ Completes basic profile
→ Selects goal
→ Selects speaking context
→ Lands on dashboard
```

### Persona Fields

Ask only what is needed for evaluation.

```text
Native language
Current role
Seniority
Industry
Main communication goal
Common challenge
Preferred practice type
```

Avoid long onboarding.

---

## 5.2 Practice Flow

```text
User selects scenario
→ Scenario question is shown
→ Optional TTS reads the question
→ User taps Start
→ User speaks
→ Live transcript appears
→ User taps Stop or silence is detected
→ Final transcript is confirmed
→ Backend evaluates response
→ User sees score + feedback + better answer
→ User can retry
```

---

## 5.3 Feedback Flow

The feedback should not be too detailed.

Each attempt should show:

```text
Overall score
Clarity score
Fluency score
Vocabulary score
Structure score
Confidence score
Filler word count
One thing done well
One thing to improve
Better model answer
Retry button
```

Do not show too many corrections in MVP. Too much feedback will overwhelm users.

---

# 6. Data Models — MySQL

Use UUIDs as strings or binary UUIDs depending on Prisma preference.

## 6.1 users

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image_url TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  subscription_tier ENUM('free', 'pro') DEFAULT 'free',
  subscription_ends_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 6.2 user_profiles

```sql
CREATE TABLE user_profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  native_language VARCHAR(100),
  job_role VARCHAR(150),
  seniority VARCHAR(100),
  industry VARCHAR(150),
  communication_goal VARCHAR(150),
  primary_challenge VARCHAR(150),
  preferred_practice_type VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 6.3 scenarios

```sql
CREATE TABLE scenarios (
  id CHAR(36) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  context TEXT,
  question TEXT NOT NULL,
  register_type ENUM('formal', 'semi_formal', 'casual') DEFAULT 'semi_formal',
  vocab_level ENUM('basic', 'general', 'professional') DEFAULT 'general',
  communication_goal VARCHAR(100),
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  common_mistakes JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 6.4 practice_sessions

```sql
CREATE TABLE practice_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  scenario_id CHAR(36) NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  status ENUM('started', 'completed', 'abandoned') DEFAULT 'started',

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);
```

---

## 6.5 attempts

```sql
CREATE TABLE attempts (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  attempt_number INT DEFAULT 1,

  transcript TEXT,
  duration_sec FLOAT,
  word_count INT,
  words_per_minute FLOAT,

  filler_word_count INT DEFAULT 0,
  filler_words JSON,

  audio_file_path TEXT,
  tts_audio_file_path TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES practice_sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 6.6 evaluations

```sql
CREATE TABLE evaluations (
  id CHAR(36) PRIMARY KEY,
  attempt_id CHAR(36) NOT NULL,

  overall_score INT,
  clarity_score INT,
  fluency_score INT,
  vocabulary_score INT,
  structure_score INT,
  confidence_score INT,
  tone_match_score INT,

  what_worked TEXT,
  improvement_focus TEXT,
  model_response TEXT,
  coach_note TEXT,
  next_drill TEXT,

  raw_json JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);
```

---

## 6.7 user_daily_stats

```sql
CREATE TABLE user_daily_stats (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  stat_date DATE NOT NULL,

  sessions_count INT DEFAULT 0,
  attempts_count INT DEFAULT 0,
  total_speaking_sec FLOAT DEFAULT 0,

  avg_overall_score FLOAT,
  avg_clarity_score FLOAT,
  avg_fluency_score FLOAT,
  avg_vocabulary_score FLOAT,
  avg_structure_score FLOAT,
  avg_confidence_score FLOAT,

  total_filler_words INT DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_date (user_id, stat_date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 6.8 payments

Only needed if Razorpay is included in Phase 1.

```sql
CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(255),

  amount_paise INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('created', 'paid', 'failed', 'refunded') DEFAULT 'created',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

# 7. API Routes

## 7.1 Authentication

```text
GET/POST /api/auth/*
```

Handled by Auth.js / NextAuth.

---

## 7.2 Persona

```text
GET  /api/persona
POST /api/persona
```

### POST /api/persona

Creates or updates user profile.

Request:

```json
{
  "native_language": "Hindi",
  "job_role": "Project Manager",
  "seniority": "Mid-level",
  "industry": "IT Services",
  "communication_goal": "Speak better in client calls",
  "primary_challenge": "I use filler words and lose structure",
  "preferred_practice_type": "client_call"
}
```

---

## 7.3 Scenarios

```text
GET  /api/scenarios
GET  /api/scenarios/:id
POST /api/admin/scenarios
```

For MVP, scenarios should mostly be pre-written and stored in the database.

Avoid dynamic scenario generation in Phase 1 unless required.

Recommended Phase 1 categories:

```text
client_call
daily_standup
interview
manager_update
sales_pitch
conflict_handling
presentation_intro
```

---

## 7.4 Session Management

```text
POST /api/session/start
GET  /api/session/:id
GET  /api/sessions
POST /api/session/:id/complete
```

### POST /api/session/start

Request:

```json
{
  "scenario_id": "uuid"
}
```

Response:

```json
{
  "session_id": "uuid",
  "scenario": {
    "id": "uuid",
    "title": "Client status update",
    "context": "You are speaking to a client about a delayed delivery.",
    "question": "Explain the delay and propose the next step.",
    "register_type": "formal",
    "communication_goal": "clarity"
  }
}
```

---

## 7.5 Audio Streaming

```text
WS /api/stream/audio
```

This route proxies browser audio to Deepgram.

The browser should never directly expose the Deepgram API key.

### Browser to Backend

```text
Audio chunks every 250ms
Format: audio/webm or supported browser format
```

### Backend to Deepgram

Deepgram streaming connection with:

```json
{
  "model": "nova-2",
  "language": "en-IN",
  "punctuate": true,
  "smart_format": true,
  "interim_results": true,
  "utterances": true,
  "filler_words": true,
  "endpointing": 1500
}
```

### Backend to Browser Events

```json
{
  "type": "interim_transcript",
  "text": "I think we should..."
}
```

```json
{
  "type": "final_transcript",
  "text": "I think we should update the client today.",
  "metadata": {
    "duration_sec": 22.4,
    "filler_words": {
      "um": 2,
      "actually": 1
    },
    "utterances": []
  }
}
```

---

## 7.6 Evaluation

```text
POST /api/session/evaluate
```

### Request

```json
{
  "session_id": "uuid",
  "transcript": "I think we should update the client today...",
  "duration_sec": 34.5,
  "filler_words": {
    "um": 2,
    "actually": 1
  },
  "audio_file_path": "/storage/audio/..."
}
```

### Server-Side Processing

The server computes:

```text
word_count
words_per_minute
filler_word_count
filler_rate_per_100_words
sentence_count
average_sentence_length
```

Then it calls OpenAI for evaluation.

### Response

```json
{
  "attempt_id": "uuid",
  "evaluation": {
    "scores": {
      "overall": 72,
      "clarity": 4,
      "fluency": 3,
      "vocabulary": 3,
      "structure": 4,
      "confidence": 3,
      "tone_match": 4
    },
    "what_worked": "Your answer was clear and you gave the client a next step.",
    "improvement_focus": "Reduce filler words like 'actually' and start directly with the key update.",
    "model_response": "We are slightly delayed because the integration testing took longer than expected. The team has identified the issue and we are working on the fix today. I will share a confirmed revised timeline by 5 PM.",
    "coach_note": "Start with the main update first, then explain the reason."
  },
  "tts_audio_url": "/storage/tts/session-id/attempt-id.mp3"
}
```

---

## 7.7 TTS

```text
POST /api/tts/speak
```

### Request

```json
{
  "text": "We are slightly delayed because the integration testing took longer than expected.",
  "voice": "default"
}
```

### Response

```json
{
  "audio_url": "/storage/tts/session-id/attempt-id.mp3"
}
```

---

## 7.8 Progress

```text
GET /api/progress
```

### Response

```json
{
  "total_sessions": 12,
  "total_attempts": 30,
  "total_speaking_minutes": 85,
  "average_score": 71,
  "current_streak": 4,
  "score_trend": [
    {
      "date": "2026-07-01",
      "score": 68
    },
    {
      "date": "2026-07-02",
      "score": 72
    }
  ],
  "top_improvement_area": "fluency",
  "most_used_filler_words": {
    "um": 12,
    "actually": 9,
    "basically": 6
  }
}
```

---

# 8. Real-Time Audio Pipeline

```text
Browser                     Next.js / Node Server              Deepgram
───────                     ─────────────────────              ────────

getUserMedia()
    │
    ▼
MediaRecorder
audio chunks every 250ms
    │
    │──── WebSocket ─────► /api/stream/audio
                                │
                                │──── WebSocket ─────► Deepgram Streaming
                                │
                                │◄── Interim transcript
                                │
                                │──── Forward transcript to browser
                                │
                                │◄── Final transcript + metadata
                                │
                                │──── Forward final result to browser
    │
    ▼
User clicks Stop
    │
    ▼
POST /api/session/evaluate
```

---

# 9. Evaluation Pipeline

```text
POST /api/session/evaluate
  │
  ├─ Validate user session
  ├─ Fetch scenario
  ├─ Fetch user persona
  ├─ Compute speech metrics
  ├─ Save attempt
  ├─ Call OpenAI for structured evaluation
  ├─ Validate OpenAI JSON response
  ├─ Save evaluation
  ├─ Generate TTS for model_response
  ├─ Store TTS file locally
  └─ Return evaluation + audio URL
```

---

# 10. OpenAI Evaluation Prompt

## 10.1 System Prompt

```text
You are Bolo, an English communication coach for Indian professionals.

Your job is to evaluate spoken workplace English and help the user improve.

Be encouraging, specific, and practical.

Do not over-correct. Give the user one main improvement area.

Do not unnecessarily Americanise or Britishise the user's speech.

Do not penalise clear Indian English if it is grammatically acceptable and suitable for the workplace.

Focus on:
- clarity
- fluency
- structure
- vocabulary
- confidence
- tone match
- filler word usage
- workplace communication effectiveness

Return only valid JSON matching the required schema.
```

---

## 10.2 User Prompt Template

```text
User profile:
- Native language: {{native_language}}
- Job role: {{job_role}}
- Seniority: {{seniority}}
- Industry: {{industry}}
- Communication goal: {{communication_goal}}
- Primary challenge: {{primary_challenge}}

Scenario:
- Category: {{category}}
- Context: {{context}}
- Question: {{question}}
- Expected register: {{register_type}}
- Communication goal: {{communication_goal}}

Speech metrics:
- Duration: {{duration_sec}} seconds
- Words: {{word_count}}
- Words per minute: {{wpm}}
- Filler words: {{filler_words_json}}
- Filler rate: {{filler_rate_per_100_words}} per 100 words

User response:
"""
{{transcript}}
"""

Evaluate the response and return JSON only.
```

---

## 10.3 Required JSON Schema

```json
{
  "scores": {
    "overall": 0,
    "clarity": 0,
    "fluency": 0,
    "vocabulary": 0,
    "structure": 0,
    "confidence": 0,
    "tone_match": 0
  },
  "what_worked": "",
  "improvement_focus": "",
  "specific_correction": {
    "original": "",
    "improved": "",
    "reason": ""
  },
  "model_response": "",
  "coach_note": "",
  "next_drill": ""
}
```

### Score Rules

```text
overall: 0-100
clarity: 1-5
fluency: 1-5
vocabulary: 1-5
structure: 1-5
confidence: 1-5
tone_match: 1-5
```

---

# 11. TTS Pipeline

For Phase 1, use OpenAI TTS.

```text
Text
  │
  ▼
OpenAI TTS
  │
  ▼
MP3 audio bytes
  │
  ▼
Save locally
  │
  ▼
Return local audio URL to browser
```

### TTS Usage Rules

Generate TTS only for:

```text
model_response
scenario question, optional
```

Avoid generating long spoken feedback in Phase 1.

---

# 12. Frontend Component Structure

```text
app/
├── (marketing)/
│   ├── page.tsx
│   ├── pricing/page.tsx
│   └── about/page.tsx
│
├── (app)/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── onboarding/page.tsx
│   ├── practice/
│   │   ├── page.tsx
│   │   └── [scenarioId]/page.tsx
│   └── progress/page.tsx
│
└── api/
    ├── auth/
    ├── session/
    ├── stream/
    ├── tts/
    ├── persona/
    ├── scenarios/
    ├── progress/
    └── payments/

components/
├── practice/
│   ├── ScenarioCard.tsx
│   ├── MicButton.tsx
│   ├── LiveTranscript.tsx
│   ├── AudioVisualiser.tsx
│   ├── FeedbackPanel.tsx
│   ├── ScoreCard.tsx
│   ├── ModelResponsePlayer.tsx
│   └── SessionSummary.tsx
│
├── persona/
│   └── PersonaForm.tsx
│
└── progress/
    ├── ScoreTrend.tsx
    ├── FillerWordTrend.tsx
    └── SessionHistory.tsx
```

---

# 13. Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=mysql://user:password@localhost:3306/english_app

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Deepgram
DEEPGRAM_API_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_EVALUATION_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=

# Storage
LOCAL_STORAGE_PATH=./storage
AUDIO_RETENTION_DAYS=7

# Razorpay - optional for Phase 1
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---

# 14. Infrastructure and Deployment

## 14.1 MVP Development Setup

```text
Frontend: Next.js
Backend: Next.js API routes + optional standalone WebSocket server
Database: Local MySQL or managed MySQL
Storage: Local filesystem
STT: Deepgram Cloud
LLM/TTS: OpenAI API
Auth: NextAuth
```

---

## 14.2 MVP Production Setup

Recommended:

```text
Frontend: Vercel
API: Vercel for normal APIs
WebSocket audio service: Railway / Render / Fly.io / ECS
Database: Managed MySQL
Storage: Local only if using single persistent server; otherwise use S3/R2
```

Important: if deployed fully on Vercel serverless, local audio storage is not reliable for persistent files. For true production, use S3/R2.

---

# 15. Latency Budget

Target:

```text
Less than 3 seconds from user stop to feedback display.
Less than 5 seconds from user stop to model answer audio playback.
```

| Step                      |         Target |
| ------------------------- | -------------: |
| Deepgram final transcript |     200–500 ms |
| Metric computation        |          50 ms |
| OpenAI evaluation         | 1,000–2,000 ms |
| DB save                   |     100–300 ms |
| OpenAI TTS                |   500–1,500 ms |
| Audio playback start      |     200–500 ms |

### Optimization

Return text feedback first.

Generate TTS in parallel or immediately after returning text feedback.

The user should not wait for audio if the text feedback is already ready.

---

# 16. Security and Privacy

## 16.1 API Security

1. Never expose Deepgram API key in browser.
2. Never expose OpenAI API key in browser.
3. All AI calls must go through backend.
4. Auth-protect all session, progress, and evaluation APIs.
5. Validate user ownership before reading sessions or attempts.

---

## 16.2 Audio Privacy

For Phase 1:

1. Audio recording is optional.
2. Ask for user consent before storing audio.
3. Store audio locally only for limited retention.
4. Default retention: 7 days.
5. Allow user to delete stored recordings.
6. Transcripts and evaluations can be retained for progress tracking.

---

## 16.3 Data Privacy

The app should have a simple privacy statement:

```text
We process your speech to generate transcripts and coaching feedback. 
Your audio is not stored unless you allow it. 
Stored audio is deleted automatically after the retention period. 
You can delete your practice history from your account.
```

---

# 17. Admin Scope

Phase 1 admin should be minimal.

Admin can:

```text
Create scenario
Edit scenario
Deactivate scenario
View scenario list
```

Admin should not be able to listen to user audio or read user transcripts unless you explicitly want human review later.

---

# 18. Phase 1 Scenario Library

Start with 30–50 high-quality scenarios.

Recommended categories:

## Client Communication

1. Explain a delay to a client
2. Ask for missing information
3. Push back politely on scope creep
4. Give project status update
5. Clarify a misunderstood requirement

## Internal Workplace Communication

1. Daily standup update
2. Explain blocker to manager
3. Ask for help from a senior
4. Give feedback to a teammate
5. Summarize a meeting

## Interview and Career

1. Introduce yourself
2. Explain your current role
3. Explain a project you handled
4. Answer “why should we hire you?”
5. Explain a career gap

## Sales / Business

1. Introduce your product
2. Handle a pricing objection
3. Explain ROI
4. Ask for a follow-up meeting
5. Summarize client need

## Leadership

1. Motivate a team member
2. Explain a decision
3. Handle disagreement
4. Set expectations
5. Give constructive feedback

---

# 19. MVP Success Metrics

Track these from day one:

```text
Signup to first practice conversion
Average sessions per user per week
Average attempts per session
Retry rate after feedback
Average speaking duration
Feedback satisfaction
Improvement in average score over 7 days
Most common filler words
Most common improvement area
```

The most important MVP signal is not revenue. It is:

```text
Do users come back and repeat speaking practice?
```

---

# 20. Recommended Build Sequence

## Week 1 — Foundation

```text
Next.js app setup
MySQL schema
Prisma setup
NextAuth login
Basic dashboard
Scenario seed data
```

## Week 2 — Practice Flow

```text
Scenario picker
Practice session page
Mic capture
Audio visualizer
Basic recording
Deepgram WebSocket proxy
Live transcript
```

## Week 3 — Evaluation

```text
Session start API
Evaluate API
OpenAI structured feedback
Save attempts
Save evaluations
Feedback panel
Model answer display
```

## Week 4 — TTS and History

```text
OpenAI TTS
Local TTS audio storage
Session history
Basic progress page
Filler word trend
Retry flow
```

## Week 5 — Polish and Beta

```text
Onboarding improvement
Admin scenario management
Error handling
Privacy settings
Audio retention cleanup
Beta testing with 20–50 users
```

## Week 6 — Payment Optional

```text
Razorpay order creation
Payment verification
Pro user flag
Basic usage limits
```

Only do Week 6 if you are ready to charge.

---

# 21. Phase 1 Usage Limits

For MVP, define simple limits.

## Free User

```text
5 practice sessions per day
No long-term audio storage
Basic feedback
```

## Pro User

```text
Unlimited or higher daily practice limit
Session history
Progress trends
Better reports later
```

Do not overcomplicate pricing in Phase 1.

---

# 22. Provider Abstraction

Create provider interfaces from the beginning.

## STT Provider

```ts
interface SpeechToTextProvider {
  startStreamingSession(config: SttConfig): Promise<StreamingSession>;
}
```

## Evaluation Provider

```ts
interface EvaluationProvider {
  evaluateAttempt(input: EvaluationInput): Promise<EvaluationResult>;
}
```

## TTS Provider

```ts
interface TextToSpeechProvider {
  synthesize(input: TtsInput): Promise<TtsResult>;
}
```

This keeps your architecture clean and allows later movement from:

```text
Deepgram → OpenAI STT
OpenAI TTS → Sarvam
Local storage → S3/R2
```

without rewriting the app.

---

# 23. Key Product Principles

1. Keep sessions short.
2. Give feedback fast.
3. Do not overload the user.
4. Focus on one improvement per attempt.
5. Make retry easy.
6. Track visible improvement.
7. Use Indian workplace examples.
8. Avoid sounding like a grammar teacher.
9. Help the user become clearer, not artificially foreign-sounding.
10. Build a habit loop around daily speaking practice.

---

# 24. Final MVP Architecture

```text
Next.js 14
+ Deepgram Streaming STT
+ OpenAI Evaluation
+ OpenAI TTS
+ MySQL
+ NextAuth
+ Local Audio Storage
+ Razorpay optional
```

This is the recommended Phase 1 architecture.

It is focused, buildable, and avoids unnecessary vendor complexity while keeping Deepgram where it adds clear value.
