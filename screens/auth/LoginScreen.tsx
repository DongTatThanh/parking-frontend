import { View, Text, TouchableOpacity, TextInput, StyleSheet, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../../components/common/BackButton';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { UserContext } from "../../context/UserContext";

const LoginScreen = () => {
  const navigation = useNavigation();
  const setUser = (userData: any) => {
    console.log('Setting user data:', userData);
    // Hàm rỗng tạm thời
  };
  const [username, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    // Validate inputs
    if (!username.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc số điện thoại');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('http://192.168.1.28:3000/api/auth/login', {
        username: username,
        password: password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data && response.data.success) {
        // Lưu token vào AsyncStorage
        if (response.data.token) {
          await AsyncStorage.setItem('userToken', response.data.token);
        }
        
        // Lưu và cập nhật thông tin người dùng vào context
        if (response.data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
          setUser(response.data.user);
        }
        
        navigation.navigate('TabNavigator' as never);
        Alert.alert(
          'Thành công',
          'Đăng nhập thành công!',
          [{ text: 'OK', onPress: () => navigation.navigate('TabNavigator' as never) }]
        );
      } else {
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        console.log('Error details:', error.response.data);
        
        // Kiểm tra nội dung lỗi từ response
        const errorMessage = error.response.data.error || error.response.data.message;
        
        if (errorMessage) {
          if (errorMessage.includes('Incorrect password')) {
            Alert.alert('Lỗi đăng nhập', 'Mật khẩu không chính xác');
          } 
          else if (errorMessage.includes('User not found') || errorMessage.includes('Email not found')) {
            Alert.alert('Lỗi đăng nhập', 'Email hoặc số điện thoại chưa được đăng ký');
          }
          else if (errorMessage.includes('Account is locked')) {
            Alert.alert('Lỗi đăng nhập', 'Tài khoản đã bị khóa');
          }
          else {
            // Hiển thị thông báo lỗi trực tiếp từ server
            Alert.alert('Lỗi đăng nhập', errorMessage);
          }
        } else {
          Alert.alert('Lỗi', 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
      } else if (error.request) {
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } else {
        Alert.alert('Lỗi', 'Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/on1.png')} 
      style={styles.background}
    >
      <View style={styles.container}>
        <BackButton />
        <TextInput 
          style={styles.input} 
          placeholder="Nhập email hoặc số điện thoại"
          value={username}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Mật khẩu" 
          secureTextEntry
          value={password}
          onChangeText={setPassword} 
        />

        <View style={styles.linkContainer}>
          <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen" as never)} >
            <Text style={styles.linkText}>Đăng ký tài khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ForgetPasswordScreen' as never)}>
            <Text style={styles.linkText}>Quên mật khẩu</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 402,
    height: 873,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    padding: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  linkContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 20,
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default LoginScreen;