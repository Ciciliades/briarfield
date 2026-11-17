// Briarfield's driver: the game loop, view states, build mode, clicks,
// keys and the day/goal events that end a run.

import { VIEW, TUNE, ITEMS, itemById, screenToGrid, inGrid } from './config.js';
import {
  createFarm, updateFarm, interact, interactObject, nearestInteractable, tryPlace,
  tryBulldoze, objectAt, scoreOf, canAfford, bedHint, setMovePath,
} from './farm.js';
import { drawFrame } from './render.js';
import {
  initHud, updateHud, setInfo, showScreen, setBestLine, setSoundLabel,
  setPauseLabel, showResults,
} from './hud.js';
import { initInput, keys, mouse, clickQueue, rightClickQueue, axisInput } from './input.js';
import { startAudio, setMuted, sfx } from './audio.js';
import { loadBest, saveBest, loadMuted, saveMuted } from './storage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let farm = createFarm();
let view = 'title';
let paused = false;
let muted = loadMuted();
let best = loadBest();
let selected = null;
let buildMode = false;
let pendingAction = null;
let lastTime = performance.now();
let hudTimer = 0;

setMuted(muted);
setSoundLabel(muted);
setBestLine(best);
setPauseLabel(false);

function enterBuildMode(id) {
  selected = id;
  buildMode = true;
  pendingAction = null;
  if (id === 'bulldoze') {
    setInfo('Bulldoze: click a placed item to remove it (50% refund). Right-click to finish.');
  } else {
    const item = itemById(id);
    setInfo(`${item.name}: click a free tile to place it. Right-click or Esc to finish.`);
  }
  sfx('click');
}

function exitBuildMode() {
  selected = null;
  buildMode = false;
  farm.ghost = null;
  setInfo('Walk with WASD or click. Press E near trees, rocks and veggie beds.');
}

function startRun() {
  farm = createFarm();
  view = 'play';
  paused = false;
  selected = null;
  buildMode = false;
  pendingAction = null;
  setPauseLabel(false);
  showScreen(null);
  startAudio();
  setInfo('Chop a tree, plant a radish, or pick a card below to design your valley.');
  sfx('click');
  updateHud(farm, selected, buildMode);
}

function finishRun() {
  view = 'over';
  const score = scoreOf(farm);
  const isNewBest = score > best;
  if (isNewBest) {
    best = score;
    saveBest(score);
  }
  setBestLine(best);
  showResults(farm, isNewBest);
  updateHud(farm, selected, buildMode);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'goal') {
      sfx('goal');
      const reward = event.reward > 0 ? ` +${event.reward} coins!` : '!';
      setInfo(`Goal complete: ${event.name}${reward}`);
    } else if (event.type === 'day') {
      if (event.day <= TUNE.seasonDays) {
        if (event.income > 0) {
          sfx('coin');
          setInfo(`Day ${event.day} — your buildings earned +${event.income} coins.`);
        } else {
          setInfo(`Day ${event.day} of ${TUNE.seasonDays}.`);
        }
      }
    } else if (event.type === 'win') {
      sfx('win');
      finishRun();
    } else if (event.type === 'lose') {
      finishRun();
    }
  }
}

function doInteract(target) {
  const result = target ? interactObject(farm, target) : interact(farm);
  if (!result) return false;
  if (result.sfx) sfx(result.sfx);
  setInfo(result.message);
  updateHud(farm, selected, buildMode);
  return true;
}

// True when the clicked tile holds an interactable in range but the swing
// animation is still cooling down, so the action must be deferred, not dropped.
function interactDeferred(gx, gy) {
  if (farm.player.swing <= 0.1) return false;
  const obj = objectAt(farm, gx, gy);
  if (!obj || !['tree', 'rock', 'bed'].includes(obj.kind)) return false;
  if (obj.kind !== 'bed' && obj.state !== 'grown') return false;
  const p = farm.player;
  return Math.hypot(obj.gx + 0.5 - p.gx, obj.gy + 0.5 - p.gy) <= 1.35;
}

function hoverTile() {
  if (!mouse.inside) return null;
  const g = screenToGrid(mouse.x, mouse.y);
  const gx = Math.floor(g.gx);
  const gy = Math.floor(g.gy);
  if (!inGrid(gx, gy)) return null;
  return { gx, gy, fx: g.gx, fy: g.gy };
}

function updateGhost() {
  farm.ghost = null;
  if (!buildMode || view !== 'play' || paused) return;
  const tile = hoverTile();
  if (!tile) return;
  let ok = false;
  if (selected === 'bulldoze') {
    const obj = objectAt(farm, tile.gx, tile.gy);
    ok = obj !== null && !['farmhouse', 'well', 'pond'].includes(obj.kind);
  } else if (selected) {
    const item = itemById(selected);
    ok = objectAt(farm, tile.gx, tile.gy) === null && canAfford(farm, item.cost);
  }
  farm.ghost = { gx: tile.gx, gy: tile.gy, kind: selected, ok };
}

function updatePrompt() {
  farm.promptTarget = null;
  if (view !== 'play' || paused || buildMode) return;
  farm.promptTarget = nearestInteractable(farm);
}

