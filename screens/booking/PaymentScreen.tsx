import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './BookingScreen';

type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'PaymentScreen'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentScreenRouteProp>();
  
  const { 
    bookingId, 
    totalPrice, 
    currency, 
    spotCode, 
    zoneId,
    bookingDate,
    startTime,
    endTime,
    duration,
    bookingType,
    licensePlate,
    phoneNumber
  } = route.params;
  
  const handlePaymentMethod = (method: string) => {
    // Ở đây sẽ xử lý thanh toán thật, nhưng hiện tại chỉ hiển thị thông báo
    Alert.alert(
      'Thanh toán thành công',
      `Bạn đã thanh toán thành công cho đặt chỗ ${bookingId} tại vị trí ${spotCode}, khu vực ${zoneId} với phương thức ${method}.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('HomeScreen')
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <Text style={styles.headerSubtitle}>
          Chọn phương thức thanh toán
        </Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle}>Thông tin đặt chỗ</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đặt chỗ:</Text>
            <Text style={styles.infoValue}>{bookingId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại vé:</Text>
            <Text style={styles.infoValue}>{bookingType === 'daily' ? 'Vé ngày' : 'Vé tháng'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày đặt:</Text>
            <Text style={styles.infoValue}>{bookingDate || 'Không có thông tin'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>{startTime || '00:00'} - {endTime || '23:59'}</Text>
          </View>
          {duration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời lượng:</Text>
              <Text style={styles.infoValue}>{duration}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vị trí:</Text>
            <Text style={styles.infoValue}>{spotCode}, Khu {zoneId}</Text>
          </View>
          {licensePlate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Biển số xe:</Text>
              <Text style={styles.infoValue}>{licensePlate}</Text>
            </View>
          )}
          {phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
              <Text style={styles.infoValue}>{phoneNumber}</Text>
            </View>
          )}
          <View style={styles.totalPriceRow}>
            <Text style={styles.totalPriceLabel}>Tổng tiền:</Text>
            <Text style={styles.totalPriceValue}>{totalPrice.toLocaleString()} {currency}</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        
        <TouchableOpacity 
          style={styles.paymentMethod}
          onPress={() => handlePaymentMethod('MoMo')}
        >
          <View style={styles.paymentIcon}>
            <Text style={{fontSize: 24}}>💰</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>MoMo</Text>
            <Text style={styles.paymentDescription}>Thanh toán qua ví điện tử MoMo</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.paymentMethod}
          onPress={() => handlePaymentMethod('ZaloPay')}
        >
          <View style={styles.paymentIcon}>
            <Text style={{fontSize: 24}}>💳</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>ZaloPay</Text>
            <Text style={styles.paymentDescription}>Thanh toán qua ví điện tử ZaloPay</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.paymentMethod}
          onPress={() => handlePaymentMethod('Thẻ ngân hàng')}
        >
          <View style={styles.paymentIcon}>
            <Text style={{fontSize: 24}}>🏦</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Thẻ ngân hàng</Text>
            <Text style={styles.paymentDescription}>Thanh toán qua thẻ ATM/Visa/Mastercard</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.paymentMethod}
          onPress={() => handlePaymentMethod('Tiền mặt')}
        >
          <View style={styles.paymentIcon}>
            <Text style={{fontSize: 24}}>💵</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Tiền mặt</Text>
            <Text style={styles.paymentDescription}>Thanh toán khi đến bãi đỗ xe</Text>
          </View>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bookingInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f1f5f9',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default PaymentScreen; 