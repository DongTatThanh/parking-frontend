import { View, Text, TouchableOpacity, TextInput, StyleSheet, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../../components/common/BackButton';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from "../../context/UserContext";
import api from '../../api/axiosConfig';

// Định nghĩa kiểu dữ liệu cho response login
interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      user_id: number;
      username: string;
      full_name: string;
      email: string;
      phone: string;
      role: string;
    };
  };
}

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
      console.log('Đang xử lý đăng nhập với:', { username, password });
      
      const response = await api.post<any, LoginResponse>('/auth/login', {
        username: username.toLowerCase(),
        password: password
      });
      
      console.log('Response từ API đăng nhập:', response);
    
      // Kiểm tra response theo cấu trúc từ backend
      if (response.success && response.data?.token && response.data?.user) {
        console.log('Đăng nhập thành công với user:', response.data.user);
        
        // Lưu token vào AsyncStorage
        await AsyncStorage.setItem('userToken', response.data.token);
        
        // Lưu và cập nhật thông tin người dùng vào context
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        
        Alert.alert(
          'Thành công',
          response.message || 'Đăng nhập thành công!',
          [{ text: 'OK', onPress: () => navigation.navigate('TabNavigator' as never) }]
        );
      } else {
        // Log chi tiết về response để debug
        console.error('Response không hợp lệ:', response);
        Alert.alert('Lỗi', response.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message.includes('Không thể kết nối đến máy chủ')) {
        Alert.alert(
          'Lỗi kết nối',
          'Không thể kết nối đến máy chủ. Vui lòng kiểm tra:\n\n' +
          '1. Máy chủ đã được khởi động\n' +
          '2. Địa chỉ IP và cổng chính xác\n' +
          '3. Kết nối mạng của bạn'
        );
      } else if (error.message.includes('Tài khoản không tồn tại')) {
        Alert.alert(
          'Lỗi đăng nhập',
          'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc số điện thoại.'
        );
      } else if (error.message.includes('Mật khẩu không đúng')) {
        Alert.alert(
          'Lỗi đăng nhập',
          'Mật khẩu không đúng. Vui lòng kiểm tra lại.'
        );
      } else {
        Alert.alert('Lỗi đăng nhập', error.message);
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