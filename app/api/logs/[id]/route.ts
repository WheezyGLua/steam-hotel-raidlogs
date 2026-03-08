import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { raids, encounters } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
       return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    const raid = await db.query.raids.findFirst({
      where: eq(raids.id, params.id),
      with: {
        encounters: {
           with: {
             combatEvents: {
                limit: 100 // We don't want to load millions of rows natively on overview, this needs pagination or aggregations
             }
           }
        }
      }
    });

    if (!raid) {
       return NextResponse.json({ error: 'Raid not found' }, { status: 404 });
    }

    return NextResponse.json(raid);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
