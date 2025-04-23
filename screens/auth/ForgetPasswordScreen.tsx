import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import api from '../../api/axiosConfig';


const ForgetPasswordScreen = () => {
  const navigation = useNavigation<any>(); // Sử dụng any để tránh gạch đỏ nếu chưa có type
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^"]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.success) {
        Alert.alert('Thành công', 'Đã gửi mã OTP về email. Vui lòng kiểm tra email!');
        navigation.navigate('ResetPassword', { email });
      } else {
        Alert.alert('Lỗi', res.message || 'Không gửi được email. Vui lòng thử lại.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không gửi được email. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quên mật khẩu</Text>
      <Text style={styles.desc}>Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi OTP</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#f1f1f1', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#222', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ForgetPasswordScreen;