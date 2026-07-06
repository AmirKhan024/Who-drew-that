import { SCORING } from "./constants";

type Rand = () => number;

export function shuffle<T>(arr: readonly T[], rand: Rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Turn order: `cycles` shuffled passes of all players, concatenated, with
 * adjacent duplicates broken up so nobody draws twice in a row at the seams.
 */
export function buildTurnOrder(
  playerIds: string[],
  cycles: number,
  rand: Rand = Math.random,
): string[] {
  const order: string[] = [];
  for (let c = 0; c < cycles; c++) order.push(...shuffle(playerIds, rand));
  if (playerIds.length > 1) {
    for (let i = 1; i < order.length; i++) {
      if (order[i] === order[i - 1]) {
        // find a later element that differs from both neighbours and swap
        for (let j = i + 1; j < order.length; j++) {
          if (order[j] !== order[i - 1] && (i + 1 >= order.length || order[j] !== order[i + 1])) {
            [order[i], order[j]] = [order[j], order[i]];
            break;
          }
        }
      }
    }
  }
  return order;
}

export function pickImposters(
  playerIds: string[],
  count: number,
  rand: Rand = Math.random,
): string[] {
  const n = Math.max(1, Math.min(count, Math.max(1, playerIds.length - 1)));
  return shuffle(playerIds, rand).slice(0, n);
}

export interface VoteTally {
  counts: Record<string, number>;
  /** Most-voted player, or null on a tie / no votes (imposter escapes). */
  accusedId: string | null;
}

export function tallyVotes(
  votes: ReadonlyArray<{ target_id: string }>,
): VoteTally {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v.target_id] = (counts[v.target_id] ?? 0) + 1;
  let accusedId: string | null = null;
  let top = 0;
  let tied = false;
  for (const [id, c] of Object.entries(counts)) {
    if (c > top) {
      top = c;
      accusedId = id;
      tied = false;
    } else if (c === top) {
      tied = true;
    }
  }
  return { counts, accusedId: tied || top === 0 ? null : accusedId };
}

export interface RoundResult {
  /** True if the accused (most-voted) player was an imposter. */
  crewCaught: boolean;
  deltas: Record<string, number>;
}

/**
 * Individual-accuracy scoring (tiered, so it's not winner-take-all):
 *  - a CREW member who voted for ANY imposter earns CREW_CORRECT_VOTE;
 *    crew who voted wrong or didn't vote earn 0.
 *  - an IMPOSTER who survived (isn't the single most-voted player) earns
 *    IMPOSTER_SURVIVE + IMPOSTER_FOOL_BONUS per crew member they fooled
 *    (crew who voted for someone other than that imposter);
 *    a caught imposter (the accused) earns 0.
 */
export function computeScores(
  allPlayerIds: string[],
  imposterIds: string[],
  votes: ReadonlyArray<{ voter_id: string; target_id: string }>,
  accusedId: string | null,
): RoundResult {
  const impSet = new Set(imposterIds);
  const crewIds = allPlayerIds.filter((id) => !impSet.has(id));
  const voteOf: Record<string, string> = {};
  for (const v of votes) voteOf[v.voter_id] = v.target_id;

  const deltas: Record<string, number> = {};
  for (const id of allPlayerIds) deltas[id] = 0;

  // Crew accuracy
  for (const id of crewIds) {
    const target = voteOf[id];
    if (target && impSet.has(target)) deltas[id] += SCORING.CREW_CORRECT_VOTE;
  }

  // Imposter survival + fooling
  for (const impId of imposterIds) {
    const caught = accusedId === impId;
    if (caught) continue; // caught imposter earns nothing
    deltas[impId] += SCORING.IMPOSTER_SURVIVE;
    const fooled = crewIds.filter((c) => voteOf[c] !== impId).length;
    deltas[impId] += fooled * SCORING.IMPOSTER_FOOL_BONUS;
  }

  const crewCaught = accusedId != null && impSet.has(accusedId);
  return { crewCaught, deltas };
}
