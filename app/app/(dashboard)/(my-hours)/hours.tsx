import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { getWeekRange, formatWeekRange } from '@/lib/week';

interface TimesheetEntry {
  id: string;
  date: string;
  stHours: number;
  otHours: number;
  status: 'pending' | 'approved' | 'disputed';
}

const STATUS_LABELS: Record<TimesheetEntry['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  disputed: 'Disputed',
};

export default function MyHoursScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [weekLabel, setWeekLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEntries = React.useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: company } = await supabase
      .from('companies')
      .select('pay_period_start_day')
      .eq('id', profile.companyId)
      .single();
    const { start, end } = getWeekRange(new Date(), company?.pay_period_start_day ?? 0);
    setWeekLabel(formatWeekRange(start, end));

    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('id, date, st_hours, ot_hours, status')
      .eq('employee_id', profile.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to load hours:', error.message);
      setEntries([]);
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
    setLoading(false);
  }, [profile]);

  // Fetches on mount and every time this screen regains focus — covers
  // both the initial load and coming back from an entry's Approve/Request
  // Change action.
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

  const totalSt = entries.reduce((sum, e) => sum + e.stHours, 0);
  const totalOt = entries.reduce((sum, e) => sum + e.otHours, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tallyCard}>
          <Text style={styles.tallyLabel}>This Pay Period</Text>
          <Text style={styles.tallyValue}>{(totalSt + totalOt).toFixed(1)} hrs</Text>
          <Text style={styles.tallyBreakdown}>
            {totalSt.toFixed(1)} ST · {totalOt.toFixed(1)} OT
          </Text>
          {!!weekLabel && <Text style={styles.weekLabel}>{weekLabel}</Text>}
        </View>

        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No hours submitted for you yet this week.</Text>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.card}
              onPress={() => router.push(`/entry/${entry.id}`)}
            >
              <View>
                <Text style={styles.entryDate}>
                  {new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.entryHours}>
                  {entry.stHours} ST · {entry.otHours} OT
                </Text>
              </View>
              <View style={[styles.statusBadge, styles[`status_${entry.status}` as const]]}>
                <Text style={[styles.statusBadgeText, styles[`statusText_${entry.status}` as const]]}>
                  {STATUS_LABELS[entry.status]}
                </Text>
              </View>
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
  tallyCard: {
    backgroundColor: '#075eec',
    borderRadius: 15,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  tallyLabel: { fontSize: 13, fontWeight: '700', color: '#dbe8ff', textTransform: 'uppercase' },
  tallyValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  tallyBreakdown: { fontSize: 14, color: '#dbe8ff', marginTop: 4 },
  weekLabel: { fontSize: 12, color: '#dbe8ff', marginTop: 8, opacity: 0.85 },
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
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  status_pending: { backgroundColor: '#f59e0b20' },
  status_approved: { backgroundColor: '#34C75920' },
  status_disputed: { backgroundColor: '#FF3B3020' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusText_pending: { color: '#b45309' },
  statusText_approved: { color: '#34C759' },
  statusText_disputed: { color: '#FF3B30' },
});
