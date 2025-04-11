import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';

type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'PaymentScreen'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentScreenRouteProp>();
  const {
    spotId,
    bookingCode,
    userName,
    phone,
    bookingTime,
    ticketType,
    expiryTime,
    totalAmount,
  } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const paymentMethods = [
    {
      id: 'momo',
      name: 'Ví MoMo',
      icon: '💸',
      color: '#ae2070',
    },
    {
      id: 'zalopay',
      name: 'ZaloPay',
      icon: '💳',
      color: '#0068ff',
    },
    {
      id: 'vnpay',
      name: 'VNPay',
      icon: '💰',
      color: '#0a5cbd',
    },
    {
      id: 'bank',
      name: 'Thẻ ngân hàng',
      icon: '🏦',
      color: '#2c7a7b',
    },
  ];

  const handlePaymentSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handlePaymentConfirm = () => {
    if (!selectedMethod) {
      Alert.alert('Thông báo', 'Vui lòng chọn phương thức thanh toán');
      return;
    }

    Alert.alert(
      'Thanh toán thành công',
      `Cảm ơn bạn đã sử dụng dịch vụ TÌM BÃI NHANH.\nMã đặt chỗ: ${bookingCode}\nSố tiền: ${totalAmount} VND\nHạn sử dụng: ${expiryTime}`,
      [
        {
          text: 'Xem hóa đơn',
          onPress: () => navigation.navigate('HistoryScreen' as never),
        },
        {
          text: 'Về trang chủ',
          onPress: () => navigation.navigate('HomeScreen' as never),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <Text style={styles.sectionTitle}>Chi tiết đơn hàng</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vị trí đỗ xe:</Text>
              <Text style={styles.summaryValue}>{spotId}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mã đặt chỗ:</Text>
              <Text style={styles.summaryValue}>{bookingCode}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tên người dùng:</Text>
              <Text style={styles.summaryValue}>{userName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Số điện thoại:</Text>
              <Text style={styles.summaryValue}>{phone}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thời gian đặt:</Text>
              <Text style={styles.summaryValue}>{bookingTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Loại vé:</Text>
              <Text style={styles.summaryValue}>{ticketType}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hạn sử dụng:</Text>
              <Text style={styles.summaryValue}>{expiryTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalValue}>{totalAmount} VND</Text>
            </View>
          </View>
          {/* Payment Methods */}
          <View style={styles.paymentMethods}>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedMethod === method.id && styles.selectedPayment,
                  { borderLeftColor: method.color, borderLeftWidth: 4 },
                ]}
                onPress={() => handlePaymentSelect(method.id)}
              >
                <View style={styles.methodInfo}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <Text style={styles.methodName}>{method.name}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedMethod === method.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {/* Payment Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Bằng cách tiếp tục, bạn đồng ý với các điều khoản thanh toán và chính sách hoàn tiền của chúng tôi.
            </Text>
          </View>
          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedMethod && styles.confirmButtonDisabled,
            ]}
            disabled={!selectedMethod}
            onPress={handlePaymentConfirm}
          >
            <Text style={styles.confirmButtonText}>Xác nhận thanh toán</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  content: {
    padding: 16,
  },
  orderSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  paymentMethods: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  selectedPayment: {
    backgroundColor: '#f0f9ff',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10b981',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PaymentScreen;