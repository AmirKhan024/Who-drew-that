// Related [crewWord, imposterWord] pairs. The crew all get the first word; the
// imposter gets the second — close enough to bluff, different enough to slip up.
// RULE: BOTH words must be simple, iconic, and genuinely easy to doodle. No
// "cottage"-style hard words. Kept diverse across many everyday categories.
export const WORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // Animals
  ["Cat", "Dog"],
  ["Lion", "Tiger"],
  ["Bear", "Panda"],
  ["Cow", "Pig"],
  ["Sheep", "Goat"],
  ["Horse", "Donkey"],
  ["Rabbit", "Mouse"],
  ["Elephant", "Rhino"],
  ["Monkey", "Gorilla"],
  ["Fox", "Wolf"],
  ["Frog", "Turtle"],
  ["Snake", "Worm"],
  ["Duck", "Chicken"],
  ["Owl", "Eagle"],
  ["Penguin", "Seal"],
  ["Fish", "Whale"],
  ["Shark", "Dolphin"],
  ["Crab", "Lobster"],
  ["Octopus", "Squid"],
  ["Bee", "Butterfly"],
  ["Ant", "Spider"],
  ["Snail", "Slug"],
  ["Dinosaur", "Dragon"],
  ["Unicorn", "Horse"],
  ["Ladybug", "Beetle"],

  // Fruit & veg
  ["Apple", "Pear"],
  ["Banana", "Corn"],
  ["Orange", "Lemon"],
  ["Grapes", "Cherries"],
  ["Strawberry", "Raspberry"],
  ["Watermelon", "Pumpkin"],
  ["Carrot", "Radish"],
  ["Tomato", "Onion"],
  ["Potato", "Egg"],
  ["Mushroom", "Broccoli"],
  ["Pineapple", "Coconut"],
  ["Peach", "Plum"],
  ["Chili", "Pepper"],

  // Food
  ["Pizza", "Pie"],
  ["Burger", "Sandwich"],
  ["Hotdog", "Taco"],
  ["Donut", "Bagel"],
  ["Cake", "Cupcake"],
  ["Cookie", "Cracker"],
  ["Ice cream", "Popsicle"],
  ["Fries", "Chips"],
  ["Bread", "Toast"],
  ["Candy", "Lollipop"],
  ["Cheese", "Butter"],
  ["Egg", "Bacon"],

  // Household objects
  ["Cup", "Mug"],
  ["Plate", "Bowl"],
  ["Spoon", "Fork"],
  ["Knife", "Axe"],
  ["Chair", "Table"],
  ["Bed", "Sofa"],
  ["Lamp", "Candle"],
  ["Clock", "Watch"],
  ["Mirror", "Window"],
  ["Door", "Gate"],
  ["Bucket", "Basket"],
  ["Broom", "Mop"],
  ["Key", "Lock"],
  ["Bell", "Whistle"],
  ["Bulb", "Flashlight"],
  ["Scissors", "Pliers"],
  ["Ladder", "Stairs"],
  ["Fan", "Windmill"],

  // Tools
  ["Hammer", "Wrench"],
  ["Saw", "Drill"],
  ["Nail", "Screw"],
  ["Shovel", "Rake"],
  ["Paintbrush", "Comb"],
  ["Magnet", "Horseshoe"],
  ["Anchor", "Hook"],

  // Clothing & accessories
  ["Hat", "Cap"],
  ["Shoe", "Boot"],
  ["Sock", "Glove"],
  ["Shirt", "Pants"],
  ["Dress", "Skirt"],
  ["Tie", "Scarf"],
  ["Crown", "Ring"],
  ["Glasses", "Sunglasses"],
  ["Watch", "Bracelet"],
  ["Bag", "Backpack"],
  ["Umbrella", "Kite"],

  // Vehicles
  ["Car", "Van"],
  ["Truck", "Bus"],
  ["Train", "Tram"],
  ["Bike", "Scooter"],
  ["Motorbike", "Bike"],
  ["Boat", "Canoe"],
  ["Ship", "Submarine"],
  ["Plane", "Helicopter"],
  ["Rocket", "Missile"],
  ["Tractor", "Bulldozer"],
  ["Wagon", "Cart"],
  ["Skateboard", "Surfboard"],

  // Nature & weather & sky
  ["Sun", "Moon"],
  ["Star", "Comet"],
  ["Cloud", "Fog"],
  ["Rain", "Snow"],
  ["Rainbow", "Bridge"],
  ["Lightning", "Arrow"],
  ["Mountain", "Volcano"],
  ["Hill", "Island"],
  ["River", "Lake"],
  ["Tree", "Bush"],
  ["Palm", "Cactus"],
  ["Leaf", "Feather"],
  ["Flower", "Clover"],
  ["Rock", "Brick"],
  ["Snowman", "Scarecrow"],

  // Buildings & places (simple)
  ["House", "Tent"],
  ["Castle", "Tower"],
  ["Igloo", "Pyramid"],
  ["Barn", "Shed"],
  ["Lighthouse", "Chimney"],
  ["Bridge", "Fence"],

  // Sports, toys & fun
  ["Ball", "Balloon"],
  ["Kite", "Drone"],
  ["Dice", "Domino"],
  ["Teddy", "Doll"],
  ["Robot", "Alien"],
  ["Ghost", "Zombie"],
  ["Flag", "Banner"],
  ["Sword", "Dagger"],
  ["Shield", "Helmet"],
  ["Bow", "Arrow"],
  ["Trophy", "Medal"],
  ["Gift", "Box"],
  ["Balloon", "Bubble"],
  ["Yo-yo", "Top"],

  // Music (simple)
  ["Guitar", "Violin"],
  ["Drum", "Bell"],
  ["Trumpet", "Flute"],
  ["Piano", "Harp"],

  // Body
  ["Eye", "Ear"],
  ["Hand", "Foot"],
  ["Nose", "Mouth"],
  ["Tooth", "Bone"],
  ["Heart", "Star"],
  ["Lips", "Mustache"],

  // Shapes & symbols
  ["Circle", "Square"],
  ["Triangle", "Diamond"],
  ["Heart", "Clover"],
  ["Arrow", "Cross"],
  ["Spiral", "Wave"],

  // Everyday misc
  ["Book", "Notebook"],
  ["Pencil", "Pen"],
  ["Phone", "Remote"],
  ["Camera", "Binoculars"],
  ["Envelope", "Stamp"],
  ["Map", "Scroll"],
  ["Compass", "Clock"],
  ["Battery", "Plug"],
  ["Cactus", "Pineapple"],
  ["Nest", "Egg"],
  ["Web", "Net"],
  ["Bone", "Stick"],
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
