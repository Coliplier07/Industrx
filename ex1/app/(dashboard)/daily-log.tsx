import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface LaborEntry {
  id: string;
  workerName: string;
  trade: string;
  stHours: number;
  otHours: number;
}

interface EquipmentEntry {
  id: string;
  equipmentName: string;
  hoursUsed: number;
}

export default function DailyLogScreen() {
  const router = useRouter();

  // Form State
  const [workDescription, setWorkDescription] = useState('');
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([
    { id: '1', workerName: '', trade: 'Operator', stHours: 8, otHours: 0 },
  ]);
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>([
    { id: '1', equipmentName: '', hoursUsed: 8 },
  ]);

  // --- Labor Handlers ---
  const addLaborRow = () => {
    setLaborEntries([
      ...laborEntries,
      { id: Date.now().toString(), workerName: '', trade: 'Laborer', stHours: 8, otHours: 0 },
    ]);
  };

  const updateLabor = (id: string, field: keyof LaborEntry, value: any) => {
    setLaborEntries(
      laborEntries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeLabor = (id: string) => {
    if (laborEntries.length > 1) {
      setLaborEntries(laborEntries.filter((entry) => entry.id !== id));
    }
  };

  // --- Equipment Handlers ---
  const addEquipmentRow = () => {
    setEquipmentEntries([
      ...equipmentEntries,
      { id: Date.now().toString(), equipmentName: '', hoursUsed: 8 },
    ]);
  };

  const updateEquipment = (id: string, field: keyof EquipmentEntry, value: any) => {
    setEquipmentEntries(
      equipmentEntries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeEquipment = (id: string) => {
    if (equipmentEntries.length > 1) {
      setEquipmentEntries(equipmentEntries.filter((entry) => entry.id !== id));
    }
  };

  // --- Submission Handler ---
  const handleSaveLog = () => {
    if (!workDescription.trim()) {
      Alert.alert('Required Field', 'Please enter a description of work done.');
      return;
    }

    const payload = {
      date: new Date().toISOString(),
      workDescription,
      laborEntries,
      equipmentEntries,
      isSynced: false, // Saves locally first for offline support
    };

    console.log('Saved Daily Log Payload:', payload);
    Alert.alert('Success', 'Daily Log saved locally.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Work Description Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe activities, jobsite conditions, delays..."
            placeholderTextColor="#8e8e93"
            multiline
            numberOfLines={4}
            value={workDescription}
            onChangeText={setWorkDescription}
          />
        </View>

        {/* Labor Hours Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Labor Tracking</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addLaborRow}>
              <Ionicons name="add-circle" size={20} color="#075eec" />
              <Text style={styles.addBtnText}>Add Worker</Text>
            </TouchableOpacity>
          </View>

          {laborEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Worker Name / ID"
                  placeholderTextColor="#8e8e93"
                  value={item.workerName}
                  onChangeText={(val) => updateLabor(item.id, 'workerName', val)}
                />
              </View>

              <View style={styles.counterRow}>
                {/* Straight Time Counter */}
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>ST Hours</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateLabor(item.id, 'stHours', Math.max(0, item.stHours - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.stHours}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateLabor(item.id, 'stHours', item.stHours + 0.5)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Overtime Counter */}
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>OT Hours</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateLabor(item.id, 'otHours', Math.max(0, item.otHours - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.otHours}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateLabor(item.id, 'otHours', item.otHours + 0.5)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {laborEntries.length > 1 && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeLabor(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Equipment Hours Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Equipment Usage</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addEquipmentRow}>
              <Ionicons name="add-circle" size={20} color="#075eec" />
              <Text style={styles.addBtnText}>Add Equipment</Text>
            </TouchableOpacity>
          </View>

          {equipmentEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <TextInput
                style={styles.input}
                placeholder="Equipment Name / Unit #"
                placeholderTextColor="#8e8e93"
                value={item.equipmentName}
                onChangeText={(val) => updateEquipment(item.id, 'equipmentName', val)}
              />

              <View style={styles.counterRow}>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Hours Operated</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateEquipment(item.id, 'hoursUsed', Math.max(0, item.hoursUsed - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.hoursUsed}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateEquipment(item.id, 'hoursUsed', item.hoursUsed + 0.5)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {equipmentEntries.length > 1 && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEquipment(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog}>
          <Text style={styles.saveButtonText}>Submit Daily Log</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e1e1e', marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#075eec', fontWeight: '600', marginLeft: 4 },
  textArea: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f5',
    paddingTop: 12,
    marginTop: 8,
  },
  inputGroup: { marginBottom: 8 },
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterContainer: { alignItems: 'center' },
  counterLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '600' },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    padding: 2,
  },
  stepBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  stepBtnText: { fontSize: 18, fontWeight: 'bold', color: '#075eec' },
  counterValue: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  deleteBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  saveButton: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});