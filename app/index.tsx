import React, { useEffect, useState } from 'react';
import { SplashScreen } from '@/screens';
import { StatusBar } from 'react-native';
import MainNavigator from "../Navigation/MainNavigator";
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { WebSocketProvider } from '../context/WebSocketContext';
import { UserProvider } from '../context/UserContext';

const Index = () => {
  const [isShowSplash, setIsShowSplash] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const { getItem, setItem } = useAsyncStorage('accessToken');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsShowSplash(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const token = await getItem();
    if (token) setAccessToken(token);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <UserProvider>
        <WebSocketProvider>
      {isShowSplash ? (
        <SplashScreen />
      ) : (
        <MainNavigator />
          )}
        </WebSocketProvider>
      </UserProvider>
    </>
  );
};

export default Index;
