import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: '158.160.165.2',
  port: 5432,
  database: 'sync_database',
  user: 'sync_user',
  password: '8wBuj1H_o2',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

console.log('🔄 Подключение к Yandex Cloud PostgreSQL...');
console.log('   Host: 158.160.165.2:5432');
console.log('   Database: sync_database');
console.log('   User: sync_user');

try {
  await client.connect();
  console.log('✅ Подключение успешно!');

  const result = await client.query('SELECT NOW()');
  console.log('✅ Запрос выполнен:', result.rows[0]);

  await client.end();
  console.log('✅ Соединение закрыто');
  process.exit(0);
} catch (error) {
  console.error('❌ Ошибка подключения:', error.message);
  console.error('   Код:', error.code);
  process.exit(1);
}
