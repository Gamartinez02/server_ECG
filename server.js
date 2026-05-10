const express = require("express");
const WebSocket = require("ws");
const app = express();

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Servidor ECG en puerto ${PORT}`));

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
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
  <h3 style="position:absolute; left:10px; z-index:10;">Monitor de Señal en Tiempo Real</h3>
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

  const socket = new WebSocket("wss://" + window.location.host);
  socket.binaryType = "arraybuffer";

  socket.onopen = () => console.log("✅ Conectado");
  
  socket.onmessage = (event) => {
    const rawData = new Uint16Array(event.data);
    for(let i=0; i < rawData.length; i++) {
      dataPoints[pointer] = rawData[i] * (3.3 / 4095);
      pointer = (pointer + 1) % bufferSize;
    }
  };

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for(let i=0; i < bufferSize; i++) {
      let x = i * (canvas.width / bufferSize);
      let idx = (pointer + i) % bufferSize;
      let y = canvas.height - (dataPoints[idx] / 3.3 * canvas.height);
      
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
