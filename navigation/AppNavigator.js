import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SherbimetScreen from '../screens/SherbimetScreen';
import KontrolliKostoveScreen from '../screens/KontrolliKostoveScreen';
import MenaxhimiSherbimeveScreen from '../screens/MenaxhimiSherbimeveScreen';
import AnalitikaScreen from '../screens/AnalitikaScreen';
import SugjerimeAIScreen from '../screens/SugjerimeAIScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import SystemLogsScreen from '../screens/SystemLogsScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import DatabaseInsightsScreen from '../screens/DatabaseInsightsScreen';

import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainApp = ({ userRole }) => {
  return (
    <Tab.Navigator
      initialRouteName="Sherbimet"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Sherbimet') iconName = 'phone-portrait';
          else if (route.name === 'Kosto') iconName = 'cash-outline';
          else if (route.name === 'Menaxhimi') iconName = 'settings-outline';
          else if (route.name === 'Analitika') iconName = 'bar-chart-outline';
          else if (route.name === 'Sugjerime AI') iconName = 'bulb-outline';
          else if (route.name === 'User Management') iconName = 'people-outline';
          else if (route.name === 'System Logs') iconName = 'document-text-outline';
          else if (route.name === 'Order Tracking') iconName = 'list-outline';
          else if (route.name === 'Database Insights') iconName = 'server-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen 
        name="Sherbimet" 
        component={SherbimetScreen}
        options={{ title: 'Sherbimet', tabBarAccessibilityLabel: 'Sherbimet'}}
      />
      <Tab.Screen 
        name="Kosto" 
        component={KontrolliKostoveScreen}
        options={{ title: 'Kosto', tabBarAccessibilityLabel: 'Kosto' }}
      />
      {(userRole === 'admin_it' || userRole === 'sme_admin') && (
        <Tab.Screen 
          name="User Management" 
          component={UserManagementScreen}
          options={{ title: 'User Management', tabBarAccessibilityLabel: 'User Management' }}
        />
      )}
      {userRole === 'admin_it' && (
        <Tab.Screen 
          name="System Logs" 
          component={SystemLogsScreen}
          options={{ title: 'System Logs', tabBarAccessibilityLabel: 'System Logs' }}
        />
      )}
      {(userRole === 'admin_it' || userRole === 'sales_support') && (
        <Tab.Screen 
          name="Order Tracking" 
          component={OrderTrackingScreen}
          options={{ title: 'Order Tracking', tabBarAccessibilityLabel: 'Order Tracking' }}
        />
      )}
      {userRole === 'admin_it' && (
        <Tab.Screen 
          name="Menaxhimi" 
          component={MenaxhimiSherbimeveScreen}
          options={{ title: 'Menaxhimi', tabBarAccessibilityLabel: 'Menaxhimi' }}
        />
      )}
      {userRole === 'admin_it' && (
        <Tab.Screen 
          name="Database Insights" 
          component={DatabaseInsightsScreen}
          options={{ 
            title: 'Insights', 
            tabBarAccessibilityLabel: 'Database Insights',
          }}
        />
      )}
      <Tab.Screen 
        name="Analitika" 
        component={AnalitikaScreen}
        options={{ title: 'Analitika', tabBarAccessibilityLabel: 'Analitika' }}
      />
      <Tab.Screen 
        name="Sugjerime AI" 
        component={SugjerimeAIScreen}
        options={{ title: 'Sugjerime AI', tabBarAccessibilityLabel: 'Sugjerime AI' }}
      />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('sme_admin'); // Default role

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="MainApp">
            {props => <MainApp {...props} userRole={userRole} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
