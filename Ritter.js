let selectedColor = "black";
let clientCount = 0;
let brushSize = 10;

let roomName = 'Ritter';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null;

let imageOffsetX = 0;
let imageOffsetY = 0;
let imageDrawWidth = 0;
let imageDrawHeight = 0;

const lineartCanvas = document.getElementById('lineart-layer');
const colorCanvas = document.getElementById('color-layer');
const clearBtn = document.getElementById('clear-btn');
const indexElem = document.getElementById('client-index');

const lineartCtx = lineartCanvas.getContext('2d');
const colorCtx = colorCanvas.getContext('2d');

// Farbauswahl
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedColor = btn.getAttribute("data-color");
  });
});

// Pinselgröße
const brushSizeSlider = document.getElementById("brush-size");
brushSizeSlider.addEventListener("input", () => {
  brushSize = parseInt(brushSizeSlider.value, 10);
});

// Lineart-Bild
const lineartImage = new Image();
lineartImage.src = 'Ritter.png';
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
  const cw = lineartCanvas.width;
  const ch = lineartCanvas.height;
  const ratio = lineartImage.width / lineartImage.height;
  const canvasRatio = cw / ch;

  let dw, dh;
  if (ratio > canvasRatio) {
    dw = cw;
    dh = cw / ratio;
  } else {
    dh = ch;
    dw = ch * ratio;
  }

const offsetX = (cw - dw) / 2;
const offsetY = (ch - dh) / 2;

imageOffsetX = offsetX;
imageOffsetY = offsetY;
imageDrawWidth = dw;
imageDrawHeight = dh;

  lineartCtx.clearRect(0, 0, cw, ch);
  lineartCtx.drawImage(lineartImage, offsetX, offsetY, dw, dh);
}

// Zeichnen
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function getPointerPosition(e) {
  const rect = colorCanvas.getBoundingClientRect();
  let x, y;
  if (e.touches) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  return { x, y };
}

function startDrawing(e) {
  isDrawing = true;
  const pos = getPointerPosition(e);
  lastX = pos.x;
  lastY = pos.y;
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPointerPosition(e);

  const relX1 = lastX / colorCanvas.width;
  const relY1 = lastY / colorCanvas.height;
  const relX2 = pos.x / colorCanvas.width;
  const relY2 = pos.y / colorCanvas.height;

  drawLine(colorCtx, lastX, lastY, pos.x, pos.y, selectedColor, brushSize);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify([
      '*broadcast-message*',
      [
        'draw-line',
        clientId,
        relX1, relY1, relX2, relY2,
        selectedColor,
        brushSize
      ]
    ]));
  }

  lastX = pos.x;
  lastY = pos.y;
}

function stopDrawing() {
  isDrawing = false;
}

colorCanvas.addEventListener('pointerdown', startDrawing);
colorCanvas.addEventListener('pointermove', draw);
colorCanvas.addEventListener('pointerup', stopDrawing);
colorCanvas.addEventListener('pointercancel', stopDrawing);
colorCanvas.addEventListener('pointerout', stopDrawing);

// Linie zeichnen
function drawLine(ctx, x1, y1, x2, y2, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Löschen
clearBtn.addEventListener('click', () => {
  clearColors();
  socket.send(JSON.stringify(['clear']));
});

function clearColors() {
  colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
}

// WebSocket-Setup
socket.addEventListener('open', () => {
  socket.send(JSON.stringify(['*enter-room*', roomName]));
  socket.send(JSON.stringify(['*subscribe-client-count*']));
  setInterval(() => socket.send(''), 30000); // Keep alive
  console.log("✅ WebSocket verbunden");
});

socket.addEventListener('message', (event) => {
  if (!event.data) return;
  const data = JSON.parse(event.data);
  const cmd = data[0];
  console.log("📩 Empfangen:", data);

  switch (cmd) {
    case '*client-id*':
      clientId = data[1];
      indexElem.innerText = `#${clientId}/${clientCount}`;
      break;
    case '*client-count*':
      clientCount = data[1];
      indexElem.innerText = `#${clientId}/${clientCount}`;
      break;
    case 'draw-line': {
      const [__, id, x1, y1, x2, y2, color, size] = data;
      if (id !== clientId) {
        drawLine(
          colorCtx,
          x1 * imageDrawWidth + imageOffsetX,
          y1 * imageDrawHeight + imageOffsetY,
          x2 * imageDrawWidth + imageOffsetX,
          y2 * imageDrawHeight + imageOffsetY,
          color,
          size || 10
        );
      }
      break;
    }
    case 'clear':
      clearColors();
      break;
    case 'error':
      console.warn('⚠️ Serverfehler:', data[1]);
      break;
  }
});
