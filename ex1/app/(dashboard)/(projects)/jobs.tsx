import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, Project } from '@/context/ProjectsContext';

export default function JobsDashboard() {
  const router = useRouter();
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#075eec" />
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

        {/* Header Row */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Projects</Text>
          <TouchableOpacity
            style={styles.newProjectBtn}
            onPress={() => router.push('/project/new')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newProjectBtnText}>New Project</Text>
          </TouchableOpacity>
        </View>

        {/* Project List */}
        {projects.length === 0 ? (
          <Text style={styles.emptyText}>No projects yet. Create one to get started.</Text>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => router.push(`/project/${project.id}`)}
            />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.projectCard} onPress={onPress}>
      <View style={styles.projectCardTop}>
        <Text style={styles.label}>{project.status.toUpperCase()}</Text>
        <View
          style={[
            styles.statusDot,
            project.status === 'Active' ? styles.statusActive : styles.statusCompleted,
          ]}
        />
      </View>
      <Text style={styles.jobTitle}>{project.name}</Text>
      {!!project.location && <Text style={styles.locationText}>{project.location}</Text>}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {project.dailyLogs.length} Daily Log{project.dailyLogs.length === 1 ? '' : 's'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e1e1e' },
  newProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075eec',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  newProjectBtnText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  projectCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusActive: { backgroundColor: '#34C759' },
  statusCompleted: { backgroundColor: '#8e8e93' },
  jobTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e1e1e', marginTop: 4 },
  locationText: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  badge: {
    backgroundColor: '#075eec20',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  badgeText: { color: '#075eec', fontWeight: 'bold', fontSize: 13 },
});
