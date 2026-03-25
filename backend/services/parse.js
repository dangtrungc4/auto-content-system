const imageService = require('./images');
const { getSheetsAPI } = require('./googleSheets');
const configService = require('./config');

/**
 * Parse raw textarea content vào các field theo quy tắc:
 *   - Caption   : dòng 1 + dòng 2
 *   - Content   : dòng 3 đến trước dòng hashtag (cuối)
 *   - Hashtag   : dòng cuối (bắt đầu bằng #)
 *
 * @param {string} text  Raw textarea input
 * @returns {{ caption, content, hashtag }}
 */
function parseText(text) {
    // Tách thành các dòng, bỏ dòng trắng đầu/cuối
    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length < 2) {
        throw new Error('Nội dung không đủ để parse (cần ít nhất 2 dòng).');
    }

    // Caption: dòng 1 + dòng 2
    const caption = `${lines[0]}\n${lines[1]}`;

    // Hashtag: dòng cuối
    const lastLine = lines[lines.length - 1];
    const hashtag = lastLine.startsWith('#') ? lastLine : '';

    // Content: từ dòng 3 đến trước hashtag
    const contentLines = hashtag
        ? lines.slice(2, lines.length - 1)
        : lines.slice(2);
    const content = contentLines.join('\n');

    return { caption, content, hashtag };
}

/**
 * Tạo giờ đăng ngẫu nhiên trong khoảng 12:00–13:00 hoặc 18:00–19:00
 * Format: "HH:MM"
 */
function randomPostTime() {
    const slots = [
        { h: 12, mMin: 0, mMax: 59 },
        { h: 18, mMin: 0, mMax: 59 }
    ];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const minute = Math.floor(Math.random() * (slot.mMax - slot.mMin + 1)) + slot.mMin;
    const hh = String(slot.h).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
}

/**
 * Parse textarea → append Google Sheet
 *
 * @param {string} text  Raw textarea input
 * @returns {object}     Parsed + sheet row data
 */
async function parseAndSave(text) {
    const { caption, content, hashtag } = parseText(text);

    // Ngày hôm nay theo vi-VN
    const now = new Date();
    const date = now.toLocaleDateString('vi-VN'); // e.g. "25/3/2026"

    // Giờ ngẫu nhiên
    const time = randomPostTime();

    // Chủ đề để trống
    const topic = '';

    // Tìm ảnh bằng dòng 2 của caption (tên bài)
    const titleLine = caption.split('\n')[1] || caption.split('\n')[0];
    const imageUrl = (await imageService.searchImage(titleLine)) || '';

    // Trạng thái mặc định
    const status = 'Chưa đăng';

    // Append vào Google Sheet
    // Column order: A:Ngày | B:Giờ | C:Chủ đề | D:Content | E:Caption | F:Image URL | G:Hashtag | H:Trạng thái
    const config = configService.getConfig();
    if (!config.sheetId) {
        throw new Error('Chưa cấu hình Google Sheet ID.');
    }

    const sheets = await getSheetsAPI();
    await sheets.spreadsheets.values.append({
        spreadsheetId: config.sheetId,
        range: 'A:H',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[date, time, topic, content, caption, imageUrl, hashtag, status]]
        }
    });

    return { caption, content, hashtag, date, time, imageUrl, status };
}

module.exports = { parseText, parseAndSave };
