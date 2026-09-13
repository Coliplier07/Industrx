import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import HeaderIconButton from '@/components/HeaderIconButton';

interface Member {
  id: string;
  fullName: string;
  role: 'admin' | 'pm' | 'employee';
  managerId: string | null;
  managerName: string | null;
}

interface PmOption {
  id: string;
  fullName: string;
}

export default function TeamScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [members, setMembers] = useState<Member[]>([]);
  const [pmOptions, setPmOptions] = useState<PmOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Only one action per member happens at a time, so a single busy flag
  // (keyed by member id) covers reassign, role change, and delete alike.
  const [busyId, setBusyId] = useState<string | null>(null);
  // Which member's "type the name to confirm" delete box is open, and what
  // they've typed into it so far.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, manager_id, manager:manager_id(full_name)')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load team:', error.message);
      Alert.alert('Error', 'Failed to load team members.');
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as any[];
    setMembers(
      rows.map((row) => ({
        id: row.id,
        fullName: row.full_name || 'Unnamed',
        role: row.role,
        managerId: row.manager_id,
        managerName: row.manager?.full_name ?? null,
      }))
    );
    setPmOptions(
      rows.filter((row) => row.role === 'pm').map((row) => ({ id: row.id, fullName: row.full_name || 'Unnamed' }))
    );
    setLoading(false);
  };

  // Re-fetch every time this screen regains focus (not just on first mount),
  // so returning from Add Person shows the up-to-date list.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMembers();
    }, [])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderIconButton name="add" onPress={() => router.push('/team/new')} style={{ marginRight: 8 }} />
      ),
      unstable_headerRightItems: () => [
        {
          type: 'custom',
          element: <HeaderIconButton name="add" onPress={() => router.push('/team/new')} style={{ marginRight: 8 }} />,
          hidesSharedBackground: true,
        },
      ],
    });
  }, [navigation, router]);

  const handleReassign = async (employeeId: string, managerId: string | null) => {
    setBusyId(employeeId);
    const { data, error } = await supabase.functions.invoke('admin-reassign-employee', {
      body: { employeeId, managerId },
    });
    setBusyId(null);

    if (error || data?.error) {
      Alert.alert('Error', data?.error ?? error?.message ?? 'Failed to reassign employee.');
      return;
    }

    setExpandedId(null);
    fetchMembers();
  };

  const handleChangeRole = (member: Member, newRole: 'pm' | 'employee') => {
    const crewSize = members.filter((m) => m.managerId === member.id).length;
    const warning =
      member.role === 'pm' && newRole === 'employee' && crewSize > 0
        ? ` Their ${crewSize} ${crewSize === 1 ? 'employee' : 'employees'} will become unassigned.`
        : '';

    Alert.alert(
      'Change Role',
      `Make ${member.fullName} ${newRole === 'pm' ? 'a PM' : 'an employee'}?${warning}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBusyId(member.id);
            const { data, error } = await supabase.functions.invoke('admin-update-role', {
              body: { memberId: member.id, newRole },
            });
            setBusyId(null);

            if (error || data?.error) {
              Alert.alert('Error', data?.error ?? error?.message ?? 'Failed to change role.');
              return;
            }

            setExpandedId(null);
            fetchMembers();
          },
        },
      ]
    );
  };

  const handleDelete = async (member: Member) => {
    setBusyId(member.id);
    const { data, error } = await supabase.functions.invoke('admin-delete-member', {
      body: { memberId: member.id },
    });
    setBusyId(null);

    if (error || data?.error) {
      Alert.alert('Error', data?.error ?? error?.message ?? 'Failed to delete team member.');
      return;
    }

    setConfirmingDeleteId(null);
    setExpandedId(null);
    fetchMembers();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  const confirmingMember = members.find((m) => m.id === confirmingDeleteId) ?? null;
  const confirmingCrewSize = confirmingMember
    ? members.filter((m) => m.managerId === confirmingMember.id).length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {members.length === 0 ? (
          <Text style={styles.emptyText}>No team members yet.</Text>
        ) : (
          members.map((member) => {
            const crewSize = members.filter((m) => m.managerId === member.id).length;
            const isExpanded = expandedId === member.id;
            const isBusy = busyId === member.id;

            return (
              <View key={member.id} style={styles.card}>
                <TouchableOpacity
                  disabled={member.role === 'admin'}
                  onPress={() => {
                    setExpandedId(isExpanded ? null : member.id);
                    setConfirmingDeleteId(null);
                  }}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <View style={[styles.roleBadge, styles[`role_${member.role}` as const]]}>
                      <Text style={styles.roleBadgeText}>{member.role.toUpperCase()}</Text>
                    </View>
                  </View>
                  {member.role !== 'admin' && (
                    <View style={styles.managerRow}>
                      <Text style={styles.managerText}>
                        {member.role === 'employee'
                          ? member.managerName
                            ? `Reports to ${member.managerName}`
                            : 'Unassigned'
                          : `Manages ${crewSize} ${crewSize === 1 ? 'employee' : 'employees'}`}
                      </Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
                    </View>
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedLabel}>Role</Text>
                    <View style={styles.roleToggleRow}>
                      {(['pm', 'employee'] as const).map((roleOption) => (
                        <TouchableOpacity
                          key={roleOption}
                          style={[styles.roleOption, member.role === roleOption && styles.pmOptionSelected]}
                          onPress={() => roleOption !== member.role && handleChangeRole(member, roleOption)}
                          disabled={isBusy}
                        >
                          <Text
                            style={[styles.pmOptionText, member.role === roleOption && styles.pmOptionTextSelected]}
                          >
                            {roleOption === 'pm' ? 'PM' : 'Employee'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {member.role === 'employee' && (
                      <>
                        <Text style={styles.expandedLabel}>Reports To</Text>
                        <View style={styles.pmList}>
                          <TouchableOpacity
                            style={[styles.pmOption, member.managerId === null && styles.pmOptionSelected]}
                            onPress={() => handleReassign(member.id, null)}
                            disabled={isBusy}
                          >
                            <Text
                              style={[styles.pmOptionText, member.managerId === null && styles.pmOptionTextSelected]}
                            >
                              Unassigned
                            </Text>
                          </TouchableOpacity>
                          {pmOptions.map((pm) => (
                            <TouchableOpacity
                              key={pm.id}
                              style={[styles.pmOption, member.managerId === pm.id && styles.pmOptionSelected]}
                              onPress={() => handleReassign(member.id, pm.id)}
                              disabled={isBusy}
                            >
                              <Text
                                style={[
                                  styles.pmOptionText,
                                  member.managerId === pm.id && styles.pmOptionTextSelected,
                                ]}
                              >
                                {pm.fullName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => {
                        setDeleteConfirmText('');
                        setConfirmingDeleteId(member.id);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.deleteBtnText}>Delete Person</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/team/new')}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Person</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={confirmingMember !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingDeleteId(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {confirmingMember && (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete {confirmingMember.fullName}?</Text>
              <Text style={styles.deleteWarningText}>
                This permanently deletes their account and their hours history. This can&apos;t be undone.
                {confirmingMember.role === 'pm' && confirmingCrewSize > 0
                  ? ` Their ${confirmingCrewSize} ${confirmingCrewSize === 1 ? 'employee' : 'employees'} will become unassigned.`
                  : ''}
              </Text>
              <Text style={styles.deleteConfirmLabel}>
                Type <Text style={styles.deleteConfirmName}>{confirmingMember.fullName}</Text> to confirm
              </Text>
              <TextInput
                style={styles.deleteConfirmInput}
                placeholder={confirmingMember.fullName}
                placeholderTextColor="#8e8e93"
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={styles.cancelDeleteBtn}
                  onPress={() => setConfirmingDeleteId(null)}
                  disabled={busyId === confirmingMember.id}
                >
                  <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    styles.confirmDeleteBtn,
                    deleteConfirmText !== confirmingMember.fullName && styles.deleteBtnDisabled,
                  ]}
                  onPress={() => handleDelete(confirmingMember)}
                  disabled={busyId === confirmingMember.id || deleteConfirmText !== confirmingMember.fullName}
                >
                  <Text style={styles.deleteBtnText}>Delete Permanently</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '700', color: '#1e1e1e' },
  roleBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  role_admin: { backgroundColor: '#075eec20' },
  role_pm: { backgroundColor: '#34C75920' },
  role_employee: { backgroundColor: '#8e8e9320' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e1e1e' },
  managerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  managerText: { fontSize: 13, color: '#6b7280' },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f5', paddingTop: 12 },
  expandedLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' },
  roleToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  pmList: { gap: 8, marginBottom: 16 },
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
  deleteBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e1e1e', marginBottom: 10 },
  deleteWarningText: { fontSize: 13, color: '#1e1e1e', marginBottom: 16, lineHeight: 18 },
  deleteConfirmLabel: { fontSize: 13, color: '#1e1e1e', marginBottom: 8 },
  deleteConfirmName: { fontWeight: '700' },
  deleteConfirmInput: {
    backgroundColor: '#fff',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  deleteConfirmActions: { flexDirection: 'row', gap: 8 },
  cancelDeleteBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelDeleteBtnText: { color: '#1e1e1e', fontSize: 14, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },
});
