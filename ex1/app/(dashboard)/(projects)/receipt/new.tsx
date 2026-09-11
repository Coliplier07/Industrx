import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '@/context/ProjectsContext';

export default function ReceiptFormScreen() {
  const { projectId, receiptId } = useLocalSearchParams<{ projectId: string; receiptId?: string }>();
  const { loading } = useProjects();

  // Don't mount the form until projects have actually loaded — otherwise,
  // if this screen is reached before the initial fetch resolves (e.g. a
  // fresh app launch straight into an edit deep link), the form's initial
  // state would snapshot "not found yet" and permanently miss the real
  // existing values once data does arrive.
  if (receiptId && loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075eec" />
      </View>
    );
  }

  // `key` forces a fresh component instance whenever the target receipt
  // changes, since this hidden-tab screen would otherwise be reused across
  // navigations instead of remounted (same issue we hit with daily-log.tsx).
  return (
    <ReceiptForm key={`${projectId}-${receiptId ?? 'new'}`} projectId={projectId} receiptId={receiptId} />
  );
}

function ReceiptForm({ projectId, receiptId }: { projectId: string; receiptId?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { getProject, addReceipt, updateReceipt } = useProjects();

  const existingReceipt = receiptId
    ? getProject(projectId)?.receipts.find((r) => r.id === receiptId)
    : undefined;
  const isEditing = !!existingReceipt;

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Receipt' : 'Add Receipt' });
  }, [isEditing]);

  const [imageUri, setImageUri] = useState<string | null>(existingReceipt?.signedUrl ?? null);
  // Only set when the user actually picks a new photo — distinguishes "kept
  // the existing photo" from "replaced it" when editing.
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [date, setDate] = useState(existingReceipt ? new Date(existingReceipt.date) : new Date());
  const [amount, setAmount] = useState(existingReceipt ? String(existingReceipt.amount) : '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to scan a receipt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setNewImageUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Photo library access is required to attach a receipt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      setNewImageUri(result.assets[0].uri);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert('Required', 'Take a photo or choose one from your library first.');
      return;
    }
    if (!projectId) {
      Alert.alert('Error', 'No project selected for this receipt.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Required', 'Enter the total amount on the receipt.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && receiptId) {
        await updateReceipt(projectId, receiptId, {
          date: date.toISOString(),
          amount: parsedAmount,
          newImageUri: newImageUri ?? undefined,
        });
      } else {
        await addReceipt(projectId, imageUri, date.toISOString(), parsedAmount);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to save receipt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receipt Photo</Text>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="receipt-outline" size={40} color="#c7ccd1" />
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color="#075eec" />
              <Text style={styles.actionBtnText}>{imageUri ? 'Retake Photo' : 'Take Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.galleryBtn]} onPress={pickFromGallery}>
              <Ionicons name="images" size={20} color="#34c759" />
              <Text style={[styles.actionBtnText, { color: '#34c759' }]}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Total Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#8e8e93"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receipt Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#075eec" />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
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

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Receipt'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  loadingContainer: { flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center', alignItems: 'center' },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e1e', marginBottom: 12 },
  placeholder: {
    height: 160,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  preview: { width: '100%', height: 220, borderRadius: 8, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#075eec',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  galleryBtn: { backgroundColor: '#f0fdf4', borderColor: '#34c759' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#075eec' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderColor: '#e1e4e8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  amountPrefix: { fontSize: 18, fontWeight: '700', color: '#1e1e1e', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1e1e1e', paddingVertical: 12 },
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
  doneBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 6, paddingHorizontal: 14 },
  doneBtnText: { color: '#075eec', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#075eec',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
