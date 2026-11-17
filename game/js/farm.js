// Briarfield's state: the isometric grid, the farmer, resources, crops,
// gathering nodes, the day clock, particles and goals. The renderer only
// reads this; main.js drives the actions.

import {
  GRID, FIXED, SOLID, ITEMS, CROP, TIERS, TUNE, itemById, inGrid, tileCenter,
} from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(gx, gy) {
  return `${gx},${gy}`;
}

export function createFarm() {
  const farm = {
    time: 0,
    day: 1,
    dayTime: 0,
    coins: TUNE.startCoins,
    wood: TUNE.startWood,
    stone: TUNE.startStone,
    earned: 0,
    harvested: 0,
    gathered: 0,
    placed: 0,
    tiersDone: [false, false, false],
    over: false,
    win: false,
    objects: new Map(),
    particles: [],
    texts: [],
    butterflies: [],
    player: {
      gx: 4.5, gy: 5.5, vx: 0, vy: 0, facing: 1,
      moving: false, bob: 0, swing: 0, target: null, path: null,
    },
  };
  for (const f of FIXED) {
    farm.objects.set(key(f.gx, f.gy), makeObject(f.kind, f.gx, f.gy, 0));
  }
  const rand = mulberry32(1234);
  const colors = ['#ff5e8a', '#ffd94d', '#a88cff', '#ff6b4a'];
  for (let i = 0; i < 4; i += 1) {
    farm.butterflies.push({
      gx: 1 + rand() * 7, gy: 1 + rand() * 7,
      tx: 1 + rand() * 7, ty: 1 + rand() * 7,
      phase: rand() * Math.PI * 2, color: colors[i],
    });
  }
  return farm;
}

function makeObject(kind, gx, gy, time) {
  const obj = { kind, gx, gy, born: time };
  if (kind === 'bed') obj.crop = { stage: 0, growth: 0, watered: false };
  if (kind === 'tree' || kind === 'rock') obj.state = 'grown';
  return obj;
}

export function objectAt(farm, gx, gy) {
  return farm.objects.get(key(gx, gy)) || null;
}

export function isBlocked(farm, fx, fy) {
  const gx = Math.floor(fx);
  const gy = Math.floor(fy);
  if (!inGrid(gx, gy)) return true;
  const obj = objectAt(farm, gx, gy);
  return obj !== null && SOLID.has(obj.kind);
}

function blockedBox(farm, fx, fy) {
  const m = 0.18;
  return isBlocked(farm, fx - m, fy - m) || isBlocked(farm, fx + m, fy - m)
    || isBlocked(farm, fx - m, fy + m) || isBlocked(farm, fx + m, fy + m);
}

export function charmTotal(farm) {
  let total = 0;
  for (const obj of farm.objects.values()) {
    const item = itemById(obj.kind);
    if (item) total += item.charm;
  }
  return total;
}

export function incomeTotal(farm) {
  let total = 0;
  for (const obj of farm.objects.values()) {
    const item = itemById(obj.kind);
    if (item) total += item.income;
  }
  return total;
}

export function windmillCount(farm) {
  let total = 0;
  for (const obj of farm.objects.values()) {
    if (obj.kind === 'windmill') total += 1;
  }
  return total;
}

export function scoreOf(farm) {
  const daysLeft = farm.win ? (TUNE.seasonDays - farm.day + 1) : 0;
  return farm.earned + farm.harvested * 20 + farm.placed * 15
    + charmTotal(farm) * 5 + daysLeft * 60;
}

export function canAfford(farm, cost) {
  return (cost.coins || 0) <= farm.coins
    && (cost.wood || 0) <= farm.wood
    && (cost.stone || 0) <= farm.stone;
}

function payCost(farm, cost) {
  farm.coins -= cost.coins || 0;
  farm.wood -= cost.wood || 0;
  farm.stone -= cost.stone || 0;
}

export function addText(farm, x, y, text, color, size = 18) {
  farm.texts.push({ x, y, text, color, size, life: 1.2, maxLife: 1.2 });
}

