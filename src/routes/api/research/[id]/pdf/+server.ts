import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { tbl_thesis } from '$lib/server/db/schema/schema.js';
import { authenticateClientRequest } from '$lib/server/utils/clientAuth.js';
import { downloadFileFromB2 } from '$lib/server/utils/backblazeDownload.js';

export const GET: RequestHandler = async ({ cookies, params, request }) => {
  const user = await authenticateClientRequest(request, cookies.get('client_token'));
  if (!user) throw error(401, { message: 'Unauthorized' });

  const thesisId = Number(params.id);
  if (!Number.isInteger(thesisId) || thesisId < 1) {
    throw error(400, { message: 'Invalid research record' });
  }

  const [thesis] = await db
    .select({ thesisId: tbl_thesis.thesisId, pdfFile: tbl_thesis.pdfFile })
    .from(tbl_thesis)
    .where(and(
      eq(tbl_thesis.id, thesisId),
      eq(tbl_thesis.isActive, true)
    ))
    .limit(1);

  if (!thesis?.pdfFile) throw error(404, { message: 'No PDF is available for this research record' });

  const objectKey = thesis.pdfFile.trim();
  if (!objectKey || objectKey.startsWith('/') || objectKey.includes('\\') || objectKey.split('/').some((part) => part === '.' || part === '..')) {
    throw error(404, { message: 'Research PDF is unavailable' });
  }

  try {
    const file = await downloadFileFromB2(objectKey);
    if (new TextDecoder().decode(file.body.subarray(0, 5)) !== '%PDF-') {
      throw error(502, { message: 'Stored research document is not a valid PDF' });
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="research-${thesisId}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (file.contentLength !== undefined) {
      headers.set('Content-Length', String(file.contentLength));
    }

    return new Response(Buffer.from(file.body), { headers });
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
    console.error('Research PDF download failed:', cause);
    throw error(502, { message: 'Research PDF could not be retrieved' });
  }
};
