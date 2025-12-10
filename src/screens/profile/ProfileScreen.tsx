import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/config';
import * as butlerApi from '../../api/butler';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [baselineEnergy, setBaselineEnergy] = useState(user?.baseline_energy || 5);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const adjustEnergy = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, baselineEnergy + delta));
    setBaselineEnergy(newValue);
    setHasChanges(newValue !== (user?.baseline_energy || 5));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await butlerApi.updateButlerProfile({ baseline_energy: baselineEnergy });
      setHasChanges(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {user?.core_values && user.core_values.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Core Values</Text>
            <View style={styles.valuesRow}>
              {user.core_values.map((value, index) => (
                <View key={index} style={styles.valueBadge}>
                  <Text style={styles.valueBadgeText}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Baseline Energy</Text>
            <View style={styles.energyControl}>
              <TouchableOpacity
                style={styles.energyButton}
                onPress={() => adjustEnergy(-1)}
                disabled={baselineEnergy <= 1}
              >
                <Text style={[styles.energyButtonText, baselineEnergy <= 1 && styles.energyButtonDisabled]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.energyValue}>{baselineEnergy}</Text>
              <TouchableOpacity
                style={styles.energyButton}
                onPress={() => adjustEnergy(1)}
                disabled={baselineEnergy >= 10}
              >
                <Text style={[styles.energyButtonText, baselineEnergy >= 10 && styles.energyButtonDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.energyHint}>
            Your typical energy level on a normal day
          </Text>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.background,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  valuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  valueBadgeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  settingItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  energyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  energyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyButtonText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '500',
  },
  energyButtonDisabled: {
    color: COLORS.textMuted,
  },
  energyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'center',
  },
  energyHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  signOutButton: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});
