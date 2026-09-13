import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface PmOption {
  id: string;
  fullName: string;
}

export default function AddPersonScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'pm' | 'employee'>('pm');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [pmOptions, setPmOptions] = useState<PmOption[]>([]);
  const [loadingPms, setLoadingPms] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPms = async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'pm');
      if (!error) {
        setPmOptions((data ?? []).map((row) => ({ id: row.id, fullName: row.full_name || 'Unnamed' })));
      }
      setLoadingPms(false);
    };
    fetchPms();
  }, []);

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please fill in name, email, and a temporary password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-account', {
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
          managerId: role === 'employee' ? managerId : null,
        },
      });

      if (error || data?.error) {
        Alert.alert('Error', data?.error ?? error?.message ?? 'Failed to create account.');
        return;
      }

      Alert.alert('Account Created', `${fullName.trim()} can now sign in with the temporary password.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ernesto Ramirez"
              placeholderTextColor="#8e8e93"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ernesto@example.com"
              placeholderTextColor="#8e8e93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Temporary Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#8e8e93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'pm' && styles.roleBtnSelected]}
                onPress={() => setRole('pm')}
              >
                <Text style={[styles.roleBtnText, role === 'pm' && styles.roleBtnTextSelected]}>PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'employee' && styles.roleBtnSelected]}
                onPress={() => setRole('employee')}
              >
                <Text style={[styles.roleBtnText, role === 'employee' && styles.roleBtnTextSelected]}>
                  Employee
                </Text>
              </TouchableOpacity>
            </View>

            {role === 'employee' && (
              <>
                <Text style={styles.label}>Reports To</Text>
                {loadingPms ? (
                  <ActivityIndicator color="#075eec" style={{ marginTop: 8 }} />
                ) : pmOptions.length === 0 ? (
                  <Text style={styles.noPmsText}>No PMs yet — add one first, or leave unassigned.</Text>
                ) : (
                  <View style={styles.pmList}>
                    {pmOptions.map((pm) => (
                      <TouchableOpacity
                        key={pm.id}
                        style={[styles.pmOption, managerId === pm.id && styles.pmOptionSelected]}
                        onPress={() => setManagerId(managerId === pm.id ? null : pm.id)}
                      >
                        <Text
                          style={[styles.pmOptionText, managerId === pm.id && styles.pmOptionTextSelected]}
                        >
                          {pm.fullName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.createBtn, saving && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              <Text style={styles.createBtnText}>{saving ? 'Creating...' : 'Create Account'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  keyboardAvoider: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1e1e1e', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  roleBtnSelected: { backgroundColor: '#075eec20', borderColor: '#075eec' },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  roleBtnTextSelected: { color: '#075eec' },
  noPmsText: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  pmList: { gap: 8 },
  pmOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  pmOptionSelected: { backgroundColor: '#075eec20', borderColor: '#075eec' },
  pmOptionText: { fontSize: 14, fontWeight: '600', color: '#1e1e1e' },
  pmOptionTextSelected: { color: '#075eec' },
  createBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
