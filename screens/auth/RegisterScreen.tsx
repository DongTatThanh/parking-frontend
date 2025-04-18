import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { appColor } from '../../constants/appColors';
import axios from 'axios';
import { Alert } from 'react-native';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  // Validate form data
  const validateForm = () => {
    if (!formData.fullName.trim()  && formData.fullName.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên họ tên phải lớn hơn 6 chữ số ');
      return false;
    }
    if (formData.fullName.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên họ tên phải lớn hơn 6 chữ số ');
      return false;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    
    if (!formData.phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }
    if (formData.phone.trim().length !== 10 || !/^\d{10}$/.test(formData.phone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại phải gồm đúng 10 chữ số');
      return false;
    }
    
    if (formData.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    
    return true;
  }

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Thêm các trường mà server yêu cầu
      const userData = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        username: formData.email, // Có thể server yêu cầu username
        role: "user" // Có thể server yêu cầu role
        // Thêm các trường khác nếu cần
      };
      
      console.log('Sending registration data:', userData);
      
      const response = await axios.post('http://192.168.0.101/api/auth/register', userData);
      
      console.log('Registration response:', response.data);
      
      if (response.data && response.data.success) {
        Alert.alert(
          'Thành công', 
          'Đăng ký tài khoản thành công!', 
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Lỗi', response.data.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response) {
        console.log('Error details:', error.response.data);
        
        // Bắt lỗi số điện thoại trùng lặp
        if (error.response.data.error && error.response.data.error.includes('Duplicate entry') && error.response.data.error.includes('phone')) {
          Alert.alert('Lỗi', 'Số điện thoại này đã được đăng ký. Vui lòng sử dụng số điện thoại khác.');
        } 
        // Bắt lỗi email trùng lặp
        else if (error.response.data.error && error.response.data.error.includes('Duplicate entry') && error.response.data.error.includes('email')) {
          Alert.alert('Lỗi', 'Email này đã được đăng ký. Vui lòng sử dụng email khác.');
        }
        // Các lỗi khác
        else {
          Alert.alert('Lỗi', error.response.data.message || error.response.data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      } else if (error.request) {
        // No response received
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } else {
        // Other error
        Alert.alert('Lỗi', 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/nen.jpg')}
      style={styles.background}
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={styles.title}>Đăng ký tài khoản</Text>
        
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={appColor.gray} />
          <TextInput
            style={styles.input}
            placeholder="Họ và tên"
            value={formData.fullName}
            onChangeText={(text) => setFormData({...formData, fullName: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={appColor.gray} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color={appColor.gray} />
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={appColor.gray} />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            secureTextEntry
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={appColor.gray} />
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
          />
        </View>

        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.registerButtonText}>Đăng ký</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,

  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 80,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: appColor.black,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: appColor.black,
    height: 50,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: appColor.gray,
    fontSize: 16,
  },
  loginLink: {
    color: appColor.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
