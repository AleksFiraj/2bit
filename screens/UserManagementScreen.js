import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as api from '../utils/api';

const availablePlans = [
  {
    name: 'ONE Business Start',
    monthlyFee: 1500,
    includedData: 100000, // Unlimited with FUP of 100GB
    includedMinutes: 5000, // FUP for national minutes
    includedSMS: 3000,     // FUP for national SMS
    roaming: true,         // Valid in Western Balkans
    internationalCalls: false,
    roamingData: 6470,     // MB available in roaming (approx 6.47 GB in Western Balkans)
    internationalMinutes: 0
  },
  {
    name: 'ONE Business Advance',
    monthlyFee: 2500,
    includedData: 100000, // Unlimited with FUP of 100GB
    includedMinutes: 5000, // FUP for national minutes
    includedSMS: 3000,     // FUP for national SMS
    roaming: true,         // Valid in Western Balkans
    internationalCalls: true,
    roamingData: 10260,    // MB available in roaming (approx 10.26 GB in Western Balkans)
    internationalMinutes: 100
  },
  {
    name: 'ONE Business Pro',
    monthlyFee: 4000,
    includedData: 100000, // Unlimited with FUP of 100GB
    includedMinutes: 5000, // FUP for national minutes
    includedSMS: 3000,     // FUP for national SMS
    roaming: true,         // Valid in Western Balkans and Zone 1
    internationalCalls: true,
    roamingData: 18280,    // MB available in roaming (approx 18.28 GB in Western Balkans)
    internationalMinutes: 200
  },
  {
    name: 'ONE Business Total',
    monthlyFee: 6000,
    includedData: 100000, // Unlimited with FUP of 100GB
    includedMinutes: 5000, // FUP for national minutes
    includedSMS: 3000,     // FUP for national SMS
    roaming: true,         // Valid in Western Balkans and Zone 1
    internationalCalls: true,
    roamingData: 26980,    // MB available in roaming (approx 26.98 GB in Western Balkans)
    internationalMinutes: 300
  }
];
const availablePackages = [
  { name: 'Roaming Bundle', description: '500MB + 50 min in EU', price: 500 },
  { name: 'International Minutes', description: '100 min Intl', price: 700 },
  { name: 'Data Booster', description: '2GB extra data', price: 300 }
];

