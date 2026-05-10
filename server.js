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
  <h3 style="position:absolute; left:10px;">Monitor de Señal en Tiempo Real</h3>
  <canvas id="scope"></canvas>
<script>
  const canvas = document.getElementById("scope");
  const ctx = canvas.getContext("2d");
  
  // Ajustar canvas al tamaño de la ventana
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.onresize = resize;
  resize();

  const bufferSize = 2000; 
  let dataPoints = new Float32Array(bufferSize).fill(2048 * (3.3/4095)); // Iniciar a la mitad
  let pointer = 0;

  // Forzar WSS usando la URL absoluta de Render
  const socket = new WebSocket("wss://server-ecg.onrender.com");
  socket.binaryType = "arraybuffer";

  socket.onopen = () => console.log("✅ Conexión establecida");
  socket.onmessage = (event) => {
    const rawData = new Uint16Array(event.data);
    for(let i=0; i < rawData.length; i++) {
      dataPoints[pointer] = rawData[i] * (3.3 / 4095);
      pointer = (pointer + 1) % bufferSize;
    }
  };

  function draw() {
    // Fondo con persistencia leve
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for(let i=0; i < bufferSize; i++) {
      let x = i * (canvas.width / bufferSize);
      let idx = (pointer + i) % bufferSize;
      
      // ESCALA: Si la señal es muy pequeña, multiplica por un factor (ej. 1.5)
      // Restamos de canvas.height porque el eje Y en canvas empieza arriba
      let valNormalizado = dataPoints[idx] / 3.3; 
      let y = canvas.height - (valNormalizado * canvas.height);
      
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    requestAnimationFrame(draw);
  }
  draw();
</script>


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
