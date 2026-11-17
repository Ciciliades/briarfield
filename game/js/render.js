// Isometric renderer: the island, every building and prop, the farmer,
// water, weather and particles. Painters are shared with the build-bar
// icons so the catalogue shows exactly what lands on the island.

import {
  VIEW, GRID, TILE_W, TILE_H, ORIGIN, PALETTE, tileCenter, inGrid,
} from './config.js';
import { mulberry32 } from './farm.js';

function diamond(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function shadow(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.fillStyle = `rgba(15,35,60,${alpha})`;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
}

function blob(ctx, x, y, r, fill, outline = null) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

// An extruded box on the isometric grid: top diamond plus two side faces.
// (x, y) is the centre of the top face; h is the height in pixels.
function isoBox(ctx, x, y, w, h, top, left, right) {
  const hw = w / 2;
  const hh = w / 4;
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(x - hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x, y + hh + h);
  ctx.lineTo(x - hw, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x, y + hh + h);
  ctx.lineTo(x + hw, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = top;
  diamond(ctx, x, y, w, w / 2);
  ctx.fill();
}

function tileRand(gx, gy) {
  return mulberry32(gx * 73 + gy * 149 + 7);
}

// --- Water and island base ---

function drawWater(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#2fb0e8');
  grad.addColorStop(0.55, PALETTE.waterShallow);
  grad.addColorStop(1, PALETTE.waterDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    const baseY = 40 + i * 52;
    const waveX = (Math.sin(time * 0.6 + i * 1.7) * 14 + i * 97) % VIEW.width;
    ctx.beginPath();
    for (let x = 0; x <= 46; x += 6) {
      const px = waveX + x - 23;
      const py = baseY + Math.sin((x / 46) * Math.PI * 2 + time * 1.4 + i) * 3;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Drifting clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i += 1) {
    const cx = ((time * 12 + i * 460) % (VIEW.width + 260)) - 130;
    const cy = 34 + i * 26;
    blob(ctx, cx, cy, 26, 'rgba(255,255,255,0.85)');
    blob(ctx, cx + 30, cy + 4, 20, 'rgba(255,255,255,0.85)');
    blob(ctx, cx - 30, cy + 6, 18, 'rgba(255,255,255,0.85)');
  }
}

function drawIslandBase(ctx) {
  const top = tileCenter(0, 0);
  const left = tileCenter(0, GRID.rows - 1);
  const right = tileCenter(GRID.cols - 1, 0);
  const bottom = tileCenter(GRID.cols - 1, GRID.rows - 1);
  const pad = 26;
  const cliff = 16;
  // Cliff sides.
  ctx.fillStyle = '#b87b45';
  ctx.beginPath();
  ctx.moveTo(left.x - TILE_W / 2 - pad, left.y);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2 + cliff);
  ctx.lineTo(left.x - TILE_W / 2 - pad, left.y + cliff);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9a5f2e';
  ctx.beginPath();
  ctx.moveTo(right.x + TILE_W / 2 + pad, right.y);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2 + cliff);
  ctx.lineTo(right.x + TILE_W / 2 + pad, right.y + cliff);
  ctx.closePath();
  ctx.fill();
  // Sand rim.
  ctx.fillStyle = PALETTE.sand;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y - TILE_H / 2 - pad / 2);
  ctx.lineTo(right.x + TILE_W / 2 + pad, right.y);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2);
  ctx.lineTo(left.x - TILE_W / 2 - pad, left.y);
  ctx.closePath();
  ctx.fill();
  // Foam ring.
  ctx.strokeStyle = 'rgba(242,253,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y - TILE_H / 2 - pad / 2 - 4);
  ctx.lineTo(right.x + TILE_W / 2 + pad + 4, right.y);
  ctx.lineTo(bottom.x, bottom.y + TILE_H / 2 + pad / 2 + 4);
  ctx.lineTo(left.x - TILE_W / 2 - pad - 4, left.y);
  ctx.closePath();
  ctx.stroke();
}

