import { AppData, Puzzle, TimeEntry } from '@/constants/store-types';
import {
    copyImageIntoStore,
    deleteImage,
    isDataUri,
    readImageAsDataUri,
    supportsImageFiles,
    writeImageFromDataUri,
} from '@/lib/image-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'puzzle_tracker_data';

const EMPTY_DATA: AppData = { puzzles: [], timeEntries: [] };

function describeError(e: unknown): string {
    if (e instanceof Error && e.message) return e.message;
    return String(e);
}

function isAppDataShaped(value: unknown): value is AppData {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<AppData>;
    return Array.isArray(candidate.puzzles) && Array.isArray(candidate.timeEntries);
}

/**
 * Photos used to be persisted as base64 data URIs inside the storage blob.
 * On load, move any that are still inline out to real files. A photo that
 * fails to migrate keeps its data URI rather than being dropped.
 */
function migrateInlineImages(puzzles: Puzzle[]): { puzzles: Puzzle[]; migrated: number } {
    if (!supportsImageFiles) return { puzzles, migrated: 0 };

    let migrated = 0;
    const next = puzzles.map(puzzle => {
        if (!puzzle.imageUri || !isDataUri(puzzle.imageUri)) return puzzle;
        try {
            const imageUri = writeImageFromDataUri(puzzle.imageUri);
            migrated += 1;
            return { ...puzzle, imageUri };
        } catch (e) {
            console.warn(`Could not migrate image for puzzle ${puzzle.id}`, e);
            return puzzle;
        }
    });

    return { puzzles: next, migrated };
}

/** Materialises any inline images in imported data out to files. */
function materialiseImportedImages(puzzles: Puzzle[]): Puzzle[] {
    if (!supportsImageFiles) return puzzles;

    return puzzles.map(puzzle => {
        if (!puzzle.imageUri || !isDataUri(puzzle.imageUri)) return puzzle;
        try {
            return { ...puzzle, imageUri: writeImageFromDataUri(puzzle.imageUri) };
        } catch (e) {
            console.warn(`Could not store imported image for puzzle ${puzzle.id}`, e);
            return { ...puzzle, imageUri: null };
        }
    });
}

