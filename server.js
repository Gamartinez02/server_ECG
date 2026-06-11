const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ server });

console.log("Iniciando servidor...");

wss.on("connection", (ws, req) => {
  console.log("Nuevo cliente conectado");

  ws.on("message", (data) => {
    // Reenviar en formato binario a todos los clientes conectados
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on("close", () => console.log("Cliente desconectado"));
  ws.on("error", (err) => console.log("WS Error:", err.message));
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Monitor ECG Profesional</title>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      background-color: #1a1a1a;
      color: #00e676;
      font-family: 'Courier New', Courier, monospace;
      user-select: none;
    }
    h2 {
      position: absolute;
      left: 20px;
      top: 15px;
      z-index: 10;
      margin: 0;
      font-size: 1.2rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.85;
      text-shadow: 0 0 10px rgba(0, 230, 118, 0.2);
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>

  <h2>ECG Tiempo Real</h2>
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

  // El buffer ahora coincide idealmente con la resolución horizontal para un mapeo 1:1 o escalado suave
  const bufferSize = 2500; 
  let dataPoints = new Float32Array(bufferSize).fill(1.65);
  let pointer = 0;

  const protocol = location.protocol === "https:" ? "wss://" : "ws://";
  const socket = new WebSocket(protocol + window.location.host);
  socket.binaryType = "arraybuffer";

  socket.onmessage = (event) => {
    const rawData = new Uint16Array(event.data);
    for(let i = 0; i < rawData.length; i++) {
      // Conversión analógica digital directa (0 - 3.3V)
      dataPoints[pointer] = rawData[i] * (3.3 / 4095);
      pointer = (pointer + 1) % bufferSize;
    }
  };

  function drawGrid() {
    ctx.strokeStyle = "rgba(0, 230, 118, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;

    // Líneas verticales
    for(let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Líneas horizontales
    for(let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function draw() {
    // Fondo plano sólido para evitar el rastro borroso distractor anterior
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // Configuración estética del trazo clínico
    ctx.strokeStyle = "#00e676"; 
    ctx.lineWidth = 2.5;         
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    
    // Sutil efecto de brillo electrónico de fósforo
    ctx.shadowColor = "rgba(0, 230, 118, 0.4)";
    ctx.shadowBlur = 8;

    ctx.beginPath();

    // El índice actual del puntero representa el "ahora". 
    // Dibujamos de forma lineal mapeando el buffer circular a la pantalla estática
    for(let i = 0; i < bufferSize; i++) {
      const x = i * (canvas.width / bufferSize);
      
      // Amplitud centrada verticalmente con márgenes simétricos
      const volt = dataPoints[i];
      const y = canvas.height - ((volt / 3.3) * (canvas.height * 0.7) + (canvas.height * 0.15));

      // Reemplazo del salto brusco por una barra de borrado sutil (efecto barrido osciloscopio)
      const distanceToPointer = Math.abs(i - pointer);
      if (i === 0 || distanceToPointer === 0) {
        ctx.moveTo(x, y);
      } else if (distanceToPointer > 30) { 
        // Solo dibuja si no está inmediatamente cerca del puntero de escritura actual
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Resetear sombras para optimizar rendimiento de otros elementos
    ctx.shadowBlur = 0; 

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
