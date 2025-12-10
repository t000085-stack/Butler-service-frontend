import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/config';
import * as butlerApi from '../../api/butler';
import type { ContextLog } from '../../types';

export default function HistoryScreen() {
  const [history, setHistory] = useState<ContextLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const data = await butlerApi.getHistory(20);
      setHistory(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    }
  };

  useEffect(() => {
    fetchHistory().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: ContextLog }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.mood}>{item.mood}</Text>
        <Text style={styles.energy}>Energy: {item.current_energy}/10</Text>
      </View>
      {item.raw_input && (
        <Text style={styles.rawInput} numberOfLines={2}>
          {item.raw_input}
        </Text>
      )}
      <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Consultation History</Text>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
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
              <Text style={styles.emptyText}>No consultations yet.</Text>
              <Text style={styles.emptySubtext}>
                Talk to your Butler to get started!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  list: {
    padding: 24,
    paddingTop: 8,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mood: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  energy: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  rawInput: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textMuted,
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
  },
});

