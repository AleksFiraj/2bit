import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as api from '../utils/api';

export default function DatabaseInsightsScreen() {
  const window = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [overviewData, setOverviewData] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeUsers: 0,
    pendingOrders: 0
  });
  const [usageData, setUsageData] = useState({
    dataUsage: [],
    callUsage: [],
    planDistribution: []
  });
  const [ordersData, setOrdersData] = useState({
    ordersByType: [],
    ordersByStatus: [],
    recentOrders: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch overview statistics
      const usersResponse = await api.lines.getAll();
      const ordersResponse = await api.orders.getAll();
      
      const users = usersResponse.data || [];
      const orders = ordersResponse.data || [];
      
      // Calculate overview stats
      const totalUsers = users.length;
      const totalOrders = orders.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      
      setOverviewData({
        totalUsers,
        totalOrders,
        activeUsers,
        pendingOrders
      });
      
      // Calculate usage data
      const dataUsage = generateRandomDataForMonths();
      const callUsage = generateRandomDataForMonths();
      
      // Calculate plan distribution
      const plans = {};
      users.forEach(user => {
        const planName = user.planName || user.plan?.name || 'Unknown';
        plans[planName] = (plans[planName] || 0) + 1;
      });
      
      const planDistribution = Object.entries(plans).map(([name, count]) => ({
        name,
        count,
        color: getRandomColor(name)
      }));
      
      setUsageData({
        dataUsage,
        callUsage,
        planDistribution
      });
      
      // Calculate orders data
      const orderTypes = {};
      const orderStatuses = {};
      
      orders.forEach(order => {
        // Count by type
        const type = order.type || 'unknown';
        orderTypes[type] = (orderTypes[type] || 0) + 1;
        
        // Count by status
        const status = order.status || 'unknown';
        orderStatuses[status] = (orderStatuses[status] || 0) + 1;
      });
      
      const ordersByType = Object.entries(orderTypes).map(([type, count]) => ({
        type,
        count
      }));
      
      const ordersByStatus = Object.entries(orderStatuses).map(([status, count]) => ({
        status,
        count,
        color: getStatusColor(status)
      }));
      
      // Get recent orders
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
        .slice(0, 5);
      
      setOrdersData({
        ordersByType,
        ordersByStatus,
        recentOrders
      });
      
    } catch (err) {
      console.error('Error fetching insights data:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to generate random data for charts
  const generateRandomDataForMonths = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      labels: months,
      datasets: [
        {
          data: months.map(() => Math.floor(Math.random() * 5000) + 1000),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };
  
  // Helper function to get color based on plan name
  const getRandomColor = (name) => {
    const colors = {
      'Biz Basic': '#FF9500',
      'Biz Plus': '#34C759',
      'Biz Premium': '#007AFF',
      'Unknown': '#8E8E93'
    };
    
    return colors[name] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
  };
  
  // Helper function to get color based on status
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#34C759';
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'failed': return '#FF3B30';
      default: return '#8E8E93';
    }
  };
  
  // Render the overview tab
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overviewData.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
            <Ionicons name="people" size={24} color="#007AFF" style={styles.statIcon} />
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overviewData.activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
            <Ionicons name="person-circle" size={24} color="#34C759" style={styles.statIcon} />
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overviewData.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Ionicons name="receipt" size={24} color="#FF9500" style={styles.statIcon} />
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overviewData.pendingOrders}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
            <Ionicons name="time" size={24} color="#FF3B30" style={styles.statIcon} />
          </View>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Plan Distribution</Text>
        <View style={styles.chartWrapper}>
          {usageData.planDistribution.length > 0 ? (
            <PieChart
              data={usageData.planDistribution.map(item => ({
                name: item.name,
                count: item.count,
                color: item.color,
                legendFontColor: '#7F7F7F',
                legendFontSize: 12
              }))}
              width={window.width - 64}
              height={200}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={styles.noDataText}>No plan data available</Text>
          )}
        </View>
      </View>
    </View>
  );
  
  // Render the usage tab
  const renderUsageTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Data Usage (MB)</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={usageData.dataUsage}
            width={window.width - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#007AFF'
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Call Minutes</Text>
        <View style={styles.chartWrapper}>
          <BarChart
            data={usageData.callUsage}
            width={window.width - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              barPercentage: 0.7
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
      </View>
    </View>
  );
  
  // Render the orders tab
  const renderOrdersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Orders by Status</Text>
        <View style={styles.chartWrapper}>
          {ordersData.ordersByStatus.length > 0 ? (
            <PieChart
              data={ordersData.ordersByStatus.map(item => ({
                name: item.status,
                count: item.count,
                color: item.color,
                legendFontColor: '#7F7F7F',
                legendFontSize: 12
              }))}
              width={window.width - 64}
              height={200}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={styles.noDataText}>No order data available</Text>
          )}
        </View>
      </View>
      
      <View style={styles.recentOrdersContainer}>
        <Text style={styles.chartTitle}>Recent Orders</Text>
        {ordersData.recentOrders.length > 0 ? (
          ordersData.recentOrders.map((order, index) => (
            <View key={`order-${index}`} style={styles.recentOrderItem}>
              <View style={styles.recentOrderHeader}>
                <Text style={styles.recentOrderType}>{order.type || 'Unknown Type'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '22' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {order.status || 'unknown'}
                  </Text>
                </View>
              </View>
              <Text style={styles.recentOrderDate}>
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown date'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No recent orders available</Text>
        )}
      </View>
    </View>
  );
  
  // Main render function
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Insights</Text>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'usage' && styles.activeTab]} 
          onPress={() => setActiveTab('usage')}
        >
          <Text style={[styles.tabText, activeTab === 'usage' && styles.activeTabText]}>Usage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]} 
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Orders</Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading and error states */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'usage' && renderUsageTab()}
          {activeTab === 'orders' && renderOrdersTab()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    paddingBottom: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 20,
  },
  recentOrdersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentOrderItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  recentOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentOrderType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  recentOrderDate: {
    fontSize: 14,
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
});
