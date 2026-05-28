const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Fallback: serve index.html for any request
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TutorAgent server running at http://localhost:${PORT}`);
});
