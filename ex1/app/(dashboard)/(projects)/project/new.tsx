import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjects } from '@/context/ProjectsContext';

export default function NewProjectScreen() {
  const router = useRouter();
  const { addProject } = useProjects();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a project name.');
      return;
    }
    const project = addProject(name.trim(), location.trim());
    router.replace(`/project/${project.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
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

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>Create Project</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
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
  createBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
