import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

async function testDatabaseConnection() {
  console.log('🧪 开始测试数据库连接...\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 环境变量未设置！');
    return;
  }

  console.log('📋 数据库配置：');
  console.log('   DATABASE_URL 已设置');
  console.log('');

  try {
    console.log('🔗 尝试连接数据库...');

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    console.log('✅ 数据库连接成功！\n');

    console.log('📊 执行测试查询...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ 查询成功！');
    console.log('   当前时间:', result.rows[0].current_time);

    console.log('');
    console.log('🗂️ 检查是否有表...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ 找到', tablesResult.rows.length, '个表：');
      tablesResult.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
    } else {
      console.log('⚠️ 数据库中没有表，需要创建');
    }

    client.release();
    await pool.end();
    console.log('');
    console.log('🎉 数据库连接测试完成！');

  } catch (error) {
    console.error('');
    console.error('❌ 数据库连接失败！');
    console.error('');

    if (error instanceof Error) {
      console.error('错误信息:', error.message);

      if ('code' in error) {
        console.error('错误代码:', (error as any).code);
      }
    }

    console.error('');
    console.error('💡 可能的原因：');
    console.error('   1. 数据库地址不正确');
    console.error('   2. 数据库服务没有运行');
    console.error('   3. 网络无法访问数据库');
    console.error('   4. 用户名/密码不正确');
    console.error('   5. 需要 VPN 或特定网络才能访问');
  }
}

testDatabaseConnection();