function drawTile(ctx, gx, gy, time) {
  const { x, y } = tileCenter(gx, gy);
  const rand = tileRand(gx, gy);
  const shade = (gx + gy) % 2 === 0 ? PALETTE.grass : PALETTE.grassLight;
  diamond(ctx, x, y, TILE_W, TILE_H);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,140,58,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Grass tufts and the odd wildflower, seeded per tile.
  const tufts = Math.floor(rand() * 3);
  for (let i = 0; i < tufts; i += 1) {
    const tx = x + (rand() - 0.5) * 52;
    const ty = y + (rand() - 0.5) * 20;
    const sway = Math.sin(time * 1.8 + gx * 2 + gy + i) * 1.5;
    ctx.strokeStyle = 'rgba(28,132,52,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + sway - 2, ty - 6);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + sway + 2, ty - 7);
    ctx.stroke();
  }
  if (rand() > 0.78) {
    const fx = x + (rand() - 0.5) * 44;
    const fy = y + (rand() - 0.5) * 16;
    const petal = ['#ffd94d', '#ff5e9e', '#ffffff'][Math.floor(rand() * 3)];
    blob(ctx, fx, fy, 3, petal);
    blob(ctx, fx, fy, 1.4, '#ff8a3d');
  }
}

// --- Object painters: (ctx, x, y, s, obj, time); (x, y) is the tile centre,
// s is the scale, y grows downward and objects rise above their base. ---

