# Who Drew That? — Project Context

## What Is This

"Who Drew That?" is a multiplayer, browser-based social deduction drawing game. A group of players share a single canvas and draw a secret word together, one stroke at a time — but one player (the Liar) doesn't actually know the word. The Liar has to fake their strokes convincingly while the rest of the group tries to spot who's drawing "off."

This document covers only the **base version** — the minimum set of features without which the game does not function. Extra features, polish, and enhancements are added on top of this baseline separately.

---

## Core Concept

- All players get the same secret word (e.g. `CAT`).
- One random player (the Liar) gets a different, related word (e.g. `DOG`) or no word at all.
- Players take turns drawing on **one shared canvas**, in short timed turns.
- The Liar has to guess what's being drawn from the strokes already on canvas, and add something that doesn't look suspicious.
- After drawing, everyone discusses and votes on who they think the Liar is.
- Points are given based on whether the crew catches the Liar, and whether the Liar survives.

---

## Basic Workflow

### 1. Start Screen
- Player opens the website and is asked: **how many players do you want to play with?** (options: 4, 5, 6, 7, 8)
- Player chooses to either:
  - **Create a private room** (gets a room code to share with friends), or
  - **Join an existing room** by entering a code

### 2. Lobby
- Players join using the room code.
- Everyone sees who else has joined.
- Players mark themselves as "ready."
- Once the selected number of players have joined and are ready, the host can start the game (or it auto-starts).

### 3. Word Assignment
- Server randomly selects one player to be the Liar.
- All other players ("the Crew") receive the same secret word.
- The Liar receives a different word or nothing.
- No player can see anyone else's word. The Liar's actual word/prompt is never sent to the other players, and the crew's real word is never sent to the Liar.

### 4. Drawing Phase
- Turn order is randomized.
- The shared canvas is shown to everyone.
- Players take turns, one at a time, drawing for a short fixed time (e.g. 10 seconds) directly on the same canvas.
- Everyone watches the current player's strokes appear live as they draw.
- This repeats for 2–3 rounds so every player gets more than one turn.

### 5. Discussion Phase
- After drawing ends, a short timed text chat opens (e.g. 20–30 seconds).
- Players discuss which strokes/lines looked "off" or suspicious.

### 6. Voting Phase
- Each player secretly casts one vote for who they think the Liar is.
- Votes are tallied once everyone has voted (or time runs out).
- The player with the most votes is accused.

### 7. Reveal
- The real Liar is revealed.
- The full drawing is shown again, stroke by stroke, tagged with who drew each part.

### 8. Scoring
- If the crew correctly votes out the Liar → crew members get points.
- If the Liar is not caught (wrong player voted, or votes are split/tied) → the Liar gets points instead.
- This process repeats for multiple rounds (best-of-X), with someone new becoming the Liar each round.
- After all rounds are played, the player(s) with the highest total score wins the game.

---

## Compulsory Base Features (MVP)

These are the features without which the game literally cannot function. Nothing extra — just what's needed to make one full game playable start to finish.

1. **Player Count Selection** — Ask how many players (4–8) before room creation.
2. **Room Creation & Join via Code** — Host creates a private room with a unique code; others join using that code.
3. **Lobby with Ready-Up** — Shows joined players, waits for everyone to be ready before starting.
4. **Random Liar Selection** — Server picks one player at random to be the Liar each round.
5. **Secret Word Delivery** — Crew gets the real word, Liar gets a different/blank word. No player can see another player's word through any means.
6. **Shared Live Canvas** — A single canvas visible to all players in the room, where strokes appear in real time as they're drawn.
7. **Turn-Based Drawing with Timer** — Only one player can draw at a time, for a fixed short duration, enforced by the server so turns can't be skipped or extended.
8. **Automatic Phase Transitions** — Game automatically moves from Drawing → Discussion → Voting → Reveal without needing manual triggers.
9. **Discussion Chat Window** — A basic timed text chat available only during the discussion phase.
10. **Voting System** — Each player can cast one secret vote; votes are tallied automatically.
11. **Liar Reveal** — At the end of voting, the game reveals who the actual Liar was.
12. **Scoring System** — Points are awarded correctly based on outcome (crew catches Liar / Liar escapes), and tracked across rounds.
13. **Multi-Round Loop** — The game repeats the round cycle (new Liar, new word, new drawing) for a set number of rounds, then ends with a final winner based on total score.
14. **Basic Disconnect Handling** — If a player leaves mid-game, the game doesn't get permanently stuck (turn skips or round ends gracefully).

Anything beyond this list (replay animations, badges, counter-guess bonus, multiple liars, wagered voting, etc.) is a later addition, not part of this base version.