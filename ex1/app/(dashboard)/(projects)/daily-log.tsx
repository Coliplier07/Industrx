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
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, LaborEntry, EquipmentEntry, VehicleEntry } from '@/context/ProjectsContext';

export default function DailyLogScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId?: string }>();
  const { loading } = useProjects();

  // Don't mount the form until projects have actually loaded — otherwise,
  // if this screen is reached before the initial fetch resolves, the form's
  // initial state would snapshot "not found yet" and permanently miss the
  // real existing values once data does arrive.
  if (logId && loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  // `key` forces a fresh component instance (and fresh initial state) whenever
  // the target log changes, since this hidden-tab screen would otherwise be
  // reused across navigations instead of remounted.
  return <DailyLogForm key={`${projectId}-${logId ?? 'new'}`} projectId={projectId} logId={logId} />;
}

function DailyLogForm({ projectId, logId }: { projectId: string; logId?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { getProject, addDailyLog, updateDailyLog } = useProjects();

  const existingLog = logId ? getProject(projectId)?.dailyLogs.find((l) => l.id === logId) : undefined;
  const isEditing = !!existingLog;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Daily Log' : 'New Daily Log' });
  }, [isEditing]);

  // Form State
  const [logDate, setLogDate] = useState(existingLog ? new Date(existingLog.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [workDescription, setWorkDescription] = useState(existingLog?.workDescription ?? '');
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>(
    existingLog?.laborEntries ?? [{ id: '1', workerName: '', trade: 'Operator', stHours: 8, otHours: 0 }]
  );
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>(
    existingLog?.equipmentEntries ?? [{ id: '1', equipmentName: '', hoursUsed: 8 }]
  );
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>(
    existingLog?.vehicleEntries ?? [{ id: '1', vehicleName: '', hoursUsed: 8 }]
  );
  const [saving, setSaving] = useState(false);

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

  // --- Vehicle Handlers ---
  const addVehicleRow = () => {
    setVehicleEntries([
      ...vehicleEntries,
      { id: Date.now().toString(), vehicleName: '', hoursUsed: 8 },
    ]);
  };

  const updateVehicle = (id: string, field: keyof VehicleEntry, value: any) => {
    setVehicleEntries(
      vehicleEntries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeVehicle = (id: string) => {
    if (vehicleEntries.length > 1) {
      setVehicleEntries(vehicleEntries.filter((entry) => entry.id !== id));
    }
  };

  // --- Date Handler ---
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setLogDate(selectedDate);
    }
  };

  // --- Submission Handler ---
  const handleSaveLog = async () => {
    if (!workDescription.trim()) {
      Alert.alert('Required Field', 'Please enter a description of work done.');
      return;
    }

    if (!projectId) {
      Alert.alert('Error', 'No project selected for this log.');
      return;
    }

    const payload = {
      date: logDate.toISOString(),
      workDescription,
      laborEntries,
      equipmentEntries,
      vehicleEntries,
    };

    setSaving(true);
    try {
      if (isEditing && logId) {
        await updateDailyLog(projectId, logId, payload);
        Alert.alert('Success', 'Daily Log updated.', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        await addDailyLog(projectId, payload);
        Alert.alert('Success', 'Daily Log saved to the project.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to save daily log.');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >

        {/* Log Date Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Log Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#075eec" />
            <Text style={styles.dateBtnText}>
              {logDate.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={logDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

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

        {/* Vehicle Hours Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Vehicle Tracking</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addVehicleRow}>
              <Ionicons name="add-circle" size={20} color="#075eec" />
              <Text style={styles.addBtnText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          {vehicleEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <TextInput
                style={styles.input}
                placeholder="Vehicle Name / Unit #"
                placeholderTextColor="#8e8e93"
                value={item.vehicleName}
                onChangeText={(val) => updateVehicle(item.id, 'vehicleName', val)}
              />

              <View style={styles.counterRow}>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Hours Used</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateVehicle(item.id, 'hoursUsed', Math.max(0, item.hoursUsed - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.hoursUsed}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateVehicle(item.id, 'hoursUsed', item.hoursUsed + 0.5)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {vehicleEntries.length > 1 && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeVehicle(item.id)}>
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
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveLog}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Daily Log'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  loadingContainer: { flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center', alignItems: 'center' },
  keyboardAvoider: { flex: 1 },
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: '#1e1e1e', marginLeft: 8 },
  doneBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  doneBtnText: { color: '#075eec', fontWeight: '700' },
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
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});