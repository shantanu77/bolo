# Bolo — Product Specification

**Version**: 0.1 (MVP)
**Target Market**: Indian professionals and students
**Tagline**: Speak better. Sound confident. In any room.

---

## 1. Vision

Bolo is an AI-powered spoken English coaching platform built for Indian users. It meets people where they are — aware of their mother tongue influence, their professional context, and the specific situations where they want to communicate better. It does not correct users toward a "neutral" or Western accent; it helps them speak clearly, confidently, and appropriately for the situation they are in.

---

## 2. Target Users

### Primary Personas

| Persona | Description | Core Need |
|---|---|---|
| IT Professional | Software engineer or PM at a product/service company, interacts with US/UK clients | Sound fluent on international calls, lose hesitation |
| BPO / Customer Support | Speaks English on calls all day, wants to sound more natural | Natural flow, less scripted delivery |
| Middle Manager | Team lead or manager in Indian MNC, speaks to reports and leadership | Authoritative tone, clear articulation of ideas |
| MBA Student / Fresher | Preparing for placements, GDs, interviews | Interview confidence, group discussion skills |
| Sales Professional | Sells to enterprise clients, presents proposals | Persuasion, tone calibration, handling objections |
| Entrepreneur | Pitches to investors, speaks at events | Structured storytelling, executive presence |

### Geography
- Tier 1: Bangalore, Mumbai, Delhi, Hyderabad, Pune, Chennai
- Tier 2 (phase 2): Ahmedabad, Jaipur, Kochi, Kolkata, Chandigarh

---

## 3. Persona Builder

On signup, users complete a 5-minute profile that drives all lesson and feedback personalisation.

### Fields Collected

```
Name
Native Language: Hindi (Phase 1 only. Tamil / Telugu / Kannada / Malayalam / Bengali / Marathi / Gujarati / Punjabi launching in Phase 2)
Job Role (free text + category selector)
Seniority Level (Fresher / Junior / Mid-level / Senior / Manager / Director / C-suite / Student)
Industry (IT / BPO / Finance / Sales / Healthcare / Education / Startup / Other)
Company Size (Startup / SME / Large Enterprise / MNC)
Who I Primarily Speak English With:
  - International clients (US / UK / Other)
  - Domestic clients
  - My team / reports
  - My manager / leadership
  - Friends and social settings
  - Interviewers / recruiters
My Biggest Challenges (multi-select):
  - I pause or say "um" too much
  - My sentences are too long or unclear
  - I mix Hindi/regional words without realising
  - I sound too informal in professional settings
  - I sound too stiff in casual settings
  - I struggle to structure my thoughts quickly
  - My pronunciation is hard to understand
  - I lose confidence when challenged or interrupted
Goals (multi-select):
  - Crack a job interview
  - Sound confident on client calls
  - Lead team meetings effectively
  - Improve day-to-day office communication
  - Prepare for public speaking or presentations
  - General fluency improvement
```

---

## 4. Scenario Library

Scenarios are the core practice unit. Each scenario gives the user a realistic situation and a question or prompt to respond to.

### Scenario Categories

#### Professional — High Stakes
- Presenting project status to leadership
- Explaining a delay or setback to a client
- Salary negotiation with HR
- Disagreeing with a senior colleague respectfully
- Answering "Tell me about yourself" in an interview
- Handling a tough question in a group discussion

#### Professional — Day to Day
- Daily standup update
- Replying to a client's complaint over a call
- Giving feedback to a team member
- Asking for a deadline extension
- Introducing yourself in a new team
- Following up on a pending task without sounding rude

#### Social & Networking
- Making small talk at an office party
- Introducing yourself at a networking event
- Speaking to a senior person you just met
- Catching up with an old colleague
- Congratulating someone without sounding awkward

#### Client Calls — International
- Opening a call with a US or UK client
- Summarising a meeting for an international stakeholder
- Handling "I didn't understand you" or a request to repeat
- Pushing back on an unreasonable client demand

#### Everyday English
- Ordering at a restaurant when the waiter speaks only English
- Speaking to a doctor or hospital staff
- Arguing a point confidently without getting flustered
- Asking for directions or help

### Scenario Prompt Format

Each scenario has:
- **Context description** (read/played to the user before the question)
- **The question or prompt** (delivered via TTS)
- **Expected register**: Formal / Semi-formal / Casual
- **Target vocabulary level**: Professional / General / Conversational
- **Key communication goal**: Clarity / Persuasion / Empathy / Confidence / Structure
- **Common mistakes for this scenario** (used by the evaluator)

