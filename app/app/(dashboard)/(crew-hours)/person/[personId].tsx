import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatWeekRange, toDateString } from '@/lib/week';

interface DayEntry {
  date: string;
  stHours: number;
  otHours: number;
  status: 'pending' | 'approved' | 'disputed' | 'denied' | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  disputed: 'Disputed',
  denied: 'Denied',
};

export default function PersonWeekScreen() {
  const navigation = useNavigation();
  const { personId, fullName, start, end } = useLocalSearchParams<{
    personId: string;
    fullName: string;
    start: string;
    end: string;
  }>();

  const [days, setDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: fullName || 'Hours' });
  }, [navigation, fullName]);

  useEffect(() => {
    const fetchDays = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('date, st_hours, ot_hours, status')
        .eq('employee_id', personId)
        .gte('date', start)
        .lte('date', end);

      if (error) {
        console.error('Failed to load hours:', error.message);
      }

      const byDate = new Map((data ?? []).map((row: any) => [row.date, row]));

      // Every day in the range, not just days with an entry -- so days off
      // show plainly as 0 rather than just being absent from the list.
      const allDates: string[] = [];
      const cursor = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      while (cursor <= endDate) {
        allDates.push(toDateString(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      setDays(
        allDates.map((date) => {
          const row = byDate.get(date);
          return {
            date,
            stHours: Number(row?.st_hours) || 0,
            otHours: Number(row?.ot_hours) || 0,
            status: row?.status ?? null,
          };
        })
      );
      setLoading(false);
    };

    if (personId && start && end) fetchDays();
  }, [personId, start, end]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  const totalSt = days.reduce((sum, d) => sum + d.stHours, 0);
  const totalOt = days.reduce((sum, d) => sum + d.otHours, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tallyCard}>
          <Text style={styles.tallyLabel}>{formatWeekRange(start, end)}</Text>
          <Text style={styles.tallyValue}>{(totalSt + totalOt).toFixed(1)} hrs</Text>
          <Text style={styles.tallyBreakdown}>
            {totalSt.toFixed(1)} ST · {totalOt.toFixed(1)} OT
          </Text>
        </View>

        {days.map((day) => (
          <View key={day.date} style={styles.card}>
            <Text style={styles.dayLabel}>
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={styles.dayRight}>
              <Text style={styles.dayHours}>
                {day.stHours.toFixed(1)} ST · {day.otHours.toFixed(1)} OT
              </Text>
              {day.status && (
                <Text style={[styles.statusText, styles[`status_${day.status}` as const]]}>
                  {STATUS_LABELS[day.status]}
                </Text>
              )}
            </View>
          </View>
        ))}
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
  dayLabel: { fontSize: 15, fontWeight: '700', color: '#1e1e1e' },
  dayRight: { alignItems: 'flex-end' },
  dayHours: { fontSize: 13, color: '#6b7280' },
  statusText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  status_pending: { color: '#b45309' },
  status_approved: { color: '#34C759' },
  status_disputed: { color: '#6b7280' },
  status_denied: { color: '#FF3B30' },
});
