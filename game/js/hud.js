// DOM interface: resource chips, the goals panel, the build bar, the
// info line and the title/results screens. The canvas owns the world;
// this owns the chrome around it.

import { ITEMS, TUNE } from './config.js';
import { canAfford, goalRows, charmTotal, scoreOf } from './farm.js';
import { drawObjectIcon } from './render.js';

function costText(cost) {
  const parts = [];
  if (cost.coins) parts.push(`${cost.coins} 🪙`);
  if (cost.wood) parts.push(`${cost.wood} 🪵`);
  if (cost.stone) parts.push(`${cost.stone} 🪨`);
  return parts.join(' + ');
}

export function initHud(callbacks) {
  const bar = document.getElementById('build-bar');
  for (const item of ITEMS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'build-card';
    card.dataset.item = item.id;
    card.title = item.blurb;
    const icon = document.createElement('canvas');
    icon.className = 'card-icon';
    icon.width = 46;
    icon.height = 46;
    drawObjectIcon(icon, item.id);
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = item.name;
    const cost = document.createElement('span');
    cost.className = 'card-cost';
    cost.textContent = costText(item.cost);
    const key = document.createElement('span');
    key.className = 'card-key';
    key.textContent = item.key;
    card.append(icon, name, cost, key);
    card.addEventListener('click', () => callbacks.onSelect(item.id));
    bar.appendChild(card);
  }
  document.getElementById('btn-bulldoze').addEventListener('click', callbacks.onBulldoze);
  document.getElementById('btn-start').addEventListener('click', callbacks.onStart);
  document.getElementById('btn-again').addEventListener('click', callbacks.onAgain);
  document.getElementById('btn-pause').addEventListener('click', callbacks.onPause);
  document.getElementById('btn-sound').addEventListener('click', callbacks.onSound);
  document.getElementById('btn-next-day').addEventListener('click', callbacks.onNextDay);
}

export function updateHud(farm, selected, buildMode) {
  document.querySelector('#chip-coins b').textContent = farm.coins;
  document.querySelector('#chip-wood b').textContent = farm.wood;
  document.querySelector('#chip-stone b').textContent = farm.stone;
  document.querySelector('#chip-charm b').textContent = charmTotal(farm);
  const dayShown = Math.min(farm.day, TUNE.seasonDays);
  document.getElementById('day-label').textContent = `Day ${dayShown} of ${TUNE.seasonDays}`;
  const progress = Math.min(1, (farm.day - 1 + farm.dayTime) / TUNE.seasonDays);
  document.getElementById('season-fill').style.width = `${Math.round(progress * 100)}%`;

  const list = document.getElementById('goals-list');
  list.innerHTML = '';
  for (const row of goalRows(farm)) {
    const el = document.createElement('div');
    el.className = `goal-row${row.done ? ' done' : row.current ? ' current' : ' locked'}`;
    const mark = document.createElement('span');
    mark.className = 'goal-mark';
    mark.textContent = row.done ? '✓' : '•';
    const text = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'goal-name';
    name.textContent = row.name;
    const detail = document.createElement('div');
    detail.className = 'goal-detail';
    detail.textContent = row.detail;
    text.append(name, detail);
    el.append(mark, text);
    list.appendChild(el);
  }

  for (const card of document.querySelectorAll('.build-card[data-item]')) {
    const item = ITEMS.find((entry) => entry.id === card.dataset.item);
    card.classList.toggle('selected', buildMode && selected === item.id);
    card.classList.toggle('poor', !canAfford(farm, item.cost));
  }
  document.getElementById('btn-bulldoze').classList.toggle(
    'selected', buildMode && selected === 'bulldoze',
  );
}

export function setInfo(text) {
  document.getElementById('info-line').textContent = text;
}

export function showScreen(id) {
  for (const screen of document.querySelectorAll('.screen')) {
    screen.classList.toggle('open', screen.id === id);
  }
}

export function setBestLine(best) {
  const el = document.getElementById('best-line');
  el.textContent = best > 0 ? `Best score so far: ${best}` : '';
}

export function setSoundLabel(muted) {
  document.getElementById('btn-sound').textContent = muted ? '🔇 Muted' : '🔊 Sound';
}

export function setPauseLabel(paused) {
  document.getElementById('btn-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
}

export function showResults(farm, isNewBest) {
  document.getElementById('over-eyebrow').textContent = farm.win
    ? 'ALL VALLEY GOALS COMPLETE'
    : 'THE SEASON ENDS';
  document.getElementById('over-title').textContent = farm.win
    ? 'A Valley, Complete!'
    : 'A Summer Well Spent';
  document.getElementById('over-tagline').textContent = farm.win
    ? 'Briarfield shines: the windmill turns, the beds are full, and the valley hums with life.'
    : 'The season slipped by before every goal was met — but the valley is lovelier than you found it.';
  document.getElementById('res-score').textContent = scoreOf(farm);
  document.getElementById('res-harvest').textContent = farm.harvested;
  document.getElementById('res-placed').textContent = farm.placed;
  document.getElementById('res-charm').textContent = charmTotal(farm);
  document.getElementById('over-newbest').style.display = isNewBest ? 'block' : 'none';
  showScreen('screen-over');
}