---

## 5. Practice Session Flow

```
1. User selects a scenario category and specific scenario
2. Bolo reads the context aloud (TTS, Indian English voice)
3. Bolo asks the question / presents the prompt (TTS)
4. User taps "Start Speaking" and responds freely
5. User taps "Done" or pauses for 2+ seconds (auto-detect)
6. Bolo processes the response:
   a. Transcription (Deepgram, en-IN)
   b. Prosody metrics (pace, pauses, filler words)
   c. LLM evaluation against persona + scenario context
7. Bolo plays back its feedback (TTS):
   a. What worked
   b. What to improve (1-2 specific things max)
   c. A model response — "Here is how you could say that instead"
8. User can:
   a. Try again with the same question
   b. Listen to the model response again
   c. Move to the next scenario
   d. Ask a follow-up question via voice
```

---

## 6. Evaluation Criteria

Every response is scored on the following dimensions. Scores are 1–5.

| Dimension | What It Measures |
|---|---|
| **Clarity** | Was the core message easy to understand? Sentence structure, word choice. |
| **Fluency** | Flow of speech. Filler words, unnatural pauses, restarts. |
| **Vocabulary** | Was the word choice appropriate for the scenario register? Were there missed opportunities for better words? |
| **Structure** | Did the answer have a logical beginning, middle, and end? |
| **Confidence** | Assertiveness of delivery. Did the person hedge excessively? |
| **Tone Match** | Did the tone suit the scenario (formal/casual/persuasive)? |
| **MTI Awareness** | Mother tongue influence — mixing regional words, sentence structures borrowed from vernacular. |

Only 1–2 improvement points are surfaced per session to avoid overwhelming the user.

---

## 7. Feedback Format

Feedback is always delivered via TTS and optionally shown on screen.

### Structure

```
"Good attempt. Let me share what worked first."
→ [1 specific positive observation]

"Now, one thing to work on:"
→ [1 specific issue with an example from what the user said]

"Here is how you could have said the same thing:"
→ [Model response, spoken at a natural pace]

"Would you like to try again, or shall we move on?"
```

Tone of feedback: Encouraging, not critical. Like a coach, not a teacher.

---

## 8. Progress & Analytics

### 8.1 Session Report (shown immediately after each session)

The session report is the most visible feedback surface. It should feel like a well-designed scorecard, not a wall of text.

**Layout: three sections**

#### Section A — Scorecard
A radar/spider chart showing all 6 dimensions with scores 1–5. Below it, a single overall score out of 100 (weighted average).

```
           Clarity
              5
         ___/___
        /       \
Tone   4         4   Fluency
Match   \       /
         \_____/
      Structure  Vocabulary
          3           4

Overall Score: 72 / 100   ▲ +8 from last session
```

Each dimension shows:
- Current score (this session)
- Personal best for this scenario
- Delta vs. last 5 sessions average (↑ / ↓ / —)

#### Section B — Filler Word Breakdown
Visual bar showing filler word rate per 100 words with a colour band:
- Green: < 3 fillers / 100 words (Excellent)
- Yellow: 3–7 (Good)
- Orange: 7–12 (Needs work)
- Red: > 12 (Focus here)

List of detected fillers with count: `"basically" ×4 · "you know" ×2 · "um" ×1`

Speaking pace indicator: `142 wpm — slightly fast. Ideal for this scenario: 120–135 wpm.`

#### Section C — Transcript Review
Full transcript with colour-coded highlights:
- Green underline: strong phrase or word choice
- Orange underline: filler word or unnecessary hedge
- Blue underline: suggested vocabulary upgrade (tap to see what Claude recommended)

---

### 8.2 Progress Dashboard (ongoing)

The dashboard is the user's home between sessions. It should feel motivating, not clinical.

**Top strip — at a glance:**
```
🔥 12-day streak    74 sessions    4.2 avg score    Top 18% this week
```

**Score trend chart**: line chart of overall score over last 30 sessions, one line per dimension (toggle-able).

**Dimension breakdown**: for each of the 6 dimensions, show current level and a small spark-line trend over last 10 sessions.

**Filler word trend**: bar chart of filler rate per session over last 4 weeks. Goal line shown.

**My weak spots**: top 2 dimensions with lowest average — with a direct "Practice this" CTA linking to a relevant scenario.

**Scenarios completed**: grid of scenario cards, each showing: completion count, best score, last played date.

