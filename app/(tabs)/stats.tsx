import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { usePuzzles } from '@/context/PuzzleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

export default function StatsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { puzzles, timeEntries } = usePuzzles();

    const stats = useMemo(() => {
        if (timeEntries.length === 0) return null;

        const totalSeconds = timeEntries.reduce((acc, e) => acc + (e.timeInSeconds || 0), 0);
        const totalPieces = timeEntries.reduce((acc, e) => {
            const puzzle = puzzles.find(p => p.id === e.puzzleId);
            return acc + (puzzle?.pieces || 0);
        }, 0);

        const ppms = timeEntries.map(e => {
            const puzzle = puzzles.find(p => p.id === e.puzzleId);
            const pieces = puzzle?.pieces || 0;
            const minutes = (e.timeInSeconds || 0) / 60;
            return minutes > 0 ? pieces / minutes : 0;
        }).filter(p => p > 0);

        const bestPPM = ppms.length > 0 ? Math.max(...ppms) : 0;
        const avgPPM = ppms.length > 0 ? ppms.reduce((a, b) => a + b, 0) / ppms.length : 0;

        // Group by piece count
        const bySize: Record<number, { count: number, totalPPM: number }> = {};
        timeEntries.forEach(e => {
            const puzzle = puzzles.find(p => p.id === e.puzzleId);
            if (!puzzle) return;
            const size = puzzle.pieces;
            const minutes = (e.timeInSeconds || 0) / 60;
            const ppm = minutes > 0 ? size / minutes : 0;
            if (!bySize[size]) bySize[size] = { count: 0, totalPPM: 0 };
            bySize[size].count += 1;
            bySize[size].totalPPM += ppm;
        });

        const sizeStats = Object.entries(bySize).map(([size, data]) => ({
            size: parseInt(size),
            avgPPM: data.totalPPM / data.count,
            count: data.count
        })).sort((a, b) => a.size - b.size);

        // Group by month
        const byMonth: Record<string, { pieces: number }> = {};
        timeEntries.forEach(e => {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { pieces: 0 };
            const puzzle = puzzles.find(p => p.id === e.puzzleId);
            byMonth[key].pieces += (puzzle?.pieces || 0);
        });

        const monthStats = Object.entries(byMonth)
            .map(([key, data]) => ({ key, pieces: data.pieces }))
            .sort((a, b) => b.key.localeCompare(a.key))
            .slice(0, 6)
            .reverse();

        // Top 3 Puzzles by PPM
        const puzzleSpeeds: Record<string, number[]> = {};
        timeEntries.forEach(e => {
            const puzzle = puzzles.find(p => p.id === e.puzzleId);
            if (!puzzle) return;
            const minutes = (e.timeInSeconds || 0) / 60;
            if (minutes > 0) {
                if (!puzzleSpeeds[e.puzzleId]) puzzleSpeeds[e.puzzleId] = [];
                puzzleSpeeds[e.puzzleId].push(puzzle.pieces / minutes);
            }
        });

        const topPuzzles = Object.entries(puzzleSpeeds)
            .map(([id, ppms]) => ({
                id,
                bestPPM: Math.max(...ppms),
                title: puzzles.find(p => p.id === id)?.title || 'Unknown',
                imageUri: puzzles.find(p => p.id === id)?.imageUri
            }))
            .sort((a, b) => b.bestPPM - a.bestPPM)
            .slice(0, 3);

        return {
            totalSeconds,
            totalPieces,
            bestPPM,
            avgPPM,
            sizeStats,
            monthStats,
            topPuzzles,
            totalSessions: timeEntries.length
        };
    }, [puzzles, timeEntries]);

    if (!stats) {
        return (
            <ThemedView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <IconSymbol name="chart.bar.fill" size={64} color={theme.icon} style={{ opacity: 0.2, marginBottom: 20 }} />
                <ThemedText type="subtitle" style={{ opacity: 0.5 }}>No statistics available yet.</ThemedText>
                <ThemedText style={{ opacity: 0.3, marginTop: 8 }}>Complete your first puzzle to see insights!</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.header}>
                <ThemedText type="title">Insights</ThemedText>
                <ThemedText style={styles.subtitle}>Your puzzling journey in numbers</ThemedText>
            </View>

            <View style={styles.statsGrid}>
                <SummaryCard
                    title="Total Time"
                    value={formatTime(stats.totalSeconds)}
                    icon="timer"
                    color="#8B5CF6"
                    theme={theme}
                />
                <SummaryCard
                    title="Total Pieces"
                    value={stats.totalPieces.toLocaleString()}
                    icon="grid.fill"
                    color="#06B6D4"
                    theme={theme}
                />
                <SummaryCard
                    title="Best PPM"
                    value={stats.bestPPM.toFixed(1)}
                    icon="bolt.fill"
                    color="#F59E0B"
                    theme={theme}
                />
                <SummaryCard
                    title="Sessions"
                    value={stats.totalSessions.toString()}
                    icon="list.bullet"
                    color="#EC4899"
                    theme={theme}
                />
            </View>

            <Section title="Average Speed by Size" theme={theme} icon="ruler.fill">
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {stats.sizeStats.map((item, index) => (
                        <View key={item.size} style={[styles.barRow, index < stats.sizeStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border + '20' }]}>
                            <View style={styles.barInfo}>
                                <ThemedText style={styles.barLabel}>{item.size} pcs</ThemedText>
                                <ThemedText style={styles.barValue}>{item.avgPPM.toFixed(1)} PPM</ThemedText>
                            </View>
                            <View style={styles.barContainer}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            backgroundColor: theme.accent,
                                            width: `${Math.min(100, (item.avgPPM / stats.bestPPM) * 100)}%`
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </Section>

            <Section title="Monthly Progress" theme={theme} icon="calendar">
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {stats.monthStats.map((item: any, index: number) => {
                        const [year, month] = item.key.split('-');
                        const monthName = MONTHS[parseInt(month) - 1];
                        const maxPieces = Math.max(...stats.monthStats.map((m: any) => m.pieces));

                        return (
                            <View key={item.key} style={[styles.monthRow, index < stats.monthStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border + '20' }]}>
                                <View style={styles.monthInfo}>
                                    <ThemedText style={styles.barLabel}>{monthName} {year}</ThemedText>
                                    <ThemedText style={styles.barValue}>{item.pieces.toLocaleString()} pcs</ThemedText>
                                </View>
                                <View style={styles.barContainer}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                backgroundColor: '#8B5CF6',
                                                width: `${Math.min(100, (item.pieces / maxPieces || 1) * 100)}%`
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </Section>

            <Section title="Top Performer Puzzles" theme={theme} icon="star.fill">
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {stats.topPuzzles.map((item, index) => (
                        <View key={item.id} style={[styles.topPuzzleRow, index < stats.topPuzzles.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border + '20' }]}>
                            <View style={[styles.rankCircle, { backgroundColor: theme.accent + '20' }]}>
                                <ThemedText style={{ color: theme.accent, fontWeight: '800' }}>#{index + 1}</ThemedText>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <ThemedText style={styles.topPuzzleTitle} numberOfLines={1}>{item.title}</ThemedText>
                                <ThemedText style={styles.topPuzzleSpeed}>{item.bestPPM.toFixed(1)} PPM</ThemedText>
                            </View>
                            <IconSymbol name="chevron.right" size={16} color={theme.icon} style={{ opacity: 0.3 }} />
                        </View>
                    ))}
                </View>
            </Section>

            <View style={styles.efficiencyBonus}>
                <View style={[styles.bonusCard, { backgroundColor: theme.accent + '20', borderColor: theme.accent }]}>
                    <IconSymbol name="star.fill" size={24} color={theme.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText style={{ fontWeight: '700', color: theme.text }}>Efficiency Goal</ThemedText>
                        <ThemedText style={{ fontSize: 13, opacity: 0.7, color: theme.text }}>
                            Your average speed is {stats.avgPPM.toFixed(1)} PPM. Try to hit {(stats.avgPPM * 1.1).toFixed(1)} PPM in your next session!
                        </ThemedText>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

function SummaryCard({ title, value, icon, color, theme }: any) {
    return (
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
                <IconSymbol name={icon} size={20} color={color} />
            </View>
            <ThemedText style={styles.summaryValue}>{value}</ThemedText>
            <ThemedText style={styles.summaryTitle}>{title}</ThemedText>
        </View>
    );
}

function Section({ title, children, theme, icon }: any) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <IconSymbol name={icon} size={18} color={theme.tint} />
                <ThemedText type="subtitle" style={{ marginLeft: 8 }}>{title}</ThemedText>
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    subtitle: {
        opacity: 0.6,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 18,
        gap: 12,
        marginBottom: 32,
    },
    summaryCard: {
        width: (width - 48 - 12) / 2,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    summaryTitle: {
        fontSize: 12,
        opacity: 0.6,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    barRow: {
        padding: 16,
    },
    monthRow: {
        padding: 16,
    },
    topPuzzleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    rankCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topPuzzleTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    topPuzzleSpeed: {
        fontSize: 12,
        opacity: 0.6,
        fontWeight: '600',
    },
    barInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    monthInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    barLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    barValue: {
        fontSize: 13,
        opacity: 0.7,
        fontWeight: '700',
    },
    barContainer: {
        height: 8,
        backgroundColor: 'rgba(128,128,128,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: 4,
    },
    efficiencyBonus: {
        paddingHorizontal: 24,
        marginTop: 8,
    },
    bonusCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
    },
});
