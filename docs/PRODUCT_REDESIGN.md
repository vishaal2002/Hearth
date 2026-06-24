# Hearth — Product Redesign

**A warm, shared calendar for the people you love.**

> Reimagining the product from a fresh perspective: the shared calendar returns to the
> center, and every other feature exists to strengthen connection, planning, memory, and
> presence across couples, families, close friends, and loved ones.

This document is the complete deliverable: vision, audit, information architecture,
navigation, journeys, feature set, the calendar experience, responsive layouts
(mobile/tablet/desktop), design system, interaction design, empty states, inspirations,
technical feasibility, and a phased roadmap.

---

## 0. Naming decision (resolve first)

The codebase is internally inconsistent: repo = **Hearth**, design system = **Hearthlight**,
shipped brand = **Amber**, shared-space defaults = "Us / Home / Ours".

**Recommendation: consolidate on _Hearth_.**

- "Amber" was chosen for a couples-journaling app. It's intimate but narrow — it doesn't
  stretch to families, roommates, or friend groups.
- "Hearth" = the warm center of a shared home. It scales to *every* relationship type
  ("the hearth our family gathers around"), and it already names the design language.
- A hearth is a *place you return to* — which is exactly what a shared calendar is.

All copy, `<title>` tags, and the wordmark should standardize on Hearth. (Today they say
"— Amber".)

---

## 1. Product Vision

### One-liner
**Hearth is the shared calendar for the people you love — where planning your days
together quietly becomes the story of your life together.**

### The wedge
Every group of close people already coordinates: dinners, trips, birthdays, "are you free
Thursday?" They do it across iMessage, three calendar apps, a shared note, and memory.
Hearth makes the *shared calendar* the single warm surface for that — and then does
something no utility calendar does: it **remembers**. Plans become memories; memories
become the relationship's timeline.

### Three product truths
1. **The calendar is the spine.** Not a tab — the home. Everything attaches to time:
   plans ahead, the present day, memories behind.
2. **Connection is the payload.** A countdown to a trip, a "this day last year" photo, a
   nudge that it's Mom's birthday in 5 days — these are *features of a calendar that cares*,
   not a separate social app bolted on.
3. **It works for more than two.** Couples are the sharpest wedge, but the model is
   **Spaces** (see §3) — a couple, a family, a friend group, an extended-family circle.
   The daily ritual and journaling become *optional texture inside a Space*, never the
   whole product.

### What we are NOT
- Not a question-of-the-day social app (the current drift).
- Not a feed with followers.
- Not an enterprise scheduling tool (no "find a time across 40 calendars").
- Not a private journal that happens to have a date field.

