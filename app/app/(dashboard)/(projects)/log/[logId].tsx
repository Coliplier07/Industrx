import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useProjects } from '@/context/ProjectsContext';
import HeaderIconButton from '@/components/HeaderIconButton';

export default function LogDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId: string }>();
  const { getProject, deleteDailyLog } = useProjects();

  const project = getProject(projectId);
  const log = project?.dailyLogs.find((l) => l.id === logId);

  const handleDelete = () => {
    Alert.alert('Delete Daily Log', 'This cannot be undone. Delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDailyLog(projectId, logId);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message ?? 'Failed to delete daily log.');
          }
        },
      },
    ]);
  };

  const showOptions = () => {
    Alert.alert('Log Options', undefined, [
      {
        text: 'Edit',
        onPress: () => router.push({ pathname: '/daily-log', params: { projectId, logId } }),
      },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Daily Log',
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
  }, [projectId, logId, log]);

  if (!log) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Log not found.</Text>
      </SafeAreaView>
    );
  }

  const dateLabel = new Date(log.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.card}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.description}>{log.workDescription}</Text>
        </View>

        <Text style={styles.sectionTitle}>Labor Tracking</Text>
        <View style={styles.card}>
          {log.laborEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryName}>{entry.employeeName}</Text>
              <Text style={styles.entryMeta}>
                {entry.roleName} · {entry.stHours} ST · {entry.otHours} OT
                {entry.perDiemName ? ` · ${entry.perDiemName}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Vehicle Tracking</Text>
        <View style={styles.card}>
          {log.vehicleEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryName}>{entry.vehicleName || 'Unnamed Vehicle'}</Text>
              <Text style={styles.entryMeta}>
                {entry.hoursUsed} hours used{entry.cost !== null ? ` · $${entry.cost.toFixed(2)}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Equipment Usage</Text>
        <View style={styles.card}>
          {log.equipmentEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryName}>{entry.equipmentName || 'Unnamed Equipment'}</Text>
              <Text style={styles.entryMeta}>
                {entry.hoursUsed} hours operated{entry.cost !== null ? ` · $${entry.cost.toFixed(2)}` : ''}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
  notFound: { padding: 20, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateLabel: { fontSize: 13, fontWeight: '700', color: '#075eec', marginBottom: 8 },
  description: { fontSize: 16, color: '#1e1e1e', lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f5',
    paddingTop: 10,
    marginTop: 10,
  },
  entryName: { fontSize: 15, fontWeight: '600', color: '#1e1e1e' },
  entryMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
