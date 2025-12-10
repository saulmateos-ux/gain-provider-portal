/**
 * Database Connection Pool (Singleton Pattern)
 *
 * CRITICAL RULE #3: Use shared connection pool from this file ONLY
 * Never create new Pool instances in individual files
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Singleton pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,

  // Optimized settings for serverless
  max: 20,                      // Max connections
  min: 2,                       // Min to maintain
  idleTimeoutMillis: 30000,     // Close idle after 30s
  connectionTimeoutMillis: 10000, // Wait 10s for connection
  statement_timeout: 60000,     // Query timeout 60s
  query_timeout: 60000,         // Total timeout 60s

  allowExitOnIdle: true,        // Allow process exit when idle
});

// Export pool for direct usage
export { pool };

/**
 * Execute a query
 * @param text SQL query
 * @param params Query parameters
 * @returns Query result with rows
 */
export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query(text, params);
};

/**
 * Get a client from the pool for transactions
 * @returns Client that must be released after use
 */
export const getClient = (): Promise<PoolClient> => {
  return pool.connect();
};

/**
 * Execute multiple queries in a transaction
 * @param callback Function that receives a client and returns a promise
 * @returns Result of the callback
 */
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Health check - tests database connection
 * @returns True if connection is healthy
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT 1 as check');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
