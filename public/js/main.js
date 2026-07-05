const socket = io();

let myId = null;
let selectedCount = 4;
let isHost = false;
let currentTurnPlayerId = null;
let timerInterval = null;

// ---------- Helpers ----------
function $(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

function showPanel(id) {
  document.querySelectorAll(".panel-view").forEach((p) => p.classList.add("hidden"));
  $(id).classList.remove("hidden");
}

function startTimerBar(endsAt) {
  clearInterval(timerInterval);
  const total = endsAt - Date.now();
  const bar = $("timer-bar");
  timerInterval = setInterval(() => {
    const remaining = endsAt - Date.now();
    const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
    bar.style.width = pct + "%";
    if (remaining <= 0) clearInterval(timerInterval);
  }, 100);
}

// ---------- Start screen ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("tab-" + btn.dataset.tab).classList.add("active");
  });
});

document.querySelectorAll(".count-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedCount = Number(btn.dataset.count);
  });
});
$("player-count-row").querySelector(".count-btn").classList.add("selected");

$("btn-create-room").addEventListener("click", () => {
  const name = $("player-name").value.trim() || "Player";
  socket.emit("create_room", { playerName: name, maxPlayers: selectedCount }, (res) => {
    if (!res.ok) return ($("start-error").textContent = res.error || "Could not create room.");
    enterLobby(res.roomCode);
  });
});

$("btn-join-room").addEventListener("click", () => {
  const name = $("player-name").value.trim() || "Player";
  const code = $("room-code-input").value.trim();
  if (!code) return ($("start-error").textContent = "Enter a room code.");
  socket.emit("join_room", { playerName: name, roomCode: code }, (res) => {
    if (!res.ok) return ($("start-error").textContent = res.error || "Could not join room.");
    enterLobby(res.roomCode);
  });
});

function enterLobby(roomCode) {
  $("start-error").textContent = "";
  $("lobby-room-code").textContent = roomCode;
  showScreen("screen-lobby");
}

// ---------- Lobby screen ----------
$("btn-copy-code").addEventListener("click", () => {
  navigator.clipboard?.writeText($("lobby-room-code").textContent);
});

$("btn-ready").addEventListener("click", () => {
  socket.emit("toggle_ready");
});

$("btn-start-game").addEventListener("click", () => {
  socket.emit("start_game");
});

