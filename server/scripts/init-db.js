require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const sqlFile = path.join(__dirname, 'init-db.sql');
const seedFile = path.join(__dirname, 'seed.sql');

async function runSqlFile(connection, file) {
  const sql = fs.readFileSync(file, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'flytie';
  const password = process.env.DB_PASSWORD || 'flytie123';
  const database = process.env.DB_NAME || 'flytie_atlas';

  const rootConnection = await mysql.createConnection({ host, port, user, password });
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await rootConnection.end();

  const connection = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true, charset: 'utf8mb4' });
  await connection.query(fs.readFileSync(sqlFile, 'utf8'));

  const [tables] = await connection.query("SHOW TABLES LIKE 'patterns'");
  const [[countRow]] = tables.length > 0 ? await connection.query('SELECT COUNT(*) as cnt FROM patterns') : [[{ cnt: 0 }]];
  if (countRow.cnt === 0) {
    await connection.query(fs.readFileSync(seedFile, 'utf8'));
    console.log('数据库结构与示例数据初始化完成：', database);
  } else {
    console.log('数据库结构已存在且已有数据，跳过示例数据：', database);
  }
  await connection.end();
}

main().catch((err) => {
  console.error('数据库初始化失败：', err.message);
  process.exit(1);
});
