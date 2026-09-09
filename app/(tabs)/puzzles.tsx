import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Puzzle } from '@/constants/store-types';
import { Colors } from '@/constants/theme';
import { usePuzzles } from '@/context/PuzzleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const formatS = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
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

export default function PuzzlesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { puzzles, addPuzzle, updatePuzzle, updateTimeEntry, deletePuzzle, deleteTimeEntry, getPuzzleEntries, getBestTime, getBestPPM } = usePuzzles();
  const router = useRouter();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state (Add/Edit)
  const [formTitle, setFormTitle] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formPieces, setFormPieces] = useState('1000');
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard' | undefined>(undefined);
  const [formImage, setFormImage] = useState<string | null>(null);

  const filteredPuzzles = puzzles.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormTitle('');
    setFormBrand('');
    setFormPieces('1000');
    setFormDifficulty(undefined);
    setFormImage(null);
  };

  const handleAddPuzzle = () => {
    if (!formTitle || !formBrand) {
      Alert.alert('Error', 'Please fill in Title and Brand.');
      return;
    }
    addPuzzle({
      title: formTitle,
      brand: formBrand,
      pieces: parseInt(formPieces) || 1000,
      difficulty: formDifficulty,
      imageUri: formImage,
    });
    setIsAddModalVisible(false);
    resetForm();
  };

  const handleUpdatePuzzle = () => {
    if (!selectedPuzzle) return;
    if (!formTitle || !formBrand) {
      Alert.alert('Error', 'Please fill in Title and Brand.');
      return;
    }
    updatePuzzle({
      ...selectedPuzzle,
      title: formTitle,
      brand: formBrand,
      pieces: parseInt(formPieces) || 1000,
      difficulty: formDifficulty,
      imageUri: formImage,
    });
    setIsDetailModalVisible(false);
    setSelectedPuzzle(null);
    resetForm();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    // The picked URI is a temporary one. addPuzzle/updatePuzzle copy it into
    // the app's own image storage; only that stored URI is ever persisted.
    if (!result.canceled && result.assets[0].uri) {
      setFormImage(result.assets[0].uri);
    }
  };

  const openDetail = (puzzle: Puzzle) => {
    setSelectedPuzzle(puzzle);
    setFormTitle(puzzle.title);
    setFormBrand(puzzle.brand);
    setFormPieces(puzzle.pieces.toString());
    setFormDifficulty(puzzle.difficulty);
    setFormImage(puzzle.imageUri || null);
    setIsDetailModalVisible(true);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">My Collection</ThemedText>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.tint }]}
          onPress={() => {
            resetForm();
            setIsAddModalVisible(true);
          }}
        >
          <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
          <ThemedText style={styles.addButtonText}>New</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <IconSymbol name="grid.fill" size={20} color={theme.icon} />
        <TextInput
          placeholder="Search puzzles..."
          placeholderTextColor={theme.icon}
          style={[styles.searchInput, { color: theme.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredPuzzles}
        renderItem={({ item }) => {
            const bestS = getBestTime(item.id);
            const bestPPM = getBestPPM(item.id);
            return (
              <PuzzleCard
                item={item}
                theme={theme}
                bestTime={bestS ? formatS(bestS) : '--:--:--'}
                bestPPM={bestPPM}
                onPress={() => openDetail(item)}
              />
            );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ThemedText style={{ opacity: 0.5 }}>No puzzles found.</ThemedText>
          </View>
        }
      />

      {/* Add Puzzle Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 80 }}
              >
                <ThemedText type="subtitle" style={{ marginBottom: 20 }}>New Puzzle</ThemedText>

                <TouchableOpacity style={[styles.imagePicker, { borderColor: theme.border }]} onPress={pickImage}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.fullImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol name="plus.circle.fill" size={40} color={theme.icon} />
                      <ThemedText style={{ color: theme.icon, marginTop: 8 }}>Add Photo</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>

                <ThemedText style={styles.inputLabel}>Title</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Starry Night..."
                  placeholderTextColor={theme.icon}
                />

                <ThemedText style={styles.inputLabel}>Brand</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formBrand}
                  onChangeText={setFormBrand}
                  placeholder="Ravensburger..."
                  placeholderTextColor={theme.icon}
                />

                <ThemedText style={styles.inputLabel}>Piece Count</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formPieces}
                  onChangeText={setFormPieces}
                  keyboardType="numeric"
                />

                <ThemedText style={styles.inputLabel}>Difficulty (Optional)</ThemedText>
                <View style={styles.difficultyContainer}>
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyButton,
                        { borderColor: theme.border, backgroundColor: theme.background },
                        formDifficulty === level && { backgroundColor: theme.tint, borderColor: theme.tint }
                      ]}
                      onPress={() => setFormDifficulty(formDifficulty === level ? undefined : level)}
                    >
                      <ThemedText style={[
                        styles.difficultyText,
                        formDifficulty === level && { color: '#fff', fontWeight: '700' }
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAddModalVisible(false)}>
                    <ThemedText>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.tint }]} onPress={handleAddPuzzle}>
                    <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Create</ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail / Edit Modal */}
      <Modal visible={isDetailModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <ThemedView style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 80 }}
              >
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Puzzle Details</ThemedText>
                  <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                    <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '90deg' }] }} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.imagePicker, { borderColor: theme.border }]} onPress={pickImage}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.fullImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol name="plus.circle.fill" size={40} color={theme.icon} />
                      <ThemedText style={{ color: theme.icon, marginTop: 8 }}>Add Photo</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>

                <ThemedText style={styles.inputLabel}>Title</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                <ThemedText style={styles.inputLabel}>Brand</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formBrand}
                  onChangeText={setFormBrand}
                />

                <ThemedText style={styles.inputLabel}>Piece Count</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={formPieces}
                  onChangeText={setFormPieces}
                  keyboardType="numeric"
                />

                <ThemedText style={styles.inputLabel}>Difficulty (Optional)</ThemedText>
                <View style={styles.difficultyContainer}>
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyButton,
                        { borderColor: theme.border, backgroundColor: theme.background },
                        formDifficulty === level && { backgroundColor: theme.tint, borderColor: theme.tint }
                      ]}
                      onPress={() => setFormDifficulty(formDifficulty === level ? undefined : level)}
                    >
                      <ThemedText style={[
                        styles.difficultyText,
                        formDifficulty === level && { color: '#fff', fontWeight: '700' }
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.accent, marginBottom: 12 }]}
                  onPress={() => {
                    setIsDetailModalVisible(false);
                    router.push({ pathname: '/add', params: { puzzleId: selectedPuzzle?.id } });
                  }}
                >
                  <ThemedText style={{ color: '#000', fontWeight: '700' }}>Start New Session</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.tint, width: '100%', marginBottom: 24 }]} onPress={handleUpdatePuzzle}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Save Changes</ThemedText>
                </TouchableOpacity>

                <View style={styles.historySection}>
                  <ThemedText type="subtitle" style={{ marginBottom: 12 }}>History</ThemedText>
                  {selectedPuzzle && getPuzzleEntries(selectedPuzzle.id).length === 0 ? (
                    <ThemedText style={{ opacity: 0.5, fontStyle: 'italic' }}>No sessions recorded yet.</ThemedText>
                  ) : (
                    selectedPuzzle && getPuzzleEntries(selectedPuzzle.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(entry => (
                        <HistoryItem
                          key={entry.id}
                          entry={entry}
                          pieces={selectedPuzzle.pieces}
                          theme={theme}
                          onUpdate={(updatedItem: any) => updateTimeEntry(updatedItem)}
                          onDelete={() => {
                            if (Platform.OS === 'web') {
                              if (window.confirm('Are you sure you want to delete this session?')) {
                                deleteTimeEntry(entry.id);
                              }
                            } else {
                              Alert.alert('Delete Entry', 'Are you sure you want to delete this session?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteTimeEntry(entry.id) }
                              ]);
                            }
                          }}
                        />
                      ))
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.deleteButton, { marginTop: 40, marginBottom: 40 }]}
                  onPress={() => {
                    if (!selectedPuzzle) return;
                    if (Platform.OS === 'web') {
                      if (window.confirm(`Are you sure you want to delete "${selectedPuzzle.title}"? This will also remove all its history.`)) {
                        deletePuzzle(selectedPuzzle.id);
                        setIsDetailModalVisible(false);
                      }
                    } else {
                      Alert.alert('Delete Puzzle', `Are you sure you want to delete "${selectedPuzzle.title}"? This will also remove all its history.`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete Everything',
                          style: 'destructive',
                          onPress: () => {
                            deletePuzzle(selectedPuzzle.id);
                            setIsDetailModalVisible(false);
                          }
                        }
                      ]);
                    }
                  }}
                >
                  <ThemedText style={{ color: '#EF4444', fontWeight: '600', textAlign: 'center' }}>Delete Puzzle & History</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

