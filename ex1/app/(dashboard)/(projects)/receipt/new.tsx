import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '@/context/ProjectsContext';

export default function NewReceiptScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { addReceipt } = useProjects();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
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

    setSaving(true);
    try {
      await addReceipt(projectId, imageUri, date.toISOString());
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
            <TouchableOpacity onPress={imageUri ? pickFromGallery : undefined}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
            </TouchableOpacity>
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
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Receipt'}</Text>
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
