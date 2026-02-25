/**
 * Client-side utility for converting B2 URLs to proxy URLs
 * This ensures images are served through our secure proxy endpoint
 */

/**
 * Convert B2 URLs to proxy URLs or ensure they're already in proxy format
 * @param url - Direct B2 URL or already-proxied URL
 * @returns Proxy URL for the image
 */
export function ensureProxiedUrl(url: string | null): string | null {
    if (!url) return null;

    // Already a proxy URL - return as is
    if (url.startsWith('/api/images/cover/')) {
        return url;
    }

    // Direct B2 URL - convert to proxy format
    if (url.includes('backblazeb2.com')) {
        try {
            // URLs might be encoded: covers%2F or decoded: covers/
            // Extract everything after the bucket name
            // Format: https://s3.{region}.backblazeb2.com/{bucket}/covers/...
            // or: https://e-kalibro.s3.us-east-005.backblazeb2.com/covers/...

            let filePath = '';

            // Try encoded format first
            const encodedMatch = url.match(/covers%2F.+/);
            if (encodedMatch) {
                filePath = decodeURIComponent(encodedMatch[0]);
            } else {
                // Try decoded format
                const decodedMatch = url.match(/covers\/.+/);
                if (decodedMatch) {
                    filePath = decodedMatch[0].replace(/^\//, '');
                }
            }

            if (filePath) {
                return `/api/images/cover/${encodeURIComponent(filePath)}`;
            }
        } catch (err) {
            console.error('Error converting B2 URL to proxy URL:', err, url);
        }
    }

    // Support plain relative paths that point at the covers folder
    // e.g., "covers/book-123.jpg" or "/covers/book-123.jpg"
    try {
        const relMatch = url.match(/(^\/)?covers\/.*$/);
        if (relMatch) {
            const filePath = url.replace(/^\//, '');
            return `/api/images/cover/${encodeURIComponent(filePath)}`;
        }
    } catch (err) {
        console.error('Error converting relative covers path to proxy URL:', err, url);
    }

    // Return original if can't parse
    return url;
}

/**
 * Check if a URL is already a proxy URL
 */
export function isProxyUrl(url: string | null): boolean {
    return url ? url.startsWith('/api/images/cover/') : false;
}

/**
 * Check if a URL is a direct B2 URL
 */
export function isB2Url(url: string | null): boolean {
    return url ? url.includes('backblazeb2.com') : false;
}
