import { db } from '../storage/database/drizzle-client';
import { healthCheck, blogPosts, users, gameRecords } from '../storage/database/shared/schema';
import bcrypt from 'bcrypt';

export async function initDatabase() {
  console.log('检查数据库状态...');

  try {
    const hasTables = await checkTablesExist();

    if (!hasTables) {
      console.log('数据库表不存在，开始创建...');
      await createTables();
      console.log('数据库表创建成功！');

      await seedInitialData();
      console.log('初始数据创建成功！');
    } else {
      console.log('数据库表已存在，跳过创建。');
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

async function checkTablesExist(): Promise<boolean> {
  try {
    await db.select().from(healthCheck).limit(1);
    return true;
  } catch {
    return false;
  }
}

async function createTables() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS health_check (
      id SERIAL NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario VARCHAR(100) NOT NULL,
      final_score INTEGER NOT NULL,
      result VARCHAR(20) NOT NULL,
      played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC NULLS LAST);
    CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
    CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);
    CREATE INDEX IF NOT EXISTS game_records_user_id_idx ON game_records(user_id);
    CREATE INDEX IF NOT EXISTS game_records_played_at_idx ON game_records(played_at);
  `;

  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await pool.query(createTablesSQL);
  await pool.end();
}

async function seedInitialData() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const [testUser] = await db
    .insert(users)
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
    await db.insert(blogPosts).values(blog);
  }

  console.log('创建示例博客文章:', sampleBlogs.length, '篇');

  const sampleRecords = [
    { userId: testUser.id, scenario: '忘记纪念日', finalScore: 85, result: 'won' },
    { userId: testUser.id, scenario: '打游戏不回消息', finalScore: 92, result: 'won' },
    { userId: testUser.id, scenario: '和异性朋友走太近', finalScore: 68, result: 'lost' },
    { userId: testUser.id, scenario: '忘记生日', finalScore: 78, result: 'won' },
  ];

  for (const record of sampleRecords) {
    await db.insert(gameRecords).values(record);
  }

  console.log('创建示例游戏记录:', sampleRecords.length, '条');
  console.log('测试账号: testuser / 123456');
}
