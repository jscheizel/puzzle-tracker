import { AppData, Puzzle, TimeEntry } from '@/constants/store-types';
import { usePuzzleData } from '@/hooks/use-puzzle-data';
import React, { createContext, ReactNode, useContext } from 'react';

interface PuzzleContextType {
    puzzles: Puzzle[];
    timeEntries: TimeEntry[];
    isLoading: boolean;
    /** Set when writing to storage failed. The UI must surface this — data is unsaved. */
    persistError: string | null;
    /** Set when reading from storage failed. Writes stay blocked until a load succeeds. */
    loadError: string | null;
    retryPersist: () => Promise<boolean>;
    addPuzzle: (puzzle: Omit<Puzzle, 'id'>) => Puzzle;
    addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => TimeEntry;
    updatePuzzle: (puzzle: Puzzle) => void;
    updateTimeEntry: (entry: TimeEntry) => void;
    deletePuzzle: (puzzleId: string) => void;
    deleteTimeEntry: (entryId: string) => void;
    getPuzzleEntries: (puzzleId: string) => TimeEntry[];
    getBestTime: (puzzleId: string) => number | null;
    getBestPPM: (puzzleId: string) => number | null;
    /** A portable snapshot with images inlined, for writing a backup file. */
    getExportData: () => Promise<AppData>;
    refresh: () => Promise<void>;
    importData: (data: AppData) => Promise<void>;
}

const PuzzleContext = createContext<PuzzleContextType | undefined>(undefined);

export function PuzzleProvider({ children }: { children: ReactNode }) {
    const puzzleData = usePuzzleData();

    return (
        <PuzzleContext.Provider value={puzzleData}>
            {children}
        </PuzzleContext.Provider>
    );
}

export function usePuzzles() {
    const context = useContext(PuzzleContext);
    if (context === undefined) {
        throw new Error('usePuzzles must be used within a PuzzleProvider');
    }
    return context;
}
