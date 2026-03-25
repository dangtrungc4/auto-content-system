const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const configService = require('./services/config');
const schedulerService = require('./services/scheduler');
const sheetService = require('./services/googleSheets');
const fbService = require('./services/facebook');
const analyticsService = require('./services/analytics');
const parseService = require('./services/parse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/config', (req, res) => {
    res.json(configService.getConfig());
});

app.post('/api/config', async (req, res) => {
    try {
        const newConfig = req.body;
        await configService.saveConfig(newConfig);
        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        isRunning: schedulerService.isRunning(),
        logs: schedulerService.getLogs(),
        stats: schedulerService.getStats()
    });
});

app.post('/api/scheduler/start', (req, res) => {
    schedulerService.start();
    res.json({ success: true, isRunning: true });
});

app.post('/api/scheduler/stop', (req, res) => {
    schedulerService.stop();
    res.json({ success: true, isRunning: false });
});

app.post('/api/run-now', async (req, res) => {
    try {
        const result = await schedulerService.runNow();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fetch Facebook Pages list using User Token
app.get('/api/facebook/pages', async (req, res) => {
    const { userToken } = req.query;
    if (!userToken) {
        return res.status(400).json({ success: false, error: 'userToken query param is required' });
    }
    try {
        const response = await axios.get('https://graph.facebook.com/v25.0/me/accounts', {
            params: { access_token: userToken, fields: 'id,name,access_token,category' }
        });
        res.json({ success: true, pages: response.data.data });
    } catch (error) {
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        res.status(500).json({ success: false, error: errMsg });
    }
});

app.get('/api/posts/history', async (req, res) => {
    try {
        const history = await configService.prisma.postRecord.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Analytics routes
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const stats = await analyticsService.getSummaryStats();
        res.json({ success: true, ...stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/chart', async (req, res) => {
    const { period = 'day', limit = 30 } = req.query;
    try {
        const data = await analyticsService.getPostsByPeriod(period, parseInt(limit));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/top-posts', async (req, res) => {
    try {
        const posts = await analyticsService.getTopPosts(5);
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/analytics/sync-engagement', async (req, res) => {
    try {
        await analyticsService.syncEngagement();
        res.json({ success: true, message: 'Engagement synced' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Parse textarea content → Google Sheet
app.post('/api/parse', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Trường "text" không được để trống.' });
    }
    try {
        const data = await parseService.parseAndSave(text.trim());
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Auto start scheduler if config exists
    await configService.loadConfig();
    const config = configService.getConfig();
    if (config.sheetId && config.fbPageToken) {
        schedulerService.start();
    }
});
