import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useProjects } from '@/context/ProjectsContext';

export default function ProjectFormScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { loading } = useProjects();

  // Don't mount the form until projects have actually loaded — otherwise,
  // if this screen is reached before the initial fetch resolves, the form's
  // initial state would snapshot "not found yet" and permanently miss the
  // real existing values once data does arrive.
  if (projectId && loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  // `key` forces a fresh component instance whenever the target project
  // changes, since this hidden-tab screen would otherwise be reused across
  // navigations instead of remounted.
  return <ProjectForm key={projectId ?? 'new'} projectId={projectId} />;
}

function ProjectForm({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { getProject, addProject, updateProject } = useProjects();

  const existingProject = projectId ? getProject(projectId) : undefined;
  const isEditing = !!existingProject;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Project' : 'New Project' });
  }, [isEditing]);

  const [name, setName] = useState(existingProject?.name ?? '');
  const [location, setLocation] = useState(existingProject?.location ?? '');
  const [status, setStatus] = useState<'Active' | 'Completed'>(existingProject?.status ?? 'Active');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a project name.');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && projectId) {
        await updateProject(projectId, { name: name.trim(), location: location.trim(), status });
        router.back();
      } else {
        const project = await addProject(name.trim(), location.trim());
        router.replace(`/project/${project.id}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Coffeyville Resources"
            placeholderTextColor="#8e8e93"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Coffeyville, KS"
            placeholderTextColor="#8e8e93"
            value={location}
            onChangeText={setLocation}
          />

          {isEditing && (
            <>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusBtn, status === 'Active' && styles.statusBtnActive]}
                  onPress={() => setStatus('Active')}
                >
                  <Text style={[styles.statusBtnText, status === 'Active' && styles.statusBtnTextActive]}>
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, status === 'Completed' && styles.statusBtnCompleted]}
                  onPress={() => setStatus('Completed')}
                >
                  <Text style={[styles.statusBtnText, status === 'Completed' && styles.statusBtnTextCompleted]}>
                    Completed
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.createBtnText}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  loadingContainer: { flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center', alignItems: 'center' },
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
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#f8f9fa',
  },
  statusBtnActive: { backgroundColor: '#34C75920', borderColor: '#34C759' },
  statusBtnCompleted: { backgroundColor: '#8e8e9320', borderColor: '#8e8e93' },
  statusBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  statusBtnTextActive: { color: '#34C759' },
  statusBtnTextCompleted: { color: '#374151' },
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
