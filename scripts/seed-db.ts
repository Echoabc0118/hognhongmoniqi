import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/storage/database/shared/schema';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool, { schema });

async function seed() {
  console.log('开始初始化数据库...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const [testUser] = await db
    .insert(schema.users)
    .values({
      username: 'testuser',
      password: hashedPassword,
    })
    .returning();

  console.log('创建测试用户:', testUser.username);

  const sampleBlogs = [
    {
      title: '如何应对伴侣的冷战',
      summary: '教你几招轻松打破僵局',
      content: '冷战真的是恋爱中的一大杀手！你不理我，我不理你，本来屁大点事，结果越闹越大。其实打破冷战很简单，有时候只需要一个小小的举动。比如假装不小心碰到对方，或者做一道对方爱吃的菜。记住，先低头的不是输家，是更珍惜这段感情的人。'
    },
    {
      title: '送礼物避雷指南',
      summary: '这些礼物千万别送！',
      content: '送礼真的是一门学问！送对了感情升温，送错了可能直接凉凉。今天来给大家排排雷：首先，千万不要送体重秤、护肤品套装（除非对方明确要）、还有那些所谓的"实用"但完全没心意的东西。记住，送礼最重要的是用心，而不是价格贵不贵。'
    },
    {
      title: '异地恋生存法则',
      summary: '距离不是问题，用心才是',
      content: '异地恋虽然辛苦，但只要经营得好，反而能让感情更加稳固。给大家几个小建议：1. 每天保持联系，但不要过度黏人；2. 定期见面，给对方期待；3. 一起规划未来，让对方看到希望；4. 信任是基础，不要胡乱猜忌。记住，熬过了异地恋，就是一辈子！'
    }
  ];

  for (const blog of sampleBlogs) {
    await db.insert(schema.blogPosts).values(blog);
  }

  console.log('创建示例博客文章:', sampleBlogs.length, '篇');

  const sampleRecords = [
    { userId: testUser.id, scenario: '忘记纪念日', finalScore: 85, result: 'won' },
    { userId: testUser.id, scenario: '打游戏不回消息', finalScore: 92, result: 'won' },
    { userId: testUser.id, scenario: '和异性朋友走太近', finalScore: 68, result: 'lost' },
    { userId: testUser.id, scenario: '忘记生日', finalScore: 78, result: 'won' },
  ];

  for (const record of sampleRecords) {
    await db.insert(schema.gameRecords).values(record);
  }

  console.log('创建示例游戏记录:', sampleRecords.length, '条');

  console.log('数据库初始化完成！');
  console.log('测试账号: testuser / 123456');

  await pool.end();
}

seed().catch((error) => {
  console.error('数据库初始化失败:', error);
  process.exit(1);
});
