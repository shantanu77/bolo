import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host:     process.env.DATABASE_HOST || 'localhost',
  port:     Number(process.env.DATABASE_PORT) || 3306,
  user:     process.env.DATABASE_USER || 'bolo_user',
  password: process.env.DATABASE_PASSWORD || 'bolo_pass',
  database: process.env.DATABASE_NAME || 'bolo_english',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
})

export default pool

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any[]

export async function query<T = unknown>(sql: string, params?: Params): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

export async function queryOne<T = unknown>(sql: string, params?: Params): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params?: Params): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params)
  return result as { insertId: number; affectedRows: number }
}
