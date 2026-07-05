const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Room, MIN_PLAYERS, MAX_PLAYERS } = require("./Room");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "..", "public")));

// In-memory room store: roomCode -> Room instance
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars (0/O, 1/I)
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

io.on("connection", (socket) => {
  let currentRoomCode = null;

  socket.on("create_room", ({ playerName, maxPlayers }, ack) => {
    const clampedMax = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(maxPlayers) || MAX_PLAYERS));
    const code = generateRoomCode();
    const room = new Room(code, socket.id);
    room.maxPlayers = clampedMax;
    room.addPlayer(socket.id, playerName || "Player");
    rooms.set(code, room);

    currentRoomCode = code;
    socket.join(code);

    ack && ack({ ok: true, roomCode: code });
    io.to(code).emit("lobby_update", {
      players: room.publicPlayerList(),
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
    });
  });

  socket.on("join_room", ({ playerName, roomCode }, ack) => {
    const code = String(roomCode || "").toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) return ack && ack({ ok: false, error: "Room not found." });
    if (room.phase !== "lobby") return ack && ack({ ok: false, error: "Game already in progress." });
    if (room.connectedPlayers().length >= room.maxPlayers) {
      return ack && ack({ ok: false, error: "Room is full." });
    }

    room.addPlayer(socket.id, playerName || "Player");
    currentRoomCode = code;
    socket.join(code);

    ack && ack({ ok: true, roomCode: code, maxPlayers: room.maxPlayers });
    io.to(code).emit("lobby_update", {
      players: room.publicPlayerList(),
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
    });
  });

  socket.on("toggle_ready", () => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    room.setReady(socket.id, !player.ready);
    io.to(currentRoomCode).emit("lobby_update", {
      players: room.publicPlayerList(),
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      canStart: room.canStart(),
    });
  });

  socket.on("start_game", () => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (socket.id !== room.hostId) return; // only host can start
    if (!room.canStart()) return;
    room.startGame(io);
  });

  socket.on("draw_stroke", ({ strokeData }) => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.handleStroke(io, socket.id, strokeData);
  });

  socket.on("end_turn", () => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.endTurnEarly(io, socket.id);
  });

  socket.on("send_chat", ({ message }) => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.handleChat(io, socket.id, message);
  });

  socket.on("cast_vote", ({ votedForId }) => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.castVote(io, socket.id, votedForId);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.handleDisconnect(io, socket.id);
    room.removePlayer(socket.id);

    // Clean up empty rooms
    if (room.connectedPlayers().length === 0) {
      room.clearTimer();
      rooms.delete(currentRoomCode);
    } else if (room.hostId === socket.id) {
      // Reassign host to the next connected player
      const next = room.connectedPlayers()[0];
      if (next) room.hostId = next.id;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Who Drew That? server running on http://localhost:${PORT}`);
});
