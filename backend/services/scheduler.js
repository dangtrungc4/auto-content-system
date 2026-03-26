const cron = require('node-cron');
const googleSheets = require('./googleSheets');
const facebook = require('./facebook');
const images = require('./images');
const configService = require('./config');

let task = null;
let isJobRunning = false; // Used for cron job synchronization
let isWorkerRunning = false; // Used for background worker
let logs = [];
let stats = { posted: 0, failed: 0, pending: 0 };

// --- New State for Queue System ---
let pendingQueue = [];
let sessionPostCount = 0;
let lastPostTime = null;
const SESSION_LIMIT = { min: 5, max: 7 }; // Post 5-7 then rest
const SESSION_REST_MINUTES = { min: 10, max: 15 };
const NIGHT_MODE = { start: 23, end: 7 };

function addLog(type, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
    logs.unshift({ timestamp, type, message });
    if (logs.length > 100) logs.pop(); // keep last 100
}

// --- Helper Functions ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isNightTime() {
    const hour = new Date().getHours();
    return hour >= NIGHT_MODE.start || hour < NIGHT_MODE.end;
}

function calculateDelay(queueSize) {
    let baseMin, baseMax;
    
    if (queueSize <= 5) {
        baseMin = 5; baseMax = 10; // 5-10 mins
    } else if (queueSize <= 15) {
        baseMin = 3; baseMax = 5;  // 3-5 mins
    } else {
        baseMin = 1; baseMax = 3;  // 1-3 mins
    }
    
    // Convert to ms
    let delayMs = (Math.random() * (baseMax - baseMin) + baseMin) * 60 * 1000;
    
    // Randomization ±30-60s
    const randomOffset = (Math.random() * 30 + 30) * 1000 * (Math.random() > 0.5 ? 1 : -1);
    
    return Math.max(30000, delayMs + randomOffset); // Min 30s
}

async function worker() {
    if (isWorkerRunning) return;
    isWorkerRunning = true;
    addLog('info', 'Worker started processing queue...');

    while (pendingQueue.length > 0) {
        // 1. Check Night Mode
        if (isNightTime()) {
            addLog('info', 'Night mode active (23:00 - 07:00). Worker sleeping...');
            await sleep(15 * 60 * 1000); // Check again in 15 mins
            continue;
        }

        // 2. Check Session Rest
        if (sessionPostCount >= (Math.floor(Math.random() * (SESSION_LIMIT.max - SESSION_LIMIT.min + 1)) + SESSION_LIMIT.min)) {
            const restMins = Math.floor(Math.random() * (SESSION_REST_MINUTES.max - SESSION_REST_MINUTES.min + 1)) + SESSION_REST_MINUTES.min;
            addLog('info', `Session limit reached. Resting for ${restMins} minutes...`);
            await sleep(restMins * 60 * 1000);
            sessionPostCount = 0;
            continue;
        }

        // 3. Get next post
        const post = pendingQueue.shift();
        if (!post) continue;

        try {
            addLog('info', `Processing post from row ${post.rowIndex}...`);
            const config = configService.getConfig();
            
            // Fetch image if missing
            let imageUrl = post.imageUrl;
            if (!imageUrl && config.unsplashKey && post.topic) {
                imageUrl = await images.searchImage(post.topic);
                addLog('info', `Fetched image for topic "${post.topic}"`);
            }

            // Post to FB
            const fbResult = await facebook.postContent(post.caption, imageUrl);
            addLog('success', `Posted to Facebook successfully: Post ID ${fbResult.id}`);

            // Save to DB
            await configService.prisma.postRecord.create({
                data: {
                    fbPostId: fbResult.id,
                    caption: post.caption,
                    imageUrl: imageUrl
                }
            }).catch(e => console.error('Error saving post record:', e.message));

            // Update Sheet
            await googleSheets.updatePostStatus(post.rowIndex, 'Đã đăng');
            stats.posted++;
            sessionPostCount++;
            lastPostTime = new Date();

            // 4. Adaptive Delay
            if (pendingQueue.length > 0) {
                const delay = calculateDelay(pendingQueue.length);
                addLog('info', `Waiting ${Math.round(delay / 1000 / 60 * 10) / 10} minutes before next post (Queue: ${pendingQueue.length})`);
                await sleep(delay);
            }
        } catch (err) {
            addLog('error', `Failed to post row ${post.rowIndex}: ${err.message}`);
            await googleSheets.updatePostStatus(post.rowIndex, 'Lỗi');
            stats.failed++;
        }
    }

    addLog('info', 'Queue is empty. Worker stopping...');
    isWorkerRunning = false;
}

async function processPosts() {
    if (isJobRunning) {
        addLog('info', 'Sync job is already running, skipping...');
        return 'Skipped';
    }
    
    isJobRunning = true;
    try {
        addLog('info', 'Syncing pending posts from Google Sheets...');
        const config = configService.getConfig();
        
        if (!config.sheetId || !config.fbPageToken || !config.googleClientEmail) {
            throw new Error('Thiếu cấu hình (Sheet ID, FB Token hoặc Google Credentials).');
        }

        const pendingPosts = await googleSheets.getPendingPosts();
        
        // Add unique posts to queue
        let addedCount = 0;
        for (const post of pendingPosts) {
            const alreadyInQueue = pendingQueue.some(p => p.rowIndex === post.rowIndex);
            if (!alreadyInQueue) {
                pendingQueue.push(post);
                addedCount++;
            }
        }

        stats.pending = pendingQueue.length;
        if (addedCount > 0) {
            addLog('success', `Added ${addedCount} new posts to queue. Total in queue: ${pendingQueue.length}`);
            // Start worker if not running
            worker().catch(err => {
                addLog('error', `Worker error: ${err.message}`);
                isWorkerRunning = false;
            });
        } else {
            addLog('info', 'No new pending posts found.');
        }
        
        return `Queue updated. ${addedCount} new, ${pendingQueue.length} total.`;
    } catch (err) {
        addLog('error', `System error during sync: ${err.message}`);
        throw err;
    } finally {
        isJobRunning = false;
    }
}

module.exports = {
    start: () => {
        const schedule = configService.getConfig().cronSchedule;
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
