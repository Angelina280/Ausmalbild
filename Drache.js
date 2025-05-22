const socket = new WebSocket('https://nosch.uber.space/web-rooms/');
let clientId = null;
let selectedColor = "black";
let clientCount = 0;
let brushSize = 10; // Standard-Pinselgröße

// Farbauswahl
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedColor = btn.getAttribute("data-color");
  });
});

// Pinselgrößen-Slider
const brushSizeSlider = document.getElementById("brush-size");
brushSizeSlider.addEventListener("input", () => {
  brushSize = parseInt(brushSizeSlider.value, 10);
});

const lineartCanvas = document.getElementById('lineart-layer');
const colorCanvas = document.getElementById('color-layer');
const clearBtn = document.getElementById('clear-btn');
const indexElem = document.getElementById('client-index');

const lineartCtx = lineartCanvas.getContext('2d');
const colorCtx = colorCanvas.getContext('2d');

const lineartImage = new Image();
lineartImage.src = 'Drache.png';

lineartImage.onload = () => {
  resizeCanvases();
  drawLineart();
};

window.addEventListener('resize', () => {
  resizeCanvases();
  drawLineart();
});

function resizeCanvases() {
  [lineartCanvas, colorCanvas].forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function drawLineart() {
  lineartCtx.clearRect(0, 0, lineartCanvas.width, lineartCanvas.height);

  const canvasWidth = lineartCanvas.width;
  const canvasHeight = lineartCanvas.height;

  const imgRatio = lineartImage.width / lineartImage.height;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth, drawHeight;

  if (imgRatio > canvasRatio) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
  } else {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
  }

  const offsetX = (canvasWidth - drawWidth) / 2;
  const offsetY = (canvasHeight - drawHeight) / 2;

  lineartCtx.drawImage(lineartImage, offsetX, offsetY, drawWidth, drawHeight);
}

// Zeichnen
let isDrawing = false;
let lastX = 0;
let lastY = 0;

colorCanvas.addEventListener('pointerdown', (e) => {
  isDrawing = true;
  const rect = colorCanvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
});

colorCanvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  const rect = colorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  drawLine(colorCtx, lastX, lastY, x, y, selectedColor, brushSize);
  socket.send(JSON.stringify(['draw-line', clientId, lastX, lastY, x, y, selectedColor, brushSize]));

  lastX = x;
  lastY = y;
});

colorCanvas.addEventListener('pointerup', () => isDrawing = false);
colorCanvas.addEventListener('pointercancel', () => isDrawing = false);

function drawLine(ctx, x1, y1, x2, y2, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

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
      const [__, id, x1, y1, x2, y2, color, size] = data;
      drawLine(colorCtx, x1, y1, x2, y2, color, size || 10);
      break;
    case 'clear':
      clearColors();
      break;
  }
});