---

### 8.3 Leaderboard

The leaderboard is opt-in. Users can choose to be visible or stay anonymous (shown as "Anonymous Boloer").

**Leaderboard tiers** — reset monthly:

| Rank | Badge | Criteria |
|---|---|---|
| 1–10 | Gold | Highest combined XP in the month |
| 11–50 | Silver | — |
| 51–200 | Bronze | — |
| Rest | Participant | Completed at least 5 sessions |

**Two leaderboard views:**
1. **Overall** — all users by monthly XP
2. **My Category** — filtered to users with the same job role / seniority band (e.g., "Senior IT Professionals")

**Leaderboard card per user shows:**
- Rank, display name, avatar initial
- Monthly XP
- Current streak
- Top dimension (their strongest area)

XP is earned (see Section 9 Gamification). The leaderboard resets on the 1st of each month; top 10 get a "Month Champion" badge permanently on their profile.

---

### 8.4 Weekly Report (email + in-app)

Delivered every Monday morning. Designed like a one-page personal performance brief.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOLO WEEKLY BRIEF — Week of 30 June
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You practiced 4 times this week. Here's where you stand.

OVERALL SCORE        74 / 100   ▲ +6 from last week
YOUR BEST MOMENT     "I clearly explained the delay and proposed a solution"
                     — Client Complaint scenario, Thursday

WHERE YOU IMPROVED   Fluency  ▲▲   Clarity  ▲
STILL WORKING ON     Structure  (avg 2.8 this week)

THIS WEEK'S FOCUS
→ Try to answer in 3 parts: what happened · why · what's next
→ Avoid starting sentences with "So basically..."
→ Recommended: "Summarising a meeting" scenario (matches your weak area)

LEADERBOARD POSITION  #43 of 1,200 users  (↑ from #67 last week)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 9. Curriculum & Learning Path

Beyond free practice, Bolo offers structured learning paths.

### Example: "Confident on Client Calls" (4 weeks)

| Week | Focus | Scenarios |
|---|---|---|
| 1 | First impressions | Introductions, opening a call, small talk |
| 2 | Clarity under pressure | Explaining complex ideas simply, repeating yourself clearly |
| 3 | Handling pushback | Disagreeing politely, managing complaints |
| 4 | Closing strong | Summarising meetings, confirming next steps, signing off |

---

## 10. Gamification

Gamification exists to build the habit of daily practice — not to distract from learning. Every mechanic ties directly to practice behaviour.

### 10.1 XP (Experience Points)

XP is the primary currency. Earned per session, not per score — so users who struggle still make progress.

| Action | XP |
|---|---|
| Complete a practice session | +10 |
| Score above 70 overall | +5 bonus |
| Score above 85 overall | +15 bonus |
| First attempt of a new scenario | +5 |
| Complete a scenario 5 times | +20 (mastery bonus) |
| Daily practice (any session) | +5 |
| Maintain a 7-day streak | +50 |
| Maintain a 30-day streak | +200 |
| Improve score vs. personal best on a scenario | +10 |

XP never expires and accumulates on the user's profile. It feeds the level system and the monthly leaderboard.

---

### 10.2 Levels

Every user has an overall level based on total lifetime XP.

| Level | Title | XP Required |
|---|---|---|
| 1 | First Word | 0 |
| 2 | Trying | 100 |
| 3 | Getting There | 300 |
| 4 | Conversant | 600 |
| 5 | Confident | 1,000 |
| 6 | Fluent | 1,800 |
| 7 | Articulate | 3,000 |
| 8 | Polished | 5,000 |
| 9 | Eloquent | 8,000 |
| 10 | Masterclass | 12,000 |

Level is shown on the user's profile card and next to their name on the leaderboard.

---

### 10.3 Streaks

A streak is maintained by completing at least one practice session per calendar day.

- Streak count shown prominently on dashboard and home screen
- At 3 days: "You're on a roll" notification
- At 7 days: +50 XP bonus + "Week Warrior" badge
- At 30 days: +200 XP bonus + "Iron Habit" badge
- Streak broken: gentle message ("Your 12-day streak ended. Let's start a new one today.") — no shame, just restart

**Streak Shield**: Pro users get 1 streak shield per month. If they miss a day, the shield is consumed automatically and the streak continues.

---

### 10.4 Badges

Badges are permanent achievements displayed on the user's profile. They signal milestones and specific accomplishments.

