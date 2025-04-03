import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens';
import HistoryScreen from '@/screens/screenBottomTab/HistoryScreen';
import NotificationScreen from '@/screens/screenBottomTab/NotificationScreen';
import ProfileScreen from '@/screens/screenBottomTab/ProfileScreen';
import { Icon } from 'react-native-elements';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Trang chủ') {
            iconName = 'home';
          } else if (route.name === 'Lịch sử') {
            iconName = 'history';
          } else if (route.name === 'Thông báo') {
            iconName = 'bell';
          } else if (route.name === 'Cá nhân') {
            iconName = 'user';
          }

          return iconName ? <Icon name={iconName} type="font-awesome" size={size} color={color} /> : null;
        },
        tabBarLabel: route.name,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Trang chủ" component={HomeScreen} />
      <Tab.Screen name="Lịch sử" component={HistoryScreen} />
      <Tab.Screen name="Thông báo" component={NotificationScreen} />
      <Tab.Screen name="Cá nhân" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;