socket.on("lobby_update", ({ players, hostId, maxPlayers, canStart }) => {
  isHost = myId === hostId;
  const readyCount = players.filter((p) => p.ready).length;
  $("lobby-count-label").textContent = `${players.length} / ${maxPlayers} joined · ${readyCount} ready`;

  $("lobby-player-list").innerHTML = players
    .map((p) => {
      const tag = p.ready
        ? '<span class="player-tag tag-ready">Ready</span>'
        : '<span class="player-tag tag-waiting">Waiting</span>';
      const hostTag = p.id === hostId ? '<span class="player-tag tag-host">Host</span>' : "";
      return `<li><span>${escapeHtml(p.name)}</span><span>${tag}${hostTag}</span></li>`;
    })
    .join("");

  $("btn-start-game").classList.toggle("hidden", !isHost);
  $("btn-start-game").disabled = !canStart;
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Game screen: setup ----------
CanvasEngine.init($("draw-canvas"), {
  onStrokeComplete: (strokeData) => socket.emit("draw_stroke", { strokeData }),
});

socket.on("game_started", ({ totalGameRounds }) => {
  showScreen("screen-game");
  $("round-label").dataset.total = totalGameRounds;
});

socket.on("round_start", ({ gameRound, totalGameRounds, turnOrder }) => {
  CanvasEngine.clear();
  $("round-label").textContent = `${gameRound} / ${totalGameRounds}`;
  $("phase-banner").textContent = "Drawing Phase";
  $("word-chip-value").textContent = "???";
  showPanel("panel-drawing");

  $("turn-order-list").innerHTML = turnOrder
    .map((p) => `<li>${escapeHtml(p.name)}${p.id === myId ? " (you)" : ""}</li>`)
    .join("");
});

socket.on("word_assigned", ({ word, isLiar }) => {
  if (isLiar) {
    $("word-chip-value").textContent = word ? `(psst, you're the Liar — ${word})` : "You're the Liar!";
  } else {
    $("word-chip-value").textContent = word;
  }
});

socket.on("turn_start", ({ playerId, playerName, turnNumber, totalTurns, endsAt }) => {
  currentTurnPlayerId = playerId;
  const isMe = playerId === myId;
  CanvasEngine.setDrawingEnabled(isMe);
  $("turn-nameplate").textContent = isMe ? "Your turn — draw!" : `${playerName} is drawing...`;
  startTimerBar(endsAt);

  const list = $("turn-order-list");
  const items = [...list.querySelectorAll("li")];
  items.forEach((li, i) => li.classList.toggle("current-turn", i === (turnNumber - 1) % items.length));
});

socket.on("stroke_added", ({ playerId, strokeData }) => {
  if (playerId !== myId) CanvasEngine.renderFullStroke(strokeData);
});

socket.on("discussion_start", ({ endsAt }) => {
  $("phase-banner").textContent = "Discussion";
  $("chat-log").innerHTML = "";
  showPanel("panel-discussion");
  startTimerBar(endsAt);
});

$("btn-send-chat").addEventListener("click", sendChat);
$("chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
function sendChat() {
  const input = $("chat-input");
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit("send_chat", { message: msg });
  input.value = "";
}

socket.on("chat_message", ({ playerName, message }) => {
  const log = $("chat-log");
  const line = document.createElement("div");
  line.className = "chat-line";
  line.innerHTML = `<span class="chat-name">${escapeHtml(playerName)}:</span> ${escapeHtml(message)}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
});

let hasVoted = false;
socket.on("voting_start", ({ players, endsAt }) => {
  $("phase-banner").textContent = "Voting";
  hasVoted = false;
  showPanel("panel-voting");
  startTimerBar(endsAt);

  $("vote-list").innerHTML = players
    .filter((p) => p.id !== myId)
    .map((p) => `<button data-id="${p.id}">${escapeHtml(p.name)}</button>`)
    .join("");

  $("vote-list").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (hasVoted) return;
      hasVoted = true;
      socket.emit("cast_vote", { votedForId: btn.dataset.id });
      $("vote-list").querySelectorAll("button").forEach((b) => (b.disabled = true));
      btn.classList.add("voted");
    });
  });

  $("vote-progress").textContent = `0 / ${players.length} votes in`;
});

socket.on("vote_progress", ({ votesIn, votersNeeded }) => {
  $("vote-progress").textContent = `${votesIn} / ${votersNeeded} votes in`;
});

socket.on("reveal", ({ liarName, liarCaught, word, liarWord, scores }) => {
  $("phase-banner").textContent = "Reveal";
  showPanel("panel-reveal");

  const stamp = $("reveal-stamp");
  stamp.textContent = liarCaught ? "CAUGHT" : "ESCAPED";
  stamp.style.color = liarCaught ? "var(--crew-teal)" : "var(--sus-red)";
  stamp.style.borderColor = liarCaught ? "var(--crew-teal)" : "var(--sus-red)";

  $("reveal-title").textContent = liarCaught
    ? `${liarName} was the Liar — and got caught!`
    : `${liarName} was the Liar — and got away with it!`;

  $("reveal-words").textContent = `The real word was "${word}". The Liar had "${liarWord || "nothing"}".`;

  $("reveal-scores").innerHTML = scores
    .sort((a, b) => b.score - a.score)
    .map((p) => `<li><span>${escapeHtml(p.name)}</span><span>${p.score}</span></li>`)
    .join("");
});

socket.on("game_over", ({ scores, winners }) => {
  $("phase-banner").textContent = "Game Over";
  showPanel("panel-gameover");
  $("winner-title").textContent =
    winners.length > 1 ? `Tied winners: ${winners.join(", ")}` : `${winners[0]} wins!`;
  $("final-scores").innerHTML = scores
    .map((p) => `<li><span>${escapeHtml(p.name)}</span><span>${p.score}</span></li>`)
    .join("");
});

$("btn-play-again").addEventListener("click", () => location.reload());

socket.on("connect", () => { myId = socket.id; });
