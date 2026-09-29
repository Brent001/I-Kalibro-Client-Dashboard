import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { downloadFileFromB2, getFileMetadataFromB2, buildResponseHeaders } from '$lib/server/utils/backblazeDownload.js';

const COVER_PREFIXES = ['covers/', 'books/covers/', 'journals/covers/', 'magazines/covers/', 'theses/covers/'];
const IMAGE_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    jfif: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp'
};

function normalizeCoverKey(value: string | undefined): string | null {
    if (!value) return null;
    let key = value;
    for (let pass = 0; pass < 5 && key.includes('%'); pass++) {
        try {
            const decoded = decodeURIComponent(key);
            if (decoded === key) break;
            key = decoded;
        } catch {
            return null;
        }
    }

    const segments = key.split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9._ ()-]+$/.test(segment))) {
        return null;
    }
    if (!COVER_PREFIXES.some((prefix) => key.startsWith(prefix))) return null;

    const extension = segments.at(-1)?.split('.').at(-1)?.toLowerCase();
    return extension && IMAGE_TYPES[extension] ? key : null;
}

function detectImageType(body: Uint8Array): string | null {
    if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return 'image/jpeg';
    if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 && body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a) return 'image/png';
    const signature = new TextDecoder().decode(body.subarray(0, 12));
    if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) return 'image/gif';
    if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') return 'image/webp';
    return null;
}

/**
 * GET - Download/view cover photo from Backblaze B2
 * Serves images with proper caching and security headers
 * 
 * Usage:
 *   GET /api/images/cover/covers/book-123.jpg
 *   GET /api/images/cover/covers%2Fbook-123.jpg (URL encoded)
 */
export const GET: RequestHandler = async ({ params }) => {
    const fileName = normalizeCoverKey(params.fileName);
    if (!fileName) return error(400, 'Invalid cover path');

    try {
        // Download file from B2
        const fileData = await downloadFileFromB2(fileName);
        const contentType = detectImageType(fileData.body);
        if (!contentType) return error(415, 'Unsupported cover image');

        const headers = buildResponseHeaders(
            contentType,
            fileData.contentLength,
            fileName,
            true // inline (display in browser)
        );

        // Serve the file with proper headers
        return new Response(Buffer.from(fileData.body), {
            status: 200,
            headers
        });

    } catch (err: any) {
        if (err?.status) throw err;
        console.error('Error serving cover photo:', err?.message);
        if (err?.message?.includes('Missing Backblaze credentials')) {
            return error(503, 'Cover image storage is not configured');
        }

        // Return proper error based on error type
        if (err.message?.includes('NoSuchKey') || err.$metadata?.httpStatusCode === 404) {
            return error(404, 'Cover photo not found');
        }

        return error(500, 'Failed to serve cover photo');
    }
};

/**
 * HEAD - Get file metadata without downloading the full file
 * Useful for checking if file exists and its properties
 */
export const HEAD: RequestHandler = async ({ params }) => {
    const fileName = normalizeCoverKey(params.fileName);
    if (!fileName) return error(400, 'Invalid cover path');

    try {
        // Use metadata call to avoid downloading entire body for HEAD
        const meta = await getFileMetadataFromB2(fileName);
        if (!meta.exists) {
            return error(404, 'Cover photo not found');
        }
        const extension = fileName.split('.').at(-1)?.toLowerCase();
        const contentType = extension ? IMAGE_TYPES[extension] : undefined;
        if (!contentType || !meta.contentType?.startsWith('image/')) {
            return error(415, 'Unsupported cover image');
        }

        const headers = buildResponseHeaders(
            contentType,
            meta.contentLength,
            fileName,
            true
        );

        // Return empty body for HEAD request
        return new Response(null, {
            status: 200,
            headers
        });
    } catch (err: any) {
        if (err?.status) throw err;
        console.error('Error checking cover photo:', err?.message);
        if (err?.message?.includes('Missing Backblaze credentials')) {
            return error(503, 'Cover image storage is not configured');
        }

        if (err.message?.includes('NoSuchKey') || err.$metadata?.httpStatusCode === 404) {
            return error(404, 'Cover photo not found');
        }

        return error(500, 'Failed to check cover photo');
    }
};
