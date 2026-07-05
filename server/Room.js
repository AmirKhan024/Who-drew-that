const { getShuffledWordPairs } = require("./words");

// ---- Tunable game constants (base MVP values) ----
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 8;
const TURN_DURATION_MS = 10000; // 10s per turn
const DRAWING_CYCLES = 2; // each player gets this many turns per round
const DISCUSSION_DURATION_MS = 25000; // 25s discussion
const VOTING_DURATION_MS = 20000; // 20s max to vote
const TOTAL_GAME_ROUNDS = 5; // best-of-5
const CREW_CATCH_POINTS = 100;
const LIAR_ESCAPE_POINTS = 150;

class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // id -> { id, name, ready, score, connected }
    this.maxPlayers = null; // chosen by host at room creation
    this.phase = "lobby"; // lobby | drawing | discussion | voting | reveal | gameover
    this.wordPairs = [];
    this.gameRound = 0;
    this.totalGameRounds = TOTAL_GAME_ROUNDS;

    this.liarId = null;
    this.turnOrder = [];
    this.turnIndex = -1;
    this.totalTurns = 0;
    this.strokeHistory = [];

    this.votes = new Map(); // voterId -> votedForId
    this.timer = null;
  }

  // ---------- Lobby ----------
  addPlayer(id, name) {
    this.players.set(id, {
      id,
      name,
      ready: false,
      score: 0,
      connected: true,
    });
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  setReady(id, ready) {
    const p = this.players.get(id);
    if (p) p.ready = ready;
  }

  allReady() {
    const connected = this.connectedPlayers();
    return connected.length > 0 && connected.every((p) => p.ready);
  }

  canStart() {
    const count = this.connectedPlayers().length;
    return (
      count >= MIN_PLAYERS &&
      count <= MAX_PLAYERS &&
      (this.maxPlayers ? count === this.maxPlayers : true) &&
      this.allReady()
    );
  }

  publicPlayerList() {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      score: p.score,
      connected: p.connected,
    }));
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // ---------- Game flow ----------
  startGame(io) {
    this.wordPairs = getShuffledWordPairs();
    this.gameRound = 0;
    io.to(this.code).emit("game_started", {
      totalGameRounds: this.totalGameRounds,
    });
    this.startRound(io);
  }

  startRound(io) {
    this.gameRound += 1;
    this.strokeHistory = [];
    this.votes.clear();

    const active = this.connectedPlayers();
    if (active.length < MIN_PLAYERS) {
      this.endGame(io, "Not enough players left to continue.");
      return;
    }

    // Pick a word pair (cycle back to shuffled list if we run out)
    if (this.wordPairs.length === 0) this.wordPairs = getShuffledWordPairs();
    const [word, liarWord] = this.wordPairs.pop();
    this.word = word;
    this.liarWord = liarWord;

    // Pick the Liar randomly
    const liarIndex = Math.floor(Math.random() * active.length);
    this.liarId = active[liarIndex].id;

    // Randomize turn order
    this.turnOrder = [...active.map((p) => p.id)];
    for (let i = this.turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.turnOrder[i], this.turnOrder[j]] = [
        this.turnOrder[j],
        this.turnOrder[i],
      ];
    }
    this.turnIndex = -1;
    this.totalTurns = this.turnOrder.length * DRAWING_CYCLES;

    // Broadcast the round reset first (this clears the canvas + word chip
    // client-side), THEN send each player their private word right after,
    // so the word doesn't get wiped by the reset.
    io.to(this.code).emit("round_start", {
      gameRound: this.gameRound,
      totalGameRounds: this.totalGameRounds,
      turnOrder: this.turnOrder.map((id) => ({
        id,
        name: this.players.get(id) ? this.players.get(id).name : "?",
      })),
    });

    for (const p of active) {
      const isLiar = p.id === this.liarId;
      io.to(p.id).emit("word_assigned", {
        word: isLiar ? this.liarWord : this.word,
        isLiar,
      });
    }

    this.phase = "drawing";
    this.nextTurn(io);
  }

  // ---------- Drawing phase ----------
  nextTurn(io) {
    this.clearTimer();
    this.turnIndex += 1;

    if (this.turnIndex >= this.totalTurns) {
      this.endDrawingPhase(io);
      return;
    }

    const playerId = this.turnOrder[this.turnIndex % this.turnOrder.length];
    const player = this.players.get(playerId);

    // Skip disconnected players instantly
    if (!player || !player.connected) {
      this.nextTurn(io);
      return;
    }

    const endsAt = Date.now() + TURN_DURATION_MS;
    io.to(this.code).emit("turn_start", {
      playerId,
      playerName: player.name,
      turnNumber: this.turnIndex + 1,
      totalTurns: this.totalTurns,
      endsAt,
    });

    this.timer = setTimeout(() => this.nextTurn(io), TURN_DURATION_MS);
  }

  handleStroke(io, playerId, strokeData) {
    const currentPlayerId = this.turnOrder[this.turnIndex % this.turnOrder.length];
    if (this.phase !== "drawing" || playerId !== currentPlayerId) return;

    this.strokeHistory.push({ playerId, strokeData });
    io.to(this.code).emit("stroke_added", { playerId, strokeData });
  }

  // Player signals they're done early; server moves on right away.
  endTurnEarly(io, playerId) {
    const currentPlayerId = this.turnOrder[this.turnIndex % this.turnOrder.length];
    if (this.phase !== "drawing" || playerId !== currentPlayerId) return;
    this.nextTurn(io);
  }

  endDrawingPhase(io) {
    this.clearTimer();
    io.to(this.code).emit("drawing_phase_end");
    this.startDiscussion(io);
  }

  // ---------- Discussion phase ----------
  startDiscussion(io) {
    this.phase = "discussion";
    const endsAt = Date.now() + DISCUSSION_DURATION_MS;
    io.to(this.code).emit("discussion_start", { endsAt });
    this.timer = setTimeout(() => this.startVoting(io), DISCUSSION_DURATION_MS);
  }

  handleChat(io, playerId, message) {
    if (this.phase !== "discussion") return;
    const player = this.players.get(playerId);
    if (!player) return;
    const clean = String(message).slice(0, 200); // basic length guard
    io.to(this.code).emit("chat_message", {
      playerId,
      playerName: player.name,
      message: clean,
    });
  }

  // ---------- Voting phase ----------
  startVoting(io) {
    this.clearTimer();
    this.phase = "voting";
    this.votes.clear();
    const endsAt = Date.now() + VOTING_DURATION_MS;
    io.to(this.code).emit("voting_start", {
      players: this.publicPlayerList(),
      endsAt,
    });
    this.timer = setTimeout(() => this.tallyVotesAndReveal(io), VOTING_DURATION_MS);
  }

  castVote(io, voterId, votedForId) {
    if (this.phase !== "voting") return;
    if (!this.players.has(voterId) || !this.players.has(votedForId)) return;
    this.votes.set(voterId, votedForId);

    io.to(this.code).emit("vote_progress", {
      votesIn: this.votes.size,
      votersNeeded: this.connectedPlayers().length,
    });

    if (this.votes.size >= this.connectedPlayers().length) {
      this.tallyVotesAndReveal(io);
    }
  }

  tallyVotesAndReveal(io) {
    this.clearTimer();
    if (this.phase !== "voting") return; // already revealed
    this.phase = "reveal";

    const tally = new Map();
    for (const votedForId of this.votes.values()) {
      tally.set(votedForId, (tally.get(votedForId) || 0) + 1);
    }

    let topId = null;
    let topCount = -1;
    let tie = false;
    for (const [id, count] of tally.entries()) {
      if (count > topCount) {
        topCount = count;
        topId = id;
        tie = false;
      } else if (count === topCount) {
        tie = true;
      }
    }

    const liarCaught = !tie && topId === this.liarId;

    // ---- Scoring ----
    if (liarCaught) {
      for (const p of this.players.values()) {
        if (p.id !== this.liarId) p.score += CREW_CATCH_POINTS;
      }
    } else {
      const liar = this.players.get(this.liarId);
      if (liar) liar.score += LIAR_ESCAPE_POINTS;
    }

    const liarPlayer = this.players.get(this.liarId);
    io.to(this.code).emit("reveal", {
      liarId: this.liarId,
      liarName: liarPlayer ? liarPlayer.name : "Unknown",
      liarCaught,
      voteCounts: [...tally.entries()].map(([id, count]) => ({ id, count })),
      word: this.word,
      liarWord: this.liarWord,
      scores: this.publicPlayerList(),
    });

    // Give players a moment to see the reveal before moving on
    this.timer = setTimeout(() => this.afterReveal(io), 8000);
  }

  afterReveal(io) {
    this.clearTimer();
    if (this.gameRound >= this.totalGameRounds) {
      this.endGame(io);
    } else {
      this.phase = "lobby-between-rounds";
      this.startRound(io);
    }
  }

  endGame(io, reason) {
    this.clearTimer();
    this.phase = "gameover";
    const scores = this.publicPlayerList().sort((a, b) => b.score - a.score);
    const topScore = scores[0] ? scores[0].score : 0;
    const winners = scores.filter((p) => p.score === topScore).map((p) => p.name);
    io.to(this.code).emit("game_over", { scores, winners, reason: reason || null });
  }

  // ---------- Disconnects ----------
  handleDisconnect(io, playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;

    if (this.phase === "lobby") {
      io.to(this.code).emit("lobby_update", {
        players: this.publicPlayerList(),
        hostId: this.hostId,
        maxPlayers: this.maxPlayers,
      });
      return;
    }

    // If it was this player's turn to draw, skip them immediately.
    if (this.phase === "drawing") {
      const currentPlayerId = this.turnOrder[this.turnIndex % this.turnOrder.length];
      if (currentPlayerId === playerId) {
        this.nextTurn(io);
      }
    }

    // If they hadn't voted yet, voting can still complete without them.
    if (this.phase === "voting" && this.votes.size >= this.connectedPlayers().length) {
      this.tallyVotesAndReveal(io);
    }

    io.to(this.code).emit("player_disconnected", { playerId, playerName: player.name });
  }
}

module.exports = { Room, MIN_PLAYERS, MAX_PLAYERS };
