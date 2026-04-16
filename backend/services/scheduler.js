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
            addLog('info', `Processing post: ${post.title || post.caption || 'No Title'}...`);
            const config = configService.getConfig();
            
            // Tự động tìm ảnh nếu trống
            let imageUrl = post.imageUrl;
            if (!imageUrl && config.unsplashKey) {
                // Ưu tiên Topic, nếu không có Topic dùng dòng đầu của Caption (giống parse.js)
                const searchQuery = post.title || post.caption.split('\n')[1] || post.topic;
                if (searchQuery) {
                    imageUrl = await images.searchImage(searchQuery);
                    if (imageUrl) addLog('info', `Fetched image for query: "${searchQuery.split('\n')[0]}"`);
                }
            }

            // Ghép nội dung theo format mới: [ Địa điểm • Ngày ] → "Tên bài" → Nội dung → #hashtag
            const locationPart = post.location;
            const titlePart = post.title ? `${post.title}` : '';
            
            let finalCaption = locationPart;
            if (titlePart) finalCaption += '\n' + titlePart;
            if (post.content) finalCaption += '\n\n' + post.content;
            if (post.hashtag) finalCaption += '\n\n' + post.hashtag;


            // Post to FB
            const fbResult = await facebook.postContent(finalCaption, imageUrl);


            addLog('success', `Posted to Facebook successfully: Post ID ${fbResult.id}`);

            // Update DB record
            if (post.id) {
                await configService.prisma.post.update({
                    where: { id: post.id },
                    data: {
                        fbPostId: fbResult.post_id || fbResult.id,
                        status: 'PUBLISHED',
                        publishedAt: new Date(),
                        imageUrl: imageUrl // Store the used image URL
                    }
                });
            } else {
                // For posts that came from Sheets but not yet in DB
                await configService.prisma.post.create({
                    data: {
                        fbPostId: fbResult.post_id || fbResult.id,
                        title: post.title,
                        content: post.content,
                        caption: post.caption,
                        topic: post.topic,
                        hashtag: post.hashtag,
                        imageUrl: imageUrl,
                        status: 'PUBLISHED',
                        publishedAt: new Date()
                    }
                }).catch(e => console.error('Error saving post record:', e.message));
            }



            // Update Sheet if it came from a sheet row
            if (post.rowIndex) {
                await googleSheets.updatePostStatus(post.rowIndex, 'Đã đăng');
            }
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
            addLog('error', `Failed to post ${post.id || 'row ' + post.rowIndex}: ${err.message}`);
            if (post.id) {
                await configService.prisma.post.update({
                    where: { id: post.id },
                    data: { status: 'FAILED' }
                });
            }
            if (post.rowIndex) {
                await googleSheets.updatePostStatus(post.rowIndex, 'Lỗi');
            }
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
        addLog('info', 'Syncing pending posts...');
        const config = configService.getConfig();
        
        if (!config.sheetId || !config.fbPageToken || !config.googleClientEmail) {
            throw new Error('Thiếu cấu hình (Sheet ID, FB Token hoặc Google Credentials).');
        }

        // 1. Get from Database (New)
        const dbPendingPosts = await configService.prisma.post.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { lte: new Date() }
            }
        });

        // 2. Get from Google Sheets (Existing)
        const sheetPendingPosts = await googleSheets.getPendingPosts();
        
        // Add unique posts to queue
        let addedCount = 0;
        const currentCaptions = new Set(pendingQueue.map(p => p.caption || p.title));
        
        // Add DB posts (Ưu tiên Database hơn)
        for (const post of dbPendingPosts) {
            const alreadyInQueue = pendingQueue.some(p => p.id === post.id);
            if (!alreadyInQueue) {
                pendingQueue.push(post);
                currentCaptions.add(post.caption || post.title);
                addedCount++;
            }
        }

        // Add Sheet posts (Chỉ thêm nếu chưa có trong Database đang chờ đăng)
        for (const post of sheetPendingPosts) {
            const isDuplicate = currentCaptions.has(post.caption || post.title);
            const alreadyInQueue = pendingQueue.some(p => p.rowIndex === post.rowIndex);
            
            if (!alreadyInQueue && !isDuplicate) {
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
