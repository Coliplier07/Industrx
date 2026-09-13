import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';

interface ChangeRequest {
  id: string;
  employeeName: string;
  date: string;
  stHours: number;
  otHours: number;
  requestedStHours: number | null;
  requestedOtHours: number | null;
  disputeReason: string | null;
}

export default function ChangeRequestsScreen() {
  const { profile } = useProfile();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  // What the PM currently has dialed in for each request — starts out equal
  // to what the employee requested, but the PM can adjust it to anything
  // before sending it back, not just accept/deny the requested numbers.
  const [editedHours, setEditedHours] = useState<Record<string, { st: number; ot: number }>>({});
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Which request's hour-editor is currently open — only one at a time.
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let people: { id: string; full_name: string }[];

    if (profile.role === 'admin') {
      const { data, error } = await supabase.from('profiles').select('id, full_name').in('role', ['pm', 'employee']);
      if (error) {
        console.error('Failed to load people:', error.message);
        setRequests([]);
        setLoading(false);
        return;
      }
      people = data ?? [];
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'employee')
        .eq('manager_id', profile.id);
      if (error) {
        console.error('Failed to load crew:', error.message);
        setRequests([]);
        setLoading(false);
        return;
      }
      people = [{ id: profile.id, full_name: profile.fullName }, ...(data ?? [])];
    }

    const nameById = new Map(people.map((p) => [p.id, p.full_name || 'Unnamed']));
    const peopleIds = people.map((p) => p.id);

    const { data: entries, error: entriesError } =
      peopleIds.length > 0
        ? await supabase
            .from('timesheet_entries')
            .select('id, employee_id, date, st_hours, ot_hours, requested_st_hours, requested_ot_hours, dispute_reason')
            .in('employee_id', peopleIds)
            .eq('status', 'disputed')
            .order('date', { ascending: false })
        : { data: [], error: null };

    if (entriesError) {
      console.error('Failed to load change requests:', entriesError.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    const fetched: ChangeRequest[] = (entries ?? []).map((row: any) => ({
      id: row.id,
      employeeName: nameById.get(row.employee_id) ?? 'Unnamed',
      date: row.date,
      stHours: Number(row.st_hours) || 0,
      otHours: Number(row.ot_hours) || 0,
      requestedStHours: row.requested_st_hours === null ? null : Number(row.requested_st_hours),
      requestedOtHours: row.requested_ot_hours === null ? null : Number(row.requested_ot_hours),
      disputeReason: row.dispute_reason,
    }));

    setRequests(fetched);
    setEditedHours(
      Object.fromEntries(
        fetched.map((r) => [r.id, { st: r.requestedStHours ?? r.stHours, ot: r.requestedOtHours ?? r.otHours }])
      )
    );
    setEditingId(null);
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    React.useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const updateEditedHours = (requestId: string, field: 'st' | 'ot', value: number) => {
    setEditedHours((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], [field]: Math.max(0, value) },
    }));
  };

  const handleAccept = (request: ChangeRequest) => {
    const finalSt = request.requestedStHours ?? request.stHours;
    const finalOt = request.requestedOtHours ?? request.otHours;
    Alert.alert('Accept Request', `Approve ${finalSt} ST / ${finalOt} OT for ${request.employeeName} as requested?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActingOn(request.id);
          // Two updates on purpose: the first applies the requested hours,
          // which protect_timesheet_hours_trigger reopens as 'pending' (any
          // hours change does, PM-initiated or not). The second then marks
          // it approved directly — since this is exactly what the employee
          // asked for, there's no need to send it back for them to re-approve.
          const { error: hoursError } = await supabase
            .from('timesheet_entries')
            .update({ st_hours: finalSt, ot_hours: finalOt })
            .eq('id', request.id);
          if (hoursError) {
            setActingOn(null);
            Alert.alert('Error', hoursError.message);
            return;
          }
          const { error: statusError } = await supabase
            .from('timesheet_entries')
            .update({ status: 'approved' })
            .eq('id', request.id);
          setActingOn(null);
          if (statusError) {
            Alert.alert('Error', statusError.message);
            return;
          }
          fetchRequests();
        },
      },
    ]);
  };

  const handleSendToEmployee = (request: ChangeRequest) => {
    const hours = editedHours[request.id];
    Alert.alert('Send to Employee', `Send ${hours.st} ST / ${hours.ot} OT back to ${request.employeeName} for approval?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setActingOn(request.id);
          // Updating hours re-opens the entry as 'pending' (see
          // protect_timesheet_hours_trigger), so the employee sees these as
          // new numbers to approve or dispute again — whether they match
          // what they originally requested or not.
          const { error } = await supabase
            .from('timesheet_entries')
            .update({ st_hours: hours.st, ot_hours: hours.ot })
            .eq('id', request.id);
          setActingOn(null);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          setEditingId(null);
          fetchRequests();
        },
      },
    ]);
  };

  const handleKeepOriginal = (request: ChangeRequest) => {
    Alert.alert('Keep Original Hours', 'Deny the request and send the original hours back to the employee?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Keep Original',
        style: 'destructive',
        onPress: async () => {
          setActingOn(request.id);
          // 'denied' (not 'pending') so the employee sees this was denied
          // and can only accept the original hours, not dispute them again.
          const { error } = await supabase
            .from('timesheet_entries')
            .update({ status: 'denied', requested_st_hours: null, requested_ot_hours: null })
            .eq('id', request.id);
          setActingOn(null);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          fetchRequests();
        },
      },
    ]);
  };

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
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>No pending change requests.</Text>
        ) : (
          requests.map((request) => {
            const hours = editedHours[request.id] ?? { st: request.stHours, ot: request.otHours };
            return (
              <View key={request.id} style={styles.card}>
                <Text style={styles.employeeName}>{request.employeeName}</Text>
                <Text style={styles.dateLabel}>
                  {new Date(`${request.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>

                <View style={styles.hoursRow}>
                  <View style={styles.hoursCol}>
                    <Text style={styles.hoursLabel}>Current</Text>
                    <Text style={styles.hoursValue}>
                      {request.stHours} ST · {request.otHours} OT
                    </Text>
                  </View>
                  <View style={styles.hoursCol}>
                    <Text style={styles.hoursLabel}>Employee Requested</Text>
                    <Text style={[styles.hoursValue, styles.requestedValue]}>
                      {request.requestedStHours ?? request.stHours} ST · {request.requestedOtHours ?? request.otHours} OT
                    </Text>
                  </View>
                </View>

                {!!request.disputeReason && (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason</Text>
                    <Text style={styles.reasonText}>{request.disputeReason}</Text>
                  </View>
                )}

                {editingId === request.id ? (
                  <>
                    <Text style={styles.sectionTitle}>Hours to Send</Text>
                    <View style={styles.counterRow}>
                      <View style={styles.counterContainer}>
                        <Text style={styles.counterLabel}>ST Hours</Text>
                        <View style={styles.counterControls}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateEditedHours(request.id, 'st', hours.st - 0.5)}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{hours.st}</Text>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateEditedHours(request.id, 'st', hours.st + 0.5)}
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
                            onPress={() => updateEditedHours(request.id, 'ot', hours.ot - 0.5)}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{hours.ot}</Text>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => updateEditedHours(request.id, 'ot', hours.ot + 0.5)}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={() => handleSendToEmployee(request)}
                        disabled={actingOn === request.id}
                      >
                        <Text style={styles.sendBtnText}>Send Back for Approval</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setEditingId(null)}
                      disabled={actingOn === request.id}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(request)}
                        disabled={actingOn === request.id}
                      >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={() => {
                          setEditedHours((prev) => ({
                            ...prev,
                            [request.id]: {
                              st: request.requestedStHours ?? request.stHours,
                              ot: request.requestedOtHours ?? request.otHours,
                            },
                          }));
                          setEditingId(request.id);
                        }}
                        disabled={actingOn === request.id}
                      >
                        <Text style={styles.sendBtnText}>Edit Hours</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.denyBtn}
                      onPress={() => handleKeepOriginal(request)}
                      disabled={actingOn === request.id}
                    >
                      <Text style={styles.denyBtnText}>Keep Original</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  employeeName: { fontSize: 16, fontWeight: '700', color: '#1e1e1e' },
  dateLabel: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 12 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursCol: { flex: 1 },
  hoursLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  hoursValue: { fontSize: 15, fontWeight: '600', color: '#1e1e1e' },
  requestedValue: { color: '#075eec' },
  reasonBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', marginBottom: 2, textTransform: 'uppercase' },
  reasonText: { fontSize: 14, color: '#1e1e1e' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e1e1e', marginTop: 16, marginBottom: 8 },
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
  actionsRow: { flexDirection: 'row', marginTop: 16 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sendBtn: {
    flex: 1,
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  denyBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  denyBtnText: { color: '#FF3B30', fontSize: 14, fontWeight: '700' },
});
