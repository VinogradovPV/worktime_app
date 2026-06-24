import pg from 'pg';
const { Pool } = pg;

async function tryConnect(label, sslConfig) {
  const pool = new Pool({
    host: '158.160.165.2',
    port: 5432,
    user: 'sync_user',
    password: '8wBuj1H_o2',
    database: 'sync_database',
    ssl: sslConfig,
    connectionTimeoutMillis: 8000,
  });
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log(`✅ [${label}] Connected!`);
    console.log('   Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ [${label}] Failed: ${err.message}`);
    await pool.end().catch(() => {});
    return false;
  }
}

console.log('Testing PostgreSQL connection to 158.160.165.2:5432...\n');

// pg_hba.conf has: host all all 0.0.0.0/0 md5
// SSL is enabled on server. Try various SSL modes.
const tests = [
  ['ssl=false (hostnossl)', false],
  ['ssl={rejectUnauthorized:false}', { rejectUnauthorized: false }],
  ['ssl=true', true],
];

for (const [label, ssl] of tests) {
  const ok = await tryConnect(label, ssl);
  if (ok) {
    console.log(`\n🎉 Working config: ssl = ${JSON.stringify(ssl)}`);
    process.exit(0);
  }
}

console.log('\n❌ All attempts failed. Check firewall/iptables on the server.');
process.exit(1);
