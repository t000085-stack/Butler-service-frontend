import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, EMOTIONAL_FRICTION } from '../../constants/config';
import { useTasks } from '../../contexts/TaskContext';
import type { EmotionalFriction } from '../../types';

export default function TaskFormScreen() {
  const { createTask } = useTasks();

  const [title, setTitle] = useState('');
  const [energyCost, setEnergyCost] = useState('5');
  const [friction, setFriction] = useState<EmotionalFriction>('Medium');
  const [associatedValue, setAssociatedValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    const energy = parseInt(energyCost, 10);
    if (isNaN(energy) || energy < 1 || energy > 10) {
      setError('Energy cost must be between 1 and 10');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await createTask({
        title: title.trim(),
        energy_cost: energy,
        emotional_friction: friction,
        associated_value: associatedValue.trim() || undefined,
      });
      setSuccess(true);
      setTitle('');
      setEnergyCost('5');
      setFriction('Medium');
      setAssociatedValue('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create New Task</Text>

        <View style={styles.form}>
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

          {error && <Text style={styles.errorText}>{error}</Text>}
          {success && <Text style={styles.successText}>Task created!</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: -8,
  },
  inputWrapper: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: COLORS.success,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});

