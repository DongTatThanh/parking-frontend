import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';
import vnpayApi from '../../api/payment/vnpay';

type PaymentResultScreenRouteProp = RouteProp<RootStackParamList, 'PaymentResultScreen'>;

const PaymentResultScreen: React.FC = () => {
  const route = useRoute<PaymentResultScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isProcessing, setIsProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [responseDetails, setResponseDetails] = useState<any>(null);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Get payment result data from route params
        console.log('Payment result route params:', route.params);
        
        // VNPAY uses vnp_ResponseCode
        const responseCode = route.params?.vnp_ResponseCode;
        const txnRef = route.params?.vnp_TxnRef; // Transaction reference
        const amount = route.params?.vnp_Amount;
        const bankCode = route.params?.vnp_BankCode;
        const transactionDate = route.params?.vnp_PayDate;
        
        // Store response details for display
        setResponseDetails({
          responseCode,
          txnRef,
          amount: amount ? parseInt(amount) / 100 : 0, // VNPAY returns amount*100
          bankCode,
          transactionDate
        });
        
        console.log('VNPAY response details:', {
          responseCode,
          txnRef,
          amount,
          bankCode
        });

        if (responseCode === '00') {
          // Payment successful
          setSuccess(true);
          setMessage('Thanh toán thành công!');
          
          // Process the successful payment
          if (txnRef) {
            // Extract bookingId from txnRef (according to backend logic)
            const bookingId = txnRef.substring(0, 8); // Adjust based on your booking ID format
            const result = await vnpayApi.processPaymentResult(bookingId);
            
            if (result) {
              setMessage('Thanh toán đã được xác nhận. Đặt chỗ của bạn đã được hoàn tất!');
            } else {
              setMessage('Thanh toán thành công nhưng có lỗi khi xác nhận đặt chỗ. Vui lòng liên hệ hỗ trợ.');
            }
          }
        } else {
          // Payment failed - map common error codes
          setSuccess(false);
          
          // Map VNPAY error codes to user-friendly messages
          switch(responseCode) {
            case '24':
              setMessage('Giao dịch không thành công do: Khách hàng hủy giao dịch');
              break;
            case '51':
              setMessage('Giao dịch không thành công do: Tài khoản không đủ số dư');
              break;
            case '65':
              setMessage('Giao dịch không thành công do: Tài khoản vượt hạn mức giao dịch');
              break;
            case '75':
              setMessage('Ngân hàng thanh toán đang bảo trì');
              break;
            case '79':
              setMessage('Giao dịch không thành công do: Sai mật khẩu thanh toán');
              break;
            case '99':
              setMessage('Lỗi không xác định');
              break;
            default:
              setMessage(route.params?.message || `Thanh toán không thành công (Mã lỗi: ${responseCode || 'không xác định'})`);
          }
        }
      } catch (error) {
        console.error('Error processing payment result:', error);
        setSuccess(false);
        setMessage('Đã xảy ra lỗi khi xử lý kết quả thanh toán.');
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentResult();
  }, [route.params]);

  const handleContinue = () => {
    if (success) {
      // Navigate to booking confirmation or home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' }],
      });
    } else {
      // Go back to previous screen
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Đang xử lý kết quả thanh toán...</Text>
          </View>
        ) : (
          <>
            <View style={styles.resultContainer}>
              <Text style={[styles.statusIcon, { color: success ? '#10b981' : '#ef4444' }]}>
                {success ? '✓' : '✗'}
              </Text>
              <Text style={styles.statusTitle}>
                {success ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
              </Text>
              <Text style={styles.statusMessage}>{message}</Text>
              
              {responseDetails && (
                <View style={styles.detailsContainer}>
                  {responseDetails.txnRef && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mã giao dịch:</Text>
                      <Text style={styles.detailValue}>{responseDetails.txnRef}</Text>
                    </View>
                  )}
                  {responseDetails.amount > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số tiền:</Text>
                      <Text style={styles.detailValue}>{responseDetails.amount.toLocaleString()} VND</Text>
                    </View>
                  )}
                  {responseDetails.bankCode && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ngân hàng:</Text>
                      <Text style={styles.detailValue}>{responseDetails.bankCode}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: success ? '#10b981' : '#3b82f6' }]}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>
                {success ? 'Tiếp tục' : 'Thử lại'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  detailsContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PaymentResultScreen; 