function paintTree(ctx, x, y, s, obj, time) {
  if (obj.state === 'stump') {
    shadow(ctx, x, y + 2 * s, 16 * s, 6 * s);
    ctx.fillStyle = PALETTE.woodDark;
    ellipse(ctx, x, y - 2 * s, 11 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = PALETTE.woodLight;
    ellipse(ctx, x, y - 5 * s, 11 * s, 5 * s);
    ctx.fill();
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 1.5;
    ellipse(ctx, x, y - 5 * s, 6 * s, 2.6 * s);
    ctx.stroke();
    return;
  }
  const grow = Math.min(1, (time - obj.born) / 1.1);
  const ease = 1 + 2.2 * (grow - 1) ** 3 + 1.2 * (grow - 1) ** 2;
  const gs = s * Math.max(0.15, ease);
  shadow(ctx, x, y + 2 * s, 20 * s, 7 * s, 0.3);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.beginPath();
  ctx.moveTo(x - 5 * gs, y);
  ctx.lineTo(x - 3.5 * gs, y - 26 * gs);
  ctx.lineTo(x + 3.5 * gs, y - 26 * gs);
  ctx.lineTo(x + 5 * gs, y);
  ctx.closePath();
  ctx.fill();
  const sway = Math.sin(time * 1.2 + obj.gx) * 1.2 * gs;
  blob(ctx, x + sway - 12 * gs, y - 40 * gs, 15 * gs, PALETTE.leaf, PALETTE.leafDark);
  blob(ctx, x + sway + 12 * gs, y - 40 * gs, 15 * gs, PALETTE.leaf, PALETTE.leafDark);
  blob(ctx, x + sway, y - 54 * gs, 18 * gs, PALETTE.leafLight, PALETTE.leafDark);
  blob(ctx, x + sway - 6 * gs, y - 60 * gs, 7 * gs, 'rgba(255,255,255,0.35)');
}

function paintFruittree(ctx, x, y, s, obj, time) {
  shadow(ctx, x, y + 2 * s, 19 * s, 7 * s, 0.3);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.beginPath();
  ctx.moveTo(x - 4.5 * s, y);
  ctx.lineTo(x - 3 * s, y - 22 * s);
  ctx.lineTo(x + 3 * s, y - 22 * s);
  ctx.lineTo(x + 4.5 * s, y);
  ctx.closePath();
  ctx.fill();
  const sway = Math.sin(time * 1.2 + obj.gx * 2) * 1 * s;
  blob(ctx, x + sway - 11 * s, y - 34 * s, 13 * s, PALETTE.leaf, PALETTE.leafDark);
  blob(ctx, x + sway + 11 * s, y - 34 * s, 13 * s, PALETTE.leaf, PALETTE.leafDark);
  blob(ctx, x + sway, y - 46 * s, 16 * s, PALETTE.leafLight, PALETTE.leafDark);
  for (const [ax, ay] of [[-14, -30], [8, -42], [14, -28], [-4, -52], [2, -34]]) {
    blob(ctx, x + sway + ax * s, y + ay * s, 3.4 * s, '#e84f33', '#b0321f');
  }
}

function paintRock(ctx, x, y, s, obj) {
  if (obj.state === 'stump') {
    shadow(ctx, x, y + 2 * s, 14 * s, 5 * s);
    ctx.fillStyle = PALETTE.stoneDark;
    ellipse(ctx, x - 6 * s, y - 2 * s, 7 * s, 3.5 * s);
    ctx.fill();
    ellipse(ctx, x + 6 * s, y - 1 * s, 5 * s, 2.6 * s);
    ctx.fill();
    return;
  }
  shadow(ctx, x, y + 3 * s, 19 * s, 7 * s, 0.3);
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.beginPath();
  ctx.moveTo(x - 18 * s, y);
  ctx.lineTo(x - 12 * s, y - 20 * s);
  ctx.lineTo(x + 4 * s, y - 26 * s);
  ctx.lineTo(x + 18 * s, y - 8 * s);
  ctx.lineTo(x + 16 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.stone;
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 20 * s);
  ctx.lineTo(x + 4 * s, y - 26 * s);
  ctx.lineTo(x + 10 * s, y - 12 * s);
  ctx.lineTo(x - 4 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(ctx, x - 2 * s, y - 20 * s, 4 * s, 2.4 * s);
  ctx.fill();
}

function paintPond(ctx, x, y, s, obj, time) {
  diamond(ctx, x, y, TILE_W * s, TILE_H * s);
  ctx.fillStyle = '#4cc3f2';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  const ripple = (Math.sin(time * 1.6 + obj.gx + obj.gy) + 1) / 2;
  ellipse(ctx, x, y, (8 + ripple * 6) * s, (3.5 + ripple * 2.5) * s);
  ctx.stroke();
  if ((obj.gx + obj.gy) % 2 === 0) {
    ctx.fillStyle = PALETTE.leaf;
    ellipse(ctx, x + 12 * s, y + 4 * s, 7 * s, 3.4 * s);
    ctx.fill();
    blob(ctx, x + 12 * s, y + 1 * s, 3 * s, '#ff8ab8');
  }
}

function paintHouse(ctx, x, y, s, roofColor, roofDark, wallColor, wide) {
  shadow(ctx, x, y + 4 * s, 30 * s, 9 * s, 0.3);
  const w = (wide ? 62 : 52) * s;
  const h = (wide ? 30 : 26) * s;
  isoBox(ctx, x, y - h, w, h, wallColor, '#e8d9b8', '#d8c49a');
  // Roof: two visible faces meeting at a ridge.
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6 * s, y - h - 4 * s);
  ctx.lineTo(x, y - h - 30 * s);
  ctx.lineTo(x + w / 2 + 6 * s, y - h - 4 * s);
  ctx.lineTo(x, y - h + 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = roofDark;
  ctx.beginPath();
  ctx.moveTo(x, y - h - 30 * s);
  ctx.lineTo(x + w / 2 + 6 * s, y - h - 4 * s);
  ctx.lineTo(x, y - h + 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,56,74,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6 * s, y - h - 4 * s);
  ctx.lineTo(x, y - h - 30 * s);
  ctx.lineTo(x + w / 2 + 6 * s, y - h - 4 * s);
  ctx.stroke();
  // Chimney with a lazy smoke puff.
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.fillRect(x + 12 * s, y - h - 34 * s, 8 * s, 16 * s);
  // Door and window on the front face.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, y - 2 * s);
  ctx.lineTo(x - 7 * s, y - 20 * s);
  ctx.quadraticCurveTo(x, y - 26 * s, x + 7 * s, y - 20 * s);
  ctx.lineTo(x + 7 * s, y - 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe94d';
  ctx.fillRect(x + 13 * s, y - 20 * s, 9 * s, 9 * s);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 13 * s, y - 20 * s, 9 * s, 9 * s);
  ctx.fillRect(x - 22 * s, y - 20 * s, 9 * s, 9 * s);
  ctx.strokeRect(x - 22 * s, y - 20 * s, 9 * s, 9 * s);
}

function paintFarmhouse(ctx, x, y, s) {
  paintHouse(ctx, x, y, s, PALETTE.roof, '#c23a28', PALETTE.cream, true);
}

function paintCottage(ctx, x, y, s) {
  paintHouse(ctx, x, y, s, '#2f8aa8', '#1f6a82', '#fff3d6', false);
}

function paintWell(ctx, x, y, s) {
  shadow(ctx, x, y + 3 * s, 20 * s, 7 * s, 0.3);
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.fillRect(x - 14 * s, y - 18 * s, 28 * s, 18 * s);
  ctx.fillStyle = PALETTE.stone;
  ellipse(ctx, x, y - 18 * s, 14 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = '#1f6a82';
  ellipse(ctx, x, y - 18 * s, 9 * s, 3.8 * s);
  ctx.fill();
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x - 17 * s, y - 46 * s, 4 * s, 30 * s);
  ctx.fillRect(x + 13 * s, y - 46 * s, 4 * s, 30 * s);
  ctx.fillStyle = PALETTE.roof;
  ctx.beginPath();
  ctx.moveTo(x - 22 * s, y - 42 * s);
  ctx.lineTo(x, y - 56 * s);
  ctx.lineTo(x + 22 * s, y - 42 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y - 30 * s);
  ctx.lineTo(x + 8 * s, y - 30 * s);
  ctx.stroke();
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(x - 4 * s, y - 30 * s, 8 * s, 7 * s);
}

function paintWindmill(ctx, x, y, s, obj, time) {
  shadow(ctx, x, y + 4 * s, 24 * s, 8 * s, 0.3);
  ctx.fillStyle = '#e8d9b8';
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y);
  ctx.lineTo(x - 10 * s, y - 52 * s);
  ctx.lineTo(x + 10 * s, y - 52 * s);
  ctx.lineTo(x + 16 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - 52 * s);
  ctx.lineTo(x, y - 62 * s);
  ctx.lineTo(x + 10 * s, y - 52 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.roof;
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, y - 50 * s);
  ctx.lineTo(x, y - 66 * s);
  ctx.lineTo(x + 13 * s, y - 50 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x - 5 * s, y - 16 * s, 10 * s, 16 * s);
  ctx.fillStyle = '#ffe94d';
  ctx.fillRect(x - 4 * s, y - 40 * s, 8 * s, 8 * s);
  // Four blades turning in the screen plane.
  const hubY = y - 52 * s;
  const angle = time * 0.9;
  ctx.save();
  ctx.translate(x, hubY);
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.rotate(angle + (i * Math.PI) / 2);
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-3 * s, -30 * s, 6 * s, 26 * s, 3 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(-1.5 * s, -30 * s, 3 * s, 26 * s);
    ctx.restore();
  }
  ctx.restore();
  blob(ctx, x, hubY, 5 * s, PALETTE.woodDark);
  blob(ctx, x, hubY, 2.4 * s, PALETTE.gold);
}

