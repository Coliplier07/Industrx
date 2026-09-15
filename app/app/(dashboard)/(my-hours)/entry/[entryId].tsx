import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface EntryDetail {
  id: string;
  date: string;
  stHours: number;
  otHours: number;
  status: 'pending' | 'approved' | 'disputed' | 'denied';
  disputeReason: string | null;
  requestedStHours: number | null;
  requestedOtHours: number | null;
}

export default function TimesheetEntryScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [reason, setReason] = useState('');
  const [requestedSt, setRequestedSt] = useState('');
  const [requestedOt, setRequestedOt] = useState('');

  useEffect(() => {
    const fetchEntry = async () => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (!error && data) {
        setEntry({
          id: data.id,
          date: data.date,
          stHours: Number(data.st_hours) || 0,
          otHours: Number(data.ot_hours) || 0,
          status: data.status,
          disputeReason: data.dispute_reason,
          requestedStHours: data.requested_st_hours === null ? null : Number(data.requested_st_hours),
          requestedOtHours: data.requested_ot_hours === null ? null : Number(data.requested_ot_hours),
        });
      }
      setLoading(false);
    };
    fetchEntry();
  }, [entryId]);

  const handleApprove = () => {
    if (!entry) return;
    Alert.alert('Approve Hours', 'Confirm these hours are correct?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setSaving(true);
          const { error } = await supabase
            .from('timesheet_entries')
            .update({ status: 'approved' })
            .eq('id', entry.id);
          setSaving(false);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  const handleSubmitDispute = async () => {
    if (!entry) return;
    if (!reason.trim()) {
      Alert.alert('Required', 'Enter a reason for the requested change.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('timesheet_entries')
      .update({
        status: 'disputed',
        dispute_reason: reason.trim(),
        requested_st_hours: requestedSt.trim() ? parseFloat(requestedSt) : null,
        requested_ot_hours: requestedOt.trim() ? parseFloat(requestedOt) : null,
      })
      .eq('id', entry.id);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    router.back();
  };

  if (loading || !entry) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  const dateLabel = new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <Text style={styles.hoursText}>
              {entry.stHours} ST · {entry.otHours} OT
            </Text>
            <Text style={styles.statusText}>Status: {entry.status}</Text>
          </View>

          {entry.status === 'disputed' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your Requested Change</Text>
              <Text style={styles.disputeText}>{entry.disputeReason}</Text>
              {(entry.requestedStHours !== null || entry.requestedOtHours !== null) && (
                <Text style={styles.disputeText}>
                  Requested: {entry.requestedStHours ?? entry.stHours} ST · {entry.requestedOtHours ?? entry.otHours} OT
                </Text>
              )}
              <Text style={styles.waitingText}>Waiting on your PM to review this.</Text>
            </View>
          )}

          {entry.status === 'approved' && (
            <View style={styles.card}>
              <Text style={styles.waitingText}>You already approved these hours.</Text>
            </View>
          )}

          {entry.status === 'denied' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Change Request Denied</Text>
              {!!entry.disputeReason && <Text style={styles.disputeText}>You said: {entry.disputeReason}</Text>}
              <Text style={styles.waitingText}>
                Your PM kept the hours as originally submitted. Accept below to confirm.
              </Text>
            </View>
          )}

          {entry.status === 'denied' && (
            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={saving}>
              <Text style={styles.approveBtnText}>Accept</Text>
            </TouchableOpacity>
          )}

          {entry.status === 'pending' && !showDisputeForm && (
            <>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={saving}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disputeBtn} onPress={() => setShowDisputeForm(true)}>
                <Text style={styles.disputeBtnText}>Request Change</Text>
              </TouchableOpacity>
            </>
          )}

          {entry.status === 'pending' && showDisputeForm && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Request a Change</Text>

              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's wrong with these hours?"
                placeholderTextColor="#8e8e93"
                value={reason}
                onChangeText={setReason}
                multiline
              />

              <Text style={styles.label}>Correct ST Hours (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={String(entry.stHours)}
                placeholderTextColor="#8e8e93"
                keyboardType="decimal-pad"
                value={requestedSt}
                onChangeText={setRequestedSt}
              />

              <Text style={styles.label}>Correct OT Hours (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={String(entry.otHours)}
                placeholderTextColor="#8e8e93"
                keyboardType="decimal-pad"
                value={requestedOt}
                onChangeText={setRequestedOt}
              />

              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                onPress={handleSubmitDispute}
                disabled={saving}
              >
                <Text style={styles.submitBtnText}>{saving ? 'Sending...' : 'Send to PM'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDisputeForm(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  keyboardAvoider: { flex: 1 },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#075eec', marginBottom: 8 },
  hoursText: { fontSize: 20, fontWeight: '700', color: '#1e1e1e' },
  statusText: { fontSize: 13, color: '#6b7280', marginTop: 6, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  disputeText: { fontSize: 14, color: '#1e1e1e', marginBottom: 6 },
  waitingText: { fontSize: 13, color: '#6b7280' },
  approveBtn: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  approveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disputeBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  disputeBtnText: { color: '#FF3B30', fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#1e1e1e', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
});
