import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal, 
  Alert, 
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { companies, lines } from '../utils/api';

export default function SherbimetScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLineDetails, setShowLineDetails] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    minData: '',
    maxData: '',
    minCalls: '',
    maxCalls: '',
    roaming: 'all',
    international: 'all'
  });
  
  // Hardcoded companyId for demo - in prod would come from logged-in user context
  const companyId = 1;

  // Fetch lines data with usage information
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companies.getUsage(companyId);
      setData(response.data);
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

  const getStatusColor = (used, total) => {
    const percentage = (used / total) * 100;
    if (percentage > 90) return '#FF3B30';
    if (percentage > 70) return '#FF9500';
    return '#34C759';
  };

  const renderUsageBar = (used, total) => {
    const percentage = Math.min((used / total) * 100, 100);
    return (
      <View style={styles.usageBarContainer}>
        <View style={[styles.usageBar, { width: `${percentage}%`, backgroundColor: getStatusColor(used, total) }]} />
      </View>
    );
  };

  const handleLinePress = (line) => {
    setSelectedLine(line);
    setShowLineDetails(true);
  };

  const renderLineCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleLinePress(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.user}</Text>
          <Text style={styles.role}>{item.role}</Text>
        </View>
        <View style={styles.msisdnContainer}>
          <Text style={styles.msisdn}>{item.msisdn}</Text>
          <Text style={[styles.status, { color: item.status === 'active' ? '#34C759' : '#FF3B30' }]}>
            {item.status === 'active' ? 'Aktiv' : 'Jo Aktiv'}
          </Text>
        </View>
      </View>
      
      <View style={styles.planContainer}>
        <Text style={styles.planLabel}>Plani:</Text>
        <Text style={styles.planValue}>{item.planName}</Text>
        <Text style={styles.planFee}>{item.monthlyFee} L/muaj</Text>
      </View>

      <View style={styles.usageContainer}>
        <View style={styles.usageItem}>
          <Text style={styles.usageLabel}>Data</Text>
          {renderUsageBar(item.dataUsedMB, item.includedData)}
          <Text style={styles.usageValue}>{item.dataUsedMB} MB / {item.includedData} MB</Text>
        </View>
        
        <View style={styles.usageItem}>
          <Text style={styles.usageLabel}>Minuta</Text>
          {renderUsageBar(item.callMinutes, item.includedMinutes)}
          <Text style={styles.usageValue}>{item.callMinutes} / {item.includedMinutes} min</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
          <Text style={styles.featureText}>{item.smsCount} / {item.includedSMS} SMS</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="globe-outline" size={16} color="#007AFF" />
          <Text style={styles.featureText}>Roaming: Available</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="call-outline" size={16} color="#007AFF" />
          <Text style={styles.featureText}>Ndërkombëtare: Available</Text>
        </View>
      </View>

      <View style={styles.budgetContainer}>
        <Text style={styles.budgetLabel}>Limiti i Buxhetit:</Text>
        <Text style={styles.budgetValue}>{item.budgetLimit} L</Text>
        {renderUsageBar(item.dataUsedMB * 0.1 + item.callMinutes * 0.05, item.budgetLimit)}
      </View>
    </TouchableOpacity>
  );

  const renderLineDetailsModal = () => {
    if (!selectedLine) return null;
    
    return (
      <Modal
        visible={showLineDetails}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detajet e Linjës</Text>
              <TouchableOpacity onPress={() => setShowLineDetails(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Informacioni i Përdoruesit</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Emri:</Text>
                  <Text style={styles.detailValue}>{selectedLine.user}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Roli:</Text>
                  <Text style={styles.detailValue}>{selectedLine.role}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Numri:</Text>
                  <Text style={styles.detailValue}>{selectedLine.msisdn}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Detajet e Planit</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plani:</Text>
                  <Text style={styles.detailValue}>{selectedLine.planName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pagesa Mujore:</Text>
                  <Text style={styles.detailValue}>{selectedLine.monthlyFee} L</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Data e Përfshirë:</Text>
                  <Text style={styles.detailValue}>{selectedLine.includedData} MB</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Minuta të Përfshira:</Text>
                  <Text style={styles.detailValue}>{selectedLine.includedMinutes}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SMS të Përfshira:</Text>
                  <Text style={styles.detailValue}>{selectedLine.includedSMS}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Përdorimi Aktual</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Data e Përdorur:</Text>
                  <Text style={styles.detailValue}>{selectedLine.dataUsedMB} MB</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Minuta të Përdorura:</Text>
                  <Text style={styles.detailValue}>{selectedLine.callMinutes}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SMS të Dërguara:</Text>
                  <Text style={styles.detailValue}>{selectedLine.smsCount}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Alerts dhe Kufijtë</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Limiti i Buxhetit:</Text>
                  <Text style={styles.detailValue}>{selectedLine.budgetLimit} L</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
        <Text style={styles.title}>Shërbimet</Text>
        <Text style={styles.subtitle}>Menaxhoni linjat tuaja mobile</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Kërko sipas emrit ose numrit"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Duke ngarkuar të dhënat...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={data && Array.isArray(data) ? data.filter(item => {
              // Search filter
              if (searchQuery && !item.user.toLowerCase().includes(searchQuery.toLowerCase()) && 
                  !item.msisdn.includes(searchQuery)) {
                return false;
              }
              
              // Status filter
              if (selectedFilter !== 'all' && item.status !== selectedFilter) {
                return false;
              }
              
              return true;
            }) : []}
            renderItem={renderLineCard}
            keyExtractor={(item, index) => `sherbim-${index}-${item.id || Date.now() + index}`}
            refreshing={loading}
            onRefresh={fetchData}
          />
        </View>
      )}

      {renderLineDetailsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
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
    backgroundColor: '#F8F8F8',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
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
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  role: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  msisdnContainer: {
    alignItems: 'flex-end',
  },
  msisdn: {
    fontSize: 14,
    color: '#8E8E93',
  },
  status: {
    fontSize: 12,
    marginTop: 2,
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 4,
  },
  planValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  planFee: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  usageContainer: {
    marginBottom: 12,
  },
  usageItem: {
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  usageBarContainer: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 4,
  },
  usageBar: {
    height: '100%',
    borderRadius: 4,
  },
  usageValue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  budgetContainer: {
    marginTop: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
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
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
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
});
