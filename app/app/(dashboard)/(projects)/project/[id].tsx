import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, DailyLog, Receipt } from '@/context/ProjectsContext';
import { useProfile } from '@/context/ProfileContext';
import HeaderIconButton from '@/components/HeaderIconButton';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProject, updateProject, deleteProject } = useProjects();
  const { profile } = useProfile();
  const project = getProject(id);
  const isAdmin = profile?.role === 'admin';
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleToggleStatus = async () => {
    if (!project) return;
    const nextStatus = project.status === 'Active' ? 'Completed' : 'Active';
    try {
      await updateProject(project.id, { name: project.name, location: project.location, status: nextStatus });
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to update project.');
    }
  };

  const handleDelete = () => {
    if (!project) return;
    setDeleteConfirmText('');
    setConfirmingDelete(true);
  };

  const confirmDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.back();
    } catch (error: any) {
      setDeleting(false);
      Alert.alert('Error', error.message ?? 'Failed to delete project.');
    }
  };

  const showOptions = () => {
    if (!project) return;
    Alert.alert('Project Options', undefined, [
      { text: 'Edit', onPress: () => router.push({ pathname: '/project/new', params: { projectId: project.id } }) },
      {
        text: project.status === 'Active' ? 'Mark as Completed' : 'Mark as Active',
        onPress: handleToggleStatus,
      },
      // Only an admin can delete a project — PMs can create/edit but not
      // remove one, enforced by RLS too (company_projects_delete policy).
      ...(isAdmin ? [{ text: 'Delete Project', style: 'destructive' as const, onPress: handleDelete }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Project',
      headerRight: () => (
        <HeaderIconButton name="ellipsis-horizontal" onPress={showOptions} style={{ marginRight: 8 }} />
      ),
      unstable_headerRightItems: () => [
        {
          type: 'custom',
          element: <HeaderIconButton name="ellipsis-horizontal" onPress={showOptions} style={{ marginRight: 8 }} />,
          hidesSharedBackground: true,
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.card}>
          <Text style={styles.projectName}>{project.name}</Text>
          {!!project.location && <Text style={styles.location}>{project.location}</Text>}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{project.status}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newLogBtn}
          onPress={() =>
            router.push({ pathname: '/daily-log', params: { projectId: project.id } })
          }
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.newLogBtnText}>New Daily Log</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Daily Logs</Text>
        {project.dailyLogs.length === 0 ? (
          <Text style={styles.emptyText}>No daily logs yet. Add the first one above.</Text>
        ) : (
          project.dailyLogs.map((log) => (
            <DailyLogRow
              key={log.id}
              log={log}
              onPress={() =>
                router.push({
                  pathname: '/log/[logId]',
                  params: { projectId: project.id, logId: log.id },
                })
              }
            />
          ))
        )}

        <View style={styles.receiptsHeader}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          <TouchableOpacity
            style={styles.addReceiptBtn}
            onPress={() => router.push({ pathname: '/receipt/new', params: { projectId: project.id } })}
          >
            <Ionicons name="add" size={16} color="#075eec" />
            <Text style={styles.addReceiptBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {project.receipts.length === 0 ? (
          <Text style={styles.emptyText}>No receipts yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.receiptsRow}>
            {project.receipts.map((receipt) => (
              <ReceiptThumbnail
                key={receipt.id}
                receipt={receipt}
                onPress={() =>
                  router.push({
                    pathname: '/receipt/[receiptId]',
                    params: { projectId: project.id, receiptId: receipt.id },
                  })
                }
              />
            ))}
          </ScrollView>
        )}

      </ScrollView>

      <Modal
        visible={confirmingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingDelete(false)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete {project.name}?</Text>
            <Text style={styles.deleteWarningText}>
              This deletes the project and everything in it — daily logs, receipts, all of it. This can&apos;t be
              undone.
            </Text>
            <Text style={styles.deleteConfirmLabel}>
              Type <Text style={styles.deleteConfirmName}>{project.name}</Text> to confirm
            </Text>
            <TextInput
              style={styles.deleteConfirmInput}
              placeholder={project.name}
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
                onPress={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  (deleting || deleteConfirmText !== project.name) && styles.deleteBtnDisabled,
                ]}
                onPress={confirmDelete}
                disabled={deleting || deleteConfirmText !== project.name}
              >
                <Text style={styles.deleteBtnText}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function DailyLogRow({ log, onPress }: { log: DailyLog; onPress: () => void }) {
  const dateLabel = new Date(log.date).toLocaleDateString();
  return (
    <TouchableOpacity style={styles.logRow} onPress={onPress}>
      <Text style={styles.logDate}>{dateLabel}</Text>
      <Text style={styles.logDescription} numberOfLines={2}>
        {log.workDescription}
      </Text>
      <Text style={styles.logMeta}>
        {log.laborEntries.length} worker{log.laborEntries.length === 1 ? '' : 's'} ·{' '}
        {log.equipmentEntries.length} equipment · {log.vehicleEntries.length} vehicle
        {log.vehicleEntries.length === 1 ? '' : 's'}
      </Text>
    </TouchableOpacity>
  );
}

function ReceiptThumbnail({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  const dateLabel = new Date(receipt.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <TouchableOpacity style={styles.receiptCard} onPress={onPress}>
      <View>
        {receipt.signedUrl ? (
          <Image source={{ uri: receipt.signedUrl }} style={styles.receiptThumb} />
        ) : (
          <View style={[styles.receiptThumb, styles.receiptThumbPlaceholder]}>
            <Ionicons name="receipt-outline" size={24} color="#c7ccd1" />
          </View>
        )}
        <View style={styles.receiptAmountBadge}>
          <Text style={styles.receiptAmountText}>
            ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
      <Text style={styles.receiptDate}>{dateLabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
  notFound: { padding: 20, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  projectName: { fontSize: 22, fontWeight: 'bold', color: '#1e1e1e' },
  location: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  badge: {
    backgroundColor: '#34C75920',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  badgeText: { color: '#34C759', fontWeight: 'bold', fontSize: 13 },
  newLogBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 20,
  },
  newLogBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  emptyText: { color: '#6b7280' },
  logRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logDate: { fontSize: 13, fontWeight: '700', color: '#075eec', marginBottom: 4 },
  logDescription: { fontSize: 15, color: '#1e1e1e', marginBottom: 4 },
  logMeta: { fontSize: 12, color: '#6b7280' },
  receiptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef4ff',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  addReceiptBtnText: { color: '#075eec', fontWeight: '600', fontSize: 13, marginLeft: 2 },
  receiptsRow: { marginBottom: 8 },
  receiptCard: { marginRight: 12, alignItems: 'center' },
  receiptThumb: { width: 90, height: 90, borderRadius: 8 },
  receiptThumbPlaceholder: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptDate: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  receiptAmountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  receiptAmountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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
    backgroundColor: '#f8f9fa',
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
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
