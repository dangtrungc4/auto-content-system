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
 * Sync engagement for all posts (run periodically)
 */
async function syncEngagement() {
    const posts = await prisma.postRecord.findMany({ select: { id: true, fbPostId: true } });
    for (const post of posts) {
        const engagement = await fetchFbEngagement(post.fbPostId);
        await prisma.postRecord.update({
            where: { id: post.id },
            data: engagement
        });
    }
}

/**
 * Get summary stats
 */
async function getSummaryStats() {
    const total = await prisma.postRecord.count();
    const success = await prisma.postRecord.count({ where: { status: 'success' } });
    const failed = total - success;

    const agg = await prisma.postRecord.aggregate({
        _sum: { likes: true, comments: true, shares: true }
    });

    return {
        total,
        success,
        failed,
        totalLikes: agg._sum.likes || 0,
        totalComments: agg._sum.comments || 0,
        totalShares: agg._sum.shares || 0,
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
        FROM PostRecord
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
async function getTopPosts(limit = 5) {
    const posts = await prisma.postRecord.findMany({
        orderBy: [{ likes: 'desc' }],
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
    });
    return posts;
}

/**
 * Start Auto Sync
 */
function startAutoSync() {
    // Sync periodically every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('Auto syncing engagement from FB...');
        try {
            await syncEngagement();
            console.log('Auto sync engagement completed.');
        } catch (error) {
            console.error('Auto sync engagement failed:', error.message);
        }
    });
}

module.exports = { getSummaryStats, getPostsByPeriod, getTopPosts, syncEngagement, startAutoSync };
