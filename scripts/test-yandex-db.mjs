import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

console.log('🔄 Подключение к Yandex Cloud PostgreSQL...');
console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`   Database: ${process.env.DB_NAME}`);
console.log(`   User: ${process.env.DB_USER}`);

try {
  await client.connect();
  console.log('✅ Подключение успешно!');

  const result = await client.query('SELECT NOW()');
  console.log('✅ Запрос выполнен:', result.rows[0]);

  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('✅ Таблицы в БД:', tablesResult.rows.map(r => r.table_name));

  await client.end();
  console.log('✅ Соединение закрыто');
  process.exit(0);
} catch (error) {
  console.error('❌ Ошибка подключения:', error.message);
  process.exit(1);
}
