// Related [crewWord, imposterWord] pairs. The crew all get the first word; the
// imposter gets the second (close enough to bluff, different enough to slip up).
export const WORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Cat", "Dog"],
  ["Sun", "Moon"],
  ["Pizza", "Burger"],
  ["Beach", "Desert"],
  ["Guitar", "Violin"],
  ["Rain", "Snow"],
  ["Car", "Bicycle"],
  ["Apple", "Orange"],
  ["Robot", "Alien"],
  ["Castle", "Tent"],
  ["Snake", "Worm"],
  ["Coffee", "Tea"],
  ["Rocket", "Airplane"],
  ["Ghost", "Zombie"],
  ["Sword", "Axe"],
  ["Butterfly", "Bee"],
  ["Mountain", "Volcano"],
  ["Clock", "Compass"],
  ["Balloon", "Kite"],
  ["Shark", "Dolphin"],
  ["Crown", "Hat"],
  ["Candle", "Lamp"],
  ["Cactus", "Tree"],
  ["Umbrella", "Tent"],
  ["Piano", "Drum"],
  ["Frog", "Turtle"],
  ["Star", "Snowflake"],
  ["Ship", "Submarine"],
  ["Donut", "Bagel"],
  ["Owl", "Eagle"],
  ["Ladder", "Stairs"],
  ["Anchor", "Hook"],
  ["Lion", "Tiger"],
  ["Mushroom", "Umbrella"],
  ["Fish", "Whale"],
  ["Key", "Lock"],
  ["Snowman", "Scarecrow"],
  ["Bat", "Bird"],
  ["Camera", "Phone"],
  ["Spider", "Crab"],
];

/**
 * Pick a pair not used this game. `usedCrewWords` holds crew words already
 * played so rounds don't repeat until the list is exhausted.
 */
export function pickWordPair(
  usedCrewWords: string[],
  rand: () => number = Math.random,
): readonly [string, string] {
  const fresh = WORD_PAIRS.filter((p) => !usedCrewWords.includes(p[0]));
  const pool = fresh.length > 0 ? fresh : WORD_PAIRS;
  return pool[Math.floor(rand() * pool.length)];
}
