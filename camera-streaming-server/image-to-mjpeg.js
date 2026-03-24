const express = require('express');
const fs = require('fs');

const app = express();
const image = fs.readFileSync('./test-image.jpg');

app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache'
  });
  
  setInterval(() => {
    res.write(`--frame\r\nContent-Type: image/jpeg\r\n\r\n`);
    res.write(image);
    res.write('\r\n');
  }, 100);
});

app.listen(8081, () => console.log('✓ Serving test image on :8081/stream'));
