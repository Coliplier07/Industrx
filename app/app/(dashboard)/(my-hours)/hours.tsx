import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { getWeekRange, formatWeekRange } from '@/lib/week';

interface TimesheetEntry {
  id: string;
  date: string;
  stHours: number;
  otHours: number;
  status: 'pending' | 'approved' | 'disputed' | 'denied';
}

const STATUS_LABELS: Record<TimesheetEntry['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  disputed: 'Disputed',
  denied: 'Denied',
};

export default function MyHoursScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [weekLabel, setWeekLabel] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [needsActionCount, setNeedsActionCount] = useState(0);

  // Hours submitted for a past pay period would otherwise never be visible —
  // this screen used to only ever query the current week.
  const isCurrentWeek = referenceDate.toDateString() === new Date().toDateString();

  const fetchEntries = React.useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: company } = await supabase
      .from('companies')
      .select('pay_period_start_day')
      .eq('id', profile.companyId)
      .single();
    const { start, end } = getWeekRange(referenceDate, company?.pay_period_start_day ?? 0);
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
  }, [profile, referenceDate]);

  // Fetches on mount and every time this screen regains focus — covers
  // both the initial load and coming back from an entry's Approve/Request
  // Change action.
  useFocusEffect(
    React.useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  // Not scoped to the current week — this is a count of everything
  // outstanding across all pay periods, so it stays accurate no matter
  // which week the screen below happens to be showing.
  useFocusEffect(
    React.useCallback(() => {
      if (!profile) return;
      supabase
        .from('timesheet_entries')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', profile.id)
        .neq('status', 'approved')
        .then(({ count }) => setNeedsActionCount(count ?? 0));
    }, [profile])
  );

  const shiftWeek = (days: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

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
        {needsActionCount > 0 && (
          <TouchableOpacity style={styles.actionBanner} onPress={() => router.push('/needs-action')}>
            <View style={styles.actionBannerIcon}>
              <Ionicons name="alert-circle" size={22} color="#fff" />
            </View>
            <Text style={styles.actionBannerText}>
              {needsActionCount} {needsActionCount === 1 ? 'entry needs' : 'entries need'} your attention
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(-7)}>
            <Ionicons name="chevron-back" size={22} color="#075eec" />
          </TouchableOpacity>
          <Text style={styles.weekNavLabel}>{weekLabel}</Text>
          <TouchableOpacity
            style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
            onPress={() => shiftWeek(7)}
            disabled={isCurrentWeek}
          >
            <Ionicons name="chevron-forward" size={22} color={isCurrentWeek ? '#c7ccd1' : '#075eec'} />
          </TouchableOpacity>
        </View>

        <View style={styles.tallyCard}>
          <Text style={styles.tallyLabel}>{isCurrentWeek ? 'This Pay Period' : 'Pay Period'}</Text>
          <Text style={styles.tallyValue}>{(totalSt + totalOt).toFixed(1)} hrs</Text>
          <Text style={styles.tallyBreakdown}>
            {totalSt.toFixed(1)} ST · {totalOt.toFixed(1)} OT
          </Text>
        </View>

        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No hours submitted for you this pay period.</Text>
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
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  actionBannerIcon: { marginRight: 10 },
  actionBannerText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  weekNavBtnDisabled: { opacity: 0.5 },
  weekNavLabel: { fontSize: 15, fontWeight: '700', color: '#1e1e1e' },
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
  status_denied: { backgroundColor: '#FF3B3020' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusText_pending: { color: '#b45309' },
  statusText_approved: { color: '#34C759' },
  statusText_disputed: { color: '#FF3B30' },
  statusText_denied: { color: '#FF3B30' },
});