function paintBed(ctx, x, y, s, obj, time) {
  const crop = obj.crop || { stage: 3, growth: 0, watered: false };
  shadow(ctx, x, y + 3 * s, 30 * s, 10 * s, 0.25);
  isoBox(ctx, x, y - 6 * s, 64 * s, 6 * s, crop.watered ? PALETTE.soilWet : PALETTE.soil, PALETTE.soilDark, '#5f3a1e');
  ctx.strokeStyle = 'rgba(20,56,74,0.3)';
  ctx.lineWidth = 1.5;
  diamond(ctx, x, y - 6 * s, 64 * s, 32 * s);
  ctx.stroke();
  const spots = [[-16, -8], [0, -14], [16, -8], [-8, 0], [8, 0], [0, -6]];
  const count = crop.stage === 0 ? 0 : 6;
  for (let i = 0; i < count; i += 1) {
    const [ox, oy] = spots[i];
    const px = x + ox * s;
    const py = y - 6 * s + oy * s;
    const sway = Math.sin(time * 2 + i) * 1 * s;
    if (crop.stage === 1) {
      ctx.strokeStyle = PALETTE.sprout;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway - 2 * s, py - 5 * s);
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway + 2 * s, py - 6 * s);
      ctx.stroke();
    } else if (crop.stage === 2) {
      ctx.strokeStyle = PALETTE.sprout;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway - 3 * s, py - 9 * s);
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway + 3 * s, py - 10 * s);
      ctx.moveTo(px, py);
      ctx.lineTo(px + sway, py - 11 * s);
      ctx.stroke();
      blob(ctx, px + sway, py - 2 * s, 3 * s, PALETTE.radish);
    } else {
      ctx.strokeStyle = PALETTE.sprout;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py - 4 * s);
      ctx.lineTo(px + sway - 4 * s, py - 12 * s);
      ctx.moveTo(px, py - 4 * s);
      ctx.lineTo(px + sway + 4 * s, py - 13 * s);
      ctx.moveTo(px, py - 4 * s);
      ctx.lineTo(px + sway, py - 14 * s);
      ctx.stroke();
      blob(ctx, px, py - 2 * s, 5.5 * s, PALETTE.radish, '#b02a44');
      blob(ctx, px - 1.8 * s, py - 4 * s, 1.8 * s, 'rgba(255,255,255,0.55)');
    }
  }
  if (crop.stage === 3) {
    const tw = (Math.sin(time * 3) + 1) / 2;
    ctx.fillStyle = `rgba(255,217,77,${0.4 + tw * 0.6})`;
    for (const [ox, oy] of [[-22, -16], [20, -18], [0, -26]]) {
      ctx.beginPath();
      ctx.arc(x + ox * s, y - 6 * s + oy * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintFence(ctx, x, y, s) {
  shadow(ctx, x, y + 2 * s, 28 * s, 7 * s, 0.25);
  ctx.strokeStyle = PALETTE.wood;
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 6 * s);
  ctx.lineTo(x, y + 8 * s);
  ctx.lineTo(x + 30 * s, y - 6 * s);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.woodLight;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 14 * s);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 30 * s, y - 14 * s);
  ctx.stroke();
  ctx.fillStyle = PALETTE.woodDark;
  for (const [px, py] of [[-30, -6], [0, 8], [30, -6]]) {
    ctx.beginPath();
    ctx.roundRect(x + px * s - 3 * s, y + py * s - 20 * s, 6 * s, 22 * s, 3 * s);
    ctx.fill();
  }
}

