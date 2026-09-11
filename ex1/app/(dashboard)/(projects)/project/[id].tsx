import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, DailyLog, Receipt } from '@/context/ProjectsContext';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProject, updateProject } = useProjects();
  const project = getProject(id);

  const handleToggleStatus = async () => {
    if (!project) return;
    const nextStatus = project.status === 'Active' ? 'Completed' : 'Active';
    try {
      await updateProject(project.id, { name: project.name, location: project.location, status: nextStatus });
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to update project.');
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
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Project',
      headerRight: () => (
        <TouchableOpacity onPress={showOptions} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
        </TouchableOpacity>
      ),
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
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
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
});
