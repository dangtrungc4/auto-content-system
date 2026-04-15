const configService = require('./config');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * AI Prompt Generator Service
 */

/**
 * Generates a technical prompt based on the Master Template:
 * [Subject] + [Action/Context] + [Environment/Lighting] + [Style/Camera Setup] + [Quality Tags]
 * 
 * @param {Object} params 
 * @param {string} params.subject - Main subject (in English)
 * @param {Array} params.keywords - List of technical keyword names
 * @param {string} params.negativePrompt - Elements to exclude
 * @param {string} params.aspectRatio - e.g. "16:9"
 * @returns {string} The final generated prompt
 */
function generatePrompt({ subject, keywords = [], negativePrompt = '', aspectRatio = '16:9' }) {
    const config = configService.getConfig();
    const bannedWords = (config.bannedWords || '').split(',').map(w => w.trim().toLowerCase()).filter(w => w);

    // Filter out banned words from subject
    let filteredSubject = subject;
    bannedWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filteredSubject = filteredSubject.replace(regex, '');
    });

    // Combine ingredients
    const parts = [filteredSubject.trim(), ...keywords];
    let prompt = parts.filter(p => p).join(', ');

    // Add quality tags
    prompt += ', highly detailed, 8k resolution, cinematic lighting, masterpiece';

    // Add Midjourney specific parameters if needed, or just general ones
    if (aspectRatio) {
        prompt += ` --ar ${aspectRatio}`;
    }

    return prompt;
}

/**
 * Uses Google Gemini to translate and enhance the subject for AI image generation.
 * @param {string} text - Vietnamese text or simple English text
 * @returns {Promise<string>} Translated and enhanced text (or original if failed)
 */
async function translateToEnglish(text) {
    const config = configService.getConfig();
    const apiKey = config.geminiApiKey;

    if (!apiKey) {
        console.warn('AI Translation: Missing geminiApiKey in configuration.');
        return text;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            Task: Translate and enhance the following description into a highly descriptive, technical English subject for an AI image generation model (like Midjourney or DALL-E).
            Input: "${text}"
            Rules:
            1. If it's in Vietnamese, translate it to English.
            2. Enhance it with 3-5 relevant descriptive keywords (e.g. textures, mood, specific details).
            3. Keep the output concise (max 30 words).
            4. Return ONLY the translated/enhanced string, no extra commentary.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const enhancedText = response.text().trim().replace(/^"|"$/g, '');
        
        return enhancedText || text;
    } catch (e) {
        console.error('Gemini AI Translation Error:', e.message);
        return text;
    }
}

/**
 * Fetches the keyword library grouped by category
 */
async function getLibrary() {
    const prisma = configService.prisma;
    return await prisma.promptCategory.findMany({
        include: {
            keywords: true
        },
        orderBy: {
            name: 'asc'
        }
    });
}

/**
 * Saves a generated prompt to history
 */
async function saveToHistory(prompt) {
    const prisma = configService.prisma;
    try {
        await prisma.promptHistory.create({
            data: { prompt }
        });

        // Optional: Keep only last 10
        const count = await prisma.promptHistory.count();
        if (count > 20) {
            const oldest = await prisma.promptHistory.findMany({
                orderBy: { createdAt: 'asc' },
                take: count - 20
            });
            await prisma.promptHistory.deleteMany({
                where: { id: { in: oldest.map(o => o.id) } }
            });
        }
    } catch (e) {
        console.error('Error saving to prompt history:', e.message);
    }
}

/**
 * Deletes a single history item by ID
 */
async function deleteHistoryItem(id) {
    const prisma = configService.prisma;
    return await prisma.promptHistory.delete({
        where: { id: parseInt(id) }
    });
}

/**
 * Clears the entire prompt history
 */
async function clearHistory() {
    const prisma = configService.prisma;
    return await prisma.promptHistory.deleteMany({});
}

module.exports = {
    generatePrompt,
    translateToEnglish,
    getLibrary,
    saveToHistory,
    deleteHistoryItem,
    clearHistory
};