function paintFlowers(ctx, x, y, s, obj, time) {
  shadow(ctx, x, y + 2 * s, 26 * s, 8 * s, 0.22);
  diamond(ctx, x, y, 56 * s, 28 * s);
  ctx.fillStyle = PALETTE.soil;
  ctx.fill();
  const colors = ['#ff5e9e', '#ffd94d', '#a88cff', '#ff6b4a', '#ffffff', '#ff8ab8'];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const px = x + Math.cos(angle) * 16 * s;
    const py = y + Math.sin(angle) * 7 * s - 2 * s;
    const sway = Math.sin(time * 2 + i * 1.3) * 1 * s;
    ctx.strokeStyle = PALETTE.sprout;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + sway, py - 8 * s);
    ctx.stroke();
    blob(ctx, px + sway, py - 10 * s, 4 * s, colors[i], 'rgba(20,56,74,0.25)');
    blob(ctx, px + sway, py - 10 * s, 1.6 * s, '#ff8a3d');
  }
}

function paintPath(ctx, x, y, s) {
  diamond(ctx, x, y, TILE_W * s * 0.92, TILE_H * s * 0.92);
  ctx.fillStyle = PALETTE.path;
  ctx.fill();
  ctx.fillStyle = PALETTE.pathDark;
  diamond(ctx, x - 14 * s, y - 4 * s, 22 * s, 11 * s);
  ctx.fill();
  diamond(ctx, x + 12 * s, y + 3 * s, 24 * s, 12 * s);
  ctx.fill();
  diamond(ctx, x + 2 * s, y - 8 * s, 18 * s, 9 * s);
  ctx.fill();
}

