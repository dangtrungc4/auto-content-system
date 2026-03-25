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
    }
};
