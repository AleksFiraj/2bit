import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Modal, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { companies, lines } from '../utils/api';

export default function KontrolliKostoveScreen() {
  const [company, setCompany] = useState(null);
  const [linesData, setLinesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [alerts, setAlerts] = useState({
    data: 80,
    calls: 80,
    budget: 90
  });
  const [isAlertEnabled, setIsAlertEnabled] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showLineBudgetModal, setShowLineBudgetModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [currentBilling, setCurrentBilling] = useState(0);
  
  // Hardcoded companyId for demo - in prod would come from user context
  const companyId = 1;

  // Fetch company and lines data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get company details
      const companyResponse = await companies.getById(companyId).catch(err => {
        console.error('Company fetch error:', err);
        throw new Error('Could not fetch company details');
      });
      setCompany(companyResponse.data || {});
      setBudgetLimit(companyResponse.data?.monthlyBudget || 0);
      
      // Get company usage
      const usageResponse = await companies.getUsage(companyId).catch(err => {
        console.error('Usage fetch error:', err);
        throw new Error('Could not fetch company usage');
      });
      
      // Check if usageResponse.data exists and has expected structure
      const responseData = usageResponse.data || {};
      
      // For company usage endpoints, the API returns lines as a property
      // Handle both array response or object with lines property
      const linesData = Array.isArray(responseData) ? responseData : 
                        (responseData.lines ? responseData.lines : []);
      
      setLinesData(linesData);
      
      // Calculate current billing from usage data - safely with array check
      const totalBilling = Array.isArray(linesData) ? linesData.reduce((total, line) => {
        return total + ((line.dataUsedMB || 0) * 0.1) + ((line.callMinutes || 0) * 0.05) + ((line.smsCount || 0) * 0.02);
      }, 0) : 0;
      
      setCurrentBilling(Math.round(totalBilling));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data. Please try again.');
      setLinesData([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleBudgetUpdate = async (newBudget) => {
    if (newBudget < 0) {
      Alert.alert('Gabim', 'Buxheti nuk mund të jetë negativ');
      return;
    }
    
    try {
      setLoading(true);
      // Update in backend
      await companies.update(companyId, { monthlyBudget: newBudget });
      setBudgetLimit(newBudget);
      setShowBudgetModal(false);
      Alert.alert('Sukses', 'Buxheti u përditës me sukses');
    } catch (err) {
      Alert.alert('Gabim', 'Përditësimi i buxhetit dështoi. Provoni përsëri.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertUpdate = (type, value) => {
    if (value < 0 || value > 100) {
      Alert.alert('Gabim', 'Vlera e alertit duhet të jetë midis 0 dhe 100');
      return;
    }
    setAlerts({ ...alerts, [type]: value });
    setShowAlertModal(false);
    // Here you would typically update the alerts in your backend
  };

  const handleLineBudgetUpdate = async (lineId, newBudget) => {
    if (newBudget < 0) {
      Alert.alert('Gabim', 'Buxheti nuk mund të jetë negativ');
      return;
    }
    
    try {
      setLoading(true);
      // Update line budget limit in backend
      await lines.updateBudgetLimit(lineId, newBudget);
      
      // Update local state
      setLinesData(linesData.map(line => 
        line.id === lineId ? {...line, budgetLimit: newBudget} : line
      ));
      
      setShowLineBudgetModal(false);
      Alert.alert('Sukses', 'Limiti i buxhetit u përditës me sukses');
    } catch (err) {
      Alert.alert('Gabim', 'Përditësimi i limitit dështoi. Provoni përsëri.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderBudgetCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Limiti i Buxhetit</Text>
        <TouchableOpacity onPress={() => setShowBudgetModal(true)}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.budgetContainer}>
        <Text style={styles.budgetAmount}>{budgetLimit} L</Text>
        <Text style={styles.budgetLabel}>në muaj</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentBilling / budgetLimit) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{currentBilling} L shpenzuar</Text>
      </View>
    </View>
  );

  const renderAlertsCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Njoftimet</Text>
        <Switch
          value={isAlertEnabled}
          onValueChange={setIsAlertEnabled}
          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
        />
      </View>
      {isAlertEnabled && (
        <View style={styles.alertsContainer}>
          <TouchableOpacity 
            style={styles.alertItem}
            onPress={() => setShowAlertModal(true)}
          >
            <View style={styles.alertInfo}>
              <Text style={styles.alertLabel}>Kufiri i Data</Text>
              <Text style={styles.alertValue}>{alerts.data}%</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.alertItem}
            onPress={() => setShowAlertModal(true)}
          >
            <View style={styles.alertInfo}>
              <Text style={styles.alertLabel}>Kufiri i Thirrjeve</Text>
              <Text style={styles.alertValue}>{alerts.calls}%</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.alertItem}
            onPress={() => setShowAlertModal(true)}
          >
            <View style={styles.alertInfo}>
              <Text style={styles.alertLabel}>Kufiri i Buxhetit</Text>
              <Text style={styles.alertValue}>{alerts.budget}%</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderLinesCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Limitet e Linjave</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{padding: 20}} size="large" color="#007AFF" />
      ) : (
        <ScrollView style={styles.linesContainer}>
          {linesData.map((line, index) => (
            <TouchableOpacity
              key={`line-${index}-${line.id || Date.now() + index}`}
              style={styles.lineCard}
              onPress={() => {
                setSelectedLine(line);
                setShowLineBudgetModal(true);
              }}
            >
              <View style={styles.lineInfo}>
                <Text style={styles.lineName}>{line.user || `User ${index+1}`}</Text>
                <Text style={styles.lineNumber}>{line.msisdn || `355${Math.floor(1000000 + Math.random() * 9000000)}`}</Text>
              </View>
              <View style={styles.lineBudget}>
                <Text>{line.budgetLimit || 2000} L</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderBudgetModal = () => (
    <Modal
      visible={showBudgetModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cakto Limitin e Buxhetit</Text>
            <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Limiti i Ri (L)</Text>
            <TextInput
              style={styles.modalInput}
              value={budgetLimit != null ? budgetLimit.toString() : ''}
              onChangeText={text => setBudgetLimit(parseInt(text) || 0)}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBudgetModal(false)}
              >
                <Text style={styles.cancelButtonText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => handleBudgetUpdate(budgetLimit)}
              >
                <Text style={styles.saveButtonText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAlertModal = () => (
    <Modal
      visible={showAlertModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cakto Kufijtë e Alertit</Text>
            <TouchableOpacity onPress={() => setShowAlertModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.alertInputGroup}>
              <Text style={styles.modalLabel}>Kufiri i Data (%)</Text>
              <TextInput
                style={styles.modalInput}
                value={alerts.data != null ? alerts.data.toString() : ''}
                onChangeText={text => setAlerts({ ...alerts, data: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.alertInputGroup}>
              <Text style={styles.modalLabel}>Kufiri i Thirrjeve (%)</Text>
              <TextInput
                style={styles.modalInput}
                value={alerts.calls != null ? alerts.calls.toString() : ''}
                onChangeText={text => setAlerts({ ...alerts, calls: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.alertInputGroup}>
              <Text style={styles.modalLabel}>Kufiri i Buxhetit (%)</Text>
              <TextInput
                style={styles.modalInput}
                value={alerts.budget != null ? alerts.budget.toString() : ''}
                onChangeText={text => setAlerts({ ...alerts, budget: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAlertModal(false)}
              >
                <Text style={styles.cancelButtonText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => handleAlertUpdate('all', alerts)}
              >
                <Text style={styles.saveButtonText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLineBudgetModal = () => (
    <Modal
      visible={showLineBudgetModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cakto Buxhetin për Linjë</Text>
            <TouchableOpacity onPress={() => setShowLineBudgetModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {selectedLine && (
              <>
                <Text style={styles.modalLabel}>Përdoruesi: {selectedLine.user}</Text>
                <Text style={styles.modalLabel}>Numri: {selectedLine.msisdn}</Text>
                <Text style={styles.modalLabel}>Limiti i Ri (L)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={selectedLine.budgetLimit != null ? selectedLine.budgetLimit.toString() : ''}
                  onChangeText={text => setSelectedLine({ ...selectedLine, budgetLimit: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowLineBudgetModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Anulo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => handleLineBudgetUpdate(selectedLine.id, selectedLine.budgetLimit)}
                  >
                    <Text style={styles.saveButtonText}>Ruaj</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    <ScrollView style={styles.container}>
      {renderBudgetCard()}
      {renderAlertsCard()}
      {renderLinesCard()}
      {renderBudgetModal()}
      {renderAlertModal()}
      {renderLineBudgetModal()}
    </ScrollView>
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
    backgroundColor: '#F2F2F7',
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  budgetAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  budgetLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  alertsContainer: {
    marginTop: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  alertInfo: {
    flex: 1,
  },
  alertLabel: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  alertValue: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  linesContainer: {
    maxHeight: 300,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  lineNumber: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  lineBudget: {
    marginRight: 12,
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
    maxWidth: 400,
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
  modalLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  alertInputGroup: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
