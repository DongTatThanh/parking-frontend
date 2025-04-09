import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import AuthNavigator from './AuthNavigation';
import { HomeScreen, LoginScreen } from '@/screens';
import ServicesScreen from '@/screens/booking/ServicesScreen';
import BookingScreen from '@/screens/booking/BookingScreen';
import BarkingLayoutScreen from '@/screens/booking/BarkingLayoutScreen';

import BookingConfirmationScreen from '@/screens/booking/BookingConfirmationScreen';
import HistoryScreen from '@/screens/screenBottomTab/HistoryScreen';

import InsuranceScreen from '@/screens/InsuranceScreen';
import AboutScreen from '@/screens/AboutScreen';
import SpecialOffersScreen from '@/screens/SpecialOffersScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import ChooseTime from "../screens/booking/ChooseTime";

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (

    <Stack.Navigator screenOptions={{ headerShown: false }}>

    <Stack.Screen name="AuthNavigator" component={AuthNavigator} /> 
      <Stack.Screen name="TabNavigator" component={TabNavigator} />
      <Stack.Screen name="ServicesScreen" component={ServicesScreen} />
      <Stack.Screen name='BookingScreen' component={BookingScreen}/>
      <Stack.Screen name='BarkingLayoutScreen' component={BarkingLayoutScreen}/>
      
      <Stack.Screen name="BookingConfirmationScreen" component={BookingConfirmationScreen} />
    <Stack.Screen name='HistoryScreen' component={HistoryScreen}/>
    <Stack.Screen name="InsuranceScreen" component={InsuranceScreen} />
     <Stack.Screen name = "HomeScreen" component={HomeScreen}/>
    <Stack.Screen name='AboutScreen' component={AboutScreen}/>
    <Stack.Screen 
          name="SpecialOffersScreen" 
          component={SpecialOffersScreen} 
          options={{ title: "Ưu Đãi Đặc Biệt" }}
        />
        <Stack.Screen 
          name="PaymentScreen" 
          component={PaymentScreen} 
          options={{ title: "Thanh toán " }}
        />
          <Stack.Screen name='ChooseTime' component={ChooseTime}
          options={{ title: "chọn thời gian" }}/>
    </Stack.Navigator>
  );
};

export default MainNavigator;