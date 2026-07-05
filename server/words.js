// Each pair = [Crew word, Liar word]
// The Crew all get word[0]. The Liar gets word[1] (a related-but-wrong word).
const WORD_PAIRS = [
  ["CAT", "DOG"],
  ["PIZZA", "BURGER"],
  ["BEACH", "MOUNTAIN"],
  ["GUITAR", "VIOLIN"],
  ["ELEPHANT", "GIRAFFE"],
  ["ROBOT", "ALIEN"],
  ["ICE CREAM", "CAKE"],
  ["AIRPLANE", "HELICOPTER"],
  ["LIBRARY", "MUSEUM"],
  ["VOLCANO", "EARTHQUAKE"],
  ["WIZARD", "KNIGHT"],
  ["SNOWMAN", "SCARECROW"],
  ["OCTOPUS", "JELLYFISH"],
  ["CASTLE", "PALACE"],
  ["ROCKET", "SATELLITE"],
];

// Returns a shuffled copy so rounds don't repeat in the same order every game.
function getShuffledWordPairs() {
  const pairs = [...WORD_PAIRS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

module.exports = { WORD_PAIRS, getShuffledWordPairs };
