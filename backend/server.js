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
const images = require('./services/images');
const promptService = require('./services/prompt');
const promptSeeder = require('./services/promptSeeder');


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
        const response = await axios.get('https://graph.facebook.com/v20.0/me/accounts', {
            params: { access_token: userToken, fields: 'id,name,access_token,category' }
        });
        res.json({ success: true, pages: response.data.data });
    } catch (error) {
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        res.status(500).json({ success: false, error: errMsg });
    }
});

app.get('/api/facebook/debug-token', async (req, res) => {
    const { token, appId, appSecret } = req.query;
    if (!token) return res.status(400).json({ success: false, error: 'token is required' });
    try {
        const info = await fbService.debugToken(token, appId, appSecret);
        res.json({ success: true, info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── Tag CRUD Routes ──────────────────────────────────────────
app.get('/api/tags', async (req, res) => {
    try {
        const tags = await configService.prisma.tag.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { posts: true } } }
        });
        res.json({ success: true, tags });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/tags', async (req, res) => {
    try {
        const { name, color = '#3b82f6' } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Tên tag không được để trống.' });
        const tag = await configService.prisma.tag.create({ data: { name: name.trim(), color } });
        res.json({ success: true, tag });
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Tag đã tồn tại.' });
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/tags/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, color } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Tên tag không được để trống.' });
        const tag = await configService.prisma.tag.update({
            where: { id },
            data: { name: name.trim(), color }
        });
        res.json({ success: true, tag });
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Tag đã tồn tại.' });
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/tags/:id', async (req, res) => {
    try {
        await configService.prisma.tag.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/tags/:id/bulk-assign', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { assignAll } = req.body; 
        
        // Fetch posts that should be assigned
        const whereClause = assignAll ? {} : { tags: { none: {} } };
        const postsToAssign = await configService.prisma.post.findMany({ select: { id: true }, where: whereClause });
        
        if (postsToAssign.length === 0) {
           return res.json({ success: true, message: 'Không có bài báo nào để gán.', updatedCount: 0 });
        }

        // Connect these posts to the specific tag
        await configService.prisma.tag.update({
            where: { id },
            data: {
                posts: {
                    connect: postsToAssign.map(p => ({ id: p.id }))
                }
            }
        });

        res.json({ success: true, updatedCount: postsToAssign.length });
    } catch (err) {
        console.error('API Error [POST /api/tags/:id/bulk-assign]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Post Management Routes ────────────────────────────────────
app.get('/api/posts', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', authorId } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { content: { contains: search } },
                { caption: { contains: search } },
                { topic: { contains: search } },
                { hashtag: { contains: search } },
                { location: { contains: search } }
            ];
        }
        if (status) where.status = status;
        if (authorId) where.authorId = parseInt(authorId);

        const total = await configService.prisma.post.count({ where });
        const posts = await configService.prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            include: { tags: { select: { id: true, name: true, color: true } } }
        });

        res.json({ success: true, posts, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
    } catch (err) {
        console.error('API Error [GET /api/posts]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/posts/history', async (req, res) => {
    req.url = '/api/posts';
    return app._router.handle(req, res);
});

app.post('/api/posts', async (req, res) => {
    try {
        const { tagIds = [], ...rest } = req.body;
        const postData = { ...rest };
        delete postData.id;
        if (postData.scheduledAt) postData.scheduledAt = new Date(postData.scheduledAt);
        if (postData.publishedAt) postData.publishedAt = new Date(postData.publishedAt);
        if (postData.authorId) postData.authorId = parseInt(postData.authorId);
        if (postData.location) postData.location = postData.location.trim();
        if (!postData.caption && (postData.location || postData.title)) {
            postData.caption = `${postData.location || ''}\n${postData.title || ''}`.trim();
        }

        const post = await configService.prisma.post.create({
            data: {
                ...postData,
                status: postData.status || 'DRAFT',
                tags: tagIds.length ? { connect: tagIds.map(id => ({ id: Number(id) })) } : undefined
            },
            include: { tags: { select: { id: true, name: true, color: true } } }
        });
        res.json({ success: true, post });
    } catch (err) {
        console.error('API Error [POST /api/posts]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
        const post = await configService.prisma.post.findUnique({
            where: { id },
            include: { tags: { select: { id: true, name: true, color: true } } }
        });
        if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
        res.json({ success: true, post });
    } catch (err) {
        console.error('API Error [GET /api/posts/:id]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });

        const { tagIds, ...rest } = req.body;
        const postData = { ...rest };
        delete postData.id;
        delete postData.sheetRow;
        delete postData.tags; // Remove nested object if any
        if (postData.scheduledAt) postData.scheduledAt = new Date(postData.scheduledAt);
        if (postData.publishedAt) postData.publishedAt = new Date(postData.publishedAt);
        if (postData.authorId) postData.authorId = parseInt(postData.authorId);
        if (postData.location) postData.location = postData.location.trim();
        if (postData.likes) postData.likes = parseInt(postData.likes);
        if (postData.comments) postData.comments = parseInt(postData.comments);
        if (postData.shares) postData.shares = parseInt(postData.shares);
        if (!postData.caption && (postData.location || postData.title)) {
            postData.caption = `${postData.location || ''}\n${postData.title || ''}`.trim();
        }

        const updateData = { ...postData };
        if (Array.isArray(tagIds)) {
            updateData.tags = { set: tagIds.map(tid => ({ id: Number(tid) })) };
        }

        const post = await configService.prisma.post.update({
            where: { id },
            data: updateData,
            include: { tags: { select: { id: true, name: true, color: true } } }
        });

        if (post.status === 'SCHEDULED' || post.status === 'PUBLISHED') {
            try {
                const sheetData = {
                    date: post.scheduledAt ? post.scheduledAt.toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
                    time: post.scheduledAt ? post.scheduledAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '00:00',
                    topic: post.topic || post.location || '',
                    content: post.content || '',
                    caption: post.caption || '',
                    imageUrl: post.imageUrl || '',
                    hashtag: post.hashtag || '',
                    status: post.status === 'PUBLISHED' ? 'Đã đăng' : 'Chưa đăng'
                };
                if (post.sheetRow) await sheetService.updatePostRow(post.sheetRow, sheetData);
            } catch (sheetErr) {
                console.error('Error syncing to sheet on update:', sheetErr.message);
            }
        }

        res.json({ success: true, post });
    } catch (err) {
        console.error('API Error [PUT /api/posts/:id]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        await configService.prisma.post.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true, message: 'Post deleted successfully' });
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const data = await analyticsService.getTopPosts(page, limit);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/pending-posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await analyticsService.getPendingPosts(page, limit);
        res.json({ success: true, ...data });
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

app.post('/api/analytics/auto-sync/start', async (req, res) => {
    try {
        await configService.saveConfig({ isAutoSyncEnabled: true });
        analyticsService.startAutoSync();
        res.json({ success: true, isRunning: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/analytics/auto-sync/stop', async (req, res) => {
    try {
        await configService.saveConfig({ isAutoSyncEnabled: false });
        analyticsService.stopAutoSync();
        res.json({ success: true, isRunning: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Image search endpoint
app.get('/api/images/search', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, error: 'Query is required' });
    try {
        const imageUrl = await images.searchImage(query);
        res.json({ success: true, imageUrl });
    } catch (err) {

        res.status(500).json({ success: false, error: err.message });
    }
});

// Parse textarea content (No save)

app.post('/api/parse', async (req, res) => {
    const { text, imageUrl, priority } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Trường "text" không được để trống.' });
    }
    try {
        const data = await parseService.parseOnly(text.trim(), imageUrl, priority);
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


// AI Prompt Generator Routes
app.get('/api/prompt/library', async (req, res) => {
    try {
        const library = await promptService.getLibrary();
        res.json({ success: true, library });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/prompt/generate', async (req, res) => {
    try {
        const { subject, keywords, aspectRatio, negativePrompt } = req.body;
        
        // Auto-translate subject if it contains non-English characters (basic check)
        const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(subject);
        let finalSubject = subject;
        if (isVietnamese) {
            finalSubject = await promptService.translateToEnglish(subject);
        }

        const prompt = promptService.generatePrompt({ 
            subject: finalSubject, 
            keywords, 
            aspectRatio, 
            negativePrompt 
        });

        // Save to history
        await promptService.saveToHistory(prompt);

        res.json({ success: true, prompt, translatedSubject: isVietnamese ? finalSubject : null });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/prompt/history', async (req, res) => {
    try {
        const history = await configService.prisma.promptHistory.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/prompt/seed', async (req, res) => {
    try {
        await promptSeeder.seedKeywords();
        res.json({ success: true, message: 'Library seeded successfully' });
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
    if (config.fbPageToken && config.isAutoSyncEnabled) {
        analyticsService.startAutoSync();
    }
});