export function burst(farm, x, y, color, count, speed = 60) {
  const rand = mulberry32((x * 31 + y * 17 + farm.time * 1000) | 0);
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const dist = 20 + rand() * speed;
    farm.particles.push({
      x, y,
      vx: Math.cos(angle) * dist,
      vy: Math.sin(angle) * dist - 40,
      life: 0.6 + rand() * 0.4, maxLife: 1,
      size: 2 + rand() * 3, color,
      kind: 'dot',
    });
  }
}

function tileScreen(gx, gy) {
  return tileCenter(gx, gy);
}

// --- Gathering and farming ---

export function nearestInteractable(farm) {
  const p = farm.player;
  let best = null;
  let bestDist = TUNE.interactRange;
  for (const obj of farm.objects.values()) {
    if (obj.kind !== 'tree' && obj.kind !== 'rock' && obj.kind !== 'bed') continue;
    if ((obj.kind === 'tree' || obj.kind === 'rock') && obj.state !== 'grown') continue;
    const dx = obj.gx + 0.5 - p.gx;
    const dy = obj.gy + 0.5 - p.gy;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = obj;
    }
  }
  return best;
}

export function bedHint(bed) {
  if (bed.crop.stage === 0) return 'plant';
  if (bed.crop.stage === 3) return 'harvest';
  return bed.crop.watered ? 'growing' : 'water';
}

export function interact(farm) {
  const obj = nearestInteractable(farm);
  if (!obj) return null;
  return interactObject(farm, obj);
}

// Acts on one specific object: a click (or a click-to-move arrival) must
// affect the tile that was clicked, not whichever interactable happens to
// stand nearest the farmer.
export function interactObject(farm, obj) {
  if (obj.kind !== 'tree' && obj.kind !== 'rock' && obj.kind !== 'bed') return null;
  if ((obj.kind === 'tree' || obj.kind === 'rock') && obj.state !== 'grown') return null;
  const p = farm.player;
  if (p.swing > 0.1) return null;
  p.swing = 0.38;
  const { x, y } = tileScreen(obj.gx, obj.gy);
  if (obj.kind === 'tree') {
    obj.state = 'stump';
    obj.regrow = TUNE.regrowTime;
    farm.wood += TUNE.chopYield;
    farm.gathered += TUNE.chopYield;
    addText(farm, x, y - 46, `+${TUNE.chopYield} wood`, '#7a4a22');
    burst(farm, x, y - 30, '#5ecb4e', 10);
    burst(farm, x, y - 20, '#a06a35', 6);
    return { sfx: 'chop', message: `Chopped +${TUNE.chopYield} wood. The tree will grow back.` };
  }
  if (obj.kind === 'rock') {
    obj.state = 'stump';
    obj.regrow = TUNE.regrowTime;
    farm.stone += TUNE.mineYield;
    farm.gathered += TUNE.mineYield;
    addText(farm, x, y - 40, `+${TUNE.mineYield} stone`, '#5f8291');
    burst(farm, x, y - 24, '#c3ccd2', 10);
    return { sfx: 'mine', message: `Mined +${TUNE.mineYield} stone. The rock will reform.` };
  }
  const crop = obj.crop;
  if (crop.stage === 0) {
    crop.stage = 1;
    crop.growth = 0;
    crop.watered = false;
    burst(farm, x, y - 10, '#8a5a34', 6, 40);
    return { sfx: 'plant', message: 'Radish planted! Water it to grow twice as fast.' };
  }
  if (crop.stage === 3) {
    crop.stage = 0;
    crop.growth = 0;
    crop.watered = false;
    farm.coins += CROP.yieldCoins;
    farm.earned += CROP.yieldCoins;
    farm.harvested += 1;
    addText(farm, x, y - 30, `+${CROP.yieldCoins} coins`, '#c07a12', 20);
    burst(farm, x, y - 14, '#e84d6b', 8);
    burst(farm, x, y - 14, '#3fae4e', 6);
    return { sfx: 'harvest', message: `Harvested a radish! +${CROP.yieldCoins} coins.` };
  }
  if (!crop.watered) {
    crop.watered = true;
    burst(farm, x, y - 18, '#6fd2ff', 10, 45);
    return { sfx: 'water', message: 'Watered! This radish grows twice as fast now.' };
  }
  return { sfx: null, message: 'Already watered — it just needs a little time.' };
}

