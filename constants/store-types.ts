export interface Puzzle {
    id: string;
    title: string;
    brand: string;
    pieces: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    imageUri?: string | null;
}

export interface TimeEntry {
    id: string;
    puzzleId: string;
    timeInSeconds: number;
    date: string;
    flippingTimeInSeconds?: number;
    edgeTimeInSeconds?: number;
    name?: string;
}

export interface AppData {
    puzzles: Puzzle[];
    timeEntries: TimeEntry[];
}
