import { View, Image, TouchableOpacity, StyleSheet, ImageStyle, TextStyle, ViewStyle, Text, Dimensions } from 'react-native';
import React from 'react';
import { globalStyyles } from '@/styles/globalStyles';
import Swiper from 'react-native-swiper';
import { useNavigation } from '@react-navigation/native';
import { appColor } from '../../constants/appColors';

const { width, height } = Dimensions.get('window');

const OnbroadingScreen = () => {
  const navigation = useNavigation();

  const handleNavigateToLogin = () => {
    navigation.navigate('LoginScreen' as never);
  };

  return (
    <View style={[globalStyyles.container]}>
      <Swiper 
        style={[]} 
        showsButtons
        loop={false}
        dotStyle={styles.dot}
        activeDotStyle={styles.activeDot}
      >
        <View style={styles.slide}>
          <Image 
            source={require('../../assets/images/nen.jpg')} 
            style={styles.fullImage}
          />
        </View>

        <View style={styles.slide}>
          <Image 
            source={require('../../assets/images/nen.jpg')} 
            style={styles.fullImage}
          />
        </View>

        <View style={styles.slide}>
          <Image 
            source={require('../../assets/images/nen.jpg')} 
            style={styles.fullImage}
          />
          <TouchableOpacity 
            style={[globalStyyles.primaryButton, styles.loginButton]}
            onPress={handleNavigateToLogin}
          >
            <Text style={globalStyyles.primaryButtonText}>
              Đăng nhập ngay
            </Text>
          </TouchableOpacity>
        </View>
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  fullImage: {
    width: width,
    height: height,
    resizeMode: 'cover' as const,
  } as ImageStyle,
  loginButton: {
    position: 'absolute',
    bottom: 50,
    right: 25,
    width: '86%',
    backgroundColor: 'black',
    borderRadius: 30,
  } as ViewStyle,
  dot: {
    backgroundColor: 'rgba(0,0,0,.2)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  } as ViewStyle,
  activeDot: {
    backgroundColor: appColor.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  } as ViewStyle,
});

export default OnbroadingScreen;