// --- Building ---

export function tryPlace(farm, id, gx, gy) {
  const item = itemById(id);
  if (!item || !inGrid(gx, gy)) return { ok: false, reason: 'out' };
  if (objectAt(farm, gx, gy)) return { ok: false, reason: 'taken' };
  if (SOLID.has(id) && Math.floor(farm.player.gx) === gx && Math.floor(farm.player.gy) === gy) {
    return { ok: false, reason: 'player' };
  }
  if (!canAfford(farm, item.cost)) return { ok: false, reason: 'poor' };
  payCost(farm, item.cost);
  farm.objects.set(key(gx, gy), makeObject(id, gx, gy, farm.time));
  farm.placed += 1;
  const { x, y } = tileScreen(gx, gy);
  burst(farm, x, y - 8, '#ffd94d', 8, 45);
  return { ok: true };
}

export function tryBulldoze(farm, gx, gy) {
  if (!inGrid(gx, gy)) return { ok: false, reason: 'out' };
  const obj = objectAt(farm, gx, gy);
  if (!obj) return { ok: false, reason: 'empty' };
  if (obj.kind === 'farmhouse' || obj.kind === 'well' || obj.kind === 'pond') {
    return { ok: false, reason: 'fixed' };
  }
  const item = itemById(obj.kind);
  farm.objects.delete(key(gx, gy));
  if (item) {
    const refund = (value) => Math.floor(value * TUNE.refundRate);
    farm.coins += refund(item.cost.coins || 0);
    farm.wood += refund(item.cost.wood || 0);
    farm.stone += refund(item.cost.stone || 0);
  }
  const { x, y } = tileScreen(gx, gy);
  burst(farm, x, y - 8, '#c3ccd2', 8, 45);
  return { ok: true };
}

// --- Goals ---

function tierProgress(farm, tier) {
  const need = tier.need;
  const charm = charmTotal(farm);
  const parts = [];
  if (need.harvested !== undefined) parts.push(`${Math.min(farm.harvested, need.harvested)}/${need.harvested} crops`);
  if (need.gathered !== undefined) parts.push(`${Math.min(farm.gathered, need.gathered)}/${need.gathered} gathered`);
  if (need.placed !== undefined) parts.push(`${Math.min(farm.placed, need.placed)}/${need.placed} built`);
  if (need.earned !== undefined) parts.push(`${Math.min(farm.earned, need.earned)}/${need.earned} earned`);
  if (need.charm !== undefined) parts.push(`${Math.min(charm, need.charm)}/${need.charm} charm`);
  if (need.windmills !== undefined) parts.push(`${Math.min(windmillCount(farm), need.windmills)}/${need.windmills} windmill`);
  return parts.join(' · ');
}

function tierMet(farm, tier) {
  const need = tier.need;
  if (need.harvested !== undefined && farm.harvested < need.harvested) return false;
  if (need.gathered !== undefined && farm.gathered < need.gathered) return false;
  if (need.placed !== undefined && farm.placed < need.placed) return false;
  if (need.earned !== undefined && farm.earned < need.earned) return false;
  if (need.charm !== undefined && charmTotal(farm) < need.charm) return false;
  if (need.windmills !== undefined && windmillCount(farm) < need.windmills) return false;
  return true;
}

export function goalRows(farm) {
  return TIERS.map((tier, i) => ({
    name: tier.name,
    detail: farm.tiersDone[i] ? 'Complete' : tierProgress(farm, tier),
    done: farm.tiersDone[i],
    current: !farm.tiersDone[i] && (i === 0 || farm.tiersDone[i - 1]),
  }));
}

