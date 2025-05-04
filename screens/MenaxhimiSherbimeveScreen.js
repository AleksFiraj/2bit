import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, StatusBar, Switch, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { companies, lines, orders } from '../utils/api';

export default function MenaxhimiSherbimeveScreen() {
  const [lineData, setLineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [newLine, setNewLine] = useState({
    user: '',
    msisdn: '',
    role: 'user',
    status: 'active',
    planName: '',
    budgetLimit: 5000
  });
  
  // Hardcoded companyId for demo - in production would come from user context
  const companyId = 1;

  // Fetch company and lines data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all lines
      const linesResponse = await lines.getAll();
      setLineData(linesResponse.data);
      
      // Get available plans
      const plansResponse = await companies.getById(companyId);
      setAvailablePlans(plansResponse.data.availablePlans || []);
      
      if (availablePlans.length > 0) {
        setNewLine(prev => ({ ...prev, planName: availablePlans[0].name }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const toggleServiceStatus = async (serviceId) => {
    try {
      setLoading(true);
      
      // Create order for toggling service
      await orders.create(selectedLine.id, 'toggle_service', { serviceId });
      
      // Update local state optimistically
      const updatedLineData = [...lineData];
      const lineIndex = updatedLineData.findIndex(line => line.id === selectedLine.id);
      const serviceIndex = updatedLineData[lineIndex].services.findIndex(service => service.id === serviceId);
      
      // Toggle service status
      updatedLineData[lineIndex].services[serviceIndex].active = !updatedLineData[lineIndex].services[serviceIndex].active;
      
      setLineData(updatedLineData);
      setSelectedLine(updatedLineData[lineIndex]);
      
      Alert.alert('Sukses', 'Statusi i shërbimit u përditësua');
    } catch (err) {
      Alert.alert('Gabim', 'Ndryshimi i statusit dështoi. Provoni përsëri.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addNewLine = async () => {
    if (!newLine.user || !newLine.msisdn || !newLine.planName) {
      Alert.alert('Gabim', 'Plotësoni të gjitha fushat e detyrueshme');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create new line in backend
      const response = await lines.create({
        ...newLine,
        companyId,
      });
      
      // Update local state with new line from server
      setLineData([...lineData, response.data]);
      setShowAddModal(false);
      setNewLine({
        user: '',
        msisdn: '',
        role: 'user',
        status: 'active',
        planName: availablePlans.length > 0 ? availablePlans[0].name : '',
        budgetLimit: 5000
      });
      
      Alert.alert('Sukses', 'Linja u shtua me sukses');
    } catch (err) {
      Alert.alert('Gabim', 'Shtimi i linjës dështoi. Provoni përsëri.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderLineItem = (line) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setSelectedLine(line)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.lineInfo}>
          <Text style={styles.lineName}>{line.user}</Text>
          <Text style={styles.lineMsisdn}>{line.msisdn}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{line.status === 'active' ? 'Aktiv' : 'Jo aktiv'}</Text>
        </View>
      </View>
      <View style={styles.lineDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plan:</Text>
          <Text style={styles.detailValue}>{line.planName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Buxheti:</Text>
          <Text style={styles.detailValue}>{line.budgetLimit} L/muaj</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Shto Linjë të Re</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={styles.textInput}
              placeholder="Përdoruesi"
              value={newLine.user}
              onChangeText={(text) => setNewLine(prev => ({ ...prev, user: text }))}
            />
            <TextInput
              style={styles.textInput}
              placeholder="MSISDN"
              value={newLine.msisdn}
              onChangeText={(text) => setNewLine(prev => ({ ...prev, msisdn: text }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Limiti i Buxhetit"
              value={newLine.budgetLimit != null ? newLine.budgetLimit.toString() : ''}
              onChangeText={(text) => setNewLine(prev => ({ ...prev, budgetLimit: parseInt(text) || 0 }))}
              keyboardType="numeric"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Plani:</Text>
              {availablePlans.map(plan => (
                <TouchableOpacity
                  key={plan.name}
                  style={[
                    styles.planOption,
                    newLine.planName === plan.name && styles.selectedPlanOption
                  ]}
                  onPress={() => setNewLine(prev => ({ ...prev, planName: plan.name }))}
                >
                  <Text style={[
                    styles.planOptionText,
                    newLine.planName === plan.name && styles.selectedPlanOptionText
                  ]}>
                    {plan.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addNewLine}
              >
                <Text style={styles.confirmButtonText}>Shto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // If error occurred during fetch
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menaxhimi i Shërbimeve</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Duke ngarkuar të dhënat...</Text>
        </View>
      ) : (
        <FlatList
          data={lineData}
          keyExtractor={(item) => item.id != null ? item.id.toString() : 'unknown'}
          renderItem={({ item }) => renderLineItem(item)}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchData}
        />
      )}
      
      {renderAddModal()}
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
  container: {
    flex: 1,
     paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  lineMsisdn: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  lineDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  modalBody: {
    padding: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  planOption: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedPlanOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  planOptionText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectedPlanOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
