import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';

interface TimesheetEntry {
  id: string;
  date: string;
  stHours: number;
  otHours: number;
  status: 'pending' | 'disputed' | 'denied';
}

const STATUS_LABELS: Record<TimesheetEntry['status'], string> = {
  pending: 'Needs Your Approval',
  disputed: 'Waiting on PM',
  denied: 'Denied — Needs Your Accept',
};

export default function NeedsActionScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // Only the very first fetch should show the blocking spinner -- otherwise
  // every trip back to this screen would blank the list and flash it for
  // no reason.
  const hasLoadedRef = useRef(false);

  const fetchEntries = React.useCallback(async () => {
    if (!profile) return;
    if (!hasLoadedRef.current) setLoading(true);

    // Every entry that isn't resolved yet, across all pay periods — not
    // scoped to a week, so nothing needing action gets buried in the past.
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('id, date, st_hours, ot_hours, status')
      .eq('employee_id', profile.id)
      .neq('status', 'approved')
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to load pending hours:', error.message);
      setEntries([]);
      hasLoadedRef.current = true;
      setLoading(false);
      return;
    }

    setEntries(
      (data ?? []).map((row: any) => ({
        id: row.id,
        date: row.date,
        stHours: Number(row.st_hours) || 0,
        otHours: Number(row.ot_hours) || 0,
        status: row.status,
      }))
    );
    hasLoadedRef.current = true;
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>Nothing needs your attention right now.</Text>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity key={entry.id} style={styles.card} onPress={() => router.push(`/entry/${entry.id}`)}>
              <View>
                <Text style={styles.entryDate}>
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.entryHours}>
                  {entry.stHours} ST · {entry.otHours} OT
                </Text>
              </View>
              <Text style={[styles.statusLabel, styles[`statusLabel_${entry.status}` as const]]}>
                {STATUS_LABELS[entry.status]}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  entryDate: { fontSize: 15, fontWeight: '700', color: '#1e1e1e' },
  entryHours: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusLabel: { fontSize: 12, fontWeight: '700', maxWidth: 120, textAlign: 'right' },
  statusLabel_pending: { color: '#b45309' },
  statusLabel_disputed: { color: '#6b7280' },
  statusLabel_denied: { color: '#FF3B30' },
});