function checkGoals(farm, events) {
  TIERS.forEach((tier, i) => {
    if (farm.tiersDone[i]) return;
    if (i > 0 && !farm.tiersDone[i - 1]) return;
    if (!tierMet(farm, tier)) return;
    farm.tiersDone[i] = true;
    if (tier.reward > 0) {
      farm.coins += tier.reward;
      farm.earned += tier.reward;
    }
    events.push({ type: 'goal', name: tier.name, reward: tier.reward });
    if (i === TIERS.length - 1) {
      farm.over = true;
      farm.win = true;
      events.push({ type: 'win' });
    }
  });
}

// --- Movement ---

// Breadth-first path over walkable tiles from the farmer's tile to the
// nearest of the goal tiles. Returns tile coords excluding the start, or
// null when no goal is reachable. Straight-line steering wedges the
// farmer in corners (a fence and a stump form a notch on the main
// east-west corridor), so clicks always route around obstacles.
export function findPath(farm, goals) {
  const p = farm.player;
  const sx = Math.floor(p.gx);
  const sy = Math.floor(p.gy);
  const goalSet = new Set(goals.map(([gx, gy]) => key(gx, gy)));
  const startKey = key(sx, sy);
  if (goalSet.has(startKey)) return [];
  const prev = new Map([[startKey, null]]);
  const queue = [[sx, sy]];
  const walkable = (gx, gy) => {
    if (!inGrid(gx, gy)) return false;
    const obj = objectAt(farm, gx, gy);
    return obj === null || !SOLID.has(obj.kind);
  };
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (!walkable(nx, ny) || prev.has(nk)) continue;
      prev.set(nk, [cx, cy]);
      if (goalSet.has(nk)) {
        const path = [];
        let cur = [nx, ny];
        let k = nk;
        while (prev.get(k) !== null) {
          path.unshift(cur);
          cur = prev.get(k);
          k = key(cur[0], cur[1]);
        }
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

// Tiles the farmer may stop on to act on (or reach) tile (gx, gy): the
// tile itself when walkable, else its walkable orthogonal neighbours
// (their centres sit 1 tile from the target, inside interact range).
export function moveGoalsFor(farm, gx, gy) {
  const obj = objectAt(farm, gx, gy);
  if (obj === null || !SOLID.has(obj.kind)) return [[gx, gy]];
  const goals = [];
  for (const [nx, ny] of [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]]) {
    if (!inGrid(nx, ny)) continue;
    const o = objectAt(farm, nx, ny);
    if (o === null || !SOLID.has(o.kind)) goals.push([nx, ny]);
  }
  return goals;
}

// Sets the farmer walking toward tile (gx, gy) along a path that goes
// around obstacles. Falls back to a straight-line target when no path
// exists (a fully enclosed tile).
export function setMovePath(farm, gx, gy) {
  const p = farm.player;
  const goals = moveGoalsFor(farm, gx, gy);
  const path = goals.length > 0 ? findPath(farm, goals) : null;
  if (path === null) {
    p.path = null;
    p.target = { gx: gx + 0.5, gy: gy + 0.5 };
    return;
  }
  if (path.length === 0) {
    p.path = null;
    p.target = null;
    return;
  }
  p.path = path.slice(1);
  const [wx, wy] = path[0];
  p.target = { gx: wx + 0.5, gy: wy + 0.5 };
}

function updatePlayer(farm, dt, input) {
  const p = farm.player;
  let targetVx = 0;
  let targetVy = 0;
  if (input.ax !== 0 || input.ay !== 0) {
    p.target = null;
    p.path = null;
    // Screen-space input -> grid-space direction (inverse iso projection).
    const sx = input.ax;
    const sy = input.ay;
    const gx = (sx + sy * 2) / 2;
    const gy = (sy * 2 - sx) / 2;
    const len = Math.hypot(gx, gy) || 1;
    targetVx = (gx / len) * TUNE.playerSpeed;
    targetVy = (gy / len) * TUNE.playerSpeed;
  } else if (p.target) {
    const dx = p.target.gx - p.gx;
    const dy = p.target.gy - p.gy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.09) {
      if (p.path && p.path.length > 0) {
        const [wx, wy] = p.path.shift();
        p.target = { gx: wx + 0.5, gy: wy + 0.5 };
      } else {
        p.target = null;
      }
    } else {
      const ease = Math.min(1, dist * 2.2);
      targetVx = (dx / dist) * TUNE.playerSpeed * ease;
      targetVy = (dy / dist) * TUNE.playerSpeed * ease;
    }
  }
  const blend = 1 - Math.exp(-12 * dt);
  p.vx += (targetVx - p.vx) * blend;
  p.vy += (targetVy - p.vy) * blend;
  const nx = p.gx + p.vx * dt;
  if (!blockedBox(farm, nx, p.gy)) p.gx = nx;
  else p.vx = 0;
  const ny = p.gy + p.vy * dt;
  if (!blockedBox(farm, p.gx, ny)) p.gy = ny;
  else p.vy = 0;
  const speed = Math.hypot(p.vx, p.vy);
  p.moving = speed > 0.25;
  if (p.moving) {
    p.bob += dt * (4 + speed * 2.2);
    const screenDx = (p.vx - p.vy) * 42;
    if (screenDx > 6) p.facing = 1;
    else if (screenDx < -6) p.facing = -1;
  }
  if (p.swing > 0) p.swing = Math.max(0, p.swing - dt);
}

