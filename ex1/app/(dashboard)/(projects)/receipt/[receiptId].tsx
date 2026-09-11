import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '@/context/ProjectsContext';

export default function ReceiptDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { projectId, receiptId } = useLocalSearchParams<{ projectId: string; receiptId: string }>();
  const { getProject, deleteReceipt } = useProjects();

  const project = getProject(projectId);
  const receipt = project?.receipts.find((r) => r.id === receiptId);

  const handleDelete = () => {
    Alert.alert('Delete Receipt', 'This cannot be undone. Delete this receipt?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReceipt(projectId, receiptId);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message ?? 'Failed to delete receipt.');
          }
        },
      },
    ]);
  };

  const showOptions = () => {
    Alert.alert('Receipt Options', undefined, [
      {
        text: 'Edit',
        onPress: () => router.push({ pathname: '/receipt/new', params: { projectId, receiptId } }),
      },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Receipt',
      headerRight: () => (
        <TouchableOpacity onPress={showOptions} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, receiptId, receipt]);

  if (!receipt) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Receipt not found.</Text>
      </SafeAreaView>
    );
  }

  const dateLabel = new Date(receipt.date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {receipt.signedUrl ? (
          <Image source={{ uri: receipt.signedUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="receipt-outline" size={48} color="#c7ccd1" />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.amount}>${receipt.amount.toFixed(2)}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eBecf4' },
  scrollContent: { padding: 20 },
  notFound: { padding: 20, color: '#6b7280', textAlign: 'center' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  photo: { width: '100%', height: 320, borderRadius: 12, marginBottom: 16 },
  photoPlaceholder: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#1e1e1e' },
  dateLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
