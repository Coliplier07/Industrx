import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface ReceiptUploaderProps {
  onImagesChange?: (images: string[]) => void;
  maxImages?: number;
}

export default function ReceiptUploader({
  onImagesChange,
  maxImages = 5,
}: ReceiptUploaderProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Update parent state whenever local images change
  const updateImages = (newImages: string[]) => {
    setSelectedImages(newImages);
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  };

  // Launch Camera
  const takePhoto = async () => {
    if (selectedImages.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only attach up to ${maxImages} images.`);
      return;
    }

    // Request permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take photo receipts.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, // Compressed to reduce offline DB size & sync bandwidth
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0].uri) {
      updateImages([...selectedImages, result.assets[0].uri]);
    }
  };

  // Select from Photo Library
  const pickImageFromGallery = async () => {
    if (selectedImages.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only attach up to ${maxImages} images.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Gallery access is required to upload receipts.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      updateImages([...selectedImages, result.assets[0].uri]);
    }
  };

  // Remove Thumbnail
  const removeImage = (uriToRemove: string) => {
    const filtered = selectedImages.filter((uri) => uri !== uriToRemove);
    updateImages(filtered);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Jobsite Receipts & Attachments ({selectedImages.length}/{maxImages})
      </Text>

      {/* Action Triggers */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#075eec" />
          <Text style={styles.actionBtnText}>Snap Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.galleryBtn]} onPress={pickImageFromGallery}>
          <Ionicons name="images" size={24} color="#34c759" />
          <Text style={[styles.actionBtnText, { color: '#34c759' }]}>Choose Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Image Thumbnails Horizontal Scroll */}
      {selectedImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewContainer}>
          {selectedImages.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => removeImage(uri)}
              >
                <Ionicons name="close-circle" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
    gap: 8,
  },
  galleryBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34c759',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#075eec' },
  previewContainer: { marginTop: 8 },
  imageWrapper: { position: 'relative', marginRight: 12, marginVertical: 4 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});