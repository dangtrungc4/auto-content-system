const configService = require('./config');
const googleSheets = require('./googleSheets');
const imageService = require('./images');

const GOLDEN_SLOTS = ["07:30", "11:30", "19:30", "22:00"];
const MAX_POSTS_PER_DAY = GOLDEN_SLOTS.length;

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
    const content = contentLines.join('\n\n');

    return { caption, content, hashtag };
}

/**
 * Tính toán ngày và giờ đăng bài thông minh
 * @param {number} index Thứ tự bài viết (0-based)
 * @param {Date} startDate Ngày bắt đầu
 * @param {string} priority Độ ưu tiên (NORMAL/HIGH)
 * @returns {{ date: string, time: string }}
 */
function calculateSmartSchedule(index, startDate = new Date(), priority = 'NORMAL') {
    let dayCount = Math.floor(index / MAX_POSTS_PER_DAY);
    let slotIndex = index % MAX_POSTS_PER_DAY;

    let targetDate = new Date(startDate);
    targetDate.setHours(0, 0, 0, 0);

    // Tìm ngày thứ n không phải Chủ Nhật
    let addedDays = 0;
    while (addedDays < dayCount) {
        targetDate.setDate(targetDate.getDate() + 1);
        if (targetDate.getDay() !== 0) { // 0 là Chủ Nhật
            addedDays++;
        }
    }
    
    // Nếu ngày tính toán rơi đúng vào Chủ Nhật (trường hợp dayCount=0), đẩy sang Thứ 2
    if (targetDate.getDay() === 0) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    // Ưu tiên slot 19:30 nếu là bài quan trọng (HIGH)
    let timeStr = GOLDEN_SLOTS[slotIndex];
    if (priority === 'HIGH') {
        timeStr = "19:30";
    }

    let [hours, minutes] = timeStr.split(':').map(Number);

    // Random ±10 phút
    const offset = Math.floor(Math.random() * 21) - 10; // -10 to +10
    minutes += offset;

    // Xử lý overflow/underflow phút
    const totalMinutes = hours * 60 + minutes;
    let finalHours = Math.floor(totalMinutes / 60);
    let finalMinutes = totalMinutes % 60;
    
    // Đảm bảo không âm
    if (finalMinutes < 0) {
        finalMinutes += 60;
        finalHours -= 1;
    }

    const dateFormatted = targetDate.toLocaleDateString('vi-VN');
    const timeFormatted = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;

    return { date: dateFormatted, time: timeFormatted };
}

/**
 * Chỉ parse dữ liệu từ textarea, chưa save vào Sheet
 *
 * @param {string} text  Raw textarea input
 * @param {string} providedImageUrl (Optional) cụ thể cho link ảnh
 * @param {string} priority (Optional) độ ưu tiên
 * @returns {object}     Parsed data
 */
async function parseOnly(text, providedImageUrl = '', priority = 'NORMAL') {
    const { caption, content, hashtag } = parseText(text);

    // Lấy số lượng bài hiện có để tính index
    const postCount = await googleSheets.getPostCount();
    const { date, time } = calculateSmartSchedule(postCount, new Date(), priority);

    // Chủ đề để trống
    const topic = '';

    // Ưu tiên providedImageUrl, nếu không có mới tìm trên Unsplash
    let imageUrl = providedImageUrl;
    if (!imageUrl) {
        // Tìm ảnh bằng dòng 2 của caption (tên bài)
        const titleLine = caption.split('\n')[1] || caption.split('\n')[0];
        imageUrl = (await imageService.searchImage(titleLine)) || '';
    }

    // Trạng thái mặc định
    const status = 'Chưa đăng';

    return { caption, content, hashtag, date, time, topic, imageUrl, status };
}

/**
 * Lưu dữ liệu đã parse vào Google Sheet
 * 
 * @param {object} data  Dữ liệu từ parseOnly
 */
async function saveToSheet(data) {
    const { date, time, topic, content, caption, imageUrl, hashtag, status } = data;

    const config = configService.getConfig();
    if (!config.sheetId) {
        throw new Error('Chưa cấu hình Google Sheet ID.');
    }

    const sheets = await googleSheets.getSheetsAPI();
    await sheets.spreadsheets.values.append({
        spreadsheetId: config.sheetId,
        range: 'A:H',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[date, time, topic, content, caption, imageUrl, hashtag, status]]
        }
    });

    return { success: true };
}

module.exports = { parseText, parseOnly, saveToSheet, calculateSmartSchedule };