function paintCrate(ctx, x, y, s) {
  shadow(ctx, x, y + 2 * s, 18 * s, 6 * s, 0.28);
  isoBox(ctx, x, y - 20 * s, 34 * s, 20 * s, PALETTE.woodLight, PALETTE.wood, PALETTE.woodDark);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2;
  diamond(ctx, x, y - 20 * s, 34 * s, 17 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 14 * s);
  ctx.lineTo(x + 12 * s, y - 6 * s);
  ctx.moveTo(x + 12 * s, y - 14 * s);
  ctx.lineTo(x - 12 * s, y - 6 * s);
  ctx.stroke();
}

function paintBarrel(ctx, x, y, s) {
  shadow(ctx, x, y + 2 * s, 16 * s, 6 * s, 0.28);
  ctx.fillStyle = PALETTE.wood;
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, y - 22 * s);
  ctx.quadraticCurveTo(x - 16 * s, y - 8 * s, x - 12 * s, y);
  ctx.lineTo(x + 12 * s, y);
  ctx.quadraticCurveTo(x + 16 * s, y - 8 * s, x + 13 * s, y - 22 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.woodLight;
  ellipse(ctx, x, y - 22 * s, 13 * s, 5.5 * s);
  ctx.fill();
  ctx.fillStyle = '#3f7fbf';
  ellipse(ctx, x, y - 22 * s, 9 * s, 3.6 * s);
  ctx.fill();
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 15 * s, y - 14 * s);
  ctx.quadraticCurveTo(x, y - 9 * s, x + 15 * s, y - 14 * s);
  ctx.moveTo(x - 14 * s, y - 6 * s);
  ctx.quadraticCurveTo(x, y - 1 * s, x + 14 * s, y - 6 * s);
  ctx.stroke();
}

function paintLamp(ctx, x, y, s, obj, time, dusk) {
  shadow(ctx, x, y + 2 * s, 12 * s, 5 * s, 0.28);
  const glow = 0.25 + dusk * 0.75;
  const grad = ctx.createRadialGradient(x, y - 40 * s, 2, x, y - 40 * s, 26 * s);
  grad.addColorStop(0, `rgba(255,233,77,${0.55 * glow})`);
  grad.addColorStop(1, 'rgba(255,233,77,0)');
  ctx.fillStyle = grad;
  ellipse(ctx, x, y - 40 * s, 26 * s, 26 * s);
  ctx.fill();
  ctx.fillStyle = '#2f3e46';
  ctx.fillRect(x - 2.5 * s, y - 38 * s, 5 * s, 38 * s);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, y - 38 * s);
  ctx.lineTo(x, y - 48 * s);
  ctx.lineTo(x + 7 * s, y - 38 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe94d';
  ctx.beginPath();
  ctx.roundRect(x - 5.5 * s, y - 38 * s, 11 * s, 12 * s, 3 * s);
  ctx.fill();
  ctx.strokeStyle = '#2f3e46';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 5.5 * s, y - 38 * s, 11 * s, 12 * s);
}

const PAINTERS = {
  tree: paintTree,
  fruittree: paintFruittree,
  rock: paintRock,
  pond: paintPond,
  farmhouse: paintFarmhouse,
  cottage: paintCottage,
  well: paintWell,
  windmill: paintWindmill,
  bed: paintBed,
  fence: paintFence,
  flowers: paintFlowers,
  path: paintPath,
  crate: paintCrate,
  barrel: paintBarrel,
  lamp: paintLamp,
};

