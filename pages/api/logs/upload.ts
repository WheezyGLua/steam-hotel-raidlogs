import type { NextApiRequest, NextApiResponse } from 'next';
import busboy from 'busboy';
import { processAndSaveLog } from '@/lib/db-actions';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false, // Disables warning about response size 
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
     res.status(405).json({ error: 'Method Not Allowed' });
     return;
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
     res.status(400).json({ error: 'Must be multipart/form-data' });
     return;
  }

  const bb = busboy({ headers: req.headers });
  let customRaidName = 'Unnamed Raid';
  let raidId: string | null = null;
  let fileFound = false;

  let processingPromise: Promise<void> | null = null;
  let uploadError: Error | null = null;

  bb.on('field', (name, val) => {
    if (name === 'raidName' && val.trim().length > 0) {
      customRaidName = val;
    }
  });

  bb.on('file', (name, fileStream, info) => {
    if (name === 'log') {
      fileFound = true;
      // Ensure file handling isn't blocked by slow processing
      processingPromise = processAndSaveLog(fileStream, customRaidName)
        .then((id) => { raidId = id; })
        .catch((err) => { uploadError = err; });
    } else {
      fileStream.resume(); // Ignore other files
    }
  });

  bb.on('close', async () => {
    if (!fileFound) {
      return res.status(400).json({ error: 'No log file provided' });
    }

    if (processingPromise) {
      try {
        await processingPromise;
      } catch (err: any) {
        uploadError = err;
      }
    }

    if (uploadError) {
      console.error('Upload Process Error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    if (!raidId) {
      return res.status(500).json({ error: 'Failed to process log file correctly' });
    }

    res.status(200).json({ success: true, raidId });
  });

  bb.on('error', (err) => {
    console.error('Busboy parsing error:', err);
    res.status(500).json({ error: 'Upload failed completely' });
  });

  req.pipe(bb);
}
