import { AppData, Puzzle, TimeEntry } from '@/constants/store-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'puzzle_tracker_data';

export function usePuzzleData() {
    const [data, setData] = useState<AppData>({ puzzles: [], timeEntries: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    // Persist data whenever it changes
    useEffect(() => {
        if (!isLoading) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(e =>
                console.error('Failed to persist data', e)
            );
        }
    }, [data, isLoading]);

    const loadData = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            if (jsonValue != null) {
                setData(JSON.parse(jsonValue));
            }
        } catch (e) {
            console.error('Failed to load data', e);
        } finally {
            setIsLoading(false);
        }
    };

    const addPuzzle = (puzzle: Omit<Puzzle, 'id'>) => {
        const newPuzzle: Puzzle = { ...puzzle, id: Date.now().toString() };
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
        setData(prev => ({
            ...prev,
            puzzles: prev.puzzles.map(p => p.id === updatedPuzzle.id ? updatedPuzzle : p)
        }));
    };

    const updateTimeEntry = (updatedEntry: TimeEntry) => {
        setData(prev => ({
            ...prev,
            timeEntries: prev.timeEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        }));
    };

    const deletePuzzle = (puzzleId: string) => {
        setData(prev => ({
            puzzles: prev.puzzles.filter(p => p.id !== puzzleId),
            timeEntries: prev.timeEntries.filter(t => t.puzzleId !== puzzleId)
        }));
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

    const importData = async (newData: AppData) => {
        if (!newData.puzzles || !newData.timeEntries) {
            throw new Error('Invalid data format');
        }
        setData(newData);
    };

    return {
        puzzles: data.puzzles,
        timeEntries: data.timeEntries,
        isLoading,
        addPuzzle,
        addTimeEntry,
        updatePuzzle,
        updateTimeEntry,
        deletePuzzle,
        deleteTimeEntry,
        getPuzzleEntries,
        getBestTime,
        getBestPPM,
        refresh: loadData,
        importData
    };
}
