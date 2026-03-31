require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    const tags = await prisma.tag.findMany();
    if (tags.length === 0) {
      console.log('Không có tag nào trong database. Vui lòng tạo tag trước qua giao diện Web.');
      process.exit(0);
    }

    console.log('\n--- DANH SÁCH TAG HIỆN CÓ ---');
    tags.forEach(t => console.log(` ID: ${t.id} \t| Tên: ${t.name}`));
    console.log('-----------------------------\n');

    rl.question('Nhập ID của Tag mà anh muốn gán TẤT CẢ các bài viết CŨ vào: ', async (answer) => {
      const tagId = parseInt(answer.trim());
      const selectedTag = tags.find(t => t.id === tagId);

      if (!selectedTag) {
        console.log('ID không hợp lệ hoặc không tìm thấy. Kết thúc.');
        process.exit(1);
      }

      const allPosts = await prisma.post.findMany({ select: { id: true } });
      if (allPosts.length === 0) {
        console.log('Không có bài viết nào trong Database.');
        process.exit(0);
      }

      console.log(`Đang gán ${allPosts.length} bài viết vào tag "${selectedTag.name}"...\n`);

      await prisma.tag.update({
        where: { id: tagId },
        data: {
          posts: {
            connect: allPosts.map(p => ({ id: p.id }))
          }
        }
      });

      console.log('✅ GÁN THÀNH CÔNG! Anh có thể xem kết quả trên trình duyệt.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Lỗi Script: ', error);
    process.exit(1);
  }
}

main();
