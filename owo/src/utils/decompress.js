import zlib from "zlib";
import { logger } from "./logger.js";
/**
 * Decompress data using various compression algorithms
 * @param data - Compressed data as string or Buffer
 * @param method - Compression method to use, or "auto" to try all methods
 * @returns DecompressionResult with decompressed data or error
 */
export function decompress(data, method = "auto") {
    try {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');
        if (method !== "auto") {
            return decompressSingle(buffer, method);
        }
        // Try all compression methods when auto is selected
        const methods = ["gzip", "deflate", "br", "zstd"];
        for (const compressionMethod of methods) {
            const result = decompressSingle(buffer, compressionMethod);
            if (result.success) {
                return result;
            }
        }
        return {
            success: false,
            error: "All decompression methods failed"
        };
    }
    catch (error) {
        logger.error(`Decompression error: ${error}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown decompression error"
        };
    }
}
/**
 * Decompress data using a specific compression method
 * @param buffer - Data buffer to decompress
 * @param method - Specific compression method to use
 * @returns DecompressionResult
 */
function decompressSingle(buffer, method) {
    try {
        let decompressed;
        switch (method) {
            case "gzip":
                decompressed = zlib.gunzipSync(buffer);
                break;
            case "deflate":
                decompressed = zlib.inflateSync(buffer);
                break;
            case "br":
                decompressed = zlib.brotliDecompressSync(buffer);
                break;
            case "zstd":
                // Check if Node.js version supports zstd (18.17.0+)
                if (typeof zlib.zstdSync === "function") {
                    decompressed = zlib.zstdSync(buffer);
                }
                else {
                    throw new Error("Zstd decompression not supported in this Node.js version");
                }
                break;
            default:
                throw new Error(`Unsupported compression method: ${method}`);
        }
        const result = decompressed.toString('utf8');
        return {
            success: true,
            data: result,
            method: method
        };
    }
    catch (error) {
        return {
            success: false,
            method: method,
            error: error instanceof Error ? error.message : `${method} decompression failed`
        };
    }
}
/**
 * Try to decompress and parse JSON data
 * @param data - Compressed data as string or Buffer
 * @param method - Compression method to use, or "auto" to try all methods
 * @returns Parsed JSON object or null if failed
 */
export function decompressJSON(data, method = "auto") {
    const result = decompress(data, method);
    if (!result.success || !result.data) {
        logger.error(`Failed to decompress data: ${result.error}`);
        return null;
    }
    try {
        const jsonData = JSON.parse(result.data);
        logger.debug(`Successfully decompressed JSON using ${result.method}`);
        return jsonData;
    }
    catch (error) {
        logger.error(`Failed to parse decompressed data as JSON: ${error}`);
        return null;
    }
}
/**
 * Check if data appears to be compressed based on magic bytes
 * @param data - Data to check
 * @returns Detected compression type or null if not compressed
 */
export function detectCompression(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');
    if (buffer.length < 2) {
        return null;
    }
    // Check magic bytes for different compression formats
    const firstBytes = buffer.subarray(0, 4);
    // Gzip magic bytes: 1f 8b
    if (firstBytes[0] === 0x1f && firstBytes[1] === 0x8b) {
        return "gzip";
    }
    // Zlib/Deflate magic bytes: 78 (various second bytes)
    if (firstBytes[0] === 0x78) {
        return "deflate";
    }
    // Brotli doesn't have standard magic bytes, but check for common patterns
    // This is less reliable than other formats
    // Zstd magic bytes: 28 b5 2f fd
    if (firstBytes[0] === 0x28 && firstBytes[1] === 0xb5 &&
        firstBytes[2] === 0x2f && firstBytes[3] === 0xfd) {
        return "zstd";
    }
    return null;
}
/**
 * Utility function to handle potentially compressed HTTP response data
 * @param data - Response data that might be compressed
 * @param contentEncoding - Content-Encoding header value
 * @returns Decompressed data or original data if not compressed
 */
export function handleHTTPResponse(data, contentEncoding) {
    // If data is already an object, it's likely already decompressed
    if (typeof data === 'object' && data !== null) {
        return data;
    }
    // If it's a string with binary data indicators, try decompression
    if (typeof data === 'string' && (data.includes('\x00') || data.includes('�'))) {
        // Try decompression based on Content-Encoding header first
        if (contentEncoding) {
            const method = contentEncoding.toLowerCase();
            const result = decompress(data, method);
            if (result.success && result.data) {
                try {
                    return JSON.parse(result.data);
                }
                catch {
                    return result.data;
                }
            }
        }
        // Fallback to auto-detection
        const result = decompress(data, "auto");
        if (result.success && result.data) {
            try {
                return JSON.parse(result.data);
            }
            catch {
                return result.data;
            }
        }
    }
    // Return original data if decompression fails or isn't needed
    return data;
}
