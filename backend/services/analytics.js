const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();
const configService = require('./config');
const cron = require('node-cron');

/**
 * Fetch engagement (likes, comments, shares) from Facebook Graph API for a post
 */
async function fetchFbEngagement(fbPostId) {
    if (!fbPostId) return { likes: 0, comments: 0, shares: 0 };
    const config = configService.getConfig();
    if (!config.fbPageToken) return { likes: 0, comments: 0, shares: 0 };
    try {
        // Dùng định dạng {page_id}_{post_id} để truy cập được toàn bộ Post object
        const fullPostId = `${config.fbPageId}_${fbPostId}`;
        
        // Dùng fields để lấy reactions, comments và shares trong cùng 1 request
        const res = await axios.get(`https://graph.facebook.com/v25.0/${fullPostId}`, {
            params: {
                fields: 'reactions.summary(total_count),comments.summary(total_count),shares',
                access_token: config.fbPageToken
            }
        });
        
        const data = res.data;
        return {
            likes: data.reactions?.summary?.total_count || 0,
            comments: data.comments?.summary?.total_count || 0,
            shares: data.shares?.count || 0
        };
    } catch (error) {
        console.error(`FB Engagement Fetch Error [${fbPostId}]:`, error.response?.data || error.message);
        return { likes: 0, comments: 0, shares: 0 };
    }
}

/**
 * Fetch Page stats (followers_count, fan_count)
 */
async function fetchPageStats() {
    const config = configService.getConfig();
    if (!config.fbPageToken || !config.fbPageId) return { followersCount: 0, fanCount: 0 };
    try {
        const res = await axios.get(`https://graph.facebook.com/v25.0/${config.fbPageId}`, {
            params: {
                fields: 'followers_count,fan_count',
                access_token: config.fbPageToken
            }
        });
        return {
            followersCount: res.data.followers_count || 0,
            fanCount: res.data.fan_count || 0
        };
    } catch (error) {
        console.error(`FB Page Stats Fetch Error:`, error.response?.data || error.message);
        return { followersCount: 0, fanCount: 0 };
    }
}

/**
 * Sync engagement for all posts (run periodically)
 */
async function syncEngagement() {
    const posts = await prisma.post.findMany({ 
        where: { status: 'PUBLISHED' },
        select: { id: true, fbPostId: true } 
    });
    for (const post of posts) {
        if (!post.fbPostId) continue;
        const engagement = await fetchFbEngagement(post.fbPostId);
        await prisma.post.update({
            where: { id: post.id },
            data: engagement
        });
    }
}

/**
 * Get summary stats
 */
async function getSummaryStats() {
    const total = await prisma.post.count({ where: { status: 'PUBLISHED' } });
    const published = total;
    const failed = await prisma.post.count({ where: { status: 'FAILED' } });

    const agg = await prisma.post.aggregate({
        where: { status: 'PUBLISHED' },
        _sum: { likes: true, comments: true, shares: true }
    });

    const pageStats = await fetchPageStats();

    return {
        total,
        published,
        failed,
        totalLikes: agg._sum.likes || 0,
        totalComments: agg._sum.comments || 0,
        totalShares: agg._sum.shares || 0,
        ...pageStats
    };
}

/**
 * Get posts grouped by day (for chart)
 * Returns array of { date: 'YYYY-MM-DD', count: N, likes: N, comments: N, shares: N }
 */
async function getPostsByPeriod(period = 'day', limit = 30) {
    let dateFormat;
    if (period === 'week') {
        dateFormat = '%Y-W%u'; // ISO week
    } else if (period === 'month') {
        dateFormat = '%Y-%m';
    } else {
        dateFormat = '%Y-%m-%d';
    }

    const rows = await prisma.$queryRaw`
        SELECT 
            DATE_FORMAT(createdAt, ${dateFormat}) as period,
            COUNT(*) as count,
            SUM(likes) as likes,
            SUM(comments) as comments,
            SUM(shares) as shares
        FROM posts
        WHERE status = 'PUBLISHED'
        GROUP BY period
        ORDER BY MIN(createdAt) DESC
        LIMIT ${limit}
    `;

    // Convert BigInt to Number for JSON serialization
    return rows.map(r => ({
        period: r.period,
        count: Number(r.count),
        likes: Number(r.likes || 0),
        comments: Number(r.comments || 0),
        shares: Number(r.shares || 0),
    })).reverse();
}

/**
 * Get top posts by engagement (likes + comments + shares)
 */
async function getTopPosts(page = 1, limit = 5) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: [{ likes: 'desc' }],
            skip,
            take: limit,
            select: {
                id: true,
                fbPostId: true,
                caption: true,
                imageUrl: true,
                likes: true,
                comments: true,
                shares: true,
                createdAt: true
            }
        }),
        prisma.post.count({ where: { status: 'PUBLISHED' } })
    ]);

    return {
        posts,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}


/**
 * Get pending posts (Scheduled)
 */
async function getPendingPosts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where: { status: 'SCHEDULED' },
            orderBy: [{ scheduledAt: 'asc' }],
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                caption: true,
                imageUrl: true,
                scheduledAt: true
            }
        }),
        prisma.post.count({ where: { status: 'SCHEDULED' } })
    ]);

    return {
        posts,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

let autoSyncTask = null;

/**
 * Start Auto Sync
 */
function startAutoSync() {
    if (autoSyncTask) {
        return; // Already running
    }
    // Sync periodically every 30 minutes
    autoSyncTask = cron.schedule('*/30 * * * *', async () => {
        console.log('Auto syncing engagement from FB...');
        try {
            await syncEngagement();
            console.log('Auto sync engagement completed.');
        } catch (error) {
            console.error('Auto sync engagement failed:', error.message);
        }
    });
    console.log('Auto sync engagement started (every 30 mins).');
}

/**
 * Stop Auto Sync
 */
function stopAutoSync() {
    if (autoSyncTask) {
        autoSyncTask.stop();
        autoSyncTask = null;
        console.log('Auto sync engagement stopped.');
    }
}

/**
 * Check if Auto Sync is running
 */
function isAutoSyncRunning() {
    return autoSyncTask !== null;
}

module.exports = { 
    getSummaryStats, 
    getPostsByPeriod, 
    getTopPosts, 
    getPendingPosts,
    syncEngagement, 
    startAutoSync,
    stopAutoSync,
    isAutoSyncRunning
};