export default function UserManagementScreen({ userRole }) {
  // States for API data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(1); // Hardcoded for demo, should come from auth context

  // UI states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ user: '', msisdn: '', role: '', plan: availablePlans[0], budgetLimit: '' });
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planUser, setPlanUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(availablePlans[0].name);
  const [showBulkPlanModal, setShowBulkPlanModal] = useState(false);
  const [bulkPlan, setBulkPlan] = useState(availablePlans[0].name);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageUser, setPackageUser] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(availablePackages[0].name);

  // Fetch users (lines) from API
  const fetchLines = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.lines.getAll();

      // Proper response handling with formatted data
      const formattedUsers = (response?.data || []).map(line => ({
        id: line.id,
        user: line.user || 'Employee', // Prevent empty user field
        msisdn: line.msisdn || '12345',
        role: line.role || 'employee',
        plan: {
          name: line.planName || 'Biz Basic',
          monthlyFee: line.monthlyFee || 2000,
          includedData: line.includedData || 5000,
          includedMinutes: line.includedMinutes || 1000,
          includedSMS: line.includedSMS || 100
        },
        budgetLimit: line.budgetLimit || 2000,
        status: line.status || 'active'
      }));

      console.log('Formatted users:', formattedUsers);
      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error fetching lines:', err);
      setError('Failed to load users');

      // Add fallback demo data if API fails
      const demoUsers = [
        {
          id: 1,
          user: 'John Smith',
          msisdn: '355671234567',
          role: 'manager',
          plan: availablePlans[0],
          budgetLimit: 2500,
          status: 'active'
        },
        {
          id: 2,
          user: 'Maria Doe',
          msisdn: '355672345678',
          role: 'employee',
          plan: availablePlans[1],
          budgetLimit: 3500,
          status: 'active'
        }
      ];
      setUsers(demoUsers);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchLines();
  }, [companyId]);

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      user: user.user,
      msisdn: user.msisdn,
      role: user.role,
      plan: user.plan || availablePlans[0],
      budgetLimit: user.budgetLimit != null ? user.budgetLimit.toString() : ''
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({ user: '', msisdn: '', role: '', plan: availablePlans[0], budgetLimit: '' });
    setShowModal(true);
  };

  const saveUser = async () => {
    if (!form.user || !form.msisdn || !form.plan || !form.budgetLimit) {
      Alert.alert('Gabim', 'Plotësoni të gjitha fushat');
      return;
    }

    try {
      // Prepare the data for API
      const lineData = {
        user: form.user,  // Fixed field name to match backend expectations
        msisdn: form.msisdn,
        planName: typeof form.plan === 'string' ? form.plan : form.plan.name,
        monthlyFee: typeof form.plan === 'string'
          ? availablePlans.find(p => p.name === form.plan)?.monthlyFee || 0
          : form.plan.monthlyFee || 0,
        budgetLimit: parseInt(form.budgetLimit, 10) || 0,
        companyId: companyId,
        role: form.role || 'employee',
        status: 'active',
        includedData: 5000,  // Default values to ensure we have valid data
        includedMinutes: 1000,
        includedSMS: 500
      };

      let updatedLine;
      let responseData;

      if (editingUser) {
        // Update existing line
        const response = await api.lines.update(editingUser.id, lineData);
        responseData = response.data;
        // Ensure we have a valid response
        updatedLine = responseData || { ...editingUser, ...lineData };
        setUsers(users.map(u => u.id === editingUser.id ? updatedLine : u));
      } else {
        // Create new line
        const response = await api.lines.create(lineData);
        responseData = response.data;
        // Ensure we have a valid response
        updatedLine = responseData || { id: Date.now(), ...lineData };
        setUsers([...users, updatedLine]);
      }

      setShowModal(false);
      // Show success message
      Alert.alert(
        'Success',
        editingUser ? 'Line updated successfully' : 'Line created successfully'
      );
    } catch (err) {
      console.error('Error saving line:', err);
      Alert.alert('Error', `Failed to save line: ${err.message || 'Please try again.'}`);
    }
  };

  const deleteUser = (user) => {
    Alert.alert('Konfirmo', 'Fshini përdoruesin?', [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Fshi', style: 'destructive', onPress: async () => {
          try {
            await api.lines.remove(user.id);
            setUsers(users.filter(u => u.id !== user.id));
            Alert.alert('Success', 'Line deleted successfully');
          } catch (err) {
            console.error('Error deleting line:', err);
            Alert.alert('Error', 'Failed to delete line. Please try again.');
          }
        }
      }
    ]);
  };

  // Real-time increase/decrease budget
  const changeBudget = async (user, delta) => {
    const newBudgetLimit = Math.max(0, (user.budgetLimit || 0) + delta);
    try {
      // First update the UI for immediate feedback
      setUsers(users.map(u => u.id === user.id ? { ...u, budgetLimit: newBudgetLimit } : u));

      // Then update in the database
      await api.lines.update(user.id, { budgetLimit: newBudgetLimit });
    } catch (err) {
      console.error('Error updating budget limit:', err);
      // Revert the UI change if the API call fails
      setUsers(users.map(u => u.id === user.id ? { ...u, budgetLimit: user.budgetLimit } : u));
      Alert.alert('Error', 'Failed to update budget limit. Please try again.');
    }
  };

  // Upsell/Downsell plan for one user
  const openPlanChange = (user) => {
    setPlanUser(user);
    setSelectedPlan(user.plan?.name || availablePlans[0].name);
    setShowPlanModal(true);
  };

  const savePlanChange = async () => {
    try {
      const selectedPlanObj = availablePlans.find(p => p.name === selectedPlan);

      // Optimistic UI update
      setUsers(users.map(u => u.id === planUser.id ? { ...u, plan: selectedPlanObj } : u));

      // Create an order for the plan change
      await api.orders.create({
        lineId: planUser.id,
        type: 'plan_change',
        payload: {
          planName: selectedPlan,
          monthlyFee: selectedPlanObj.monthlyFee
        }
      });

      // Update the line with the new plan in the database
      await api.lines.update(planUser.id, {
        planName: selectedPlan,
        monthlyFee: selectedPlanObj.monthlyFee
      });

      setShowPlanModal(false);
      Alert.alert('Success', `Plan changed to ${selectedPlan}`);
    } catch (err) {
      console.error('Error changing plan:', err);
      // Revert the UI change
      fetchLines();
      Alert.alert('Error', 'Failed to change plan. Please try again.');
    }
  };

  // Bulk plan change
  const openBulkPlanChange = () => {
    setBulkPlan(availablePlans[0].name);
    setShowBulkPlanModal(true);
  };

  const saveBulkPlanChange = async () => {
    try {
      const selectedPlanObj = availablePlans.find(p => p.name === bulkPlan);

      // Optimistic UI update
      setUsers(users.map(u => ({ ...u, plan: selectedPlanObj })));

      // Prepare bulk updates for the API
      const updates = users.map(user => ({
        id: user.id,
        planName: bulkPlan,
        monthlyFee: selectedPlanObj.monthlyFee
      }));

      // Call bulk update API
      await api.lines.bulkUpdate(updates);

      // Create orders for each line
      for (const user of users) {
        await api.orders.create({
          lineId: user.id,
          type: 'plan_change',
          payload: {
            planName: bulkPlan,
            monthlyFee: selectedPlanObj.monthlyFee,
            bulkOperation: true
          }
        });
      }

      setShowBulkPlanModal(false);
      Alert.alert('Success', `All lines updated to ${bulkPlan} plan`);
    } catch (err) {
      console.error('Error in bulk plan change:', err);
      // Revert the UI by refetching
      fetchLines();
      Alert.alert('Error', 'Failed to update plans. Please try again.');
    }
  };

  // Activate additional package
  const openPackageModal = (user) => {
    setPackageUser(user);
    setSelectedPackage(availablePackages[0].name);
    setShowPackageModal(true);
  };

  const savePackage = async () => {
    try {
      const packageDetails = availablePackages.find(p => p.name === selectedPackage);

      // Create order for package activation
      await api.orders.create({
        lineId: packageUser.id,
        type: 'service_activation',
        payload: {
          packageId: Date.now(),  // In a real app, this would be a valid package ID
          packageName: selectedPackage,
          price: packageDetails.price,
          description: packageDetails.description
        }
      });

      setShowPackageModal(false);
      Alert.alert('Paketa u aktivizua!', `${selectedPackage} u aktivizua për ${packageUser.user}`);
    } catch (err) {
      console.error('Error activating package:', err);
      Alert.alert('Error', 'Failed to activate package. Please try again.');
    }
  };

  // Handle loading state
  if (loading && users.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  // Handle error state
  if (error && users.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchLines}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menaxhimi i Përdoruesve</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={openAdd} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openBulkPlanChange} style={styles.bulkButton}>
            <Ionicons name="swap-horizontal" size={22} color="#fff" />
            <Text style={styles.bulkButtonText}>Ndrysho Planin për të gjithë</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item, index) => `user-${index}-${item.id || Date.now() + index}`}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.user}</Text>
              <Text style={styles.userMsisdn}>{item.msisdn}</Text>
              <Text style={styles.userRole}>{item.role}</Text>
              <View style={styles.planInfoBox}>
                <Ionicons name="pricetag" size={16} color="#007AFF" />
                <Text style={styles.planName}>{item.plan?.name}</Text>
                <Text style={styles.planFee}>{item.plan?.monthlyFee} L/muaj</Text>
                <TouchableOpacity style={styles.planChangeBtn} onPress={() => openPlanChange(item)}>
                  <Ionicons name="swap-vertical" size={18} color="#007AFF" />
                  <Text style={styles.planChangeText}>Ndrysho</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.budgetInfoBox}>
                <Ionicons name="wallet" size={16} color="#34C759" />
                <Text style={styles.budgetLabel}>Limiti:</Text>
                <Text style={styles.budgetValue}>{item.budgetLimit} L</Text>
                <TouchableOpacity style={styles.budgetBtn} onPress={() => changeBudget(item, 100)}>
                  <Ionicons name="add-circle" size={20} color="#34C759" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.budgetBtn} onPress={() => changeBudget(item, -100)}>
                  <Ionicons name="remove-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <View style={styles.packageBox}>
                <TouchableOpacity style={styles.packageBtn} onPress={() => openPackageModal(item)}>
                  <Ionicons name="gift" size={18} color="#fff" />
                  <Text style={styles.packageBtnText}>Aktivizo Paketë</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteUser(item)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingUser ? 'Përditëso Përdoruesin' : 'Shto Përdorues'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Emri"
              value={form.user}
              onChangeText={t => setForm({ ...form, user: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="MSISDN"
              value={form.msisdn}
              onChangeText={t => setForm({ ...form, msisdn: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Roli"
              value={form.role}
              onChangeText={t => setForm({ ...form, role: t })}
            />
            <Text style={styles.label}>Plani</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={form.plan.name}
                onValueChange={planName => setForm({ ...form, plan: availablePlans.find(p => p.name === planName) })}
                style={{ height: 40 }}
              >
                {availablePlans.map(plan => (
                  <Picker.Item key={plan.name} label={`${plan.name} (${plan.monthlyFee} L/muaj)`} value={plan.name} />
                ))}
              </Picker>
            </View>
            <View style={styles.planDetailsBox}>
              <Text style={styles.planDetailsTitle}>Detajet e Planit</Text>
              <Text style={styles.planDetail}>Data: {form.plan.includedData} MB</Text>
              <Text style={styles.planDetail}>Minuta: {form.plan.includedMinutes}</Text>
              <Text style={styles.planDetail}>SMS: {form.plan.includedSMS}</Text>
              <Text style={styles.planDetail}>Roaming: {form.plan.roaming ? 'Po' : 'Jo'}</Text>
              <Text style={styles.planDetail}>Ndërkombëtare: {form.plan.internationalCalls ? 'Po' : 'Jo'}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Limiti i Buxhetit (L)"
              value={form.budgetLimit}
              onChangeText={t => setForm({ ...form, budgetLimit: t.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveUser}>
                <Text style={styles.saveText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showPlanModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ndrysho Planin</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedPlan}
                onValueChange={setSelectedPlan}
                style={{ height: 40 }}
              >
                {availablePlans.map(plan => (
                  <Picker.Item key={plan.name} label={`${plan.name} (${plan.monthlyFee} L/muaj)`} value={plan.name} />
                ))}
              </Picker>
            </View>
            <View style={styles.planDetailsBox}>
              <Text style={styles.planDetailsTitle}>Detajet e Planit</Text>
              <Text style={styles.planDetail}>Data: {availablePlans.find(p => p.name === selectedPlan)?.includedData} MB</Text>
              <Text style={styles.planDetail}>Minuta: {availablePlans.find(p => p.name === selectedPlan)?.includedMinutes}</Text>
              <Text style={styles.planDetail}>SMS: {availablePlans.find(p => p.name === selectedPlan)?.includedSMS}</Text>
              <Text style={styles.planDetail}>Roaming: {availablePlans.find(p => p.name === selectedPlan)?.roaming ? 'Po' : 'Jo'}</Text>
              <Text style={styles.planDetail}>Ndërkombëtare: {availablePlans.find(p => p.name === selectedPlan)?.internationalCalls ? 'Po' : 'Jo'}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPlanModal(false)}>
                <Text style={styles.cancelText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePlanChange}>
                <Text style={styles.saveText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showBulkPlanModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ndrysho Planin për të gjithë</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={bulkPlan}
                onValueChange={setBulkPlan}
                style={{ height: 40 }}
              >
                {availablePlans.map(plan => (
                  <Picker.Item key={plan.name} label={`${plan.name} (${plan.monthlyFee} L/muaj)`} value={plan.name} />
                ))}
              </Picker>
            </View>
            <View style={styles.planDetailsBox}>
              <Text style={styles.planDetailsTitle}>Detajet e Planit</Text>
              <Text style={styles.planDetail}>Data: {availablePlans.find(p => p.name === bulkPlan)?.includedData} MB</Text>
              <Text style={styles.planDetail}>Minuta: {availablePlans.find(p => p.name === bulkPlan)?.includedMinutes}</Text>
              <Text style={styles.planDetail}>SMS: {availablePlans.find(p => p.name === bulkPlan)?.includedSMS}</Text>
              <Text style={styles.planDetail}>Roaming: {availablePlans.find(p => p.name === bulkPlan)?.roaming ? 'Po' : 'Jo'}</Text>
              <Text style={styles.planDetail}>Ndërkombëtare: {availablePlans.find(p => p.name === bulkPlan)?.internationalCalls ? 'Po' : 'Jo'}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowBulkPlanModal(false)}>
                <Text style={styles.cancelText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveBulkPlanChange}>
                <Text style={styles.saveText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showPackageModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aktivizo Paketë</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedPackage}
                onValueChange={setSelectedPackage}
                style={{ height: 40 }}
              >
                {availablePackages.map(pkg => (
                  <Picker.Item key={pkg.name} label={`${pkg.name} (${pkg.price} L) - ${pkg.description}`} value={pkg.name} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPackageModal(false)}>
                <Text style={styles.cancelText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePackage}>
                <Text style={styles.saveText}>Aktivizo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  container: { borderflex: 1, backgroundColor: '#F2F2F7', paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 30 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', elevation: 2 },
  title: { fontSize: 20, fontWeight: 'bold', color: 'black', letterSpacing: 0.5 },
  addButton: { backgroundColor: '#007AFF', borderRadius: 20, padding: 10, elevation: 2 },
  bulkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, marginLeft: 8, elevation: 2 },
  bulkButtonText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 },
  userCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  userName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  userMsisdn: { fontSize: 15, color: '#8E8E93', marginTop: 2 },
  userRole: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  planInfoBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#F2F8FF', borderRadius: 8, padding: 6, gap: 6 },
  planName: { fontSize: 15, color: '#007AFF', fontWeight: '600', marginLeft: 4 },
  planFee: { fontSize: 13, color: '#8E8E93', marginLeft: 8 },
  planChangeBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, backgroundColor: '#E5F0FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  planChangeText: { color: '#007AFF', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  budgetInfoBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#F7FFF2', borderRadius: 8, padding: 6, gap: 6 },
  budgetLabel: { fontSize: 14, color: '#34C759', fontWeight: '600', marginLeft: 4 },
  budgetValue: { fontSize: 14, color: '#1C1C1E', fontWeight: '700', marginLeft: 4 },
  budgetBtn: { marginLeft: 8 },
  packageBox: { marginTop: 10 },
  packageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 4 },
  packageBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  actions: { flexDirection: 'row', gap: 20 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '92%', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#007AFF' },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, backgroundColor: '#F8FAFF' },
  label: { fontSize: 15, color: '#1C1C1E', marginBottom: 6, fontWeight: '600' },
  pickerBox: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, marginBottom: 14, backgroundColor: '#F8FAFF' },
  planDetailsBox: { backgroundColor: '#F2F8FF', borderRadius: 8, padding: 10, marginBottom: 14 },
  planDetailsTitle: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', marginBottom: 4 },
  planDetail: { fontSize: 13, color: '#1C1C1E', marginBottom: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 8 },
  cancelButton: { padding: 12 },
  saveButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, minWidth: 80, alignItems: 'center' },
  cancelText: { color: '#007AFF', fontWeight: '600', fontSize: 16 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
}); 