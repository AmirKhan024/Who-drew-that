# Setup & Run Instructions

This covers how to install, run, and test the "Who Drew That?" base project.
For the game concept, feature list, and task split, see `README.md`.

## Project structure

```
who-drew-that/
  server/
    server.js     -> Express + Socket.io setup, all socket event wiring ("The Referee")
    Room.js        -> The game state machine: lobby, turns, votes, scoring
    words.js        -> Secret word pairs (Crew word + related Liar word)
  public/
    index.html       -> All screens (start, lobby, in-game) ("The Artist")
    css/style.css     -> Visual styling
    js/canvas.js       -> Captures/renders drawing strokes
    js/main.js          -> Socket.io client logic, wires UI to server events
  test/
    simulate-game.js     -> Runs a full simulated 4-player game instantly, to
                            sanity-check the game logic without waiting on
                            real timers
  package.json
```

## 1. Install requirements

You need [Node.js](https://nodejs.org) installed (v18 or newer is safest).
Check with:
```bash
node -v
```

## 2. Install dependencies

From the project folder, run:
```bash
npm install
```
This installs `express` and `socket.io`.

## 3. Run the server

```bash
npm start
```
You should see:
```
Who Drew That? server running on http://localhost:3000
```

## 4. Play it

- **On one PC, testing solo:** open `http://localhost:3000` in several
  browser tabs/windows — each tab acts as a separate player.
- **On multiple PCs on the same Wi-Fi/LAN:** find the host PC's local IP
  (Windows: `ipconfig`, look for IPv4 Address, e.g. `192.168.1.5`). Other
  players on the same network open `http://192.168.1.5:3000` in their
  browser. Make sure Windows Firewall allows Node.js on private networks.
- **On different networks entirely (over the internet):** the simplest way
  while testing is a tunneling tool like [ngrok](https://ngrok.com)
  (`ngrok http 3000`), which gives you a public URL you can share. For a
  permanent version, you'd deploy the server somewhere (Render, Railway,
  a VPS, etc.) — that's a separate step for later, not needed to test the
  base game.

## 5. Run the automated logic test (optional but useful)

```bash
npm test
```
This runs `test/simulate-game.js`, which drives 4 fake players through an
entire 5-round game instantly (bypassing real timers) and prints the round
results, votes, and final scores. Use this after making changes to
`Room.js` to quickly confirm nothing broke, without manually clicking
through a real game every time.

## How a game actually flows

1. **Start screen** — player picks a name, then creates a room (choosing
   4–8 players) or joins one via room code.
2. **Lobby** — players see who's joined, mark themselves ready; once
   everyone's ready, the host clicks Start.
3. **Word assignment** — server privately sends the real word to the Crew
   and a different related word to the Liar.
4. **Drawing phase** — turn order is randomized; each player gets 2 turns
   (10 seconds each) to add to the same shared canvas.
5. **Discussion phase** — a short timed chat opens for players to call out
   suspicious strokes.
6. **Voting phase** — everyone secretly votes for who they think the Liar
   is.
7. **Reveal** — the Liar is revealed, along with whether they were caught,
   the real word, and updated scores.
8. **Repeat** — this cycles for 5 rounds (a new Liar each time), then the
   player(s) with the highest total score win.

## Where to tune things

All the key numbers live at the top of `server/Room.js`:
```js
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;
const TURN_DURATION_MS = 10000;      // 10s per turn
const DRAWING_CYCLES = 2;            // turns per player per round
const DISCUSSION_DURATION_MS = 25000;
const VOTING_DURATION_MS = 20000;
const TOTAL_GAME_ROUNDS = 5;         // best-of-5
const CREW_CATCH_POINTS = 100;
const LIAR_ESCAPE_POINTS = 150;
```
Change these freely to rebalance the game without touching any other logic.

Secret word pairs live in `server/words.js` — add more `[Crew word, Liar
word]` pairs there any time.

## Not included yet (by design)

These are Phase 2 "engagement hook" features from the original brief —
intentionally left out of this base version so it stays simple to build on:
- Animated stroke-by-stroke replay in the reveal screen
- Liar's counter-guess bonus
- Badges (e.g. "Master Bluffer")
- Multiple Liars for larger lobbies
- Wagered/confidence voting
