// Tuning, palette, isometric geometry, build catalogue, crops and goals
// for Briarfield. One place for every number the game balances against.

export const VIEW = { width: 1280, height: 720 };

// Isometric grid: 9 by 9 diamond tiles. ORIGIN is the screen position of
// the centre of tile (0, 0); the whole island sits between the top bar and
// the build bar.
export const GRID = { cols: 9, rows: 9 };
export const TILE_W = 84;
export const TILE_H = 42;
export const ORIGIN = { x: 640, y: 148 };

export function tileCenter(gx, gy) {
  return {
    x: ORIGIN.x + (gx - gy) * (TILE_W / 2),
    y: ORIGIN.y + (gx + gy) * (TILE_H / 2),
  };
}

// Inverse projection: screen point -> fractional grid coordinates.
export function screenToGrid(sx, sy) {
  const dx = sx - ORIGIN.x;
  const dy = sy - ORIGIN.y;
  return {
    gx: (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2,
    gy: (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2,
  };
}

export function inGrid(gx, gy) {
  return gx >= 0 && gx < GRID.cols && gy >= 0 && gy < GRID.rows;
}

// Fixed features placed when a run starts. kind: farmhouse, well, pond,
// tree, rock, bed, fence, flowers.
export const FIXED = [
  { kind: 'farmhouse', gx: 1, gy: 0 },
  { kind: 'well', gx: 4, gy: 1 },
  { kind: 'pond', gx: 7, gy: 0 },
  { kind: 'pond', gx: 8, gy: 0 },
  { kind: 'pond', gx: 7, gy: 1 },
  { kind: 'pond', gx: 8, gy: 1 },
  { kind: 'tree', gx: 0, gy: 2 },
  { kind: 'tree', gx: 2, gy: 0 },
  { kind: 'tree', gx: 6, gy: 4 },
  { kind: 'tree', gx: 0, gy: 6 },
  { kind: 'rock', gx: 5, gy: 0 },
  { kind: 'rock', gx: 8, gy: 5 },
  { kind: 'bed', gx: 3, gy: 3 },
  { kind: 'bed', gx: 4, gy: 3 },
  { kind: 'fence', gx: 2, gy: 3 },
  { kind: 'fence', gx: 5, gy: 3 },
  { kind: 'flowers', gx: 6, gy: 6 },
  { kind: 'flowers', gx: 2, gy: 6 },
];

// Kinds the farmer cannot walk through. Flowers and paths are flat.
export const SOLID = new Set([
  'farmhouse', 'well', 'pond', 'tree', 'rock', 'bed', 'fence',
  'crate', 'barrel', 'lamp', 'fruittree', 'cottage', 'windmill',
]);

export const PALETTE = {
  skyTop: '#4fbdf0',
  waterDeep: '#1478c8',
  waterShallow: '#3fb8ef',
  foam: '#f2fdff',
  sand: '#f4cf8a',
  sandDark: '#e0b56a',
  grass: '#58c745',
  grassDark: '#3aa82e',
  grassLight: '#7ce05c',
  soil: '#8a5a34',
  soilDark: '#6e4423',
  soilWet: '#5f3a1e',
  path: '#f7d99a',
  pathDark: '#eec67c',
  wood: '#a06a35',
  woodDark: '#7a4a22',
  woodLight: '#c98d4e',
  cream: '#fffaf0',
  ink: '#14384a',
  inkSoft: '#2f6a80',
  coral: '#ff6b4a',
  gold: '#ffc93c',
  roof: '#f4573f',
  leaf: '#2fae4e',
  leafDark: '#1e8c3a',
  leafLight: '#5ecb4e',
  stone: '#c3ccd2',
  stoneDark: '#8b9aa3',
  radish: '#e84d6b',
  sprout: '#3fae4e',
};

// The build catalogue: cost, charm added, coins earned per day, hotkey.
export const ITEMS = [
  { id: 'bed', name: 'Veggie Bed', cost: { wood: 5 }, charm: 1, income: 0, key: '1', blurb: 'Plant radishes, water them, harvest for coins.' },
  { id: 'fence', name: 'Fence', cost: { wood: 2 }, charm: 1, income: 0, key: '2', blurb: 'A sturdy wooden fence. +1 charm.' },
  { id: 'flowers', name: 'Flower Bed', cost: { coins: 10 }, charm: 3, income: 0, key: '3', blurb: 'Bright blooms. +3 charm.' },
  { id: 'path', name: 'Stone Path', cost: { stone: 2 }, charm: 1, income: 0, key: '4', blurb: 'A flat stone path. +1 charm.' },
  { id: 'crate', name: 'Crate', cost: { wood: 3 }, charm: 1, income: 0, key: '5', blurb: 'A wooden crate. +1 charm.' },
  { id: 'barrel', name: 'Barrel', cost: { wood: 3 }, charm: 1, income: 0, key: '6', blurb: 'A water barrel. +1 charm.' },
  { id: 'lamp', name: 'Lamp Post', cost: { wood: 6, coins: 4 }, charm: 3, income: 0, key: '7', blurb: 'Glows warmly at dusk. +3 charm.' },
  { id: 'fruittree', name: 'Apple Tree', cost: { coins: 15 }, charm: 4, income: 0, key: '8', blurb: 'Heavy with apples. +4 charm.' },
  { id: 'cottage', name: 'Cottage', cost: { coins: 40, wood: 10 }, charm: 6, income: 8, key: '9', blurb: 'A cosy cottage. +6 charm, +8 coins a day.' },
  { id: 'windmill', name: 'Windmill', cost: { coins: 45, wood: 8 }, charm: 8, income: 12, key: '0', blurb: 'Mills the valley grain. +8 charm, +12 coins a day.' },
];

export function itemById(id) {
  return ITEMS.find((item) => item.id === id);
}

export const CROP = {
  name: 'Radish',
  growTime: 14,
  wateredTime: 7,
  yieldCoins: 6,
};

// Tier goals, in order. Rewards are bonus coins; the last tier wins the run.
export const TIERS = [
  { name: 'First Harvest', need: { harvested: 4 }, reward: 25, goal: 'Harvest 4 crops' },
  { name: 'Gather & Build', need: { gathered: 24, placed: 6 }, reward: 40, goal: 'Gather 24 wood + stone, place 6 items' },
  { name: 'Briarfield Shines', need: { earned: 100, charm: 30, windmills: 1 }, reward: 0, goal: 'Earn 100 coins, 30 charm, 1 windmill' },
];

export const TUNE = {
  startCoins: 60,
  startWood: 8,
  startStone: 4,
  dayLength: 30,
  seasonDays: 8,
  chopYield: 3,
  mineYield: 3,
  regrowTime: 18,
  refundRate: 0.5,
  playerSpeed: 3.6,
  interactRange: 1.35,
  chopCooldown: 0.45,
};

export const SAVE_KEY = 'briarfield-v1';
