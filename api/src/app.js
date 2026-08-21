const express = require('express');
const app = express();

const BUILD_NUMBER = process.env.BUILD_NUMBER || 'local';
const COMMIT_SHA = process.env.COMMIT_SHA || 'local';

const excuses = [
  "I forgot to commit my changes.",
  "The server was down.",
  "It worked on my machine (in the Docker container)!",
  "Jenkins is tired, give it a coffee.",
  "Someone deleted the production database... again.",
  "It's not a bug, it's an undocumented feature.",
  "The network is slow because of solar flares.",
  "I was too busy to commit."
];

app.get('/api/data', (req, res) => {
  const randomIndex = Math.floor(Math.random() * excuses.length);  
  res.json({ 
    message: excuses[randomIndex],
    status: 'authenticated',
    timestamp: new Date()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    build: BUILD_NUMBER, 
    commit: COMMIT_SHA 
    });
});

// ====== חבלה מכוונת לצורך מבחן הכיסוי (מבחן החבלה) ======
app.get('/api/dead-route-1', (req, res) => {
    const data = "test";
    if (data === "ready") {
        console.log("Not covered");
    } else {
        console.log("Still not covered");
    }
    res.json({ message: 'Dead code 1' });
});

app.get('/api/dead-route-2', (req, res) => {
    try {
        for (let i = 0; i < 10; i++) {
            console.log("Looping through uncovered code: " + i);
        }
    } catch (e) {
        console.error(e);
    }
    res.json({ message: 'Dead code 2' });
});

app.get('/api/dead-route-3', (req, res) => {
    res.json({ message: 'Dead code 3' });
});
// ========================================================


module.exports = app;