**Practice Badges**
| Badge | Trigger |
|---|---|
| First Session | Completed first practice |
| Scenario Explorer | Tried 5 different scenarios |
| Comeback | Retried a scenario after scoring below 50 and scored above 70 |
| Persistent | Completed 50 total sessions |
| Century | Completed 100 total sessions |

**Skill Badges**
| Badge | Trigger |
|---|---|
| Filler Free | Scored zero filler words in a session |
| Speed Control | Hit ideal WPM range 3 sessions in a row |
| Structured Mind | Scored 5/5 on Structure in any session |
| Vocabulary Upgrade | Scored 5/5 on Vocabulary in any session |

**Streak Badges**
| Badge | Trigger |
|---|---|
| Week Warrior | 7-day streak |
| Fortnight | 14-day streak |
| Iron Habit | 30-day streak |
| Unstoppable | 60-day streak |

**Leaderboard Badges**
| Badge | Trigger |
|---|---|
| Top 10 | Finished in top 10 in any monthly leaderboard |
| Month Champion | Finished #1 in any monthly leaderboard |
| Consistent Climber | Improved leaderboard rank for 3 consecutive months |

---

### 10.5 Scenario Mastery

Each scenario has a mastery level (1–5 stars) based on the user's best score on that scenario:

| Stars | Score Range |
|---|---|
| ⭐ | 1–40 |
| ⭐⭐ | 41–55 |
| ⭐⭐⭐ | 56–69 |
| ⭐⭐⭐⭐ | 70–84 |
| ⭐⭐⭐⭐⭐ | 85–100 |

The scenario picker grid shows mastery stars. Completing all scenarios in a category at 4+ stars unlocks a "Category Master" badge.

---

### 10.6 Daily Challenge

Each day, one scenario is featured as the Daily Challenge. It is the same for all users.

- Completing it before midnight: +15 XP (vs. +10 for a regular session)
- Scores on daily challenges count toward a separate daily challenge leaderboard (top 20 shown)
- Adds social energy — users compare notes on the same scenario

---

## 11. Subscription Tiers

| Tier | Price | Includes |
|---|---|---|
| **Free** | ₹0 | 5 sessions/month · 3 scenarios · Basic scorecard · Leaderboard visibility (read-only) |
| **Pro** | ₹499/month | Unlimited sessions · Full scenario library · Full progress dashboard · Leaderboard participation · Streak Shield (1/month) · Weekly report · XP + badges |
| **Teams** | ₹299/seat/month (min 5) | Everything in Pro · Admin dashboard · Team leaderboard · Team progress reports · Custom scenarios |

---

## 11. MVP Scope

The MVP ships with:
- [ ] Persona builder (onboarding form) — Hindi native language only
- [ ] 10 scenarios across 3 categories (Professional Day-to-Day, Client Calls, Interview Prep)
- [ ] Voice input → Deepgram transcription → Claude evaluation → TTS feedback loop
- [ ] Per-session scorecard (radar chart + filler word breakdown + transcript highlights)
- [ ] XP system + levels + streaks + badges
- [ ] Monthly leaderboard (opt-in)
- [ ] Daily Challenge scenario
- [ ] Basic progress dashboard (score trends, weak spots)
- [ ] Scenario mastery stars
- [ ] Free tier + Pro subscription via Razorpay

Not in MVP:
- Learning paths / curriculum
- Team tier
- Weekly email reports
- Real-time filler word interruption ("I noticed you said 'basically' three times...")
- Mobile app (web-first, mobile-responsive)
- Additional native languages beyond Hindi

---

## 12. Indian English Considerations

- The goal is **clear, confident Indian English** — not American or British English
- Feedback acknowledges that Indian English has valid regional flavours; it flags only what reduces clarity or sounds out of place in a professional context
- Common MTI patterns to detect (varies by native language):
  - "Itself" used as emphasis ("the file itself is missing")
  - Overuse of "only" at sentence end ("I told him only")
  - Present continuous for habitual actions ("I am going to office daily")
  - Dropped articles ("I went to market")
  - Mixing of "this" and "that" in demonstratives
- The TTS voice is Indian English (en-IN) — users should hear English that sounds like them, not a foreign accent

---

## 13. Success Metrics (MVP)

| Metric | Target (Month 3) |
|---|---|
| Registered users | 2,000 |
| DAU/MAU | 20% |
| Sessions per active user per week | 3+ |
| Pro conversion rate | 8% |
| Average session score improvement (week 1 vs week 4) | +15% |
| NPS | 40+ |
