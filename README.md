# Who Drew That? 

**"Who Drew That?"** is a multiplayer social deduction game where drawing is your only alibi. 4 to 8 players collaborate on a single, shared canvas to draw a secret word—but one player is a clueless Liar trying to blend in. 

Can the group catch the imposter based on one suspicious line, or will the Liar blend in and steal the victory?

---

## The Core Concept
Unlike traditional drawing games where one person draws alone, **Who Drew That?** features a **shared canvas, one-stroke-at-a-time** mechanic. 

* **The Crew:** Everyone receives the same secret word (e.g., `"CAT"`).
* **The Liar:** One random player receives a different, related word (e.g., `"DOG"`) or a blank prompt. They do not know what the crew is drawing.
* **The Twist:** Players take turns adding to the *same* drawing in short, intense 10-second bursts. The Liar must deduce the crew's word purely from their strokes and bluff their way through their own turn without making a "suspicious" line.

---

## The Game Loop
1. **Lobby:** Players join via a unique room link and ready up.
2. **Word Assignment:** Secret words are handed out privately by the server. Turn order is randomized.
3. **Drawing Phase:** The shared canvas opens. Players cycle through 2-3 rounds of quick, 10-second turns, drawing live while everyone else watches in real-time.
4. **Discussion Phase:** A 20-30 second text chat opens. Players frantically debate why a specific line or circle looks "sus."
5. **Voting Phase:** Players cast secret votes on who they think the Liar is.
6. **The Reveal:** The Liar is unmasked, points are awarded, and the entire drawing is replayed stroke-by-stroke with player tags!

---

## Key Features (MVP & Beyond)

### Phase 1: Core MVP
* **Room & Lobby Management:** Quick room creation and smooth join-via-link system.
* **Server-Controlled State Machine:** Strict turn timers (10s) and seamless phase transitions handled entirely by the server to prevent desync.
* **Live Stroke Synchronization:** Watch players hesitate or change direction mid-stroke in real time.
* **Secure Word Delivery:** The true word is never sent to the Liar's client, making browser-inspection cheating impossible.
* **Voting & Dynamic Scoring:** Dedicated phases to vote out the imposter and calculate scores over a best-of-5 rounds setup.

### Phase 2: Engagement Hooks
* **Stroke-by-Stroke Replay:** A beautiful animated replay at the end of the round showing exactly who drew what line.
* **Liar's Counter-Guess:** If the Liar gets caught, they get one final chance to guess the crew's actual word for bonus points.
* **Visual Polish:** Turn transition indicators, countdown bars, and simple visual badges (e.g., "Master Bluffer").

---

## 2-Person Task Split

To ensure parallel development without blocking each other, the work is split into two distinct roles that communicate via a pre-agreed data schema.

### Person A: "The Referee" (Backend & State)
Focuses entirely on game rules, data security, and synchronizing state across players.
* Designing the Room and Lobby infrastructure.
* Server-side word assignment and Liar selection.
* Building the central game clock (turn management, phase switching).
* Processing votes, handling player disconnects gracefully, and tallying final scores.

### Person B: "The Artist" (Frontend & UI)
Focuses entirely on the user experience, interaction, and rendering visual elements.
* Implementing the interactive HTML5 canvas drawing board.
* Capturing user brush data and rendering incoming live strokes from other players.
* Building UI views for the Lobby, Active Turn/Timer, Chat, and Voting screens.
* Creating the end-of-round Reveal animation and player scoring tables.
