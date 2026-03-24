const { google } = require('googleapis');
const configService = require('./config');

async function getAuthClient() {
    const config = configService.getConfig();
    if (!config.googleClientEmail || !config.googlePrivateKey) {
        throw new Error('Google Credentials không hợp lệ.');
    }
    
    // Replace literal '\n' with actual newlines in private key if needed
    const privateKey = config.googlePrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: config.googleClientEmail,
            private_key: privateKey
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return await auth.getClient();
}

async function getSheetsAPI() {
    const authClient = await getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

module.exports = {
    getPendingPosts: async () => {
        const config = configService.getConfig();
        if (!config.sheetId) throw new Error('Chưa cấu hình Google Sheet ID.');

        const sheets = await getSheetsAPI();
        
        // Giả sử dữ liệu ở trang tính đầu tiên (Sheet1) từ cột A đến H
        // Column Index (0-based):
        // 0: Ngày, 1: Giờ, 2: Chủ đề, 3: Content, 4: Caption, 5: Image URL, 6: Hashtag, 7: Trạng thái
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.sheetId,
            range: 'A:H' // Adjust range if sheet name is different
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) return [];

        const pending = [];
        const now = new Date();
        const currentDateStr = now.toLocaleDateString('vi-VN'); // Ex: 25/12/2023 - adjust based on your format
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Bắt đầu từ dòng 2 (index 1) vì dòng 1 là Header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Need to handle undefined columns safely
            const dateStr = row[0] || '';
            const timeStr = row[1] || ''; // Ex: "10:30"
            const topic = row[2] || '';
            const content = row[3] || '';
            const caption = row[4] || '';
            const imageUrl = row[5] || '';
            const hashtag = row[6] || '';
            const status = row[7] || '';

            // Kiểm tra trạng thái "Chưa đăng"
            if (status.trim().toLowerCase() === 'chưa đăng') {
                // Kiểm tra thời gian (Đơn giản hóa: So sánh giờ và phút, hoặc bỏ qua kiểm tra ngày nếu chỉ cần chạy theo giờ)
                // Ở đây ta có thể đơn giản lấy giờ ra so sánh:
                if (timeStr) {
                    const [h, m] = timeStr.split(':').map(Number);
                    if (currentHour > h || (currentHour === h && currentMinute >= m)) {
                        pending.push({
                            rowIndex: i + 1, // 1-based index cho Google Sheet API
                            topic,
                            caption: caption ? caption + '\n\n' + hashtag : hashtag,
                            imageUrl
                        });
                    }
                } else {
                    // Nếu không có giờ, coi như post ngay
                    pending.push({
                        rowIndex: i + 1,
                        topic,
                        caption: caption ? caption + '\n\n' + hashtag : hashtag,
                        imageUrl
                    });
                }
            }
        }
        return pending;
    },
    updatePostStatus: async (rowIndex, statusStr) => {
        const config = configService.getConfig();
        const sheets = await getSheetsAPI();
        
        // Cập nhật cột H (Trạng thái)
        await sheets.spreadsheets.values.update({
            spreadsheetId: config.sheetId,
            range: `H${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[statusStr]]
            }
        });
    }
};
