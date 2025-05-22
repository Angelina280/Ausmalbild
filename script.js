const socket = new WebSocket('https://nosch.uber.space/web-rooms/');
let clientId = null;
let clientColor = getRandomColor();
let clientCount = 0;

const lineartCanvas = document.getElementById('lineart-layer');
const colorCanvas = document.getElementById('color-layer');
const clearBtn = document.getElementById('clear-btn');
const indexElem = document.getElementById('client-index');

const lineartCtx = lineartCanvas.getContext('2d');
const colorCtx = colorCanvas.getContext('2d');

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

function resizeCanvases() {
  [lineartCanvas, colorCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  drawLineart();
}

function drawLineart() {
  const ctx = lineartCtx;
  ctx.clearRect(0, 0, lineartCanvas.width, lineartCanvas.height);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;

  // Beispielzeichnung: Smiley
  ctx.beginPath();
  const cx = lineartCanvas.width / 2;
  const cy = lineartCanvas.height / 2;
  const r = 100;
  ctx.arc(cx, cy, r, 0, 2 * Math.PI); // Kopf
  ctx.moveTo(cx - 40, cy - 30); ctx.arc(cx - 40, cy - 30, 10, 0, 2 * Math.PI); // Auge links
  ctx.moveTo(cx + 40, cy - 30); ctx.arc(cx + 40, cy - 30, 10, 0, 2 * Math.PI); // Auge rechts
  ctx.moveTo(cx - 40, cy + 30); ctx.quadraticCurveTo(cx, cy + 60, cx + 40, cy + 30); // Mund
  ctx.stroke();
}

// Zeichnen
let isDrawing = false;
colorCanvas.addEventListener('pointerdown', (e) => {
  isDrawing = true;
  drawPoint(e);
});
colorCanvas.addEventListener('pointermove', (e) => {
  if (isDrawing) drawPoint(e);
});
colorCanvas.addEventListener('pointerup', () => isDrawing = false);
colorCanvas.addEventListener('pointercancel', () => isDrawing = false);

function drawPoint(e) {
  const x = e.clientX;
  const y = e.clientY;

  drawDot(colorCtx, x, y, clientColor);
  socket.send(JSON.stringify(['draw', clientId, x, y, clientColor]));
}

function drawDot(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.fill();
}

// Clear
clearBtn.addEventListener('click', () => {
  socket.send(JSON.stringify(['clear']));
  clearColors();
});

function clearColors() {
  colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
}

// WebSocket
socket.addEventListener('open', () => {
  socket.send(JSON.stringify(['*enter-room*', 'ausmalbild']));
  socket.send(JSON.stringify(['*subscribe-client-count*']));
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  const cmd = data[0];

  switch (cmd) {
    case '*client-id*':
      clientId = data[1];
      indexElem.innerText = `#${clientId}/${clientCount}`;
      break;
    case '*client-count*':
      clientCount = data[1];
      indexElem.innerText = `#${clientId}/${clientCount}`;
      break;
    case 'draw':
      const [_, id, x, y, color] = data;
      drawDot(colorCtx, x, y, color);
      break;
    case 'clear':
      clearColors();
      break;
  }
});

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 100%, 50%)`;
}


//test 
