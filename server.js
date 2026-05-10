const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({
  server
});

console.log("Iniciando servidor...");

wss.on("connection", (ws, req) => {

  console.log("Nuevo cliente conectado");

  ws.on("message", (data) => {

    console.log("Paquete recibido:", data.length, "bytes");

    // Reenviar a TODOS los clientes conectados
    wss.clients.forEach(client => {

      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }

    });

  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
  });

  ws.on("error", (err) => {
    console.log("WS Error:", err.message);
  });

});

app.get("/", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Monitor ECG</title>
</head>

<body style="
  margin:0;
  overflow:hidden;
  background:black;
  color:#00ff00;
  font-family:monospace;
">

<h2 style="
  position:absolute;
  left:15px;
  top:10px;
  z-index:10;
">
ECG Tiempo Real
</h2>

<canvas id="scope"></canvas>

<script>

const canvas = document.getElementById("scope");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.onresize = resize;
resize();

const bufferSize = 2000;

let dataPoints = new Float32Array(bufferSize).fill(1.65);

let pointer = 0;

const protocol = location.protocol === "https:" ? "wss://" : "ws://";

const socket = new WebSocket(protocol + window.location.host);

socket.binaryType = "arraybuffer";

socket.onopen = () => {
  console.log("WS conectado");
};

socket.onerror = (e) => {
  console.log("WS error", e);
};

socket.onclose = () => {
  console.log("WS cerrado");
};

socket.onmessage = (event) => {

  console.log("Paquete recibido");

  const rawData = new Uint16Array(event.data);

  for(let i = 0; i < rawData.length; i++) {

    dataPoints[pointer] = rawData[i] * (3.3 / 4095);

    pointer = (pointer + 1) % bufferSize;
  }
};

function drawGrid() {

  ctx.strokeStyle = "rgba(0,255,0,0.08)";
  ctx.lineWidth = 1;

  const grid = 50;

  for(let x = 0; x < canvas.width; x += grid) {

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for(let y = 0; y < canvas.height; y += grid) {

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function draw() {

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;

  ctx.beginPath();

  for(let i = 0; i < bufferSize; i++) {

    const idx = (pointer + i) % bufferSize;

    const x = i * (canvas.width / bufferSize);

    const y = canvas.height -
      ((dataPoints[idx] / 3.3) * canvas.height);

    if(i === 0)
      ctx.moveTo(x, y);
    else
      ctx.lineTo(x, y);
  }

  ctx.stroke();

  requestAnimationFrame(draw);
}

draw();

</script>

</body>
</html>
`);

});

server.listen(PORT, () => {
  console.log("Servidor ejecutándose en puerto", PORT);
});
