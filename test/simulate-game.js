// Whitebox test: drives the Room state machine directly (bypassing real
// timers) to make sure a full game runs start-to-finish without errors.
const { Room } = require("../server/Room");

const room = new Room("TEST1", "p1");
room.maxPlayers = 4;
["p1", "p2", "p3", "p4"].forEach((id, i) => room.addPlayer(id, `Player${i + 1}`));
["p1", "p2", "p3", "p4"].forEach((id) => room.setReady(id, true));

console.log("canStart:", room.canStart());

let roundsSeen = 0;

const fakeIo = {
  to(target) {
    return {
      emit(event, payload) {
        handleEvent(event, payload);
      },
    };
  },
};

function handleEvent(event, payload) {
  switch (event) {
    case "round_start":
      roundsSeen++;
      console.log(`\n=== Round ${payload.gameRound}/${payload.totalGameRounds} === turnOrder:`, payload.turnOrder.map(p => p.name).join(", "));
      break;
    case "word_assigned":
      // (private per-player event, no id available here, skip logging)
      break;
    case "turn_start": {
      const pid = payload.playerId;
      // simulate a stroke then end the turn immediately (skip 10s wait)
      room.handleStroke(fakeIo, pid, { points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }] });
      room.endTurnEarly(fakeIo, pid);
      break;
    }
    case "stroke_added":
      break;
    case "drawing_phase_end":
      console.log("Drawing phase complete.");
      break;
    case "discussion_start":
      console.log("Discussion started -> skipping straight to voting for test speed.");
      room.startVoting(fakeIo);
      break;
    case "voting_start": {
      // Crew votes for the real liar, liar votes for a random crew member.
      const ids = ["p1", "p2", "p3", "p4"];
      ids.forEach((voterId) => {
        const target = voterId === room.liarId
          ? ids.find((id) => id !== room.liarId)
          : room.liarId;
        room.castVote(fakeIo, voterId, target);
      });
      break;
    }
    case "reveal":
      console.log(`Reveal: liar=${payload.liarName} caught=${payload.liarCaught} word=${payload.word}/${payload.liarWord}`);
      console.log("Scores:", payload.scores.map(p => `${p.name}:${p.score}`).join(", "));
      room.afterReveal(fakeIo); // skip the 8s pause for test speed
      break;
    case "game_over":
      console.log("\n=== GAME OVER ===");
      console.log("Winners:", payload.winners.join(", "));
      console.log("Final scores:", payload.scores.map(p => `${p.name}:${p.score}`).join(", "));
      console.log(`\nTotal rounds played: ${roundsSeen}`);
      console.log(roundsSeen === room.totalGameRounds ? "PASS: correct round count" : "FAIL: round count mismatch");
      process.exit(0);
      break;
    default:
      break;
  }
}

room.startGame(fakeIo);

// Safety net in case something hangs
setTimeout(() => {
  console.error("FAIL: test did not complete (possible hang / infinite loop)");
  process.exit(1);
}, 5000);