### North-star metric
**Weekly Connected Households**: Spaces with ≥2 active members where, in a 7-day window,
someone *both* touched the calendar (created/edited/RSVP'd an event) *and* touched a
connection surface (memory, reaction, check-in, countdown). It forces calendar + connection
to stay fused.

---

## 2. Complete Audit — what exists, what drifted

### 2.1 Screen & route inventory (current)

| Route | File | What it is | Verdict |
|---|---|---|---|
| `/` | `routes/index.tsx` | Landing — sells the "one question a day" ritual | **Repivot** to lead with the shared calendar |
| `/auth` | `routes/auth.tsx` | Sign in / up | **Keep**, restyle to system |
| `/welcome` | `_authenticated/welcome.tsx` | 3-step onboarding, couples-only | **Rework** to multi-relationship Spaces |
| `/app` | `_authenticated/app.tsx` | Full calendar (5 views, recurring, sharing) | **Promote to home**; orphaned today |
| `/today` | `_authenticated/today.tsx` | Daily-question ritual + mood + "1 yr ago" | **Demote & fold** into Today dashboard as one module |
| `/us` | `_authenticated/us.tsx` | Reverse-chron "moments" timeline | **Evolve** into the Memory Timeline |

**Supporting components**
- `components/calendar/*` — `calendar-view`, `event-dialog`, `members-dialog`, `user-avatar`. **Strong; keep and extend.**
- `components/amber/*` — `prompt-hero`, `ritual-sheet`, `mood-orbit`, `moment`, `partner-presence`, `seal`, `ember-button`, etc. **Salvage the primitives** (typography, surfaces, buttons, presence) but **un-brand from "Amber"** and **generalize "partner" → "member(s)".**
- `components/ui/*` — full shadcn/Radix set already present (sidebar, resizable, chart, command, carousel…). **Massively underused** — these unlock the desktop layouts below with no new deps.

### 2.2 Information architecture problems (root causes of the drift)

1. **The calendar is unreachable from the primary nav.** `BottomNav` only routes to
   `/today` and `/us`. ([app-shell.tsx:69](src/components/app-shell.tsx#L69))
2. **Two parallel headers/shells.** `app.tsx` has its own bespoke header + `BottomNav`;
   `Shell`/`RitualChrome` is a second system. No unified frame.
3. **"Partner" is hard-coded everywhere.** `today.tsx` computes a single `partner`
   (`peopleQ.data.find(p => p.id !== user.id)`), `welcome.tsx` says "your person." The
   data model (`calendar_members`, many rows) already supports N people — the *UI* assumes 2.
4. **The daily question is the whole emotional surface.** A genuinely nice ritual got
   promoted to *the product*. It should be one card on a calendar-centric dashboard.
5. **Mobile-only layout.** Every authenticated screen is `max-w-lg` centered
   ([app-shell.tsx:131](src/components/app-shell.tsx#L131)) — a phone column stranded in the
   middle of a desktop. The calendar at `/app` is the only screen with a real sidebar.
6. **Concept sprawl in naming.** "space" (couples calendar), "calendars" (table), "moments"
   (table), "ritual," "ember," "seal" — overlapping metaphors that don't map to a clear IA.

### 2.3 What to keep (don't throw away)
- The **calendar engine** (`calendar-utils.ts`: recurring expansion, week/month math, color
  system) and `calendar-view.tsx`.
- The **design language** in `styles.css` (Hearthlight): OKLCH ember palette, morning/evening
  themes, glow-over-shadow, paper textures, Fraunces + Jakarta + Caveat.
- The **Supabase model**: `calendars` (with `is_personal`), `calendar_members` (roles),
  `events` (recurrence fields), `invitations`, `moments`. It's a sound base.
- The **"share then see"** mechanic and **"this day last year"** — these are genuinely
  special; they become *features inside* Hearth, not the identity of it.

---

## 3. Information Architecture (target)

### 3.1 Core model: **Spaces**

A **Space** is a shared world for a set of people. It generalizes today's "non-personal
calendar." Each Space has a *type* that tunes copy, defaults, and suggested features —
without forking the codebase.

```
Account (one person)
 ├── Personal calendar (always private, is_personal = true)   ← already in schema
 └── Spaces  (1..n)
      ├── type: couple | family | friends | circle
      ├── Members (2..n)  with roles: owner | editor | viewer   ← calendar_members today
      ├── Calendars (1..n inside the space, color-coded)        ← reuse calendars table
      ├── Events / plans                                        ← events table
      ├── Memories (photos, notes, voice, milestones)           ← extends moments table
      ├── Lists (bucket list, gifts, packing, groceries)
      ├── Goals & habits
      └── Rituals (daily check-in / question — OPTIONAL per space)
```

A person can belong to several Spaces (your partner *and* your family *and* your hiking
friends). This is the single most important structural change: **it lifts the 2-person
ceiling without complicating the couple case** (a couple Space just has 2 members).

### 3.2 The three time zones of the app

The whole product organizes around **time relative to now** — this is what makes it a
calendar at heart rather than a feed:

```
        ←  BEHIND            •  PRESENT  •            AHEAD  →
        Memories             Today / This week        Plans, Countdowns,
        (timeline, on-this-  (dashboard, check-in,     Milestones, Goals
         day, milestones)     what's next)             (calendar, agenda)
```

Navigation maps directly onto this (next section).

### 3.3 Top-level destinations

| Dest | Purpose | Time zone |
|---|---|---|
| **Today** (Home) | Warm dashboard: what's today/next, the day's ritual, nudges, presence | Present |
| **Calendar** | The full planning surface (month/week/day/agenda/journey) | Ahead |
| **Memories** | Photo + note + voice timeline, on-this-day, milestones | Behind |
| **Together** | Lists, goals, habits, bucket list, conversation prompts | Cross-cutting |
| **Space switcher** | Move between couple / family / friends Spaces | — |

> Four destinations + a Space switcher. The current 2 tabs (today/us) expand to a coherent
> set, and the orphaned calendar comes home.

---

## 4. Navigation Redesign

### 4.1 Mobile — bottom tab bar (4 + center action)

```
┌─────────────────────────────────────────────┐
│                                               │
│              (screen content)                 │
│                                               │
├───────────────────────────────────────────────┤
│  ◑ Today   ▦ Calendar  (＋)  ♡ Memories  ⊕ Together │
└───────────────────────────────────────────────┘
        active = ember; center ＋ = quick-add (event/photo/note)
```

- Replaces the 2-tab bar. Center **＋** opens a quick-add sheet (event, photo memory, note,
  list item) — the single most common create actions.
- Space switcher lives in the top-left avatar/space chip, not the tab bar.

### 4.2 Tablet — left rail + content

A 72px icon rail (collapsible to labels) replaces the bottom bar. Content gets a two-pane
layout where it helps (Calendar + day detail; Memories grid + lightbox).

### 4.3 Desktop — persistent sidebar + multi-panel

A 260px sidebar (reuse `components/ui/sidebar.tsx`, currently unused) with:
Space switcher → primary destinations → calendar list (color toggles, the existing
`SidebarContent`) → "Your people" presence. Content area becomes genuinely multi-panel
(see §8).

### 4.4 Unify the shell

Collapse the two competing frames (`Shell`/`RitualChrome` vs `app.tsx`'s bespoke header)
into **one responsive `AppFrame`**:
- `< md`: top context bar + bottom tab bar.
- `≥ md`: persistent sidebar, no bottom bar.
- All five destinations render inside it, so the calendar stops being a visual island.

---

## 5. User Journeys

### 5.1 New user → first value (onboarding)
1. **Sign up** (`/auth`).
2. **"Who are you sharing life with?"** — pick a Space type with warm illustrations:
   *My partner · My family · Close friends · Someone special*. (Replaces couples-only copy.)
3. **Name the Space + accent color** (reuse `welcome.tsx`'s lovely color step).
4. **Invite people** (email; multi-invite for family/friends, not just one "person").
5. **Seed the calendar to create instant value:** "Add a few dates we already know" →
   chips for *birthdays, an anniversary, a trip, a recurring date night*. This is the
   critical fix — the user leaves onboarding with a **populated calendar**, not an empty
   journal prompt.
6. Land on **Today**, which already shows their first countdown ("Anniversary in 24 days").

### 5.2 Returning daily loop (the habit)
Open app → **Today**: "Tonight: Dinner with Mom, 7pm" + "It's been 3 days since you and
Sam logged a moment — today's question is waiting" + "On this day last year: [photo]."
One screen answers *what's happening, what needs me, what's worth remembering.*

### 5.3 Planning together (collaboration)
Anyone proposes a plan → others see it on the shared calendar → RSVP / suggest a time /
add to it (notes, who's bringing what) → it gets a **countdown** → afterward it can be
**turned into a memory** (attach photos) with one tap. Plan → presence → memory, in one arc.

### 5.4 Milestone / anniversary
Hearth tracks recurring relationship dates (anniversary, birthdays, "first met"). It
surfaces a countdown, suggests gift ideas (from the shared gift list), and after the day,
prompts to save a memory. Closes the loop most calendars drop on the floor.

### 5.5 Couple intimacy loop (preserve the magic)
The daily question + "share then see" + mood + "this day last year" **survive intact** —
but as the **Ritual module** inside a couple Space's Today screen, not the entire app.
Families/friends Spaces can enable a lighter version (a weekly group check-in) or turn it off.

---

## 6. Feature Set — organized into pillars

Every feature is justified by *"does this strengthen connection through shared time?"*
Features from the brief are mapped here; ★ = net-new proposals.

### Pillar A — Shared Calendar (the spine)
- Multiple color-coded calendars per Space (have).
- Recurring events (have), all-day, reminders (have).
- **RSVP / going-status per member** on an event. ★
- **Event collaboration**: shared checklist, "who's bringing what," notes, photos attached
  to an event. ★
- **Joint planning / proposals**: "Propose 3 times," members vote. ★
- **Travel & trip planning**: a trip is a date-range container with its own itinerary,
  packing list, and countdown. ★
- **Family logistics**: assignable events ("school pickup → Dad"), kid/dependent profiles. ★

### Pillar B — Anticipation (ahead of now)
- **Event countdowns** — hero countdowns for the next meaningful date. ★
- **Anniversary & birthday tracking** with auto-recurring milestones. ★
- **Relationship milestones** ("1000 days," "first trip"). ★
- **Smart + gift reminders**: "Mom's birthday in 7 days — here's your shared gift list." ★
- **Shared bucket list** that can graduate items into real planned events. ★

### Pillar C — Presence (the now)
- **Today dashboard** — the new home (see §8.1).
- **Daily check-in / mood sharing** — generalize the existing mood orbit + presence dots. (have, repurpose)
- **The daily question ritual** — kept, scoped to a module. (have)
- **Partner/member presence** — "Sam is here / shared today." (have, generalize to N)
- **Status & availability** ("heads-down till 3," "free tonight"). ★

### Pillar D — Memory (behind now)
- **Memory timeline** — evolve `/us` into a rich photo+note+voice timeline. (have, evolve)
- **Shared photo moments** attached to days/events. ★
- **Voice memories** — short audio notes on a day. ★
- **On-this-day / "last year"** resurfacing. (have)
- **Location-based memories** — pin where a memory happened; a small map of "our places." ★
- **Relationship insights** — gentle yearly/monthly recap ("47 days together this year,
  3 trips, your most-used word: 'finally'"). Recharts is already a dependency. ★

### Pillar E — Shared Life (cross-cutting)
- **Collaborative notes** (groceries, ideas, planning docs). ★
- **Shared goals & habit tracking together** ("walk 3×/week," streaks for two). ★
- **Important conversation prompts** — deeper, opt-in prompts beyond the daily question. ★
- **Private sub-spaces** — the multi-Space model *is* this: separate worlds for partner vs
  family vs friends, each with its own privacy boundary (RLS already enforces per-calendar). (have, surface it)

### Pillar F — Intelligence (Claude-powered) ★
- **AI-assisted planning**: "Plan a low-key anniversary night near us" → drafts an event
  with time, idea, and a reservation reminder.
- **Smart suggestions on the calendar**: detects an upcoming free weekend + an unticked
  bucket-list item → "You're both free Saturday — finally do the pottery class?"
- **Memory captions & recaps**: auto-drafts a warm caption for a photo, or the yearly recap.
- **Gift suggestions** from shared interests + the gift list.

> Use the latest Claude models (e.g. `claude-opus-4-8` for recaps/planning,
> `claude-haiku-4-5` for cheap inline suggestions). See §12 feasibility.

---

## 7. The Calendar Experience (the heart)

The calendar must feel like the emotional center, not a grid. Views:

1. **Month** — classic grid, but cells carry **member-colored dots**, a small **memory
   icon** on days that have memories, and **milestone ribbons** (anniversary/birthday).
2. **Week / 3-day / Day** — time-grid (have). Add **member avatars on events**,
   **going-status**, drag-to-move (have).
3. **Agenda** — a warm vertical list grouped by day, leading with countdowns. (have, restyle)
4. **Shared Timeline view** ★ — a horizontal lane per member (or per calendar) so you can
   *see togetherness*: where your days overlap, where they don't. "We're both free Sunday."
5. **Relationship Journey view** ★ — zoom all the way out: a single ribbon from the day the
   Space started to today, beaded with milestones, trips, and memory clusters. This is the
   "story of us" — the feature no utility calendar has.
6. **Milestone view** ★ — just the meaningful recurring dates and their countdowns.

**Overlays & smart layers**
- **Memory overlay** — toggle to bloom photo thumbnails onto past calendar days.
- **Weather/season tint** for trips and outdoor plans (nice-to-have).
- **Smart suggestions** — inline "+ Free Saturday — plan something?" chips.
- **AI planning** — a "Plan with Hearth" entry on the create-event flow.

**Create/edit** keeps the solid `event-dialog.tsx` but grows tabs: *Details · People (RSVP)
· Bring/Checklist · Memory*. On desktop this becomes an inline right-panel, not a modal (§8.3).

---

## 8. Responsive Layouts — true per-device experiences

> Principle: **same data, device-native composition.** Phones get focus and thumb-reach;
> tablets get two panes; desktop gets a dashboard that uses the whole canvas. No more
> `max-w-lg` everywhere.

### 8.1 Today (Home) — DESKTOP (≥1280px)

```
┌────────────┬─────────────────────────────────────────────┬──────────────────┐
│  SIDEBAR   │  Good evening, Vishaal · Monday, Jun 22      │  YOUR PEOPLE      │
│            │                                               │  ◍ Sam — here     │
│ ◆ Us  ▾    │  ┌─────────────────────┐ ┌─────────────────┐ │  ◍ Mom — away     │
│            │  │ NEXT UP             │ │ COUNTDOWN        │ │                  │
│ ◑ Today •  │  │ 7:00 Dinner w/ Mom  │ │   Anniversary    │ │  ON THIS DAY     │
│ ▦ Calendar │  │ 9:30 Call w/ Sam    │ │     24 days      │ │  ┌────┐ "last yr │
│ ♡ Memories │  │ + 2 more today      │ │   ▓▓▓▓▓░░░░       │ │  │img │  at the  │
│ ⊕ Together │  └─────────────────────┘ └─────────────────┘ │  └────┘  lake"    │
│            │  ┌─────────────────────┐ ┌─────────────────┐ │                  │
│ CALENDARS  │  │ TODAY'S QUESTION    │ │ THIS WEEK        │ │  GENTLE NUDGES   │
│ ◉ Us       │  │ "What made you      │ │ M T W T F S S    │ │ • Gift idea for  │
│ ◉ Family   │  │  smile today?"      │ │ ● ● · ● · ●● ·   │ │   Mom (7d left)  │
│ ◉ Work     │  │ [ Answer → ]        │ │ 3 plans together │ │ • Sam logged a   │
│            │  └─────────────────────┘ └─────────────────┘ │   moment ♡       │
│ + New      │  ┌───────────────────────────────────────┐   │                  │
│ ◍◍ people  │  │ MINI MONTH  Jun 2026   ‹ ›             │   │                  │
│            │  │  S M T W T F S  …grid with dots…       │   │                  │
└────────────┴──┴───────────────────────────────────────┴───┴──────────────────┘
   260px                   fluid 12-col widget grid                  320px rail
```

Widget dashboard (cards = `components/ui/card`), 3 regions: left nav, center widget grid,
right "presence & connection" rail. Information-rich, premium, *not* a centered phone.

### 8.2 Calendar — DESKTOP

```
┌────────────┬──────────────────────────────────────────────┬──────────────────┐
│  SIDEBAR   │ ‹ June 2026 ›   [Month][Week][Day][Agenda]    │  EVENT DETAIL     │
│            │                 [Timeline][Journey]   + New    │  ┌──────────────┐ │
│ mini-month │ ┌──┬──┬──┬──┬──┬──┬──┐                         │  │ Dinner w/ Mom │ │
│ ▣ Jun ▾    │ │Mo│Tu│We│Th│Fr│Sa│Su│                         │  │ Mon 7:00pm    │ │
│            │ ├──┼──┼──┼──┼──┼──┼──┤                         │  │ ◍ Sam going   │ │
│ CALENDARS  │ │ 1│ 2│ 3│ 4│●5│ 6│ 7│   color-dotted cells   │  │ ◍ You going   │ │
│ ◉ Us       │ │ 8│ 9│10│11│12│♡13│14│   ♡ = has memory      │  │ Bring: wine   │ │
│ ◉ Family   │ │15│16│17●18│19│20│21│   ⬥ = milestone        │  │ [Add memory]  │ │
│ ◉ Friends  │ │22│⬥23│24│25│26│27│28│                       │  └──────────────┘ │
│            │ └──┴──┴──┴──┴──┴──┴──┘                         │  SUGGESTIONS      │
│ + New cal  │  ＋ Free Sat 13 — plan something?              │  ✨ Plan w/ Hearth│
└────────────┴──────────────────────────────────────────────┴──────────────────┘
```

Clicking an event opens a **right detail panel** (`react-resizable-panels` is installed),
not a centered modal. The mobile version keeps the modal.

### 8.3 Calendar — TABLET (two-pane) & MOBILE (focus)

```
TABLET                                   MOBILE
┌──────┬──────────────────────────┐      ┌───────────────────┐
│ rail │ ‹ June ›  [M][W][D][Agd] │      │ ‹ June 2026 ›   ⊕ │
│ 72px │ ┌──────────────────────┐ │      ├───────────────────┤
│  ◑   │ │   month grid          │ │      │  M T W T F S S    │
│  ▦ • │ │   (tap day → )        │ │      │  · · ● · · ●● ·   │  ← week strip
│  ♡   │ ├──────────────────────┤ │      ├───────────────────┤
│  ⊕   │ │ Sat 13  ── day detail │ │      │ TODAY             │
│      │ │ ♡ memory · 2 events   │ │      │ 7:00 Dinner w/Mom │
│      │ └──────────────────────┘ │      │ 9:30 Call w/ Sam  │
└──────┴──────────────────────────┘      │ ───────────────── │
                                          │ ✨ Free Sat?      │
  Month + selected-day detail side        ├───────────────────┤
  by side; rail replaces bottom bar.      │ ◑ ▦• (＋) ♡ ⊕     │
                                          └───────────────────┘
                                       One view at a time, big tap
                                       targets, swipe between weeks.
```

### 8.4 Memories — responsive
- **Mobile:** single-column timeline (evolve `/us`), date-grouped (have), with photo cards
  and "on this day" interludes.
- **Tablet:** masonry grid + tap-to-expand lightbox.
- **Desktop:** masonry grid (left) + sticky **year scrubber / Journey ribbon** (right) to
  jump through the relationship's history.

### 8.5 Breakpoint contract
| Token | Range | Nav | Calendar | Today |
|---|---|---|---|---|
| Mobile | <768 | Bottom tabs + ＋ | One view, week strip | Single column, swipe cards |
| Tablet | 768–1279 | Icon rail | Two-pane (grid+day) | 2-col widgets |
| Desktop | ≥1280 | Full sidebar | Grid + detail panel + suggestions | 3-region dashboard |

---

## 9. Design System ("Hearthlight", extended)

Keep the strong foundation in `styles.css`; formalize and extend it.

### 9.1 Color (OKLCH, already defined)
- **Ember** primary `oklch(0.68 0.19 42)` — warmth, action, the "lit hearth."
- Morning (light) / Evening (dark) duality is a brand signature — keep the
  `localStorage` theme but rename to Hearth and add **auto (follow system + time of day).**
- The 8 accent swatches (Ember, Marigold, Rose, Sage, Sky, Dusk, Clay, Teal) become the
  **member/calendar identity palette** — each person & calendar carries a warm color.
- Add semantic tokens: `--going`, `--maybe`, `--declined` (RSVP), `--milestone`,
  `--memory`, `--countdown-urgent`.

### 9.2 Typography
- **Display:** Fraunces (have) — headings, prompts, countdowns. Optical sizing on.
- **Body/UI:** Plus Jakarta Sans (have).
- **Hand:** Caveat (have) — sparingly, for emotional accents ("us," memory captions).
- Formalize a scale: `display-xl` (countdowns) → `display` → `title` → `body` →
  `whisper` (the existing `.text-whisper` lowercase label). Tighten to a 1.25 ratio.

### 9.3 Surface & elevation
- Signature **glow-over-shadow** (have: `.glow-ember`, `.shadow-glow`, `.surface-paper`).
  Keep depth from light, not boxes.
- **Paper texture** (`--paper-radius`, noise SVG) for memory/intimate surfaces; clean
  cards for planning surfaces. This contrast = *plans feel crisp, memories feel kept.*

### 9.4 Components to build (most primitives exist)
- `AppFrame` (responsive shell) — **new, replaces dual shell.**
- `SpaceSwitcher` — **new.**
- `CountdownCard`, `MilestoneRibbon`, `MemoryCard`, `VoiceMemo`, `RSVPControl`,
  `PresenceRail`, `JourneyRibbon`, `SuggestionChip` — **new, composed from `ui/*`.**
- Reuse: `sidebar`, `resizable`, `carousel`, `chart`, `command` (⌘K quick-add on desktop),
  `drawer`/`sheet` (mobile create), `avatar` + existing `AvatarStack`.

### 9.5 Iconography & illustration
- Icons: continue **lucide-react** (have) for UI; commission/define a small set of
  **warm spot illustrations** for onboarding, empty states, and milestones (hearth, hands,
  shared table, journey path). Consistent 2px, rounded, warm-tinted line style.
- Define one **mascot/marque** moment — a softly glowing hearth/ember used at key emotional
  beats (onboarding finish, milestone unlocked, yearly recap).

---

## 10. Interaction Design & Micro-interactions

- **Motion language:** framer-motion (have). Warm, slightly slow, *settling* easing
  (springs with low stiffness). Nothing snappy/enterprise.
- **The "keep" gesture:** saving a memory does a gentle ember-bloom + haptic (`haptics.ts`
  exists) — the existing `success` haptic pattern.
- **Share-then-see reveal:** keep the lovely seal/unseal animation (`seal.tsx`,
  `frost-seal`) — frost melts to reveal the partner's answer. Generalize to "tap to reveal."
- **Countdown urgency:** the progress ring tightens and warms in color as the date nears.
- **Calendar drag:** event drag uses a lift + glow shadow; drop snaps with a soft settle.
- **On-this-day:** memories *fade in* (`faded` prop already exists in `MomentReveal`).
- **Presence:** the ember-pulse (`animate-ember-pulse`) = a person is currently active.
- **Pull-to-refresh / week swipe** on mobile with rubber-band physics.
- **Respect `prefers-reduced-motion`** (already handled in `styles.css`) — keep it.
- **Optimistic UI** for RSVP, reactions, check-ins (React Query mutations).

---

## 11. Empty States (delight, not dead ends)

Every empty state teaches the next action and stays warm:

| Surface | Empty state |
|---|---|
| **Calendar (no events)** | "Your shared days start here." + quick chips: *Add a birthday · Plan a date · Save an anniversary.* (Today the `/app` empty state is a nice "warm corner" message — keep its tone, add the actions.) |
| **Memories (none)** | "Nothing kept yet — but you're making memories right now." + "Save your first photo" + show a faint *future* on-this-day placeholder. (Evolve `/us`'s "your story starts today.") |
| **No partner/members yet** | "Hearth is warmer with your people." + one-tap invite (reuse `InviteStrip`), and make it clear solo use still works (personal calendar). |
| **Countdown (none)** | "Add something to look forward to." |
| **Bucket list (empty)** | Pre-seeded gentle suggestions by Space type (couple: "watch the sunrise together"; family: "a no-phones dinner"). |
| **Today (quiet day)** | "A calm one. Nothing planned — want to make a little plan, or just say hi?" + check-in + ✨ suggestion. |

---

## 12. Premium UI Inspirations (benchmark set)

Emotionally engaging, polished products to benchmark against — *not* enterprise tools:

- **Arc / Cron (Notion Calendar)** — keyboard-fast, beautiful calendar interactions,
  multi-calendar overlay, command bar.
- **Things 3** — restraint, typography, "feels calm," delightful micro-interactions.
- **Partiful / Howbout** — warm, playful event/RSVP and group-plan energy.
- **Locket / BeReal (the intimacy, not the feed)** — the "share to see," presence of people you love.
- **Day One** — premium journaling/memory craft, on-this-day, media-rich entries.
- **Airbnb / Headspace** — illustration warmth, onboarding emotion, soft palettes.
- **Stripe / Linear (for the *system rigor only*)** — spacing discipline and density on desktop, applied to a warm skin.

The target feeling: **"Things 3 meets Day One, for people who love each other."**

---

## 13. Technical Feasibility

The stack is well-suited; most of this is composition + schema extension, not rewrites.
Stack: TanStack Start/Router + React 19 + React Query + Supabase + Tailwind v4 + Radix/shadcn
+ framer-motion + recharts.

### 13.1 Data model changes (Supabase)
- **Spaces:** add `type` to `calendars` (or introduce a `spaces` table that groups
  calendars) — `couple | family | friends | circle`. Low-risk: `is_personal` already
  distinguishes shared from personal.
- **RSVP:** `event_attendance(event_id, user_id, status, updated_at)`.
- **Memories:** extend `moments` with `media_url`, `media_type (photo|voice)`,
  `location`, `event_id?` (link memory↔event), reactions table.
- **Milestones / countdowns:** can be **derived** from events with a `kind`/`is_milestone`
  flag + recurrence — minimal new tables.
- **Lists / goals / habits:** `lists(space_id, kind)`, `list_items`, `habits`, `habit_logs`.
- **RLS:** the per-calendar membership policies already enforce privacy — extend the same
  pattern to new tables. This is the project's existing strength; keep it.

### 13.2 Frontend
- **Routing:** add `/calendar` (promote current `/app`), `/memories` (evolve `/us`),
  `/together`; keep `/today` but rebuild as the dashboard. TanStack file routes + the
  generated `routeTree.gen.ts` make this cheap.
- **Responsive shell:** one `AppFrame` with Tailwind breakpoints; sidebar/`resizable`/
  `sheet` all already installed → desktop multi-panel is achievable with **zero new deps.**
- **State:** React Query already in use; add optimistic mutations for RSVP/reactions.
- **Realtime presence:** Supabase Realtime channels for "who's here / who just shared"
  (the presence dots). Incremental.

### 13.3 Media (photos / voice)
- Supabase Storage buckets for memory media; signed URLs gated by Space membership.
- Voice memos: `MediaRecorder` API → upload; transcribe later (optional, Claude/Whisper).

### 13.4 AI (Claude) — feasibility & cost shape
- Planning & recaps: **`claude-opus-4-8`** (high quality, lower volume).
- Inline suggestions / captions: **`claude-haiku-4-5`** (cheap, high volume).
- Run via a thin server route (TanStack server fn) holding the Anthropic key — never
  client-side. Tool-use lets "Plan with Hearth" return a structured event draft.
- Prompt-cache the Space context (members, upcoming dates) to cut cost on repeated calls.

### 13.5 Risks / watch-items
- **Don't regress the calendar engine** (`calendar-utils.ts` recurrence expansion is the
  riskiest code to touch) — wrap, don't rewrite.
- **Migration discipline:** `space.ts` already has a graceful RPC-vs-client fallback for
  `create_shared_space`; follow that pattern for new RPCs.
- **Performance:** memory media + month grids → virtualize long timelines; lazy-load images.
- **Scope creep:** the feature list is large — the roadmap (§14) sequences it so the
  calendar+connection core ships first and stays coherent.

---

## 14. Feature Roadmap (phased)

### Phase 0 — Refocus & unify (foundation)  ⟶ *fixes the drift*
1. Rebrand Amber → **Hearth** across copy/titles/wordmark.
2. Build **`AppFrame`** (one responsive shell): bottom tabs (mobile) / sidebar (desktop).
3. **Promote the calendar** into primary nav; it is no longer orphaned.
4. New nav: **Today · Calendar · Memories · Together** + Space switcher.
5. Rebuild **Today** as the dashboard; the daily question becomes one module.
6. Generalize **"partner" → members (N)** throughout (`today.tsx`, `welcome.tsx`).
7. Onboarding: **choose Space type** + **seed real dates** (instant populated calendar).

### Phase 1 — Calendar as the heart
1. Member avatars + colors on events; **RSVP/going-status**.
2. **Countdowns** + **milestone/anniversary/birthday** tracking.
3. Desktop calendar **detail panel** + month memory/milestone markers.
4. **Agenda** restyle; **week strip** on mobile.

### Phase 2 — Memory & connection
1. **Memory timeline** (evolve `/us`): photos + notes + **on-this-day**.
2. Attach **memories to events** ("turn this plan into a memory").
3. **Daily check-in / mood / presence**, generalized; keep share-then-see for couples.
4. **Voice memories**; reactions.

### Phase 3 — Shared life
1. **Lists** (bucket list, gifts, packing, groceries) + bucket→event graduation.
2. **Goals & habits together**; **conversation prompts**.
3. **Trip planning** container (itinerary + packing + countdown).

### Phase 4 — Depth & intelligence
1. **Timeline & Journey** calendar views; **relationship insights** (recharts).
2. **Location-based memories** (map of "our places").
3. **AI**: Plan with Hearth, smart suggestions, gift ideas, yearly recap.

### Phase 5 — Premium polish
Illustration set, milestone celebrations, command bar (⌘K), realtime presence, refined
motion pass, accessibility audit, performance/virtualization.

---

## 15. Summary of the core moves

1. **Bring the calendar home** — it's the spine, reachable, the literal home of the app.
2. **Spaces, not couples** — one model that serves partners, families, friends, loved ones.
3. **Demote the question** to a delightful *module*, not the product.
4. **Three time zones** — Memories (behind) · Today (present) · Calendar (ahead) — give the
   app a coherent shape where planning naturally becomes remembering.
5. **Real responsive design** — phone focus, tablet two-pane, desktop dashboard; kill the
   stranded `max-w-lg` column.
6. **Keep the soul** — Hearthlight palette, share-then-see, on-this-day, warm motion — and
   let it serve a calendar that helps people stay close to the ones they love.
