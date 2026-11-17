// Keyboard and mouse state for Briarfield. The game loop reads this each
// frame; clicks are queued so none is lost between frames.

export const keys = new Set();
export const mouse = { x: -100, y: -100, inside: false };
export const clickQueue = [];
export const rightClickQueue = [];

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function initInput(canvas, callbacks) {
  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (action) {
      keys.add(action);
      event.preventDefault();
    }
    if (callbacks.onKey) callbacks.onKey(event.code, event);
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) keys.delete(action);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    // Round to whole canvas pixels: the scale division can land a
    // fraction below an integer (252.99999999999997), and a tile centre
    // sits exactly on a grid boundary, so an unrounded value can push a
    // top-row click to grid row -1 and silently drop it.
    mouse.x = Math.round(((event.clientX - rect.left) / rect.width) * canvas.width);
    mouse.y = Math.round(((event.clientY - rect.top) / rect.height) * canvas.height);
    mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * canvas.height);
    if (event.button === 0) clickQueue.push({ x, y });
    else if (event.button === 2) rightClickQueue.push({ x, y });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

export function axisInput() {
  let x = 0;
  let y = 0;
  if (keys.has('left')) x -= 1;
  if (keys.has('right')) x += 1;
  if (keys.has('up')) y -= 1;
  if (keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}
