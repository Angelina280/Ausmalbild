const socket = new WebSocket('https://nosch.uber.space/web-rooms/');
let clientId = null;
let selectedColor = "black";
let clientCount = 0;

document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedColor = btn.getAttribute("data-color");
  });
});

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

// Zeichnen mit Linie
let isDrawing = false;
let lastX = 0;
let lastY = 0;

colorCanvas.addEventListener('pointerdown', (e) => {
  isDrawing = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

colorCanvas.addEventListener('pointermove', (e) => {
  if (isDrawing) {
    drawLine(colorCtx, lastX, lastY, e.clientX, e.clientY, selectedColor);
    socket.send(JSON.stringify(['draw-line', clientId, lastX, lastY, e.clientX, e.clientY, selectedColor]));
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

colorCanvas.addEventListener('pointerup', () => isDrawing = false);
colorCanvas.addEventListener('pointercancel', () => isDrawing = false);

function drawLine(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
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
    case 'draw-line':
      const [__, id, x1, y1, x2, y2, color] = data;
      drawLine(colorCtx, x1, y1, x2, y2, color);
      break;
    case 'clear':
      clearColors();
      break;
  }
});
