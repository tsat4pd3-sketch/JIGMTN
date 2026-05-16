import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'jig_pm',
  waitForConnections: true,
  connectionLimit:    10,
  timezone: '+07:00',
});

export default pool;

export async function ping() {
  const [rows] = await pool.query('SELECT 1');
  return rows;
}
