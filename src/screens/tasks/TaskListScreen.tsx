import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTasks } from '../../contexts/TaskContext';
import { COLORS, EMOTIONAL_FRICTION } from '../../constants/config';
import MagicTaskInput, { ParsedTaskData } from '../../components/MagicTaskInput';
import type { Task, EmotionalFriction } from '../../types';

const frictionColors: Record<string, string> = {
  Low: COLORS.success,
  Medium: '#f59e0b',
  High: COLORS.error,
};

export default function TaskListScreen() {
  const { tasks, isLoading, error, fetchTasks, completeTask, deleteTask, createTask } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [energyCost, setEnergyCost] = useState('5');
  const [friction, setFriction] = useState<EmotionalFriction>('Medium');
  const [associatedValue, setAssociatedValue] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAIParsed, setIsAIParsed] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setTitle('');
    setEnergyCost('5');
    setFriction('Medium');
    setAssociatedValue('');
    setFormError(null);
    setIsAIParsed(false);
  };

  // Handle AI-parsed task data from MagicTaskInput
  const handleMagicTaskParsed = (data: ParsedTaskData) => {
    setTitle(data.title);
    setEnergyCost(data.energy_cost.toString());
    setFriction(data.emotional_friction);
    setAssociatedValue('');
    setFormError(null);
    setIsAIParsed(true);
    setShowModal(true);
  };

  const handleMagicError = (error: string) => {
    Alert.alert('Magic Input Error', error);
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      setFormError('Please enter a task title');
      return;
    }

    const energy = parseInt(energyCost, 10);
    if (isNaN(energy) || energy < 1 || energy > 10) {
      setFormError('Energy cost must be between 1 and 10');
      return;
    }

    setFormError(null);
    setFormLoading(true);

    try {
      await createTask({
        title: title.trim(),
        energy_cost: energy,
        emotional_friction: friction,
        associated_value: associatedValue.trim() || undefined,
      });
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task');
    } finally {
      setFormLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleComplete = async (task: Task) => {
    try {
      await completeTask(task._id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete task');
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task._id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Task }) => (
    <View style={[styles.card, item.is_completed && styles.cardCompleted]}>
      <View style={styles.cardContent}>
        <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleCompleted]}>
          {item.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Energy: {item.energy_cost}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: frictionColors[item.emotional_friction] + '20' }]}>
            <Text style={[styles.badgeText, { color: frictionColors[item.emotional_friction] }]}>
              {item.emotional_friction}
            </Text>
          </View>
          {item.associated_value && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.associated_value}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        {!item.is_completed && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleComplete(item)}
          >
            <Text style={styles.completeButtonText}>✓</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      
      {/* Subtle background gradient */}
      <LinearGradient
        colors={['#ffffff', '#faf5ff', '#fdf4ff', '#ffffff']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Tasks</Text>
          <Text style={styles.subtitle}>{tasks.filter(t => !t.is_completed).length} pending</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Manual</Text>
        </TouchableOpacity>
      </View>

      {/* Magic Task Input - AI-powered voice/text task creation */}
      <MagicTaskInput
        onTaskParsed={handleMagicTaskParsed}
        onError={handleMagicError}
        placeholder="Describe your task... e.g., 'Call mom tomorrow, it's emotionally hard'"
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tasks yet!</Text>
              <Text style={styles.emptySubtext}>
                Tap "+ New" to create your first task.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Task Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isAIParsed ? '✨ AI Parsed Task' : 'New Task'}
                </Text>
                {isAIParsed && (
                  <Text style={styles.modalSubtitle}>Review and adjust if needed</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Task Title</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="What needs to be done?"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <Text style={styles.label}>Energy Cost (1-10)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor={COLORS.textMuted}
                  value={energyCost}
                  onChangeText={setEnergyCost}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <Text style={styles.label}>Emotional Friction</Text>
              <View style={styles.frictionRow}>
                {EMOTIONAL_FRICTION.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.frictionButton,
                      friction === level && styles.frictionButtonActive,
                    ]}
                    onPress={() => setFriction(level)}
                  >
                    <Text
                      style={[
                        styles.frictionButtonText,
                        friction === level && styles.frictionButtonTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Associated Value (optional)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Health, Career, Family"
                  placeholderTextColor={COLORS.textMuted}
                  value={associatedValue}
                  onChangeText={setAssociatedValue}
                />
              </View>

              {formError && <Text style={styles.formErrorText}>{formError}</Text>}

              <TouchableOpacity
                style={[styles.createButton, formLoading && styles.createButtonDisabled]}
                onPress={handleCreateTask}
                disabled={formLoading}
                activeOpacity={0.7}
              >
                {formLoading ? (
                  <ActivityIndicator color={COLORS.background} size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create Task</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  addButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: '600',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 22,
    color: COLORS.error,
    fontWeight: '400',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textMuted,
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  frictionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  frictionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  frictionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frictionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  frictionButtonTextActive: {
    color: COLORS.background,
  },
  formErrorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  createButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
});