export function usePuzzleData() {
    const [data, setData] = useState<AppData>(EMPTY_DATA);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Guards the write-back. If the initial read failed we do NOT know what is
     * on disk, and persisting the empty in-memory state would destroy it.
     * Only a load that actually succeeded unlocks writing.
     */
    const [canPersist, setCanPersist] = useState(false);
    const [persistError, setPersistError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);

            if (jsonValue != null) {
                const parsed = JSON.parse(jsonValue);
                if (!isAppDataShaped(parsed)) throw new Error('Stored data is not in the expected format');

                const { puzzles, migrated } = migrateInlineImages(parsed.puzzles);
                if (migrated > 0) console.log(`Migrated ${migrated} inline puzzle image(s) to files`);
                setData({ puzzles, timeEntries: parsed.timeEntries });
            }

            setLoadError(null);
            setCanPersist(true);
        } catch (e) {
            console.error('Failed to load data', e);
            setLoadError(describeError(e));
            setCanPersist(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Persist whenever data changes, but never before a successful load.
    useEffect(() => {
        if (isLoading || !canPersist) return;

        let cancelled = false;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            .then(() => {
                if (!cancelled) setPersistError(null);
            })
            .catch(e => {
                console.error('Failed to persist data', e);
                if (!cancelled) setPersistError(describeError(e));
            });

        return () => {
            cancelled = true;
        };
    }, [data, isLoading, canPersist]);

    /** Forces the current in-memory state to be written again. */
    const retryPersist = useCallback(async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setPersistError(null);
            return true;
        } catch (e) {
            console.error('Retry failed to persist data', e);
            setPersistError(describeError(e));
            return false;
        }
    }, [data]);

    const addPuzzle = (puzzle: Omit<Puzzle, 'id'>) => {
        const newPuzzle: Puzzle = {
            ...puzzle,
            id: Date.now().toString(),
            imageUri: puzzle.imageUri ? copyImageIntoStore(puzzle.imageUri) : puzzle.imageUri,
        };
        setData(prev => ({
            ...prev,
            puzzles: [...prev.puzzles, newPuzzle]
        }));
        return newPuzzle;
    };

    const addTimeEntry = (entry: Omit<TimeEntry, 'id'>) => {
        const newEntry: TimeEntry = { ...entry, id: Date.now().toString() };
        setData(prev => ({
            ...prev,
            timeEntries: [...prev.timeEntries, newEntry]
        }));
        return newEntry;
    };

    const updatePuzzle = (updatedPuzzle: Puzzle) => {
        setData(prev => {
            const previous = prev.puzzles.find(p => p.id === updatedPuzzle.id);
            let imageUri = updatedPuzzle.imageUri;

            // A newly picked photo arrives as an external URI; copy it into our storage.
            if (imageUri && imageUri !== previous?.imageUri) {
                imageUri = copyImageIntoStore(imageUri);
            }
            // The old file is now unreferenced either way.
            if (previous?.imageUri && previous.imageUri !== imageUri) {
                deleteImage(previous.imageUri);
            }

            return {
                ...prev,
                puzzles: prev.puzzles.map(p => p.id === updatedPuzzle.id ? { ...updatedPuzzle, imageUri } : p)
            };
        });
    };

    const updateTimeEntry = (updatedEntry: TimeEntry) => {
        setData(prev => ({
            ...prev,
            timeEntries: prev.timeEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        }));
    };

    const deletePuzzle = (puzzleId: string) => {
        setData(prev => {
            deleteImage(prev.puzzles.find(p => p.id === puzzleId)?.imageUri);
            return {
                puzzles: prev.puzzles.filter(p => p.id !== puzzleId),
                timeEntries: prev.timeEntries.filter(t => t.puzzleId !== puzzleId)
            };
        });
    };

    const deleteTimeEntry = (entryId: string) => {
        setData(prev => ({
            ...prev,
            timeEntries: prev.timeEntries.filter(e => e.id !== entryId)
        }));
    };

    const getPuzzleEntries = (puzzleId: string) => {
        return data.timeEntries.filter(e => e.puzzleId === puzzleId);
    };

    const getBestTime = (puzzleId: string) => {
        const entries = getPuzzleEntries(puzzleId);
        if (entries.length === 0) return null;
        return Math.min(...entries.map(e => e.timeInSeconds));
    };

    const getBestPPM = (puzzleId: string) => {
        const puzzle = data.puzzles.find(p => p.id === puzzleId);
        if (!puzzle) return null;
        const entries = getPuzzleEntries(puzzleId);
        if (entries.length === 0) return null;

        const ppms = entries.map(e => {
            const minutes = e.timeInSeconds / 60;
            return minutes > 0 ? puzzle.pieces / minutes : 0;
        });
        return Math.max(...ppms);
    };

    /**
     * Builds a portable snapshot: images are inlined so the backup file works
     * on another device, where our local file paths mean nothing.
     */
    const getExportData = async (): Promise<AppData> => {
        const puzzles = await Promise.all(data.puzzles.map(async puzzle => {
            if (!puzzle.imageUri) return puzzle;
            return { ...puzzle, imageUri: await readImageAsDataUri(puzzle.imageUri) };
        }));

        return { puzzles, timeEntries: data.timeEntries };
    };

    const importData = async (newData: AppData) => {
        if (!isAppDataShaped(newData)) {
            throw new Error('Invalid data format');
        }

        const puzzles = materialiseImportedImages(newData.puzzles);

        // Everything the previous collection referenced is now unreachable.
        data.puzzles.forEach(puzzle => deleteImage(puzzle.imageUri));

        setData({ puzzles, timeEntries: newData.timeEntries });
        setCanPersist(true);
    };

    return {
        puzzles: data.puzzles,
        timeEntries: data.timeEntries,
        isLoading,
        persistError,
        loadError,
        retryPersist,
        addPuzzle,
        addTimeEntry,
        updatePuzzle,
        updateTimeEntry,
        deletePuzzle,
        deleteTimeEntry,
        getPuzzleEntries,
        getBestTime,
        getBestPPM,
        getExportData,
        refresh: loadData,
        importData
    };
}
