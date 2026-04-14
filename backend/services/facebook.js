const axios = require('axios');
const configService = require('./config');

module.exports = {
    postContent: async (message, imageUrl) => {
        const config = configService.getConfig();
        if (!config.fbPageToken || !config.fbAppId || !config.fbPageId) {
            throw new Error('Chưa cấu hình Facebook. Vào Settings → nhập User Token → bấm "Fetch Pages" để lấy Page ID và Page Token.');
        }

        const pageId = config.fbPageId;
        const apiVersion = 'v20.0';
        const urls = imageUrl ? String(imageUrl).split('\n').map(u => u.trim()).filter(Boolean) : [];

        try {
            if (urls.length === 0) {
                // Post text only
                const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/feed`, {
                    message,
                    access_token: config.fbPageToken
                });
                return response.data;
            } else if (urls.length === 1) {
                // Single media
                const mediaUrl = urls[0];
                const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|webm)$/i);
                
                if (isVideo) {
                    const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/videos`, {
                        file_url: mediaUrl,
                        description: message,
                        access_token: config.fbPageToken
                    });
                    return response.data;
                } else {
                    const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/photos`, {
                        url: mediaUrl,
                        caption: message,
                        access_token: config.fbPageToken
                    });
                    return response.data;
                }
            } else {
                // Multiple media -> Upload as unpublished, then attach to feed
                let attached_media = [];
                for (const mediaUrl of urls) {
                    const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|webm)$/i);
                    const endpoint = isVideo ? 'videos' : 'photos';
                    const urlKey = isVideo ? 'file_url' : 'url';
                    
                    const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/${endpoint}`, {
                        [urlKey]: mediaUrl,
                        published: false,
                        access_token: config.fbPageToken
                    });
                    attached_media.push({ media_fbid: response.data.id });
                }

                // Post collection
                const response = await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/feed`, {
                    message,
                    attached_media,
                    access_token: config.fbPageToken
                });
                return response.data;
            }
        } catch (error) {
            const errorMsg = error.response && error.response.data 
                ? JSON.stringify(error.response.data) 
                : error.message;
            throw new Error(`Facebook API Error: ${errorMsg}`);
        }
    },

    debugToken: async (token, overrideAppId, overrideAppSecret) => {
        const config = configService.getConfig();
        const appId = (overrideAppId || config.fbAppId)?.trim();
        const appSecret = (overrideAppSecret || config.fbAppSecret)?.trim();

        if (!appId || !appSecret) {
            throw new Error('Chưa cấu hình App ID hoặc App Secret.');
        }

        // App Access Token is required to debug any token
        const appAccessToken = `${appId}|${appSecret}`;

        try {
            const response = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
                params: {
                    input_token: token,
                    access_token: appAccessToken
                }
            });
            return response.data.data; // token info (is_valid, expires_at, scopes, etc.)
        } catch (error) {
            const errorDetail = error.response?.data?.error?.message || error.message;
            throw new Error(`Facebook Debug Token Error: ${errorDetail}`);
        }
    }
};
