import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';

/**
 * Health Check Endpoint
 *
 * Returns application and database health status
 * Public endpoint - no authentication required
 */
export async function GET() {
  try {
    const dbHealthy = await healthCheck();

    return NextResponse.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        checks: {
          database: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
