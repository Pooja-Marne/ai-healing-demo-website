const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// SPA-style fallback isn't needed (every page is a real .html file), but
// keep unknown paths from 404ing into a blank page during the demo.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`AI Healing Demo static site running on port ${PORT}`);
});
