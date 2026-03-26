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
        const { page = 1, limit = 9, search = '', status = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const where = {};
        if (search) {
            where.caption = { contains: search };
        }
        if (status) {
            where.status = status;
        }

        const countQuery = Object.keys(where).length > 0 ? { where } : undefined;
        const total = await configService.prisma.postRecord.count(countQuery);

        const history = await configService.prisma.postRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum
        });

        res.json({ 
            success: true, 
            history, 
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
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

app.get('/api/analytics/auto-sync-status', (req, res) => {
    res.json({ success: true, isRunning: analyticsService.isAutoSyncRunning() });
});

app.post('/api/analytics/auto-sync/start', (req, res) => {
    analyticsService.startAutoSync();
    res.json({ success: true, isRunning: true });
});

app.post('/api/analytics/auto-sync/stop', (req, res) => {
    analyticsService.stopAutoSync();
    res.json({ success: true, isRunning: false });
});

// Parse textarea content (No save)
app.post('/api/parse', async (req, res) => {
    const { text, imageUrl } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Trường "text" không được để trống.' });
    }
    try {
        const data = await parseService.parseOnly(text.trim(), imageUrl);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Save parsed data to Google Sheet
app.post('/api/save', async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.caption) {
            return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ.' });
        }
        const result = await parseService.saveToSheet(data);
        res.json({ success: true, result });
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
    if (config.fbPageToken) {
        analyticsService.startAutoSync();
    }
});
