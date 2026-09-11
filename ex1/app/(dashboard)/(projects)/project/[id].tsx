import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, DailyLog } from '@/context/ProjectsContext';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProject } = useProjects();
  const project = getProject(id);

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
        {log.equipmentEntries.length} equipment
      </Text>
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
});
