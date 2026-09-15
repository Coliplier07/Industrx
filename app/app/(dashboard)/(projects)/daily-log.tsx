import React, { useEffect, useState } from 'react';
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
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useProjects, LaborEntry, EquipmentEntry, VehicleEntry } from '@/context/ProjectsContext';

interface RosterMember {
  id: string;
  fullName: string;
}

interface RateSheetItem {
  id: string;
  category: 'labor' | 'equipment' | 'vehicle' | 'per_diem';
  name: string;
  rateType: 'hourly' | 'daily' | 'per_job';
  rate: number;
}

// A flat daily rate covers a standard 8-hour day; hours beyond that are
// prorated off the same rate rather than charged again in full.
function computeDailyRateCost(rate: number, hoursUsed: number): number {
  const cost = hoursUsed > 8 ? (rate / 8) * hoursUsed : rate;
  return Math.round(cost * 100) / 100;
}

type PickerTarget =
  | { entryType: 'labor'; entryId: string; field: 'employee' | 'role' | 'perDiem' }
  | { entryType: 'equipment'; entryId: string; field: 'item' }
  | { entryType: 'vehicle'; entryId: string; field: 'item' };

export default function DailyLogScreen() {
  const { projectId, logId } = useLocalSearchParams<{ projectId: string; logId?: string }>();
  const { loading } = useProjects();

  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [rateSheetItems, setRateSheetItems] = useState<RateSheetItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      const [rosterResult, rateSheetResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('role', ['pm', 'employee']),
        supabase.from('rate_sheet_items').select('id, category, name, rate_type, rate'),
      ]);

      if (rosterResult.error) console.error('Failed to load roster:', rosterResult.error.message);
      if (rateSheetResult.error) console.error('Failed to load rate sheet:', rateSheetResult.error.message);

      setRoster(
        (rosterResult.data ?? []).map((row) => ({ id: row.id, fullName: row.full_name || 'Unnamed' }))
      );
      setRateSheetItems(
        (rateSheetResult.data ?? []).map((row: any) => ({
          id: row.id,
          category: row.category,
          name: row.name,
          rateType: row.rate_type,
          rate: Number(row.rate) || 0,
        }))
      );
      setLoadingOptions(false);
    };
    fetchOptions();
  }, []);

  // Don't mount the form until projects and the picker options have loaded —
  // otherwise the form's initial state would snapshot "not found/empty yet"
  // and permanently miss the real values once data does arrive.
  if ((logId && loading) || loadingOptions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  // `key` forces a fresh component instance (and fresh initial state) whenever
  // the target log changes, since this hidden-tab screen would otherwise be
  // reused across navigations instead of remounted.
  return (
    <DailyLogForm
      key={`${projectId}-${logId ?? 'new'}`}
      projectId={projectId}
      logId={logId}
      roster={roster}
      rateSheetItems={rateSheetItems}
    />
  );
}

