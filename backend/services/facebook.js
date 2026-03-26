const axios = require('axios');
const configService = require('./config');

module.exports = {
    postContent: async (message, imageUrl) => {
        const config = configService.getConfig();
        if (!config.fbPageToken || !config.fbAppId || !config.fbPageId) {
            throw new Error('Chưa cấu hình Facebook. Vào Settings → nhập User Token → bấm "Fetch Pages" để lấy Page ID và Page Token.');
        }

        const pageId = config.fbPageId; // 'me' works for the page access token representing the page itself
        let url = `https://graph.facebook.com/v25.0/${pageId}/feed`;
        const payload = {
            message,
            access_token: config.fbPageToken
        };

        if (imageUrl) {
            // Nếu có ảnh, sử dụng endpoint photos
            url = `https://graph.facebook.com/v25.0/${pageId}/photos`;
            payload.url = imageUrl;
            payload.caption = message; // for photos, message is sent as caption
            delete payload.message;
        }

        try {
            const response = await axios.post(url, payload);
            return response.data; // { id: "post_id" }
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
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
            const response = await axios.get('https://graph.facebook.com/v25.0/debug_token', {
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