function drawObject(ctx, obj, time, dusk) {
  const { x, y } = tileCenter(obj.gx, obj.gy);
  const painter = PAINTERS[obj.kind];
  if (painter) painter(ctx, x, y, 1, obj, time, dusk);
}

// --- The farmer ---

function drawPlayer(ctx, farm, time) {
  const p = farm.player;
  const { x, y } = tileCenter(p.gx - 0.5, p.gy - 0.5);
  const bobY = p.moving ? -Math.abs(Math.sin(p.bob)) * 3.5 : Math.sin(time * 2) * 0.8;
  const swing = p.swing > 0 ? Math.sin((p.swing / 0.38) * Math.PI) : 0;
  const lean = swing * 5;
  shadow(ctx, x, y + 2, 13, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bobY);
  ctx.scale(p.facing, 1);
  const step = p.moving ? Math.sin(p.bob) * 5 : 0;
  // Legs.
  ctx.strokeStyle = '#2f5f8f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -14);
  ctx.lineTo(-2 + step, 0);
  ctx.moveTo(3, -14);
  ctx.lineTo(3 - step, 0);
  ctx.stroke();
  // Boots.
  ctx.fillStyle = '#5b3a1e';
  ellipse(ctx, -2 + step, -1, 5, 2.6);
  ctx.fill();
  ellipse(ctx, 3 - step, -1, 5, 2.6);
  ctx.fill();
  // Body: denim overalls over a cream shirt.
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.roundRect(-8, -34, 17, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#3a7bb8';
  ctx.beginPath();
  ctx.roundRect(-7, -26, 15, 13, 4);
  ctx.fill();
  ctx.fillStyle = '#3a7bb8';
  ctx.fillRect(-6, -34, 4, 8);
  ctx.fillRect(3, -34, 4, 8);
  // Head.
  blob(ctx, 1 + lean * 0.3, -42, 10, '#f2b88a', 'rgba(20,56,74,0.3)');
  blob(ctx, 5 + lean * 0.3, -40, 2.2, '#ff8a9a');
  ctx.fillStyle = '#14384a';
  blob(ctx, 5 + lean * 0.3, -44, 1.6, '#14384a');
  // Green cap with a brim.
  ctx.fillStyle = '#2fae4e';
  ctx.beginPath();
  ctx.arc(1 + lean * 0.3, -44, 10, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e8c3a';
  ctx.beginPath();
  ctx.roundRect(6 + lean * 0.3, -47, 11, 4, 2);
  ctx.fill();
  // Arm: rests down, swings up with the axe when working.
  const armAngle = -0.4 - swing * 1.6;
  ctx.save();
  ctx.translate(7, -30);
  ctx.rotate(armAngle);
  ctx.strokeStyle = '#f7ead0';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, 2);
  ctx.stroke();
  if (swing > 0.15) {
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(16, -8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.stone;
    ctx.beginPath();
    ctx.moveTo(16, -8);
    ctx.lineTo(22, -4);
    ctx.lineTo(17, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Satchel.
  ctx.fillStyle = '#a06a35';
  ctx.beginPath();
  ctx.roundRect(-12, -26, 7, 9, 2);
  ctx.fill();
  ctx.restore();
}

// --- Overlays ---

function drawButterflies(ctx, farm) {
  for (const b of farm.butterflies) {
    const { x, y } = tileCenter(b.gx - 0.5, b.gy - 0.5);
    const flap = Math.sin(b.phase) * 0.9;
    const hover = y - 34 + Math.sin(b.phase * 0.5) * 4;
    ctx.save();
    ctx.translate(x, hover);
    ctx.fillStyle = b.color;
    ctx.save();
    ctx.rotate(flap * 0.5);
    ellipse(ctx, -4, 0, 5, 3.2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(-flap * 0.5);
    ellipse(ctx, 4, 0, 5, 3.2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#14384a';
    ctx.fillRect(-1, -3, 2, 6);
    ctx.restore();
  }
}

function drawParticles(ctx, farm) {
  for (const pt of farm.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, farm) {
  for (const t of farm.texts) {
    const alpha = Math.max(0, Math.min(1, t.life / (t.maxLife * 0.5)));
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${t.size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,250,240,0.9)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawPrompt(ctx, farm) {
  const obj = farm.promptTarget;
  if (!obj) return;
  const { x, y } = tileCenter(obj.gx, obj.gy);
  const bob = Math.sin(farm.time * 4) * 3;
  const py = y - 74 + bob;
  ctx.fillStyle = 'rgba(20,56,74,0.9)';
  ctx.beginPath();
  ctx.roundRect(x - 14, py - 14, 28, 28, 9);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 5, py + 13);
  ctx.lineTo(x + 5, py + 13);
  ctx.lineTo(x, py + 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.font = '700 17px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', x, py + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawGhost(ctx, farm) {
  const ghost = farm.ghost;
  if (!ghost || !inGrid(ghost.gx, ghost.gy)) return;
  const { x, y } = tileCenter(ghost.gx, ghost.gy);
  const ok = ghost.ok;
  diamond(ctx, x, y, TILE_W, TILE_H);
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.35)' : 'rgba(232,79,51,0.35)';
  ctx.fill();
  ctx.strokeStyle = ok ? '#ffffff' : '#e84f33';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (ghost.kind && ghost.kind !== 'bulldoze') {
    ctx.globalAlpha = 0.75;
    const fake = { kind: ghost.kind, gx: ghost.gx, gy: ghost.gy, born: -99, state: 'grown', crop: { stage: 3, growth: 0, watered: false } };
    const painter = PAINTERS[ghost.kind];
    if (painter) painter(ctx, x, y, 1, fake, farm.time, 0);
    ctx.globalAlpha = 1;
  }
}

// --- Frame ---

export function drawFrame(ctx, farm, view) {
  const time = farm.time;
  const dusk = Math.max(0, Math.min(1, (farm.dayTime - 0.7) / 0.3));
  drawWater(ctx, time);
  drawIslandBase(ctx);
  for (let gy = 0; gy < GRID.rows; gy += 1) {
    for (let gx = 0; gx < GRID.cols; gx += 1) {
      const obj = farm.objects.get(`${gx},${gy}`);
      if (obj && obj.kind === 'pond') continue;
      drawTile(ctx, gx, gy, time);
    }
  }
  // Depth-sorted draw: objects and the farmer by (gx + gy).
  const drawables = [];
  for (const obj of farm.objects.values()) {
    drawables.push({ depth: obj.gx + obj.gy, obj });
  }
  const p = farm.player;
  drawables.push({ depth: p.gx + p.gy - 1, player: true });
  drawables.sort((a, b) => a.depth - b.depth);
  for (const d of drawables) {
    if (d.player) drawPlayer(ctx, farm, time);
    else drawObject(ctx, d.obj, time, dusk);
  }
  drawGhost(ctx, farm);
  drawButterflies(ctx, farm);
  drawParticles(ctx, farm);
  drawTexts(ctx, farm);
  if (view === 'play') drawPrompt(ctx, farm);

  if (dusk > 0) {
    ctx.fillStyle = `rgba(255,122,60,${dusk * 0.14})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  // Soft vignette.
  const vig = ctx.createRadialGradient(640, 360, 320, 640, 360, 760);
  vig.addColorStop(0, 'rgba(10,40,60,0)');
  vig.addColorStop(1, 'rgba(10,40,60,0.14)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

// --- Build-bar icons ---

export function drawObjectIcon(canvas, kind) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const fake = {
    kind, gx: 0, gy: 0, born: -99, state: 'grown',
    crop: { stage: 3, growth: 0, watered: false },
  };
  const painter = PAINTERS[kind];
  if (!painter) return;
  ctx.save();
  ctx.translate(w / 2, h - 8);
  ctx.scale(0.62, 0.62);
  painter(ctx, 0, 0, 1, fake, 1.2, 0);
  ctx.restore();
}
