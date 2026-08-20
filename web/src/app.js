const express = require('express');
const axios = require('axios'); // ספריה לביצוע בקשות HTTP
const path = require('path');
const app = express();

const BUILD_NUMBER = process.env.BUILD_NUMBER || 'local';
const COMMIT_SHA = process.env.COMMIT_SHA || 'local';
const API_URL = process.env.API_URL || 'http://localhost:4000'; // כתובת ה-API

app.use(express.static(path.join(__dirname, '../public'))); // הגדרת ספריית הקבצים הסטטיים

app.get('/api/excuses', async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/api/data`); // בקשה לנתיב /api/data של ה-API
    res.json({
        message: response.data.message,
        apiStatus: response.data.status,
        weBuild: BUILD_NUMBER,

    });
  } catch (error) {
    // מבחן החבלה -   טיפול בשגיאות במקרה שהבקשה ל-API נכשלת 
    res.status(500).json({
        error: 'System Failure: Could not connect to the API service.',
        details: error.message,
    });
  } 
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    build: BUILD_NUMBER, 
    commit: COMMIT_SHA 
  });
});

module.exports = app;