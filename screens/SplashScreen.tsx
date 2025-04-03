import { View, Text, ImageBackground, Image, ActivityIndicator } from 'react-native';
import React from 'react';
import { appColor } from '../constants/appColors';
import { SpaceComponents, Spacer } from '@/components';




const SplashScreen = () => {
  return (
    <ImageBackground
      source={require("../assets/images/nen.jpg")}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      imageStyle={{ resizeMode: 'cover' }}
    >
      <Image
        source={require("../assets/images/nen.jpg")}
        style={{
          
        }}
      />
        
      <Spacer height={30}/>
      <ActivityIndicator color={appColor.gray} size={40}/>
    </ImageBackground>
  );
};

export default SplashScreen;