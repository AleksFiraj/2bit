import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../utils/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('admin_it');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!contractNumber || !username || !password || !phone) {
      setErrorMessage('Të gjitha fushat janë të detyrueshme.');
      return;
    }
    const phoneRegex = /^\+355\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setErrorMessage('Numri i telefonit duhet të jetë në format +355 e ndjekur nga 9 shifra.');
      return;
    }
    // Simple contract number validation (adjust as needed, e.g., alphanumeric)
    if (!/^[a-zA-Z0-9-]+$/.test(contractNumber)) {
      setErrorMessage('Numri i kontratës është i pavlefshëm. Përdorni vetëm shkronja dhe numra.');
      return;
    }
    try {
      const response = await auth.register(contractNumber, username, password, phone);
      Alert.alert('Sukses', 'OTP u dërgua në telefonin tuaj');
      setShowOtpInput(true);
    } catch (err) {
      Alert.alert('Gabim', err.response?.data?.message || err.message);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      return Alert.alert('Gabim', 'Shkruani kredencialet');
    }
    try {
      const response = await auth.login(username, password, role);
      const data = response.data;

      if (data.role !== 'sme_admin') {
        Alert.alert('Sukses', 'U identifikove me sukses');
        onLoginSuccess && onLoginSuccess(data.role);
      } else {
        setPhone(data.phone || phone);
        setShowOtpInput(true);
        Alert.alert('OTP', 'Kodi OTP u dërgua në telefon');
      }
    } catch (err) {
      Alert.alert('Gabim', err.response?.data?.message || err.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return Alert.alert('Gabim', 'Shkruani OTP');
    try {
      const response = await auth.verifyOtp(phone, otp);
      Alert.alert('Sukses', 'U identifikove me sukses');
      onLoginSuccess && onLoginSuccess('sme_admin');
    } catch (err) {
      Alert.alert('Gabim', err.response?.data?.message || err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="business" size={64} color="#007AFF" />
          <Text style={styles.title}>ONE Albania SME Dashboard</Text>
          <Text style={styles.subtitle}>Hyrja në Sistem</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Roli</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={role}
              onValueChange={val => {
                setRole(val);
                setIsRegistering(false);
                setShowOtpInput(false);
              }}
            >
              <Picker.Item label="Admin IT (ONE Albania)" value="admin_it" />
              <Picker.Item label="Sales Support (ONE Albania)" value="sales_support" />
              <Picker.Item label="SME Administrator (Client)" value="sme_admin" />
            </Picker>
          </View>

          {role === 'sme_admin' && !showOtpInput && isRegistering && (
            <>
              <Text style={styles.label}>Numri i Kontratës</Text>
              <TextInput
                style={styles.input}
                value={contractNumber}
                onChangeText={setContractNumber}
                placeholder="Shkruani numrin e kontratës"
                keyboardType="default"
              />
              <Text style={styles.label}>Numri i Telefonit</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+3556xxxxxxx"
                keyboardType="phone-pad"
              />
            </>
          )}

          {!showOtpInput && (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Shkruani username"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Shkruani password"
                secureTextEntry
              />
            </>
          )}

          {showOtpInput && (
            <>
              <Text style={styles.label}>Kodi OTP</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
                placeholder="Shkruani OTP"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => (isRegistering ? handleRegister() : handleLogin())}
              >
                <Text style={styles.resendText}>Dërgo përsëri kodin OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {!showOtpInput && role === 'sme_admin' && (
            <TouchableOpacity onPress={() => setIsRegistering(prev => !prev)} style={{ alignItems: 'center' }}>
              <Text style={{ color: '#007AFF', fontSize: 14, marginTop: 10 }}>
                {isRegistering ? 'Kthehu te hyrja' : 'Regjistrohu si SME Admin'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => {
              if (showOtpInput) handleVerifyOtp();
              else if (isRegistering && role === 'sme_admin') handleRegister();
              else handleLogin();
            }}
          >
            <Text style={styles.loginButtonText}>
              {showOtpInput ? 'Verifiko' : 'Vazhdo'}
            </Text>
          </TouchableOpacity>
          {errorMessage && (
            <Text style={{ color: 'red', fontSize: 14, marginTop: 10 }}>
              {errorMessage}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 6,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
  },
});