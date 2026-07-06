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
  crewCaught: boolean;
  deltas: Record<string, number>;
}

/**
 * Crew wins the round if the accused player is an imposter. Winners get points.
 */
export function computeScores(
  allPlayerIds: string[],
  imposterIds: string[],
  accusedId: string | null,
): RoundResult {
  const impSet = new Set(imposterIds);
  const crewCaught = accusedId != null && impSet.has(accusedId);
  const deltas: Record<string, number> = {};
  for (const id of allPlayerIds) deltas[id] = 0;
  if (crewCaught) {
    for (const id of allPlayerIds)
      if (!impSet.has(id)) deltas[id] = SCORING.CREW_CATCH_POINTS;
  } else {
    for (const id of imposterIds) deltas[id] = SCORING.IMPOSTER_ESCAPE_POINTS;
  }
  return { crewCaught, deltas };
}
