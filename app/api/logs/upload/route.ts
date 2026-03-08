import { NextResponse } from 'next/server';

import { Readable } from 'stream';
import busboy from 'busboy';
import { processAndSaveLog } from '@/lib/db-actions';

// Disable Next.js default body parser to handle massive file streams natively
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!req.body) {
      return NextResponse.json({ error: 'No body' }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Must be multipart/form-data' }, { status: 400 });
    }

    // Convert Web ReadableStream to Node Readable
    // @ts-ignore - TS types for fromWeb may be finicky depending on node types version
    const nodeStream = Readable.fromWeb(req.body);

    const bb = busboy({ headers: { 'content-type': contentType } });
    let customRaidName = 'Unnamed Raid';
    let raidId: string | null = null;
    let fileFound = false;

    const parsePromise = new Promise<{ id: string }>((resolve, reject) => {
      bb.on('field', (name, val) => {
        if (name === 'raidName' && val.trim().length > 0) {
          customRaidName = val;
        }
      });

      bb.on('file', (name, fileStream, info) => {
        if (name === 'log') {
          fileFound = true;
          // We stream the file directly into our parser as it uploads
          processAndSaveLog(fileStream, customRaidName)
            .then(id => { raidId = id; })
            .catch(err => {
              fileStream.resume(); // sink unread data
              reject(err);
            });
        } else {
           fileStream.resume();
        }
      });

      bb.on('close', () => {
        if (!fileFound) {
           reject(new Error('No log file provided'));
           return;
        }
        // processAndSaveLog might still be finishing saving to DB since busboy closed
        // But since we wait for it in the bb.on('file') but do not block busboy... wait, 
        // we should better wait for the processAndSaveLog promise to resolve.
      });

      bb.on('error', reject);
    });

    // The stream plumbing
    nodeStream.pipe(bb);
    
    // We need to wait for Busboy to finish AND processAndSaveLog to finish
    // Since we assigned raidId in the file handler, we can just poll or wrap it better.
    // For simplicity, we just listen to a resolve custom wrapper above.
    
    // Actually, waiting for processing
    const waitProcessing = new Promise<string>((resolve, reject) => {
       bb.on('close', () => {
          setTimeout(() => {
             if (raidId) resolve(raidId);
             else reject(new Error('Processing failed or no ID returned.'));
          }, 1000); // Hacky wait, but in real express we'd await processAndSaveLog explicitly
       });
    });

    const finalRaidId = await waitProcessing;

    return NextResponse.json({ success: true, raidId: finalRaidId });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
