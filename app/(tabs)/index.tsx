import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { usePuzzles } from '@/context/PuzzleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Dimensions, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseFormattedTime = (timeStr: string) => {
  const parts = timeStr.split(':').map(part => parseInt(part, 10));
  let totalSeconds = 0;
  if (parts.length === 3) {
    totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  } else if (parts.length === 2) {
    totalSeconds = (parts[0] * 60) + parts[1];
  } else if (parts.length === 1) {
    totalSeconds = parts[0];
  }
  return isNaN(totalSeconds) ? 0 : totalSeconds;
};

const formatDateForInput = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { puzzles, timeEntries, updateTimeEntry, importData, getExportData } = usePuzzles();
  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false);

  const handleExport = async () => {
    try {
      // Images live as files on disk; getExportData inlines them so the backup
      // is self-contained and restorable on another device.
      const data = await getExportData();

      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `puzzles_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const backupFile = new File(Paths.cache, 'puzzle_tracker_backup.json');
        backupFile.write(JSON.stringify(data), { encoding: 'utf8' });
        await Sharing.shareAsync(backupFile.uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (!result.canceled) {
        let fileContent = '';
        if (Platform.OS === 'web') {
          fileContent = await (await fetch(result.assets[0].uri)).text();
        } else {
          const pickedFile = new File(result.assets[0].uri);
          fileContent = await pickedFile.text();
        }

        const data = JSON.parse(fileContent);

        const proceedWithImport = async () => {
          try {
            await importData(data);
            setIsSettingsVisible(false);
            Alert.alert('Success', 'Data imported successfully');
          } catch (err) {
            Alert.alert('Error', 'Invalid data format');
          }
        };

        if (Platform.OS === 'web') {
          if (window.confirm('This will replace all your current data. Are you sure?')) {
            proceedWithImport();
          }
        } else {
          Alert.alert(
            'Import Data',
            'This will replace all your current data. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Import', style: 'destructive', onPress: proceedWithImport }
            ]
          );
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to import data. Please ensure the file is a valid JSON backup.');
    }
  };

  // Calculate Stats
  const totalPuzzles = puzzles.length;

  const ppmValues = timeEntries.map(entry => {
    const puzzle = puzzles.find(p => p.id === entry.puzzleId);
    const pieces = Number(puzzle?.pieces) || 0;
    const minutes = (Number(entry.timeInSeconds) || 0) / 60;
    return minutes > 0 ? pieces / minutes : 0;
  }).filter(v => v > 0);

  const bestPPM = ppmValues.length > 0 ? Math.max(...ppmValues) : 0;
  const avgPPM = ppmValues.length > 0
    ? ppmValues.reduce((acc, v) => acc + v, 0) / ppmValues.length
    : 0;

  const now = new Date();
  const thisMonthCount = timeEntries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const recentEntries = [...timeEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/header_bg.jpg')}
          style={styles.headerImage}
          contentFit="cover"
        />
        <View style={styles.headerOverlay}>
          <View style={styles.headerTopRow}>
            <ThemedText style={styles.welcomeText}>Welcome back, Solver</ThemedText>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => setIsSettingsVisible(true)}
            >
              <IconSymbol name="gearshape.fill" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ThemedText type="title" style={styles.headerTitle}>Dashboard</ThemedText>
        </View>
      </View>

      <Modal visible={isSettingsVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setIsSettingsVisible(false)}
          />
          <ThemedView style={[styles.settingsModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Settings & Backup</ThemedText>
              <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                <IconSymbol name="plus.circle.fill" size={24} color={theme.icon} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.settingsDescription}>
              Manage your puzzle data and backups here.
            </ThemedText>

            <View style={styles.settingsOptions}>
              <TouchableOpacity
                style={[styles.settingItem, { borderColor: theme.border }]}
                onPress={handleExport}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#8B5CF620' }]}>
                  <IconSymbol name="square.and.arrow.up" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.settingLabel}>Export Data</ThemedText>
                  <ThemedText style={styles.settingSubLabel}>Save your progress as a JSON file</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { borderColor: theme.border }]}
                onPress={handleImport}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#06B6D420' }]}>
                  <IconSymbol name="square.and.arrow.down" size={20} color="#06B6D4" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.settingLabel}>Import Data</ThemedText>
                  <ThemedText style={styles.settingSubLabel}>Restore data from a backup file</ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.tint }]}
              onPress={() => setIsSettingsVisible(false)}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Done</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      <ThemedView style={styles.content}>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Puzzles"
            value={totalPuzzles.toString()}
            icon="grid.fill"
            color="#8B5CF6"
            theme={theme}
          />
          <StatCard
            title="Best Speed"
            value={bestPPM > 0 ? `${bestPPM.toFixed(1)} PPM` : '--'}
            icon="bolt.fill"
            color="#06B6D4"
            theme={theme}
          />
          <StatCard
            title="Avg. Speed"
            value={avgPPM > 0 ? `${avgPPM.toFixed(1)} PPM` : '--'}
            icon="chart.bar.fill"
            color="#F59E0B"
            theme={theme}
          />
          <StatCard
            title="This Month"
            value={thisMonthCount.toString()}
            icon="timer"
            color="#EC4899"
            theme={theme}
          />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Recent Activity</ThemedText>
        </View>

        {recentEntries.length === 0 ? (
          <ThemedView style={{ alignItems: 'center', padding: 40, backgroundColor: 'transparent' }}>
            <ThemedText style={{ opacity: 0.5 }}>No sessions yet. Start puzzling!</ThemedText>
          </ThemedView>
        ) : (
          recentEntries.map(entry => {
            const puzzle = puzzles.find(p => p.id === entry.puzzleId);
            return (
              <RecentItem
                key={entry.id}
                item={entry}
                title={puzzle?.title || 'Unknown Puzzle'}
                pieces={puzzle?.pieces || 0}
                time={formatTime(entry.timeInSeconds)}
                date={new Date(entry.date).toLocaleDateString()}
                imageUri={puzzle?.imageUri}
                theme={theme}
                onUpdate={(updatedItem: any) => updateTimeEntry(updatedItem)}
              />
            );
          })
        )}
      </ThemedView>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color, theme }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statTitle}>{title}</ThemedText>
    </View>
  );
}

function RecentItem({ item, title, pieces, time, date, imageUri, theme, onUpdate }: any) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [newName, setNewName] = React.useState(item.name || '');
  const [newTime, setNewTime] = React.useState(time);
  const [newFlippingTime, setNewFlippingTime] = React.useState(item.flippingTimeInSeconds ? formatTime(item.flippingTimeInSeconds) : '');
  const [newEdgeTime, setNewEdgeTime] = React.useState(item.edgeTimeInSeconds ? formatTime(item.edgeTimeInSeconds) : '');
  const [newDate, setNewDate] = React.useState(formatDateForInput(item.date));

  const handleSave = () => {
    const timeInSeconds = parseFormattedTime(newTime);
    const flippingTimeInSeconds = newFlippingTime ? parseFormattedTime(newFlippingTime) : undefined;
    const edgeTimeInSeconds = newEdgeTime ? parseFormattedTime(newEdgeTime) : undefined;
    const dateObj = new Date(newDate);
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
      return;
    }

    onUpdate({
      ...item,
      name: newName,
      timeInSeconds,
      flippingTimeInSeconds,
      edgeTimeInSeconds,
      date: dateObj.toISOString()
    });
    setIsEditing(false);
  };

  return (
    <View style={[styles.recentItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flex: 1, flexDirection: isEditing ? 'column' : 'row', alignItems: isEditing ? 'stretch' : 'center' }}>
        <View style={styles.recentLeft}>
          {!isEditing && (
            imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePlaceholder} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
            )
          )}
          <View style={{ flex: 1, marginRight: 8 }}>
            <ThemedText style={styles.recentTitle} numberOfLines={1}>{title}</ThemedText>
            {isEditing ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <View>
                  <ThemedText style={styles.inputLabel}>Name</ThemedText>
                  <TextInput
                    style={[styles.nameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Session name..."
                    placeholderTextColor={theme.icon}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Date (YYYY-MM-DD)</ThemedText>
                    <TextInput
                      style={[styles.nameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                      value={newDate}
                      onChangeText={setNewDate}
                      placeholder="2024-01-01"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Time (H:MM:SS)</ThemedText>
                    <TextInput
                      style={[styles.nameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                      value={newTime}
                      onChangeText={setNewTime}
                      placeholder="1:23:45"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Flipping Time</ThemedText>
                    <TextInput
                      style={[styles.nameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                      value={newFlippingTime}
                      onChangeText={setNewFlippingTime}
                      placeholder="0:10:00"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Edge Time</ThemedText>
                    <TextInput
                      style={[styles.nameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                      value={newEdgeTime}
                      onChangeText={setNewEdgeTime}
                      placeholder="0:15:00"
                      placeholderTextColor={theme.icon}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <>
                {item.name ? <ThemedText style={styles.recentName} numberOfLines={1}>{item.name}</ThemedText> : null}
                <ThemedText style={styles.recentDate}>{date}</ThemedText>
              </>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: isEditing ? 0 : 8, marginTop: isEditing ? 12 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!isEditing && (
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={styles.recentTime}>{time}</ThemedText>
                {pieces > 0 && item.timeInSeconds > 0 && (
                  <ThemedText style={styles.recentPPM}>
                    {(pieces / (item.timeInSeconds / 60)).toFixed(1)} PPM
                  </ThemedText>
                )}
              </View>
            )}
            {isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(false)} style={{ padding: 4 }}>
                <ThemedText style={{ color: theme.icon }}>Cancel</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => isEditing ? handleSave() : setIsEditing(true)}
              style={isEditing ? [styles.saveBtn, { backgroundColor: theme.tint }] : {}}
            >
              {isEditing ? (
                <ThemedText style={{ color: '#fff', fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4 }}>Save</ThemedText>
              ) : (
                <IconSymbol name="pencil" size={16} color={theme.tint} />
              )}
            </TouchableOpacity>
          </View>
          {!isEditing && (item.flippingTimeInSeconds || item.edgeTimeInSeconds) && (
            <ThemedText style={styles.subTimeText}>
              {item.flippingTimeInSeconds ? `F: ${formatTime(item.flippingTimeInSeconds)}` : ''}
              {item.flippingTimeInSeconds && item.edgeTimeInSeconds ? ' • ' : ''}
              {item.edgeTimeInSeconds ? `E: ${formatTime(item.edgeTimeInSeconds)}` : ''}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 220,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    color: '#CBD5E1',
    fontSize: 16,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48, // Increased to clear the overlapping content card
    paddingTop: 60, // Added to handle status bar better
    backgroundColor: 'rgba(15, 17, 21, 0.3)',
  },
  content: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: (width - 60) / 2,
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
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  recentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  recentTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  recentDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  recentTime: {
    fontWeight: '700',
    fontSize: 14,
  },
  recentPPM: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '600',
  },
  recentName: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  nameInput: {
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  subTimeText: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    opacity: 0.5,
    marginBottom: 2,
  },
  saveBtn: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsDescription: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
  },
  settingsOptions: {
    gap: 12,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubLabel: {
    fontSize: 12,
    opacity: 0.5,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
});
