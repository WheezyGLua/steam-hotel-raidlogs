import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { raids } from '../../../db/schema';
import { desc, ilike, or } from 'drizzle-orm';

// Global logs discovery and search
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const results = await db.query.raids.findMany({
      where: query
        ? or(
            ilike(raids.customName, `%${query}%`),
            ilike(raids.guildName, `%${query}%`)
          )
        : undefined,
      orderBy: [desc(raids.createdAt)],
      limit: Math.min(limit, 100),
      with: {
        encounters: {
          columns: {
            id: true,
            bossName: true,
            kill: true
          }
        }
      }
    });

    return NextResponse.json(results);
  } catch (err: any) {
     return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
