import { Colors } from '@/constants/theme';
import { usePuzzles } from '@/context/PuzzleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Storage failures used to be swallowed into console.error: the UI kept showing
 * the new session as saved while nothing had been written, and the data was gone
 * on next launch. This makes that state impossible to miss.
 *
 * Rendered above the tab bar on every screen, and only when something is wrong.
 */
export function StorageErrorBanner() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { persistError, loadError, retryPersist, refresh } = usePuzzles();
    const [isRetrying, setIsRetrying] = React.useState(false);

    if (!persistError && !loadError) return null;

    // A failed read is the more serious of the two: writing is blocked entirely
    // until it succeeds, so we do not overwrite data we could not read.
    const isLoadFailure = !!loadError;

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            if (isLoadFailure) {
                await refresh();
            } else {
                await retryPersist();
            }
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: '#EF4444' }]}>
            <View style={styles.stripe} />
            <View style={styles.body}>
                <Text style={[styles.title, { color: theme.text }]}>
                    {isLoadFailure ? 'Could not read your saved data' : 'Your changes are not saved'}
                </Text>
                <Text style={[styles.message, { color: theme.text }]}>
                    {isLoadFailure
                        ? 'Saving is paused so nothing already on this device gets overwritten. Try again, and avoid making changes until it works.'
                        : 'Storage is full or unavailable, so recent changes exist only in the app right now and will be lost if you close it. Export a backup once this succeeds.'}
                </Text>
                <Text style={[styles.detail, { color: theme.icon }]} numberOfLines={2}>
                    {loadError ?? persistError}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: '#EF4444', opacity: isRetrying ? 0.6 : 1 }]}
                onPress={handleRetry}
                disabled={isRetrying}
                accessibilityRole="button"
                accessibilityLabel={isLoadFailure ? 'Retry loading your data' : 'Retry saving your data'}
            >
                <Text style={styles.retryText}>{isRetrying ? '...' : 'Retry'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 96,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        paddingLeft: 0,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    stripe: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: '#EF4444',
        marginRight: 10,
    },
    body: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    message: {
        fontSize: 12,
        opacity: 0.75,
        lineHeight: 16,
    },
    detail: {
        fontSize: 10,
        opacity: 0.6,
        marginTop: 2,
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    retryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
});
