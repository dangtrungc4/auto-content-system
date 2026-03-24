const axios = require('axios');
const configService = require('./config');

module.exports = {
    searchImage: async (query) => {
        const config = configService.getConfig();
        if (!config.unsplashKey) {
            return null; // Bỏ qua nếu không cấu hình
        }

        try {
            const response = await axios.get('https://api.unsplash.com/search/photos', {
                params: {
                    query: `${query}`,
                    per_page: 5,
                    orientation: 'landscape'
                },
                headers: {
                    Authorization: `Client-ID ${config.unsplashKey}`
                }
            });

            if (response.data && response.data.results && response.data.results.length > 0) {
                // Return a random image from top 5 to avoid repeating the exact same image
                const randomIndex = Math.floor(Math.random() * response.data.results.length);
                return response.data.results[randomIndex].urls.regular;
            }
            return null;
        } catch (error) {
            console.error('Lỗi khi lấy ảnh từ Unsplash:', error.message);
            return null;
        }
    }
};
