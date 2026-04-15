const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED_DATA = [
    {
        name: 'Lighting (Ánh sáng)',
        keywords: [
            { name: 'cinematic lighting', label: 'Ánh sáng điện ảnh' },
            { name: 'volumetric lighting', label: 'Ánh sáng khối' },
            { name: 'rim lighting', label: 'Ánh sáng viền' },
            { name: 'softbox lighting', label: 'Ánh sáng softbox' },
            { name: 'neon lighting', label: 'Ánh sáng neon' },
            { name: 'golden hour', label: 'Giờ vàng' },
            { name: 'blue hour', label: 'Giờ xanh' },
            { name: 'high contrast lighting', label: 'Tương phản cao' },
            { name: 'dramatic shadows', label: 'Bóng đổ kịch tính' },
            { name: 'studio lighting', label: 'Ánh sáng studio' }
        ]
    },
    {
        name: 'Camera (Góc máy/Ống kính)',
        keywords: [
            { name: '85mm lens', label: 'Ống kính 85mm (chân dung)' },
            { name: '35mm lens', label: 'Ống kính 35mm (đường phố)' },
            { name: 'wide angle', label: 'Góc rộng' },
            { name: 'macro photography', label: 'Chụp macro' },
            { name: 'depth of field', label: 'Độ sâu trường ảnh (xóa phông)' },
            { name: 'f/1.8 aperture', label: 'Khẩu độ f/1.8' },
            { name: 'low angle shot', label: 'Góc thấp' },
            { name: 'bird\'s eye view', label: 'Góc nhìn từ trên cao' },
            { name: 'close up', label: 'Cận cảnh' },
            { name: 'extreme long shot', label: 'Toàn cảnh cực xa' }
        ]
    },
    {
        name: 'Mood (Tâm trạng)',
        keywords: [
            { name: 'minimalist', label: 'Tối giản' },
            { name: 'luxury', label: 'Sang trọng' },
            { name: 'serene', label: 'Thanh bình' },
            { name: 'gritty', label: 'Gai góc' },
            { name: 'moody', label: 'U tối' },
            { name: 'futuristic', label: 'Tương lai' },
            { name: 'vintage', label: 'Hoài cổ' },
            { name: 'hyperrealistic', label: 'Siêu thực' },
            { name: 'dreamy', label: 'Mơ màng' },
            { name: 'mysterious', label: 'Bí ẩn' }
        ]
    },
    {
        name: 'Materials (Chất liệu)',
        keywords: [
            { name: 'silk texture', label: 'Vải lụa' },
            { name: 'metallic finish', label: 'Kim loại' },
            { name: 'glass reflection', label: 'Phản chiếu kính' },
            { name: 'concrete', label: 'Bê tông' },
            { name: 'liquid gold', label: 'Vàng lỏng' },
            { name: 'matte plastic', label: 'Nhựa nhám' },
            { name: 'skin texture', label: 'Cấu trúc da' },
            { name: 'glossy', label: 'Bóng loáng' },
            { name: 'wooden texture', label: 'Vân gỗ' },
            { name: 'marble', label: 'Đá cẩm thạch' }
        ]
    }
];

async function seedKeywords() {
    console.log('--- Seeding Prompt Keywords ---');
    
    for (const catData of SEED_DATA) {
        // Find or create category
        const category = await prisma.promptCategory.upsert({
            where: { name: catData.name },
            update: {},
            create: { name: catData.name }
        });

        for (const kw of catData.keywords) {
            // Find existing keyword by name and categoryId
            const existing = await prisma.promptKeyword.findFirst({
                where: { 
                    name: kw.name, 
                    categoryId: category.id 
                }
            });
            
            if (!existing) {
                await prisma.promptKeyword.create({
                    data: { 
                        name: kw.name, 
                        label: kw.label, 
                        categoryId: category.id 
                    }
                });
            } else {
                await prisma.promptKeyword.update({
                    where: { id: existing.id },
                    data: { label: kw.label }
                });
            }
        }
    }
    
    console.log('--- Seeding Complete ---');
}

if (require.main === module) {
    seedKeywords()
        .catch(e => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = { seedKeywords };
