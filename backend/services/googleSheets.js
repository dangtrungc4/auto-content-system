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
    getAuthClient,
    getSheetsAPI,
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
        // Normalize server date: "24/3/2026" -> "24/3/2026" (or "24/03/2026" -> "24/3/2026")
        const formatDate = (d) => {
            const parts = d.split(/[\/\-\.]/); // Handle /, -, . as separators
            if (parts.length !== 3) return d;
            // Return as D/M/YYYY without leading zeros
            return `${parseInt(parts[0])}/${parseInt(parts[1])}/${parts[2]}`;
        };

        const currentDateStr = formatDate(now.toLocaleDateString('vi-VN'));
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

            // Kiểm tra ngày (chỉ lấy bài trong ngày hiện tại)
            if (formatDate(dateStr) !== currentDateStr) continue;
            // Kiểm tra trạng thái "Chưa đăng"
            if (status.trim().toLowerCase() === 'chưa đăng') {
                const fbCaptionString = caption ? caption + '\n\n' + content + '\n\n' + hashtag : hashtag;
                
                // Trình tự lưu trữ bài mới: dùng caption (dòng 1) làm title cho DB
                const titleFromCaption = caption.split('\n')[1] || topic || 'Untitled from Sheet';

                const postData = {
                    rowIndex: i + 1,
                    topic,
                    content,
                    caption,
                    hashtag,
                    imageUrl,
                    fbCaption: fbCaptionString,
                    title: titleFromCaption
                };

                if (timeStr) {
                    const [h, m] = timeStr.split(':').map(Number);
                    if (currentHour > h || (currentHour === h && currentMinute >= m)) {
                        pending.push(postData);
                    }
                } else {
                    pending.push(postData);
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
    },
    getPostCount: async () => {
        const config = configService.getConfig();
        if (!config.sheetId) return 0;

        const sheets = await getSheetsAPI();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.sheetId,
            range: 'A:A' // Chỉ cần đếm số dòng ở cột A
        });

        const rows = response.data.values;
        // Trừ đi 1 dòng header nếu có dữ liệu
        return rows ? Math.max(0, rows.length - 1) : 0;
    },
    updatePostRow: async (rowIndex, data) => {
        const config = configService.getConfig();
        const sheets = await getSheetsAPI();
        
        // Data format: [date, time, topic, content, caption, imageUrl, hashtag, status]
        const { date, time, topic, content, caption, imageUrl, hashtag, status } = data;
        const values = [[date, time, topic, content, caption, imageUrl, hashtag, status]];

        await sheets.spreadsheets.values.update({
            spreadsheetId: config.sheetId,
            range: `A${rowIndex}:H${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values }
        });
    }
};
