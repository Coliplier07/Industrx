import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';

interface CrewMember {
  id: string;
  fullName: string;
  role: 'pm' | 'employee';
  isSelf: boolean;
  stHours: number;
  otHours: number;
}

export default function CrewHoursScreen() {
  const { profile } = useProfile();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCrewAndHours = async (forDate: Date) => {
    if (!profile) return;
    setLoading(true);

    let people: { id: string; full_name: string; role: 'pm' | 'employee' }[];

    if (profile.role === 'admin') {
      // Admin can submit for anyone — every PM (their own hours) and employee.
      const { data, error } = await supabase.from('profiles').select('id, full_name, role').in('role', ['pm', 'employee']);
      if (error) {
        console.error('Failed to load crew:', error.message);
        setCrew([]);
        setLoading(false);
        return;
      }
      people = data ?? [];
    } else {
      // PM: their own hours plus their assigned employees.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'employee')
        .eq('manager_id', profile.id);
      if (error) {
        console.error('Failed to load crew:', error.message);
        setCrew([]);
        setLoading(false);
        return;
      }
      people = [{ id: profile.id, full_name: profile.fullName, role: 'pm' }, ...(data ?? [])];
    }

    const dateStr = forDate.toISOString().slice(0, 10);
    const peopleIds = people.map((p) => p.id);
    const { data: entries } =
      peopleIds.length > 0
        ? await supabase
            .from('timesheet_entries')
            .select('employee_id, st_hours, ot_hours')
            .in('employee_id', peopleIds)
            .eq('date', dateStr)
        : { data: [] };

    const entryByEmployee = new Map((entries ?? []).map((e: any) => [e.employee_id, e]));

    setCrew(
      people.map((p) => ({
        id: p.id,
        fullName: p.full_name || 'Unnamed',
        role: p.role,
        isSelf: p.id === profile.id,
        stHours: Number(entryByEmployee.get(p.id)?.st_hours) || 0,
        otHours: Number(entryByEmployee.get(p.id)?.ot_hours) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    // Re-fetches when the selected day changes (not on every render) so
    // switching dates shows that day's already-submitted hours, if any.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCrewAndHours(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, date.toDateString()]);

  const updateHours = (id: string, field: 'stHours' | 'otHours', value: number) => {
    setCrew((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    const toSubmit = crew.filter((m) => m.stHours > 0 || m.otHours > 0);
    if (toSubmit.length === 0) {
      Alert.alert('Nothing to Submit', 'Enter hours for at least one crew member.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('timesheet_entries').upsert(
      toSubmit.map((m) => ({
        company_id: profile.companyId,
        employee_id: m.id,
        date: date.toISOString().slice(0, 10),
        st_hours: m.stHours,
        ot_hours: m.otHours,
        logged_by: profile.id,
      })),
      { onConflict: 'employee_id,date' }
    );
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Submitted', `Hours sent to ${toSubmit.length} crew member${toSubmit.length === 1 ? '' : 's'}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#075eec" />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#075eec" style={styles.loadingIndicator} />
        ) : crew.length === 0 ? (
          <Text style={styles.emptyText}>
            {profile?.role === 'pm' ? 'No employees are assigned to you yet.' : 'No employees yet.'}
          </Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Crew</Text>
            {crew.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {member.fullName}
                  {member.isSelf ? ' (You)' : ''}
                </Text>
                <Text style={styles.memberRole}>{member.role === 'pm' ? 'PM' : 'Employee'}</Text>
                <View style={styles.counterRow}>
                  <View style={styles.counterContainer}>
                    <Text style={styles.counterLabel}>ST Hours</Text>
                    <View style={styles.counterControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateHours(member.id, 'stHours', Math.max(0, member.stHours - 0.5))}
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{member.stHours}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateHours(member.id, 'stHours', member.stHours + 0.5)}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.counterContainer}>
                    <Text style={styles.counterLabel}>OT Hours</Text>
                    <View style={styles.counterControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateHours(member.id, 'otHours', Math.max(0, member.otHours - 0.5))}
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{member.otHours}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateHours(member.id, 'otHours', member.otHours + 0.5)}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {crew.length > 0 && (
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.submitBtnText}>{saving ? 'Submitting...' : 'Submit Hours'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 16 },
  loadingIndicator: { marginTop: 24 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: '#1e1e1e', marginLeft: 8 },
  doneBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 6, paddingHorizontal: 14 },
  doneBtnText: { color: '#075eec', fontWeight: '700' },
  memberRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f5',
    paddingTop: 12,
    marginTop: 8,
  },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1e1e1e', marginBottom: 2 },
  memberRole: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterContainer: { alignItems: 'center' },
  counterLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '600' },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    padding: 2,
  },
  stepBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  stepBtnText: { fontSize: 18, fontWeight: 'bold', color: '#075eec' },
  counterValue: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
