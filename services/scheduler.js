const cron = require('node-cron');
const googleSheets = require('./googleSheets');
const facebook = require('./facebook');
const images = require('./images');
const configService = require('./config');

let task = null;
let isJobRunning = false;
let logs = [];
let stats = { posted: 0, failed: 0, pending: 0 };

function addLog(type, message) {
    const timestamp = new Date().toISOString();
    logs.unshift({ timestamp, type, message });
    if (logs.length > 100) logs.pop(); // keep last 100
}

async function processPosts() {
    if (isJobRunning) {
        addLog('info', 'Job is already running, skipping this tick...');
        return 'Skipped';
    }
    
    isJobRunning = true;
    try {
        addLog('info', 'Starting scheduled post check...');
        const config = configService.getConfig();
        
        if (!config.sheetId || !config.fbPageToken || !config.googleClientEmail) {
            throw new Error('Thiếu cấu hình (Sheet ID, FB Token hoặc Google Credentials).');
        }

        const pendingPosts = await googleSheets.getPendingPosts();
        stats.pending = pendingPosts.length;
        addLog('success', `Found ${pendingPosts.length} pending posts matching criteria.`);

        let processedCount = 0;
        for (const post of pendingPosts) {
            try {
                // 1. Fetch image if image URL is missing but Unsplash key is configured
                let imageUrl = post.imageUrl;
                if (!imageUrl && config.unsplashKey && post.topic) {
                    imageUrl = await images.searchImage(post.topic);
                    addLog('info', `Fetched image for topic "${post.topic}"`);
                }

                // 2. Post to FB
                const fbResult = await facebook.postContent(post.caption, imageUrl);
                addLog('success', `Posted to Facebook successfully: Post ID ${fbResult.id}`);

                // 3. Update Sheet
                await googleSheets.updatePostStatus(post.rowIndex, 'Đã đăng');
                stats.posted++;
                processedCount++;
            } catch (err) {
                addLog('error', `Failed to post row ${post.rowIndex}: ${err.message}`);
                await googleSheets.updatePostStatus(post.rowIndex, 'Lỗi');
                stats.failed++;
            }
        }
        
        return `Processed ${processedCount} posts.`;
    } catch (err) {
        addLog('error', `System error: ${err.message}`);
        throw err;
    } finally {
        isJobRunning = false;
    }
}

module.exports = {
    start: () => {
        const schedule = configService.getConfig().cronSchedule || '*/5 * * * *';
        if (task) {
            task.stop();
        }
        task = cron.schedule(schedule, processPosts);
        addLog('info', `Scheduler started with pattern: ${schedule}`);
    },
    stop: () => {
        if (task) {
            task.stop();
            task = null;
            addLog('info', 'Scheduler stopped.');
        }
    },
    isRunning: () => task !== null,
    runNow: async () => {
        return await processPosts();
    },
    getLogs: () => logs,
    getStats: () => stats
};
