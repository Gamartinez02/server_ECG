const express = require("express");
const WebSocket = require("ws");
const app = express();

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Servidor ECG en puerto ${PORT}`));

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    // Retransmisión binaria eficiente a todos los navegadores conectados
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data); 
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<body style="background:#000; color:#0f0; font-family:monospace; overflow:hidden; margin:0;">
  <h3 style="position:absolute; left:10px; z-index:10;">Monitor de Señal en Tiempo Real (Simulación)</h3>
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
  let dataPoints = new Float32Array(bufferSize).fill(1.65); // Iniciar a nivel medio
  let pointer = 0;

  // Conexión forzada
  const socket = new WebSocket("wss://server-ecg.onrender.com");
  socket.binaryType = "arraybuffer";

  socket.onopen = () => console.log("✅ WebSocket Conectado");
  socket.onerror = (err) => console.error("❌ Error WS:", err);

  socket.onmessage = (event) => {
    const rawData = new Uint16Array(event.data);
    for(let i=0; i < rawData.length; i++) {
      // Normalización: 0-4095 a 0-3.3V
      dataPoints[pointer] = rawData[i] * (3.3 / 4095);
      pointer = (pointer + 1) % bufferSize;
    }
  };

  function draw() {
    // Fondo con persistencia leve para ver rastro
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 3; // Línea más gruesa para que sea visible
    ctx.beginPath();
    
    for(let i=0; i < bufferSize; i++) {
      let x = i * (canvas.width / bufferSize);
      let idx = (pointer + i) % bufferSize;
      
      // Mapeo: 3.3V es el tope del canvas, 0V es el fondo
      // Usamos un offset para centrar la señal si es necesario
      let y = canvas.height - (dataPoints[idx] / 3.3 * (canvas.height * 0.8) + (canvas.height * 0.1));
      
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
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
