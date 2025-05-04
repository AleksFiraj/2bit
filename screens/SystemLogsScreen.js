import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, StatusBar } from 'react-native';
import axios from 'axios';

const API_URL = 'http://169.254.132.71:3001';

export default function SystemLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/logs`);
      setLogs(response.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load system logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>System Logs</Text>
      
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => `log-${index}-${item.id || Date.now() + index}`}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.meta}>{item.user} - {item.timestamp}</Text>
            </View>
          )}
          refreshing={loading}
          onRefresh={fetchLogs}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No system logs available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24
  },
  retryText: {
    color: 'white',
    fontWeight: '600'
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93'
  },
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 ,  paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,},
  title: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 16 },
  logCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  action: { fontSize: 16, color: '#1C1C1E', fontWeight: '600' },
  meta: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
}); 