function DailyLogForm({
  projectId,
  logId,
  roster,
  rateSheetItems,
}: {
  projectId: string;
  logId?: string;
  roster: RosterMember[];
  rateSheetItems: RateSheetItem[];
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const { getProject, addDailyLog, updateDailyLog } = useProjects();

  const existingLog = logId ? getProject(projectId)?.dailyLogs.find((l) => l.id === logId) : undefined;
  const isEditing = !!existingLog;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Daily Log' : 'New Daily Log' });
  }, [isEditing]);

  const laborRoleOptions = rateSheetItems.filter((i) => i.category === 'labor');
  const equipmentOptions = rateSheetItems.filter((i) => i.category === 'equipment');
  const vehicleOptions = rateSheetItems.filter((i) => i.category === 'vehicle');
  const perDiemOptions = rateSheetItems.filter((i) => i.category === 'per_diem');

  const canAddLabor = roster.length > 0 && laborRoleOptions.length > 0;
  const canAddEquipment = equipmentOptions.length > 0;
  const canAddVehicle = vehicleOptions.length > 0;

  // Form State
  const [logDate, setLogDate] = useState(existingLog ? new Date(existingLog.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [workDescription, setWorkDescription] = useState(existingLog?.workDescription ?? '');
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>(existingLog?.laborEntries ?? []);
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>(
    existingLog?.equipmentEntries ?? []
  );
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>(existingLog?.vehicleEntries ?? []);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  // --- Labor Handlers ---
  const addLaborRow = () => {
    setLaborEntries([
      ...laborEntries,
      {
        id: Date.now().toString(),
        employeeId: '',
        employeeName: '',
        rateSheetItemId: '',
        roleName: '',
        perDiemItemId: null,
        perDiemName: null,
        stHours: 8,
        otHours: 0,
      },
    ]);
  };

  // Functional updater form throughout below (prev => ...), not a closure
  // over the current state variable -- two of these can otherwise be called
  // back-to-back in one handler (see handlePick) and both compute their
  // patch from the same stale snapshot, so the first call's change gets
  // silently overwritten by the second.
  const patchLabor = (id: string, patch: Partial<LaborEntry>) => {
    setLaborEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const removeLabor = (id: string) => {
    setLaborEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // A flat daily-rate item gets its cost computed here, from whatever the
  // entry's rate sheet item and hours are *after* this patch is applied --
  // covers both picking a different item and adjusting hours.
  const withRecalculatedCost = <T extends { rateSheetItemId: string; hoursUsed: number }>(
    entry: T
  ): T => {
    const rateItem = rateSheetItems.find((i) => i.id === entry.rateSheetItemId);
    return { ...entry, cost: rateItem?.rateType === 'daily' ? computeDailyRateCost(rateItem.rate, entry.hoursUsed) : null };
  };

  // --- Equipment Handlers ---
  const addEquipmentRow = () => {
    setEquipmentEntries([
      ...equipmentEntries,
      { id: Date.now().toString(), rateSheetItemId: '', equipmentName: '', hoursUsed: 8, cost: null },
    ]);
  };

  const patchEquipment = (id: string, patch: Partial<EquipmentEntry>) => {
    setEquipmentEntries((prev) =>
      prev.map((entry) => (entry.id === id ? withRecalculatedCost({ ...entry, ...patch }) : entry))
    );
  };

  const removeEquipment = (id: string) => {
    setEquipmentEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // --- Vehicle Handlers ---
  const addVehicleRow = () => {
    setVehicleEntries([
      ...vehicleEntries,
      { id: Date.now().toString(), rateSheetItemId: '', vehicleName: '', hoursUsed: 8, cost: null },
    ]);
  };

  const patchVehicle = (id: string, patch: Partial<VehicleEntry>) => {
    setVehicleEntries((prev) =>
      prev.map((entry) => (entry.id === id ? withRecalculatedCost({ ...entry, ...patch }) : entry))
    );
  };

  const removeVehicle = (id: string) => {
    setVehicleEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // --- Picker Handlers ---
  const pickerOptions: { id: string; label: string }[] | null = (() => {
    if (!picker) return null;
    if (picker.entryType === 'labor') {
      if (picker.field === 'employee') return roster.map((r) => ({ id: r.id, label: r.fullName }));
      if (picker.field === 'role') return laborRoleOptions.map((i) => ({ id: i.id, label: i.name }));
      return [{ id: '', label: 'No Per Diem' }, ...perDiemOptions.map((i) => ({ id: i.id, label: i.name }))];
    }
    if (picker.entryType === 'equipment') return equipmentOptions.map((i) => ({ id: i.id, label: i.name }));
    return vehicleOptions.map((i) => ({ id: i.id, label: i.name }));
  })();

  const handlePick = (option: { id: string; label: string }) => {
    if (!picker) return;

    if (picker.entryType === 'labor') {
      if (picker.field === 'employee') {
        patchLabor(picker.entryId, { employeeId: option.id, employeeName: option.label });
      } else if (picker.field === 'role') {
        patchLabor(picker.entryId, { rateSheetItemId: option.id, roleName: option.label });
      } else {
        patchLabor(picker.entryId, { perDiemItemId: option.id || null, perDiemName: option.id ? option.label : null });
      }
    } else if (picker.entryType === 'equipment') {
      patchEquipment(picker.entryId, { rateSheetItemId: option.id, equipmentName: option.label });
    } else {
      patchVehicle(picker.entryId, { rateSheetItemId: option.id, vehicleName: option.label });
    }

    setPicker(null);
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

    if (laborEntries.some((e) => !e.employeeId || !e.rateSheetItemId)) {
      Alert.alert('Incomplete Labor Entry', 'Select a worker and a role for every labor entry.');
      return;
    }
    if (equipmentEntries.some((e) => !e.rateSheetItemId)) {
      Alert.alert('Incomplete Equipment Entry', 'Select an equipment item for every equipment entry.');
      return;
    }
    if (vehicleEntries.some((e) => !e.rateSheetItemId)) {
      Alert.alert('Incomplete Vehicle Entry', 'Select a vehicle for every vehicle entry.');
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
            <TouchableOpacity
              style={[styles.addBtn, !canAddLabor && styles.addBtnDisabled]}
              onPress={addLaborRow}
              disabled={!canAddLabor}
            >
              <Ionicons name="add-circle" size={20} color={canAddLabor ? '#075eec' : '#c7ccd1'} />
              <Text style={[styles.addBtnText, !canAddLabor && styles.addBtnTextDisabled]}>Add Worker</Text>
            </TouchableOpacity>
          </View>

          {!canAddLabor && (
            <Text style={styles.emptyStateText}>
              {roster.length === 0
                ? 'No PMs or employees in your company yet.'
                : 'Add a labor role to the Rate Sheet first.'}
            </Text>
          )}

          {laborEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setPicker({ entryType: 'labor', entryId: item.id, field: 'employee' })}
              >
                <Text style={[styles.pickerBtnText, !item.employeeName && styles.pickerBtnPlaceholder]}>
                  {item.employeeName || 'Select Worker'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setPicker({ entryType: 'labor', entryId: item.id, field: 'role' })}
              >
                <Text style={[styles.pickerBtnText, !item.roleName && styles.pickerBtnPlaceholder]}>
                  {item.roleName || 'Select Role'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>

              {perDiemOptions.length > 0 && (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setPicker({ entryType: 'labor', entryId: item.id, field: 'perDiem' })}
                >
                  <Text style={[styles.pickerBtnText, !item.perDiemName && styles.pickerBtnPlaceholder]}>
                    {item.perDiemName || 'No Per Diem'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
              )}

              <View style={styles.counterRow}>
                {/* Straight Time Counter */}
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>ST Hours</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchLabor(item.id, { stHours: Math.max(0, item.stHours - 0.5) })}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.stHours}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchLabor(item.id, { stHours: item.stHours + 0.5 })}
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
                      onPress={() => patchLabor(item.id, { otHours: Math.max(0, item.otHours - 0.5) })}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.otHours}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchLabor(item.id, { otHours: item.otHours + 0.5 })}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeLabor(item.id)}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Vehicle Hours Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Vehicle Tracking</Text>
            <TouchableOpacity
              style={[styles.addBtn, !canAddVehicle && styles.addBtnDisabled]}
              onPress={addVehicleRow}
              disabled={!canAddVehicle}
            >
              <Ionicons name="add-circle" size={20} color={canAddVehicle ? '#075eec' : '#c7ccd1'} />
              <Text style={[styles.addBtnText, !canAddVehicle && styles.addBtnTextDisabled]}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          {!canAddVehicle && (
            <Text style={styles.emptyStateText}>Add a vehicle to the Rate Sheet first.</Text>
          )}

          {vehicleEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setPicker({ entryType: 'vehicle', entryId: item.id, field: 'item' })}
              >
                <Text style={[styles.pickerBtnText, !item.vehicleName && styles.pickerBtnPlaceholder]}>
                  {item.vehicleName || 'Select Vehicle'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>

              {item.cost !== null && (
                <Text style={styles.costText}>
                  Est. Cost: ${item.cost.toFixed(2)}
                  {item.hoursUsed > 8 ? ' (prorated over 8 hrs)' : ''}
                </Text>
              )}

              <View style={styles.counterRow}>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Hours Used</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchVehicle(item.id, { hoursUsed: Math.max(0, item.hoursUsed - 0.5) })}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.hoursUsed}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchVehicle(item.id, { hoursUsed: item.hoursUsed + 0.5 })}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeVehicle(item.id)}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Equipment Hours Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Equipment Usage</Text>
            <TouchableOpacity
              style={[styles.addBtn, !canAddEquipment && styles.addBtnDisabled]}
              onPress={addEquipmentRow}
              disabled={!canAddEquipment}
            >
              <Ionicons name="add-circle" size={20} color={canAddEquipment ? '#075eec' : '#c7ccd1'} />
              <Text style={[styles.addBtnText, !canAddEquipment && styles.addBtnTextDisabled]}>
                Add Equipment
              </Text>
            </TouchableOpacity>
          </View>

          {!canAddEquipment && (
            <Text style={styles.emptyStateText}>Add equipment to the Rate Sheet first.</Text>
          )}

          {equipmentEntries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setPicker({ entryType: 'equipment', entryId: item.id, field: 'item' })}
              >
                <Text style={[styles.pickerBtnText, !item.equipmentName && styles.pickerBtnPlaceholder]}>
                  {item.equipmentName || 'Select Equipment'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>

              {item.cost !== null && (
                <Text style={styles.costText}>
                  Est. Cost: ${item.cost.toFixed(2)}
                  {item.hoursUsed > 8 ? ' (prorated over 8 hrs)' : ''}
                </Text>
              )}

              <View style={styles.counterRow}>
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Hours Operated</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchEquipment(item.id, { hoursUsed: Math.max(0, item.hoursUsed - 0.5) })}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{item.hoursUsed}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => patchEquipment(item.id, { hoursUsed: item.hoursUsed + 0.5 })}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEquipment(item.id)}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Fixed footer so submitting doesn't require scrolling to the bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveLog}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Daily Log'}
          </Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <ScrollView>
              {(pickerOptions ?? []).map((option) => (
                <TouchableOpacity
                  key={option.id || 'none'}
                  style={styles.modalOption}
                  onPress={() => handlePick(option)}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPicker(null)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  addBtnDisabled: {},
  addBtnText: { color: '#075eec', fontWeight: '600', marginLeft: 4 },
  addBtnTextDisabled: { color: '#c7ccd1' },
  emptyStateText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pickerBtnText: { fontSize: 15, fontWeight: '600', color: '#1e1e1e' },
  pickerBtnPlaceholder: { color: '#8e8e93', fontWeight: '400' },
  costText: { fontSize: 13, fontWeight: '600', color: '#075eec', marginBottom: 8 },
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
  footer: {
    backgroundColor: '#eBecf4',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 16,
  },
  saveButton: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
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
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
  },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#1e1e1e' },
  modalCancelBtn: { paddingVertical: 14, alignItems: 'center' },
  modalCancelBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '700' },
});