function HistoryItem({ entry, pieces, theme, onUpdate, onDelete }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(entry.name || '');
  const [newTime, setNewTime] = useState(formatS(entry.timeInSeconds));
  const [newFlippingTime, setNewFlippingTime] = useState(entry.flippingTimeInSeconds ? formatS(entry.flippingTimeInSeconds) : '');
  const [newEdgeTime, setNewEdgeTime] = useState(entry.edgeTimeInSeconds ? formatS(entry.edgeTimeInSeconds) : '');
  const [newDate, setNewDate] = useState(formatDateForInput(entry.date));

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
      ...entry,
      name: newName,
      timeInSeconds,
      flippingTimeInSeconds,
      edgeTimeInSeconds,
      date: dateObj.toISOString()
    });
    setIsEditing(false);
  };

  return (
    <View style={[styles.historyItem, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: isEditing ? 'column' : 'row', gap: isEditing ? 8 : 12, alignItems: isEditing ? 'stretch' : 'center', marginBottom: 4 }}>
          {isEditing ? (
            <View style={{ gap: 8 }}>
              <View>
                <ThemedText style={styles.historyInputLabel}>Name</ThemedText>
                <TextInput
                  style={[styles.historyNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Name..."
                  placeholderTextColor={theme.icon}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyInputLabel}>Date (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.historyNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    value={newDate}
                    onChangeText={setNewDate}
                    placeholder="2024-01-01"
                    placeholderTextColor={theme.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyInputLabel}>Time (H:MM:SS)</ThemedText>
                  <TextInput
                    style={[styles.historyNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    value={newTime}
                    onChangeText={setNewTime}
                    placeholder="1:23:45"
                    placeholderTextColor={theme.icon}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyInputLabel}>Flipping Time</ThemedText>
                  <TextInput
                    style={[styles.historyNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    value={newFlippingTime}
                    onChangeText={setNewFlippingTime}
                    placeholder="0:10:00"
                    placeholderTextColor={theme.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyInputLabel}>Edge Time</ThemedText>
                  <TextInput
                    style={[styles.historyNameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    value={newEdgeTime}
                    onChangeText={setNewEdgeTime}
                    placeholder="0:15:00"
                    placeholderTextColor={theme.icon}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                <TouchableOpacity onPress={() => setIsEditing(false)}>
                  <ThemedText style={{ color: theme.icon, padding: 8 }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.historySaveBtn, { backgroundColor: theme.tint }]}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700', paddingHorizontal: 16, paddingVertical: 8 }}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <ThemedText style={styles.historyDate}>
                {new Date(entry.date).toLocaleDateString()}
              </ThemedText>
              <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <ThemedText style={styles.historyTime}>{formatS(entry.timeInSeconds)}</ThemedText>
                <ThemedText style={styles.historyPPM}>
                  {entry.timeInSeconds > 0 ? (pieces / (entry.timeInSeconds / 60)).toFixed(1) : '0.0'} PPM
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={{ marginLeft: 8 }}>
                <IconSymbol name="pencil" size={14} color={theme.tint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={{ marginLeft: 'auto' }}>
                <IconSymbol name="plus.circle.fill" size={20} color="#EF4444" style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isEditing && (
          <>
            {entry.name ? <ThemedText style={styles.historyName}>{entry.name}</ThemedText> : null}
            {(entry.flippingTimeInSeconds || entry.edgeTimeInSeconds) && (
              <ThemedText style={styles.historySubTime}>
                {entry.flippingTimeInSeconds ? `F: ${formatS(entry.flippingTimeInSeconds)}` : ''}
                {entry.flippingTimeInSeconds && entry.edgeTimeInSeconds ? ' • ' : ''}
                {entry.edgeTimeInSeconds ? `E: ${formatS(entry.edgeTimeInSeconds)}` : ''}
              </ThemedText>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function PuzzleCard({ item, theme, bestTime, bestPPM, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
          <IconSymbol name="plus.circle.fill" size={32} color={theme.icon} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.cardSubtitle}>
          {item.pieces} pcs • {item.brand}
          {item.difficulty && ` • ${item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}`}
        </ThemedText>
        <View style={styles.bestTimeRow}>
          <IconSymbol name="timer" size={12} color={theme.accent} />
          <ThemedText style={[styles.bestTime, { color: theme.accent }]}>{bestTime}</ThemedText>
          {bestPPM ? (
            <ThemedText style={[styles.bestTime, { color: theme.accent, marginLeft: 8 }]}>
              {bestPPM.toFixed(1)} PPM
            </ThemedText>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 8,
  },
  bestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    height: '85%',
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  cancelButton: {
    padding: 12,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  historySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyPPM: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '600',
  },
  historyName: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyNameInput: {
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  historySubTime: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  historyInputLabel: {
    fontSize: 10,
    opacity: 0.5,
    marginBottom: 2,
  },
  historySaveBtn: {
    padding: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
