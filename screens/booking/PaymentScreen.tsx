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
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'PaymentScreen'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentScreenRouteProp>();
  
  // Add state for QR code
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
  
  const handlePaymentMethod = async (method: string) => {
    try {
      setIsProcessing(true);
      
      // Simulate API call for payment processing
      setTimeout(() => {
        // Store payment method in AsyncStorage for history
        AsyncStorage.setItem('last_payment_method', method).catch(console.error);
        
        // If method is digital payment, show QR code
        if (['MoMo', 'ZaloPay'].includes(method)) {
          setQrCodeData('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAACUCAYAAAB1PADUAAAAAklEQVR4AewaftIAAATTSURBVO3BQY4cSRIEQdNA/f/Lun30UwCJ9GpyuCaCP1K15KRq0UnVopOqRSdVi06qFp1ULTqpWnRSteikatFJ1aKTqkUnVYtOqhadVC06qVr0yUtAfpOaJ4C8oWYCMql5Asik5gbIb1LzxknVopOqRSdViz5ZpmYTkCeA3Ki5ATIBuQFyo2ZSMwGZ1Nyo2QRk00nVopOqRSdViz75MiBPqHkCyKTmCSA3ajYB2QTkCTXfdFK16KRq0UnVok/+cUCeUDMBuVEzAblRMwH5l5xULTqpWnRSteiT/zNqJiA3am6APAFkUvMvOaladFK16KRq0SdfpuY3AZnU3Kh5AsiNmt+k5m9yUrXopGrRSdWiT5YB+ZPUTEAmNROQN9Q8AWRSMwG5UfNNQL5JzQ2QGzVvnFQtOqladFK1CH9kEZBJzQRkk5rfBGRS8waQSc0EZFJzA+RGzTedVC06qVp0UrXokz9MzQRkUjMBuQHyhpoJyA2QSc0EZFLzhJobIDdqJiA3at44qVp0UrXopGoR/sgXAZnUPAFkUjMBmdRMQG7UPAFkUjMBeULNBGRS8waQSc03nVQtOqladFK1CH/kBSBPqJmATGpugPxJaiYgk5obIJOaGyBvqLkBMql546Rq0UnVopOqRfgjLwCZ1ExAnlAzAZnUPAHkRs0E5Ak1E5BJzTcBmdTcAJnUbDqpWnRSteikahH+yAtAJjW/CciNmieATGomIDdqboA8oeYJIJOa33RSteikatFJ1SL8kReATGomIE+omYDcqHkCyKTmBsgbam6AbFIzAZnUfNNJ1aKTqkUnVYvwR/7DgExqJiBPqNkEZFIzAZnUPAHkRs0NkEnNGydVi06qFp1ULfrkJSC/Sc2k5g01TwCZ1NyomYA8AWRSc6NmAnKjZtNJ1aKTqkUnVYs+WaZmE5AbIDdqJiATkEnNBGRS85vUvKFmAvJNJ1WLTqoWnVQt+uTLgDyh5m+iZgIyqZmA3KiZgExA3gByo+abTqoWnVQtOqla9EldAZnUTEBu1NyomYBMaiYgk5ongNyoeeOkatFJ1aKTqkWf/OOAPAFkUjMBuVEzAZnU3KiZgExqJiCTmgnIjZpNJ1WLTqoWnVQt+uTL1HyTmgnIpOYGyKTmRs0bQN4A8oSaCcg3nVQtOqladFK16JNlQH4TkCeA3AD5JjVvAJnU3ACZ1HzTSdWik6pFJ1WL8EeqlpxULTqpWnRSteikatFJ1aKTqkUnVYtOqhadVC06qVp0UrXopGrRSdWik6pFJ1WL/gfOKj4ur80SFQAAAABJRU5ErkJggg==');
          
          setTimeout(() => {
            Alert.alert(
              'Quét mã QR',
              `Vui lòng quét mã QR bằng ứng dụng ${method} để thanh toán.`,
              [
                {
                  text: 'Đã thanh toán',
                  onPress: () => {
                    setQrCodeData(null);
                    completePayment(method);
                  },
                },
                {
                  text: 'Hủy',
                  style: 'cancel',
                  onPress: () => setQrCodeData(null),
                },
              ]
            );
            setIsProcessing(false);
          }, 1000);
        } else {
          // For cash or bank card, just show success message
          completePayment(method);
          setIsProcessing(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Lỗi khi xử lý thanh toán:', error);
      Alert.alert('Lỗi', 'Không thể xử lý thanh toán. Vui lòng thử lại.');
      setIsProcessing(false);
    }
  };
  
  const completePayment = (method: string) => {
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
        
        {/* QR Code Display */}
        {qrCodeData && (
          <View style={styles.qrCodeContainer}>
            <Text style={styles.qrCodeTitle}>Quét mã QR để thanh toán</Text>
            <Image 
              source={{ uri: qrCodeData }}
              style={styles.qrCode}
              resizeMode="contain"
            />
            <Text style={styles.qrCodeInstructions}>
              Sử dụng ứng dụng ví điện tử để quét mã QR và hoàn tất thanh toán
            </Text>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Đang xử lý thanh toán...</Text>
          </View>
        ) : (
          <>
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
          </>
        )}
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
  qrCodeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  qrCodeInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default PaymentScreen; 