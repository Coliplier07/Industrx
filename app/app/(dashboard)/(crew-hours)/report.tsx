import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { getWeekRange, formatWeekRange } from '@/lib/week';

interface PersonTotal {
  id: string;
  fullName: string;
  role: 'pm' | 'employee';
  stHours: number;
  otHours: number;
}

interface CrewGroup {
  key: string;
  title: string;
  members: PersonTotal[];
}

export default function CrewHoursReportScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [weekLabel, setWeekLabel] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [groups, setGroups] = useState<CrewGroup[]>([]);
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
      setRangeStart(start);
      setRangeEnd(end);

      let people: { id: string; full_name: string; role: 'pm' | 'employee'; manager_id: string | null }[];

      if (profile.role === 'admin') {
        // Every PM (their own hours) and every employee, company-wide.
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, manager_id')
          .in('role', ['pm', 'employee']);
        if (error || !data) {
          console.error('Failed to load people:', error?.message);
          setGroups([]);
          setLoading(false);
          return;
        }
        people = data;
      } else {
        // PM: their own hours plus their assigned employees only.
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, manager_id')
          .eq('role', 'employee')
          .eq('manager_id', profile.id);
        if (error) {
          console.error('Failed to load crew:', error.message);
          setGroups([]);
          setLoading(false);
          return;
        }
        people = [
          { id: profile.id, full_name: profile.fullName, role: 'pm', manager_id: null },
          ...(data ?? []),
        ];
      }

      const peopleIds = people.map((p) => p.id);
      const { data: entries } =
        peopleIds.length > 0
          ? await supabase
              .from('timesheet_entries')
              .select('employee_id, st_hours, ot_hours')
              .in('employee_id', peopleIds)
              .gte('date', start)
              .lte('date', end)
          : { data: [] };

      const byPerson = new Map<string, { st: number; ot: number }>();
      (entries ?? []).forEach((e: any) => {
        const current = byPerson.get(e.employee_id) ?? { st: 0, ot: 0 };
        current.st += Number(e.st_hours) || 0;
        current.ot += Number(e.ot_hours) || 0;
        byPerson.set(e.employee_id, current);
      });

      const toTotal = (p: (typeof people)[number]): PersonTotal => ({
        id: p.id,
        fullName: p.full_name || 'Unnamed',
        role: p.role,
        stHours: byPerson.get(p.id)?.st ?? 0,
        otHours: byPerson.get(p.id)?.ot ?? 0,
      });

      if (profile.role !== 'admin') {
        // A PM only ever has one crew — their own — so it's a single
        // group, not something that needs per-PM headers.
        setGroups([{ key: 'crew', title: 'Your Crew', members: people.map(toTotal) }]);
        setLoading(false);
        return;
      }

      const pms = people.filter((p) => p.role === 'pm');
      const employeesByManager = new Map<string, typeof people>();
      const unassigned: typeof people = [];
      people
        .filter((p) => p.role === 'employee')
        .forEach((e) => {
          if (e.manager_id) {
            const list = employeesByManager.get(e.manager_id) ?? [];
            list.push(e);
            employeesByManager.set(e.manager_id, list);
          } else {
            unassigned.push(e);
          }
        });

      const pmGroups: CrewGroup[] = pms
        .map((pm) => ({
          key: pm.id,
          title: pm.full_name || 'Unnamed PM',
          members: [pm, ...(employeesByManager.get(pm.id) ?? [])].map(toTotal),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      if (unassigned.length > 0) {
        pmGroups.push({
          key: 'unassigned',
          title: 'Unassigned',
          members: unassigned.map(toTotal).sort((a, b) => a.fullName.localeCompare(b.fullName)),
        });
      }

      setGroups(pmGroups);
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

  // No reporting on weeks that haven't happened yet.
  const isCurrentWeek = referenceDate.toDateString() === new Date().toDateString();

  const allMembers = groups.flatMap((g) => g.members);
  const totalSt = allMembers.reduce((sum, m) => sum + m.stHours, 0);
  const totalOt = allMembers.reduce((sum, m) => sum + m.otHours, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(-7)}>
            <Ionicons name="chevron-back" size={22} color="#075eec" />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            style={[styles.weekNavBtn, isCurrentWeek && styles.weekNavBtnDisabled]}
            onPress={() => shiftWeek(7)}
            disabled={isCurrentWeek}
          >
            <Ionicons name="chevron-forward" size={22} color={isCurrentWeek ? '#c7ccd1' : '#075eec'} />
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
        ) : allMembers.length === 0 ? (
          <Text style={styles.emptyText}>
            {profile?.role === 'pm' ? 'No employees are assigned to you yet.' : 'No one to report on yet.'}
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.groupSection}>
              {profile?.role === 'admin' && (
                <View style={styles.groupTitleRow}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.key !== 'unassigned' && (
                    <View style={styles.crewBadge}>
                      <Text style={styles.crewBadgeText}>Crew</Text>
                    </View>
                  )}
                </View>
              )}
              {group.members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/person/[personId]',
                      params: { personId: m.id, fullName: m.fullName, start: rangeStart, end: rangeEnd },
                    })
                  }
                >
                  <View>
                    <Text style={styles.employeeName}>
                      {m.fullName}
                      {m.id === profile?.id ? ' (You)' : ''}
                    </Text>
                    {profile?.role === 'admin' && (
                      <Text style={styles.employeeRole}>{m.role === 'pm' ? 'PM' : 'Employee'}</Text>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={styles.employeeHoursCol}>
                      <Text style={styles.employeeHours}>
                        {m.stHours.toFixed(1)} ST · {m.otHours.toFixed(1)} OT
                      </Text>
                      <Text style={styles.employeeTotal}>{(m.stHours + m.otHours).toFixed(1)} hrs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#c7ccd1" style={styles.chevron} />
                  </View>
                </TouchableOpacity>
              ))}
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
  weekNavBtnDisabled: { opacity: 0.5 },
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
  groupSection: { marginBottom: 12 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  groupTitle: { fontSize: 14, fontWeight: '700', color: '#075eec' },
  crewBadge: {
    backgroundColor: '#eef4ff',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  crewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#075eec',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  employeeName: { fontSize: 15, fontWeight: '700', color: '#1e1e1e' },
  employeeRole: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
  chevron: { marginLeft: 8 },
  employeeHoursCol: { alignItems: 'flex-end' },
  employeeHours: { fontSize: 13, color: '#6b7280' },
  employeeTotal: { fontSize: 15, fontWeight: '700', color: '#075eec', marginTop: 2 },
});
