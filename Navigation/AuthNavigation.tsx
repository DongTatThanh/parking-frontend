import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen, LoginScreen, OnbroadingScreen } from '@/screens';
import { Ionicons } from '@expo/vector-icons';
import { globalStyyles } from '@/styles/globalStyles';

import ForgetPasswordScreen from '@/screens/auth/ForgetPasswordScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import BookingScreen from '@/screens/booking/BookingScreen';

import PaymentScreen from '@/screens/PaymentScreen';
import ServicesScreen from '@/screens/booking/ServicesScreen';
import BarkingLayoutScreen from '@/screens/booking/BarkingLayoutScreen';
import BookingConfirmationScreen from '@/screens/booking/BookingConfirmationScreen';
import SpecialOffersScreen from '@/screens/SpecialOffersScreen';


const Stack = createStackNavigator();

const AuthNavigation = () => {
  return (
    <Stack.Navigator initialRouteName='OnbroadingScreen' screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="OnbroadingScreen" 
        component={OnbroadingScreen} 
      />
      <Stack.Screen 
        name="LoginScreen" 
        component={LoginScreen} 
      />
      <Stack.Screen 
        name="RegisterScreen" 
        component={RegisterScreen}
      /> 
      <Stack.Screen 
        name="ForgetPasswordScreen" 
        component={ForgetPasswordScreen}

      />
       <Stack.Screen 
      name="HomeScreen" 
      component={HomeScreen}

    />
     <Stack.Screen 
     name="BookingScreen"
      component={BookingScreen}
      />
    <Stack.Screen
     name='BarkingLayoutScreen'
     component={BarkingLayoutScreen}
     />
      <Stack.Screen
     name='PaymentScreen'
     component={PaymentScreen}
     />
      <Stack.Screen
     name='ServicesScreen'
     component={ServicesScreen}
     />
      <Stack.Screen
     name='BookingConfirmationScreen'
     component={BookingConfirmationScreen}
     />
    
    
    </Stack.Navigator>
  );
};

export default AuthNavigation;
