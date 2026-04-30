import { Pool } from 'pg';
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

async function init() {
  console.log('开始创建数据库表...');

  const createTables = `
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

  await pool.query(createTables);
  console.log('数据库表创建成功！');

  await pool.end();
}

init().catch((error) => {
  console.error('数据库初始化失败:', error);
  process.exit(1);
});
