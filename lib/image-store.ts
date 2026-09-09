import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Puzzle photos live as files on disk, not inside the AsyncStorage blob.
 *
 * Storing them as base64 data URIs on the puzzle record meant every photo was
 * serialised into the single `puzzle_tracker_data` key. Android's AsyncStorage
 * defaults to a 6 MB database, so a few dozen photos filled it and every
 * subsequent write failed. Here images are written to the app's document
 * directory and only the file URI is persisted.
 *
 * Backups are the exception: an export inlines the images as data URIs again so
 * the file stays self-contained and portable between devices, and an import
 * writes them back out to disk.
 */

const IMAGE_DIR_NAME = 'puzzle-images';

/** Web has no usable filesystem here, so images stay inline as data URIs there. */
export const supportsImageFiles = Platform.OS !== 'web';

export function isDataUri(uri: string): boolean {
    return uri.startsWith('data:');
}

function ensureImageDirectory(): Directory {
    const dir = new Directory(Paths.document, IMAGE_DIR_NAME);
    dir.create({ idempotent: true, intermediates: true });
    return dir;
}

/** Unique per call, so replacing a photo never collides with a cached image. */
function uniqueName(extension: string): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

function normaliseExtension(raw: string): string {
    const ext = raw.replace(/^\./, '').toLowerCase();
    return ext === 'png' || ext === 'webp' || ext === 'jpg' ? ext : 'jpg';
}

function parseDataUri(dataUri: string): { base64: string; extension: string } | null {
    const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(dataUri);
    if (!match) return null;
    const subtype = match[1].toLowerCase();
    return {
        base64: match[2],
        extension: normaliseExtension(subtype === 'jpeg' ? 'jpg' : subtype),
    };
}

function mimeTypeFor(extension: string): string {
    const ext = normaliseExtension(extension);
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
}

/**
 * Copies a freshly picked image into the app's own storage.
 * Returns the stored file URI, or the source URI unchanged on web.
 */
export function copyImageIntoStore(sourceUri: string): string {
    if (!supportsImageFiles) return sourceUri;

    const source = new File(sourceUri);
    const target = new File(ensureImageDirectory(), uniqueName(normaliseExtension(source.extension || 'jpg')));
    source.copy(target);
    return target.uri;
}

/**
 * Writes a base64 data URI out to a file. Used by the migration of existing
 * records and when importing a backup.
 */
export function writeImageFromDataUri(dataUri: string): string {
    const parsed = parseDataUri(dataUri);
    if (!parsed) throw new Error('Not a base64 image data URI');

    const file = new File(ensureImageDirectory(), uniqueName(parsed.extension));
    file.create({ overwrite: true });
    file.write(parsed.base64, { encoding: 'base64' });
    return file.uri;
}

/**
 * Reads a stored image back as a data URI so it can be embedded in a backup.
 * Returns null if the file has gone missing, so a broken image never blocks an export.
 */
export async function readImageAsDataUri(uri: string): Promise<string | null> {
    if (isDataUri(uri)) return uri;

    try {
        const file = new File(uri);
        if (!file.exists) return null;
        return `data:${mimeTypeFor(file.extension)};base64,${await file.base64()}`;
    } catch (e) {
        console.warn('Failed to read puzzle image for export', e);
        return null;
    }
}

/** Best-effort cleanup. A failure here leaks a file but must never break the app. */
export function deleteImage(uri?: string | null): void {
    if (!uri || !supportsImageFiles || isDataUri(uri)) return;

    try {
        const file = new File(uri);
        if (file.exists) file.delete();
    } catch (e) {
        console.warn('Failed to delete puzzle image', e);
    }
}