// --- Main update ---

export function updateFarm(farm, dt, input) {
  const events = [];
  farm.time += dt;
  updatePlayer(farm, dt, input);

  for (const obj of farm.objects.values()) {
    if (obj.kind === 'bed' && obj.crop.stage > 0 && obj.crop.stage < 3) {
      obj.crop.growth += dt * (obj.crop.watered ? 2 : 1);
      const t = obj.crop.growth / CROP.growTime;
      obj.crop.stage = t >= 1 ? 3 : t >= 0.45 ? 2 : 1;
      if (obj.crop.stage === 3) {
        const { x, y } = tileScreen(obj.gx, obj.gy);
        burst(farm, x, y - 16, '#ffd94d', 4, 30);
      }
    }
    if ((obj.kind === 'tree' || obj.kind === 'rock') && obj.state === 'stump') {
      obj.regrow -= dt;
      if (obj.regrow <= 0) {
        obj.state = 'grown';
        obj.born = farm.time;
        const { x, y } = tileScreen(obj.gx, obj.gy);
        burst(farm, x, y - 20, '#5ecb4e', 6, 35);
      }
    }
  }

  farm.dayTime += dt / TUNE.dayLength;
  if (farm.dayTime >= 1 && !farm.over) {
    farm.dayTime = 0;
    farm.day += 1;
    const income = incomeTotal(farm);
    if (income > 0) {
      farm.coins += income;
      farm.earned += income;
    }
    events.push({ type: 'day', day: farm.day, income });
    if (farm.day > TUNE.seasonDays) {
      farm.over = true;
      farm.win = false;
      events.push({ type: 'lose' });
    }
  }

  for (const b of farm.butterflies) {
    const dx = b.tx - b.gx;
    const dy = b.ty - b.gy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.3) {
      const rand = mulberry32((farm.time * 997 + b.phase * 100) | 0);
      b.tx = 1 + rand() * 7;
      b.ty = 1 + rand() * 7;
    } else {
      b.gx += (dx / dist) * dt * 0.55;
      b.gy += (dy / dist) * dt * 0.55;
    }
    b.phase += dt * 6;
  }

  for (let i = farm.particles.length - 1; i >= 0; i -= 1) {
    const pt = farm.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      farm.particles.splice(i, 1);
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 160 * dt;
  }
  for (let i = farm.texts.length - 1; i >= 0; i -= 1) {
    const t = farm.texts[i];
    t.life -= dt;
    t.y -= 26 * dt;
    if (t.life <= 0) farm.texts.splice(i, 1);
  }

  if (!farm.over) checkGoals(farm, events);
  return events;
}
