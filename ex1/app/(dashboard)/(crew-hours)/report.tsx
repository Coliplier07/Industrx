import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { getWeekRange, formatWeekRange } from '@/lib/week';

interface EmployeeTotal {
  id: string;
  fullName: string;
  stHours: number;
  otHours: number;
}

export default function CrewHoursReportScreen() {
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [weekLabel, setWeekLabel] = useState('');
  const [totals, setTotals] = useState<EmployeeTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchReport = async () => {
      setLoading(true);

      const { data: company } = await supabase
        .from('companies')
        .select('pay_period_start_day')
        .eq('id', profile.companyId)
        .single();
      const { start, end } = getWeekRange(referenceDate, company?.pay_period_start_day ?? 0);
      setWeekLabel(formatWeekRange(start, end));

      let employeeQuery = supabase.from('profiles').select('id, full_name').eq('role', 'employee');
      if (profile.role === 'pm') {
        employeeQuery = employeeQuery.eq('manager_id', profile.id);
      }
      const { data: employees, error: employeesError } = await employeeQuery;

      if (employeesError || !employees) {
        console.error('Failed to load employees:', employeesError?.message);
        setTotals([]);
        setLoading(false);
        return;
      }

      const employeeIds = employees.map((e) => e.id);
      const { data: entries } =
        employeeIds.length > 0
          ? await supabase
              .from('timesheet_entries')
              .select('employee_id, st_hours, ot_hours')
              .in('employee_id', employeeIds)
              .gte('date', start)
              .lte('date', end)
          : { data: [] };

      const byEmployee = new Map<string, { st: number; ot: number }>();
      (entries ?? []).forEach((e: any) => {
        const current = byEmployee.get(e.employee_id) ?? { st: 0, ot: 0 };
        current.st += Number(e.st_hours) || 0;
        current.ot += Number(e.ot_hours) || 0;
        byEmployee.set(e.employee_id, current);
      });

      setTotals(
        employees
          .map((e: any) => ({
            id: e.id,
            fullName: e.full_name || 'Unnamed',
            stHours: byEmployee.get(e.id)?.st ?? 0,
            otHours: byEmployee.get(e.id)?.ot ?? 0,
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
      );
      setLoading(false);
    };
    fetchReport();
  }, [profile, referenceDate]);

  const shiftWeek = (days: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const totalSt = totals.reduce((sum, t) => sum + t.stHours, 0);
  const totalOt = totals.reduce((sum, t) => sum + t.otHours, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(-7)}>
            <Ionicons name="chevron-back" size={22} color="#075eec" />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(7)}>
            <Ionicons name="chevron-forward" size={22} color="#075eec" />
          </TouchableOpacity>
        </View>

        <View style={styles.tallyCard}>
          <Text style={styles.tallyLabel}>{profile?.role === 'admin' ? 'Whole Company' : 'Your Crew'}</Text>
          <Text style={styles.tallyValue}>{(totalSt + totalOt).toFixed(1)} hrs</Text>
          <Text style={styles.tallyBreakdown}>
            {totalSt.toFixed(1)} ST · {totalOt.toFixed(1)} OT
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#075eec" style={styles.loadingIndicator} />
        ) : totals.length === 0 ? (
          <Text style={styles.emptyText}>
            {profile?.role === 'pm' ? 'No employees are assigned to you yet.' : 'No employees yet.'}
          </Text>
        ) : (
          totals.map((t) => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.employeeName}>{t.fullName}</Text>
              <View style={styles.employeeHoursRow}>
                <Text style={styles.employeeHours}>
                  {t.stHours.toFixed(1)} ST · {t.otHours.toFixed(1)} OT
                </Text>
                <Text style={styles.employeeTotal}>{(t.stHours + t.otHours).toFixed(1)} hrs</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
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
  weekLabel: { fontSize: 15, fontWeight: '700', color: '#1e1e1e' },
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
  loadingIndicator: { marginTop: 24 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  employeeName: { fontSize: 15, fontWeight: '700', color: '#1e1e1e', marginBottom: 6 },
  employeeHoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  employeeHours: { fontSize: 13, color: '#6b7280' },
  employeeTotal: { fontSize: 15, fontWeight: '700', color: '#075eec' },
});
