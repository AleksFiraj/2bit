import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { orders } from '../utils/api';

export default function OrderTrackingScreen() {
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [orderStats, setOrderStats] = useState({
    completed: 0,
    pending: 0,
    inProgress: 0,
    failed: 0
  });

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orders.getAll();
      const ordersData = response.data || [];
      setOrderData(ordersData);
      
      // Calculate order statistics
      const stats = {
        completed: 0,
        pending: 0,
        inProgress: 0,
        failed: 0
      };
      
      ordersData.forEach(order => {
        if (order.status === 'completed') stats.completed++;
        else if (order.status === 'pending') stats.pending++;
        else if (order.status === 'in_progress') stats.inProgress++;
        else if (order.status === 'failed') stats.failed++;
      });
      
      setOrderStats(stats);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'completed': return { color: '#34C759' };
      case 'pending': return { color: '#FF9500' };
      case 'in_progress': return { color: '#007AFF' };
      case 'failed': return { color: '#FF3B30' };
      default: return { color: '#8E8E93' };
    }
  };
  
  const getTypeLabel = (type) => {
    switch(type) {
      case 'line_activation': return 'Aktivizim linje';
      case 'plan_change': return 'Ndryshim plani';
      case 'package_activation': return 'Aktivizim pakete';
      case 'service_activation': return 'Aktivizim shërbimi';
      case 'toggle_service': return 'Ndryshim statusi shërbimi';
      case 'budget_increase': return 'Rritje buxheti';
      default: return type;
    }
  };
  
  const getTypeIcon = (type) => {
    switch(type) {
      case 'line_activation': return 'phone-portrait-outline';
      case 'plan_change': return 'sync-outline';
      case 'package_activation': return 'cube-outline';
      case 'budget_increase': return 'wallet-outline';
      case 'service_activation': return 'add-circle-outline';
      case 'toggle_service': return 'toggle-outline';
      default: return 'document-text-outline';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getTimelineColor = (status) => {
    switch(status) {
      case 'completed': return '#34C759';
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'failed': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  // If error occurred during fetch
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Open detailed order view
  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // Render statistics dashboard
  const renderStatsDashboard = () => (
    <View style={styles.statsDashboard}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#E8F4FF' }]}>
          <Text style={styles.statNumber}>{orderStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#FF9500' }]} />
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#E6FFF2' }]}>
          <Text style={styles.statNumber}>{orderStats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#34C759' }]} />
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EEF8FF' }]}>
          <Text style={styles.statNumber}>{orderStats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#007AFF' }]} />
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#FFEFEF' }]}>
          <Text style={styles.statNumber}>{orderStats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#FF3B30' }]} />
        </View>
      </View>
    </View>
  );

  // Render detailed order view modal
  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;
    
    const getStatusStep = (status) => {
      switch(status) {
        case 'pending': return 0;
        case 'in_progress': return 1;
        case 'completed': return 2;
        case 'failed': return -1;
        default: return 0;
      }
    };
    
    const currentStep = getStatusStep(selectedOrder.status);
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.orderDetailHeader}>
                <View style={styles.orderTypeContainer}>
                  <Ionicons 
                    name={getTypeIcon(selectedOrder.type)} 
                    size={30} 
                    color="#007AFF" 
                    style={styles.orderTypeIcon} 
                  />
                  <View>
                    <Text style={styles.orderDetailType}>{getTypeLabel(selectedOrder.type)}</Text>
                    <Text style={styles.orderDetailId}>ID: {selectedOrder.id}</Text>
                  </View>
                </View>
                
                <View style={[styles.orderStatusBadge, { backgroundColor: getTimelineColor(selectedOrder.status) + '22' }]}>
                  <Text style={[styles.orderStatusText, { color: getTimelineColor(selectedOrder.status) }]}>
                    {selectedOrder.status}
                  </Text>
                </View>
              </View>
              
              {/* Timeline visualization */}
              <View style={styles.timeline}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>Order Progress</Text>
                </View>
                
                <View style={styles.timelineSteps}>
                  {/* Step 1 - Created */}
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: '#007AFF' }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Order Created</Text>
                      <Text style={styles.timelineDate}>{formatDate(selectedOrder.createdAt || selectedOrder.date)}</Text>
                    </View>
                  </View>
                  
                  {/* Timeline connector */}
                  <View style={[styles.timelineConnector, { backgroundColor: currentStep >= 1 ? '#34C759' : '#E0E0E0' }]} />
                  
                  {/* Step 2 - Processing */}
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: currentStep >= 1 ? '#007AFF' : '#E0E0E0' }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Processing</Text>
                      <Text style={styles.timelineDate}>
                        {currentStep >= 1 ? 'In progress' : 'Waiting'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Timeline connector */}
                  <View style={[styles.timelineConnector, { backgroundColor: currentStep >= 2 ? '#34C759' : '#E0E0E0' }]} />
                  
                  {/* Step 3 - Completed */}
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { 
                      backgroundColor: currentStep === 2 ? '#34C759' : currentStep === -1 ? '#FF3B30' : '#E0E0E0' 
                    }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>
                        {currentStep === -1 ? 'Failed' : 'Completed'}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {currentStep >= 2 ? 'Order completed' : 
                         currentStep === -1 ? 'Order failed' : 'Not completed yet'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Order details section */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.user || selectedOrder.payload?.user || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.msisdn || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt || selectedOrder.date)}</Text>
                </View>
                
                {selectedOrder.payload && (
                  <View style={styles.payloadContainer}>
                    <Text style={styles.sectionTitle}>Order Details</Text>
                    
                    {Object.entries(selectedOrder.payload).map(([key, value]) => (
                      <View style={styles.detailRow} key={key}>
                        <Text style={styles.detailLabel}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</Text>
                        <Text style={styles.detailValue}>
                          {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracking</Text>
      
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Duke ngarkuar porositë...</Text>
        </View>
      ) : (
        <>
          {renderStatsDashboard()}
          
          <View style={styles.listContainer}>
            <Text style={styles.sectionHeader}>Recent Orders</Text>
            
            <FlatList
              data={orderData}
              keyExtractor={(item, index) => `order-${index}-${item.id || Date.now() + index}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.orderCard}
                  onPress={() => openOrderDetail(item)}
                >
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderIconContainer}>
                      <Ionicons name={getTypeIcon(item.type)} size={24} color="#007AFF" />
                    </View>
                    
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderType}>{getTypeLabel(item.type)}</Text>
                      <Text style={styles.orderDate}>{formatDate(item.createdAt || item.date)}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: getTimelineColor(item.status) + '22' }]}>
                      <Text style={[styles.statusText, { color: getTimelineColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.orderMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={16} color="#8E8E93" />
                      <Text style={styles.metaText}>{item.line?.user || item.user || 'User'}</Text>
                    </View>
                    
                    {item.msisdn && (
                      <View style={styles.metaItem}>
                        <Ionicons name="call-outline" size={16} color="#8E8E93" />
                        <Text style={styles.metaText}>{item.msisdn}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              refreshing={loading}
              onRefresh={fetchOrders}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={50} color="#CCCCCC" />
                  <Text style={styles.emptyText}>No active orders</Text>
                </View>
              }
            />
          </View>
          
          {renderOrderDetailModal()}
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  // Base styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
    backgroundColor: '#F8F8F8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1C1C1E',
    letterSpacing: 0.5,
  },
  
  // Stats dashboard styles
  statsDashboard: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  statIndicator: {
    position: 'absolute',
    width: 4,
    height: '70%',
    left: 0,
    top: '15%',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  // List container styles
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  
  // Order card styles
  orderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderType: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  
  // Detail modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalBody: {
    padding: 20,
  },
  orderDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTypeIcon: {
    marginRight: 12,
  },
  orderDetailType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  orderDetailId: {
    fontSize: 12,
    color: '#8E8E93',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Timeline styles
  timeline: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timelineHeader: {
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  timelineSteps: {
    paddingLeft: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  timelineConnector: {
    width: 2,
    height: 30,
    marginLeft: 7,
    marginBottom: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  
  // Detail section styles
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  detailLabel: {
    width: 120,
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
  },
  payloadContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  
  // Error and empty state styles
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
}); 