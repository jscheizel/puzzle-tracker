import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Puzzle } from '@/constants/store-types';
import { Colors } from '@/constants/theme';
import { usePuzzles } from '@/context/PuzzleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddTimeScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { puzzles, addTimeEntry } = usePuzzles();
    const router = useRouter();
    const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>();

    const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);

    useEffect(() => {
        if (puzzleId && puzzles.length > 0) {
            const found = puzzles.find(p => p.id === puzzleId);
            if (found) setSelectedPuzzle(found);
        }
    }, [puzzleId, puzzles]);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [flippingTime, setFlippingTime] = useState<number | null>(null);
    const [edgeTime, setEdgeTime] = useState<number | null>(null);
    const [isPuzzleModalVisible, setIsPuzzleModalVisible] = useState(false);

    // Manual entry state
    const [manualH, setManualH] = useState(0);
    const [manualM, setManualM] = useState(0);
    const [manualS, setManualS] = useState(0);
    const [sessionName, setSessionName] = useState('');

    const startTimeRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef<number>(0);
    const timerRef = useRef<any>(null);

    // Keep screen awake while timer is running and not paused
    useEffect(() => {
        if (isTimerRunning && !isPaused) {
            activateKeepAwakeAsync();
        } else {
            deactivateKeepAwake();
        }
        return () => {
            deactivateKeepAwake();
        };
    }, [isTimerRunning, isPaused]);

    // Handle AppState changes (e.g. returning from background)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && isTimerRunning && !isPaused && startTimeRef.current) {
                // Refresh the display immediately when coming back
                const now = Date.now();
                const total = accumulatedTimeRef.current + Math.floor((now - startTimeRef.current) / 1000);
                setSeconds(total);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isTimerRunning, isPaused]);

    useEffect(() => {
        if (isTimerRunning && !isPaused) {
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const total = accumulatedTimeRef.current + Math.floor((now - (startTimeRef.current ?? now)) / 1000);
                setSeconds(total);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, isPaused]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        if (!selectedPuzzle) {
            Alert.alert('Error', 'Please select a puzzle first.');
            return;
        }

        const manualTotal = manualH * 3600 + manualM * 60 + manualS;

        // Final sync of seconds if timer is still running
        let finalSeconds = seconds;
        if (isTimerRunning && !isPaused && startTimeRef.current) {
            finalSeconds = accumulatedTimeRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        }

        // Prioritize manual entry if it's set to something non-zero
        const totalSeconds = manualTotal > 0 ? manualTotal : finalSeconds;

        if (totalSeconds === 0) {
            Alert.alert('Error', 'Time cannot be zero. Use the timer or enter time manually.');
            return;
        }

        addTimeEntry({
            puzzleId: selectedPuzzle.id,
            timeInSeconds: totalSeconds,
            date: new Date().toISOString(),
            flippingTimeInSeconds: flippingTime || undefined,
            edgeTimeInSeconds: edgeTime || undefined,
            name: sessionName.trim() || undefined,
        });

        Alert.alert('Success', 'Time entry saved!', [
            { text: 'OK', onPress: () => router.replace('/') }
        ]);

        // Reset all recording states
        setSeconds(0);
        setIsTimerRunning(false);
        setIsPaused(false);
        setFlippingTime(null);
        setEdgeTime(null);
        setManualH(0);
        setManualM(0);
        setManualS(0);
        setSessionName('');
        startTimeRef.current = null;
        accumulatedTimeRef.current = 0;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.background }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView
                style={[styles.container, { backgroundColor: theme.background }]}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
            >
                <ThemedView style={styles.header}>
                    <ThemedText type="title">Track Session</ThemedText>
                    <ThemedText style={styles.subtitle}>Ready for a new record?</ThemedText>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle">1. Select Puzzle</ThemedText>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setIsPuzzleModalVisible(true)}
                    >
                        <ThemedText style={{ color: selectedPuzzle ? theme.text : theme.icon }}>
                            {selectedPuzzle ? `${selectedPuzzle.title} (${selectedPuzzle.pieces}pcs)` : 'Choose a puzzle...'}
                        </ThemedText>
                        <IconSymbol name="chevron.right" size={20} color={theme.icon} />
                    </TouchableOpacity>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle">2. Session Name (Optional)</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="e.g. Afternoon session, Rainy day..."
                        placeholderTextColor={theme.icon}
                        value={sessionName}
                        onChangeText={setSessionName}
                    />
                </ThemedView>

                <ThemedView style={[styles.timerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <ThemedText style={styles.timerLabel}>Live Timer</ThemedText>
                    <ThemedText style={styles.timerText}>{formatTime(seconds)}</ThemedText>

                    <View style={styles.buttonRow}>
                        {!isTimerRunning ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.accent }]}
                                    onPress={() => {
                                        startTimeRef.current = Date.now();
                                        setIsTimerRunning(true);
                                    }}
                                >
                                    <IconSymbol name="timer" size={24} color="#000" />
                                    <ThemedText style={styles.buttonText}>Start</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.border }]}
                                    onPress={() => {
                                        setSeconds(0);
                                        setFlippingTime(null);
                                        setEdgeTime(null);
                                        startTimeRef.current = null;
                                        accumulatedTimeRef.current = 0;
                                    }}
                                >
                                    <ThemedText style={[styles.buttonText, { color: theme.text }]}>Reset</ThemedText>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.timerControls}>
                                <View style={styles.controlRow}>
                                    <TouchableOpacity
                                        style={[styles.smallButton, { backgroundColor: flippingTime ? theme.border : theme.accent }]}
                                        onPress={() => !flippingTime && setFlippingTime(seconds)}
                                        disabled={!!flippingTime}
                                    >
                                        <ThemedText style={[styles.buttonText, { fontSize: 12 }]}>
                                            {flippingTime ? `Flipped: ${formatTime(flippingTime)}` : 'Flipping'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.smallButton, { backgroundColor: edgeTime ? theme.border : theme.accent }]}
                                        onPress={() => !edgeTime && setEdgeTime(seconds)}
                                        disabled={!!edgeTime}
                                    >
                                        <ThemedText style={[styles.buttonText, { fontSize: 12 }]}>
                                            {edgeTime ? `Edge: ${formatTime(edgeTime)}` : 'Edge'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.controlRow}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: theme.border, flex: 1 }]}
                                        onPress={() => {
                                            if (!isPaused) {
                                                // Pausing: accumulate time
                                                if (startTimeRef.current) {
                                                    accumulatedTimeRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
                                                    startTimeRef.current = null;
                                                }
                                            } else {
                                                // Resuming: set new start time
                                                startTimeRef.current = Date.now();
                                            }
                                            setIsPaused(!isPaused);
                                        }}
                                    >
                                        <ThemedText style={[styles.buttonText, { color: theme.text }]}>
                                            {isPaused ? 'Resume' : 'Pause'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#EF4444', flex: 1 }]}
                                        onPress={() => {
                                            if (!isPaused && startTimeRef.current) {
                                                accumulatedTimeRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
                                                startTimeRef.current = null;
                                            }
                                            setIsTimerRunning(false);
                                        }}
                                    >
                                        <ThemedText style={styles.buttonText}>Stop</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle">Or Manual Entry</ThemedText>
                    <View style={styles.manualEntryRow}>
                        <TimeInput label="HH" value={manualH} onChange={setManualH} theme={theme} />
                        <TimeInput label="MM" value={manualM} onChange={setManualM} theme={theme} />
                        <TimeInput label="SS" value={manualS} onChange={setManualS} theme={theme} />
                    </View>
                </ThemedView>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.tint, opacity: selectedPuzzle ? 1 : 0.5 }]}
                    onPress={handleSave}
                >
                    <ThemedText style={styles.saveButtonText}>Save Entry</ThemedText>
                </TouchableOpacity>

                {/* Puzzle Selection Modal */}
                <Modal visible={isPuzzleModalVisible} animationType="slide" transparent>
                    <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <ThemedView style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">Select Puzzle</ThemedText>
                                <TouchableOpacity onPress={() => setIsPuzzleModalVisible(false)}>
                                    <ThemedText style={{ color: theme.tint }}>Close</ThemedText>
                                </TouchableOpacity>
                            </View>
                            {puzzles.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <ThemedText>No puzzles in collection.</ThemedText>
                                </View>
                            ) : (
                                <FlatList
                                    data={puzzles}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.modalItem}
                                            onPress={() => {
                                                setSelectedPuzzle(item);
                                                setIsPuzzleModalVisible(false);
                                            }}
                                        >
                                            <ThemedText>{item.title} ({item.pieces}pcs)</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </ThemedView>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function TimeInput({ label, value, onChange, theme }: any) {
    const [displayValue, setDisplayValue] = React.useState(value.toString().padStart(2, '0'));

    // Sync from parent if changed externally (e.g. Save/Reset)
    React.useEffect(() => {
        const currentNumericValue = parseInt(displayValue) || 0;
        if (value !== currentNumericValue || displayValue === '') {
            setDisplayValue(value.toString().padStart(2, '0'));
        }
    }, [value]);

    return (
        <View style={[styles.halfInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={styles.label}>{label}</ThemedText>
            <TextInput
                style={[styles.valueInput, { color: theme.text }]}
                value={displayValue}
                onChangeText={(text: string) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setDisplayValue(cleaned);

                    if (cleaned !== '') {
                        const num = parseInt(cleaned);
                        const max = label === 'HH' ? 99 : 59;
                        const finalNum = Math.min(num, max);
                        onChange(finalNum);

                        // If user typed a number that got capped (e.g. 70 -> 59), 
                        // update display immediately to match.
                        if (num > max) {
                            setDisplayValue(max.toString());
                        }
                    } else {
                        onChange(0);
                    }
                }}
                onBlur={() => {
                    setDisplayValue(value.toString().padStart(2, '0'));
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginTop: 60,
        marginBottom: 30,
        backgroundColor: 'transparent',
    },
    subtitle: {
        opacity: 0.6,
        marginTop: 4,
    },
    timerCard: {
        padding: 30,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    timerLabel: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.6,
        marginBottom: 10,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '700',
        lineHeight: 60,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 8,
    },
    buttonText: {
        color: '#000',
        fontWeight: '600',
    },
    timerControls: {
        width: '100%',
        gap: 12,
    },
    controlRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    smallButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 16,
    },
    section: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 10,
    },
    manualEntryRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    halfInput: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        opacity: 0.6,
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: '600',
    },
    valueInput: {
        fontSize: 24,
        fontWeight: '700',
        padding: 0,
        textAlign: 'center',
        width: '100%',
    },
    saveButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 50,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '50%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
});
