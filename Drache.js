let selectedColor = "black";
let clientCount = 0;
let brushSize = 10; // Standard-Pinselgröße

let roomName = 'Drache';
let serverURL = 'wss://nosch.uber.space/web-rooms/';
let socket = new WebSocket(serverURL);
let clientId = null;

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

// Zeichnen (mit Touch-Support)
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Touch-Events verhindern Scrollen/Zoom auf Canvas
['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(event => {
  colorCanvas.addEventListener(event, e => e.preventDefault(), { passive: false });
});

// Position aus Maus/Touch ermitteln
function getPointerPosition(e) {
  const rect = colorCanvas.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches[0]) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
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
  drawLine(colorCtx, lastX, lastY, pos.x, pos.y, selectedColor, brushSize);
  socket.send(JSON.stringify(['draw-line', clientId, lastX, lastY, pos.x, pos.y, selectedColor, brushSize]));
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

// WebSocket öffnen
socket.addEventListener('open', () => {
  socket.send(JSON.stringify(['*enter-room*', 'Drache']));
  socket.send(JSON.stringify(['*subscribe-client-count*']));
  // ggf. weitere Subscriptions
  setInterval(() => socket.send(''), 30000); // Verbindung halten
});

// Zentraler Nachrichten-Handler
socket.addEventListener('message', (event) => {
  if (!event.data) return;
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
    case 'draw-line': {
      const [__, id, x1, y1, x2, y2, color, size] = data;
      if (id !== clientId) { // Nur Linien der anderen Spieler zeichnen
        drawLine(colorCtx, x1, y1, x2, y2, color, size || 10);
      }
      break;
    }
    case 'clear':
      clearColors();
      break;
    // Weitere Fälle aus deinem Multiplayer-Code:
    case 'client-id':
      clientId = data[1];
      player.id = clientId;
      sendMessage('broadcast-message', ['position', player]);
      draw();
      break;
    case 'position': {
      const other = data[1];
      if (other.id !== clientId) {
        if (!otherPlayers[other.id]) {
          otherPlayers[other.id] = other;
        } else {
          otherPlayers[other.id].direction = other.direction;
          otherPlayers[other.id].body[0] = other.body[0];
        }
      }
      break;
    }
    case 'client-exit': {
      const leftId = data[1];
      delete otherPlayers[leftId];
      break;
    }
    case 'error':
      console.warn('Server error:', data[1]);
      break;
  }
});

//Nachricht an Server
function sendMessage(...msg) {
  socket.send(JSON.stringify(msg));
  console.log("Message vom Server gesendet:", msg);
}