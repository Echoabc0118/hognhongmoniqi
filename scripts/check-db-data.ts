import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

async function checkDatabaseData() {
  console.log('📊 检查数据库数据...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();

    console.log('📄 博客文章：');
    const blogResult = await client.query('SELECT id, title, created_at FROM blog_posts ORDER BY created_at DESC');
    console.log(`   数量：${blogResult.rows.length}`);
    blogResult.rows.forEach(row => {
      console.log(`   - [${row.id}] ${row.title} (${row.created_at})`);
    });

    console.log('\n👤 用户：');
    const usersResult = await client.query('SELECT id, username, created_at FROM users');
    console.log(`   数量：${usersResult.rows.length}`);
    usersResult.rows.forEach(row => {
      console.log(`   - [${row.id}] ${row.username} (${row.created_at})`);
    });

    console.log('\n🎮 游戏记录：');
    const recordsResult = await client.query(`
      SELECT gr.id, u.username, gr.scenario, gr.final_score, gr.result, gr.played_at 
      FROM game_records gr 
      JOIN users u ON gr.user_id = u.id 
      ORDER BY gr.played_at DESC
    `);
    console.log(`   数量：${recordsResult.rows.length}`);
    recordsResult.rows.forEach(row => {
      console.log(`   - [${row.id}] ${row.username}: ${row.scenario} - ${row.final_score}分 (${row.result})`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ 数据检查完成！');

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkDatabaseData();