function handleClicks() {
  while (clickQueue.length > 0) {
    const click = clickQueue.shift();
    if (view !== 'play' || paused) continue;
    const g = screenToGrid(click.x, click.y);
    const gx = Math.floor(g.gx);
    const gy = Math.floor(g.gy);
    if (!inGrid(gx, gy)) continue;
    if (buildMode) {
      if (selected === 'bulldoze') {
        const result = tryBulldoze(farm, gx, gy);
        if (result.ok) {
          sfx('chop');
          setInfo('Bulldozed — half the cost was refunded.');
        } else if (result.reason === 'fixed') {
          sfx('error');
          setInfo('That one stays — the farmhouse, well and pond are part of the valley.');
        } else {
          sfx('error');
          setInfo('Nothing to bulldoze on that tile.');
        }
      } else if (selected) {
        const result = tryPlace(farm, selected, gx, gy);
        if (result.ok) {
          sfx('place');
          const item = itemById(selected);
          setInfo(`${item.name} placed! +${item.charm} charm.`);
        } else if (result.reason === 'taken') {
          sfx('error');
          setInfo('That tile is already taken.');
        } else if (result.reason === 'player') {
          sfx('error');
          setInfo('Step aside first — you are standing on that tile.');
        } else if (result.reason === 'poor') {
          sfx('error');
          setInfo('Not enough resources for that yet — chop, mine and harvest first.');
        }
      }
      updateHud(farm, selected, buildMode);
      continue;
    }
    const obj = objectAt(farm, gx, gy);
    const p = farm.player;
    const dist = Math.hypot(gx + 0.5 - p.gx, gy + 0.5 - p.gy);
    if (obj && ['tree', 'rock', 'bed'].includes(obj.kind)) {
      if (dist <= 1.35 && !(obj.kind !== 'bed' && obj.state !== 'grown')) {
        if (!doInteract(obj) && interactDeferred(gx, gy)) {
          // The swing is still cooling down: hold the action and retry
          // next frame instead of silently dropping the click.
          p.target = null;
          p.path = null;
          pendingAction = { gx, gy };
        }
      } else {
        setMovePath(farm, gx, gy);
        pendingAction = { gx, gy };
      }
    } else {
      setMovePath(farm, gx, gy);
      pendingAction = null;
    }
  }
  while (rightClickQueue.length > 0) {
    rightClickQueue.shift();
    if (buildMode) exitBuildMode();
  }
}

function checkPendingAction() {
  if (!pendingAction || view !== 'play' || paused) return;
  const p = farm.player;
  const dist = Math.hypot(
    pendingAction.gx + 0.5 - p.gx, pendingAction.gy + 0.5 - p.gy,
  );
  if (dist <= 1.35 || !p.target) {
    const obj = objectAt(farm, pendingAction.gx, pendingAction.gy);
    if (obj && ['tree', 'rock', 'bed'].includes(obj.kind)) {
      if (doInteract(obj) || !interactDeferred(pendingAction.gx, pendingAction.gy)) {
        pendingAction = null;
        p.target = null;
        p.path = null;
      }
      // Otherwise the swing is cooling down: keep the pending action so
      // it fires on a later frame instead of being lost.
    } else {
      pendingAction = null;
      p.target = null;
      p.path = null;
    }
  }
}

function onKey(code) {
  if (code === 'KeyM') {
    muted = !muted;
    setMuted(muted);
    saveMuted(muted);
    setSoundLabel(muted);
    return;
  }
  if (view !== 'play') {
    if ((code === 'Enter' || code === 'Space') && view === 'title') startRun();
    return;
  }
  if (code === 'KeyP') {
    paused = !paused;
    setPauseLabel(paused);
    setInfo(paused ? 'Paused — press P or Resume to keep farming.' : 'Back to the valley!');
    return;
  }
  if (paused) return;
  if (code === 'Escape') {
    if (buildMode) exitBuildMode();
    return;
  }
  if (code === 'KeyB') {
    if (buildMode && selected === 'bulldoze') exitBuildMode();
    else enterBuildMode('bulldoze');
    return;
  }
  if (code === 'KeyN') {
    farm.dayTime = 0.999;
    return;
  }
  if (code.startsWith('Digit')) {
    const digit = code.slice(5);
    const item = ITEMS.find((entry) => entry.key === digit);
    if (item) {
      if (buildMode && selected === item.id) exitBuildMode();
      else enterBuildMode(item.id);
    }
    return;
  }
  if ((code === 'KeyE' || code === 'Space' || code === 'Enter') && !buildMode) {
    doInteract();
  }
}

initHud({
  onSelect: (id) => {
    if (view !== 'play') return;
    if (buildMode && selected === id) exitBuildMode();
    else enterBuildMode(id);
    updateHud(farm, selected, buildMode);
  },
  onBulldoze: () => {
    if (view !== 'play') return;
    if (buildMode && selected === 'bulldoze') exitBuildMode();
    else enterBuildMode('bulldoze');
    updateHud(farm, selected, buildMode);
  },
  onStart: startRun,
  onAgain: startRun,
  onPause: () => onKey('KeyP'),
  onSound: () => onKey('KeyM'),
  onNextDay: () => {
    if (view === 'play' && !paused) farm.dayTime = 0.999;
  },
});

initInput(canvas, { onKey });

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (view === 'title') {
    updateFarm(farm, dt, { ax: 0, ay: 0 });
    farm.day = 1;
    farm.dayTime = 0.25;
    farm.over = false;
  } else if (view === 'play' && !paused) {
    handleClicks();
    const stick = axisInput();
    const input = { ax: stick.x, ay: stick.y };
    if (input.ax !== 0 || input.ay !== 0) pendingAction = null;
    const events = updateFarm(farm, dt, input);
    checkPendingAction();
    handleEvents(events);
    updateGhost();
    updatePrompt();
    hudTimer += dt;
    if (hudTimer > 0.12) {
      hudTimer = 0;
      updateHud(farm, selected, buildMode);
    }
  } else if (view === 'play' && paused) {
    clickQueue.length = 0;
    rightClickQueue.length = 0;
  }

  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawFrame(ctx, farm, view);
  requestAnimationFrame(frame);
}

updateHud(farm, selected, buildMode);
requestAnimationFrame(frame);
