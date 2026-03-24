const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let currentConfig = {
    sheetId: '',
    googleClientEmail: '',
    googlePrivateKey: '',
    fbAppId: '',
    fbUserToken: '',
    fbPageToken: '',
    fbPageId: '',
    unsplashKey: '',
    cronSchedule: '*/5 * * * *'
};

async function loadConfig() {
    try {
        let dbConfig = await prisma.config.findUnique({ where: { id: 1 } });
        if (!dbConfig) {
            dbConfig = await prisma.config.create({
                data: { id: 1, ...currentConfig }
            });
        }
        currentConfig = { ...currentConfig, ...dbConfig };

        return currentConfig;
    } catch (e) {
        console.error('Error loading config from Prisma', e.message);
        // Fallback or throw based on preference, here we just log to let the server start
    }
}

module.exports = {
    loadConfig,
    getConfig: () => currentConfig,
    saveConfig: async (newConfig) => {
        try {
            // Remove id from newConfig if present to avoid updating primary key issues
            delete newConfig.id;
            const updatedConfig = await prisma.config.upsert({
                where: { id: 1 },
                update: newConfig,
                create: { id: 1, ...currentConfig, ...newConfig }
            });
            currentConfig = { ...currentConfig, ...updatedConfig };
            return currentConfig;
        } catch (e) {
            console.error('Error saving config to Prisma', e.message);
            throw e;
        }
    }
};
