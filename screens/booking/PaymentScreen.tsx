import React, { useState, useEffect, useMemo } from 'react';
import {  SafeAreaView,  ScrollView,  View,  Text,  StyleSheet,  TouchableOpacity,  Image,  Alert,  ActivityIndicator,  Linking,  AppState} from 'react-native';
import queryString from 'query-string';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';
import vnpayApi from '../../api/payment/vnpay'; // Import VNPAY API


type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'PaymentScreen'>;

interface PaymentResponse {
  success: boolean;
  message?: string;
  vehicleId?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentScreenRouteProp>();
  
  // Add state for other variables
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false);
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Thêm state cho bộ đếm ngược
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 phút = 300 giây
  const [timerColor, setTimerColor] = useState<string>('#333'); // Màu bình thường khi đủ thời gian
  
  // Thêm state cho VNPAY
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);
  const [vnpayTxnRef, setVnpayTxnRef] = useState<string | null>(null);
  
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
    phoneNumber,
    endDate,
    qrCodeData
  } = route.params;
  
  // Debug logs
  console.log('=== PAYMENT SCREEN DEBUG LOGS ===');
  console.log('Route params:', {
    bookingId,
    totalPrice,
    bookingType,
    duration,
    startTime,
    endTime
  });
  
  // Chuyển đổi bookingType thành type cụ thể và đảm bảo giá trị mặc định là 'daily'
  const bookingTypeValue = (bookingType === 'monthly' ? 'monthly' : 'daily') as 'monthly' | 'daily';
  console.log('Booking type after conversion:', bookingTypeValue);
  
  // Sử dụng giá trực tiếp từ API và kiểm tra loại vé
  const [spotPrice, setSpotPrice] = useState(totalPrice);
  console.log('Initial spot price:', spotPrice);

  // Hiển thị giá vé theo loại vé
  const displayPrice = useMemo(() => {
    const price = bookingTypeValue === 'monthly' ? spotPrice : spotPrice;
    console.log('Display price calculation:', {
      bookingTypeValue,
      spotPrice,
      calculatedPrice: price
    });
    return price;
  }, [spotPrice, bookingTypeValue]);
  
  useEffect(() => {
    console.log('Price updated:', {
      spotPrice,
      displayPrice,
      bookingType: bookingTypeValue
    });
  }, [spotPrice, displayPrice, bookingTypeValue]);
  
  useEffect(() => {
  // Thêm logic xử lý bộ đếm ngược
    let timerId: NodeJS.Timeout;
    
    const calculateTimeRemaining = () => {
      // Nếu có thời gian hết hạn từ params
      if (endDate) {
        const expTime = new Date(endDate).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((expTime - now) / 1000)); // Đổi thành giây và không âm
        return diff;
      }
      
      // Fallback nếu không có endDate
      // Mặc định 5 phút nếu không có thông tin
      return 300;
    };
    
    // Khởi tạo ban đầu
    setTimeRemaining(calculateTimeRemaining());
    
    // Cập nhật mỗi giây
    timerId = setInterval(() => {
      setTimeRemaining((prevTime) => {
        const newTime = prevTime - 1;
        
        // Thay đổi màu khi còn ít thời gian
        if (newTime <= 60) { // Dưới 1 phút
          setTimerColor('#ef4444'); // Đỏ
        } else if (newTime <= 120) { // Dưới 2 phút
          setTimerColor('#f59e0b'); // Cam
        }
        
        // Khi hết thời gian
        if (newTime <= 0) {
          clearInterval(timerId);
          
          // Xóa thông tin booking tạm thời khi hết hạn
          AsyncStorage.removeItem('pending_booking')
            .then(() => console.log('Đã xóa booking tạm thời do hết hạn'))
            .catch(err => console.error('Lỗi khi xóa booking tạm thời:', err));
          
          // Thông báo hết thời gian và quay về màn hình trước
          Alert.alert(
            'Hết thời gian thanh toán',
            'Đã hết thời gian thanh toán. Chỗ đặt của bạn đã bị hủy.',
            [
              { 
                text: 'Đã hiểu', 
                onPress: () => navigation.goBack() 
              }
            ]
          );
          
          // Gọi API hủy booking và giải phóng biển số xe
          try {
            // Gọi API hủy booking
            if (bookingId && licensePlate) {
              api.Booking.expireBooking(bookingId, licensePlate)
                .then(response => {
                  if (response.success) {
                    console.log('Đã hủy booking và giải phóng biển số xe:', licensePlate);
                    
                    // Đảm bảo xóa biển số xe khỏi AsyncStorage nếu đã lưu
                    AsyncStorage.removeItem('booking_license_plate');
                    AsyncStorage.removeItem('license_plate');
                  } else {
                    console.error('Lỗi khi hủy booking:', response.message);
                  }
                });
            }
          } catch (err) {
            console.error('Lỗi khi giải phóng biển số xe:', err);
          }
          
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    // Dọn dẹp khi unmount
    return () => clearInterval(timerId);
  }, [endDate, bookingId, navigation, licensePlate]);
  
  // Hàm format thời gian từ giây sang MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
          
          // Xử lý khi thanh toán thành công
  const handleSuccessfulPayment = async (paymentMethod: string = 'vnpay') => {
    try {
      // Gọi API xác nhận thanh toán
      const { success, message } = await api.post('/bookings/confirm-payment', {
        bookingId: bookingId || '',
        paymentStatus: 'completed',
        paymentMethod: paymentMethod
      });
      
      if (success) {
        // Lưu thông tin đặt chỗ vào AsyncStorage để xem lại sau này
        const bookingInfo = {
          bookingId: bookingId || '',
          spotCode: spotCode || '',
          zoneId: zoneId || '',
          bookingDate: bookingDate || '',
          startTime: startTime || '',
          endTime: endTime || '',
          duration: duration || '',
          bookingType: bookingTypeValue || 'daily',
          totalPrice: spotPrice || 0,
          licensePlate: licensePlate || '',
          phoneNumber: phoneNumber || '',
          timestamp: new Date().toISOString(),
          paymentMethod: paymentMethod
        };
        
        await AsyncStorage.setItem('last_booking', JSON.stringify(bookingInfo));
        
        // Xóa booking tạm thời vì đã thanh toán thành công
        await AsyncStorage.removeItem('pending_booking');
        
        // Hiển thị thông báo thành công và chuyển hướng
        Alert.alert(
          'Thanh toán thành công',
          'Cảm ơn bạn đã đặt chỗ. Bạn có muốn xem thông tin đặt chỗ không?',
          [
            {
              text: 'Xem thông tin',
              onPress: () => {
                navigation.replace('BookingConfirmationScreen', {
                  bookingId: bookingId || '',
                  spotCode: spotCode || '',
                  zoneId: zoneId || '',
                  phoneNumber: phoneNumber || '',
                  bookingDate: bookingDate || '',
                  startTime: startTime || '',
                  endTime: endTime || '',
                  duration: duration || '',
                  bookingType: bookingTypeValue || undefined,
                  totalPrice: spotPrice || 0,
                  licensePlate: licensePlate || ''
                });
              }
            },
            {
              text: 'Đóng',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', message || 'Không thể xác nhận thanh toán. Vui lòng liên hệ CSKH.');
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      Alert.alert('Lỗi', `Không thể xác nhận thanh toán: ${error.message}`);
    }
  };
  
  // Hàm để tạo thanh toán qua VNPAY
  const createVNPayPayment = async () => {
    try {
      setIsLoadingQR(true);
      
      // Tạo thông tin đặt hàng
      const orderInfo = `Thanh toán đặt chỗ ${spotCode} - ${bookingDate || 'Không có ngày'}`;
      
      // Gọi API tạo thanh toán VNPAY qua backend
      const paymentUrl = await vnpayApi.createVNPayPayment(
        spotPrice, 
        orderInfo, 
        bookingId
      );
      
      console.log('Nhận được URL thanh toán VNPAY:', paymentUrl);
      
      // Lưu URL thanh toán
      setVnpayUrl(paymentUrl);
      
      // Mở URL thanh toán
      if (paymentUrl) {
        await openVNPayWebsite(paymentUrl);
        
        // Thêm lắng nghe URL để bắt callback từ VNPAY
        const urlListener = Linking.addEventListener('url', async (event) => {
          try {
            // Xử lý URL callback từ VNPAY
            const { url } = event;
            
            console.log('=== VNPAY DEEP LINK RECEIVED ===');
            console.log('Deep link received:', url);
            
            // Phân tích URL để lấy các tham số
            if (url.includes('payment-result')) {
              console.log('URL đầy đủ:', url);
              
              // Trích xuất query parameters từ URL
              const urlObj = new URL(url);
              const searchParams = urlObj.search;
              console.log('Search params:', searchParams);
              
              const params = queryString.parse(searchParams);
              console.log('VNPAY callback params:', JSON.stringify(params, null, 2));
              
              // Check for required VNPAY parameters
              if (params.vnp_ResponseCode) {
                console.log('Tìm thấy mã phản hồi VNPAY:', params.vnp_ResponseCode);
                
                // Xử lý kết quả thanh toán
                const success = await vnpayApi.handleVNPayReturn(params);
                if (success) {
                  console.log('Xử lý thanh toán VNPAY thành công!');
                  await handleSuccessfulPayment('vnpay');
                } else {
                  console.error('Xử lý thanh toán VNPAY thất bại!');
                  Alert.alert('Thông báo', 'Thanh toán không thành công hoặc bị hủy. Vui lòng thử lại sau.');
                }
              } else {
                console.error('Không tìm thấy mã phản hồi VNPAY trong URL callback!');
                Alert.alert('Lỗi', 'Dữ liệu thanh toán không hợp lệ. Vui lòng thử lại.');
              }
              
              // Gỡ bỏ lắng nghe
              urlListener.remove();
            }
          } catch (error) {
            console.error('Error handling deep link:', error);
          }
        });
        
        // Bắt đầu kiểm tra trạng thái thanh toán định kỳ
        console.log('=== VNPAY PAYMENT STATUS POLLING STARTED ===');
        console.log('Bắt đầu kiểm tra trạng thái thanh toán cho booking:', bookingId);
        
        const checkInterval = setInterval(async () => {
      try {
            console.log('Đang kiểm tra trạng thái thanh toán VNPAY...');
            const status = await vnpayApi.checkPaymentStatus(bookingId);
            console.log('Kết quả kiểm tra trạng thái:', JSON.stringify(status, null, 2));
            
            if (status && status.success) {
              // Kiểm tra đúng cấu trúc dữ liệu trả về
              const paymentData = status.data || status;
              const isCompleted = 
                (paymentData.paymentStatus === 'completed') || 
                (paymentData.status === 'confirmed') || 
                (paymentData.isPaymentCompleted === true);
              
              if (isCompleted) {
                console.log('=== VNPAY PAYMENT COMPLETED DETECTED ===');
                console.log('Thanh toán đã hoàn tất, dừng kiểm tra và xác nhận thanh toán');
                clearInterval(checkInterval);
                urlListener.remove(); // Gỡ bỏ lắng nghe nếu thanh toán thành công
                await handleSuccessfulPayment('vnpay');
              } else {
                console.log('Thanh toán chưa hoàn tất, tiếp tục chờ...');
              }
            } else {
              console.log('Kiểm tra trạng thái không thành công, tiếp tục chờ...');
            }
          } catch (error) {
            console.error('Lỗi khi kiểm tra trạng thái thanh toán:', error);
          }
        }, 5000); // Kiểm tra mỗi 5 giây
        
        // Dừng kiểm tra sau 5 phút
        setTimeout(() => {
          console.log('=== VNPAY PAYMENT TIMEOUT ===');
          console.log('Đã hết thời gian chờ thanh toán, dừng kiểm tra');
          clearInterval(checkInterval);
          urlListener.remove(); // Gỡ bỏ lắng nghe sau 5 phút
        }, 5 * 60 * 1000);
      } else {
        Alert.alert('Lỗi', 'Không thể tạo URL thanh toán VNPAY');
      }
    } catch (error: any) {
      console.error('Error creating VNPAY payment:', error);
      Alert.alert('Lỗi', `Không thể tạo thanh toán VNPAY: ${error.message || 'Lỗi không xác định'}`);
    } finally {
      setIsLoadingQR(false);
      setIsProcessing(false);
    }
  };
  
  // Hàm mở trang web VNPAY
  const openVNPayWebsite = async (url: string) => {
    try {
      console.log('Mở URL thanh toán VNPAY:', url);
      const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
        await Linking.openURL(url);
    } else {
          Alert.alert(
          'Không thể mở URL',
          'Không thể mở trang thanh toán VNPAY. Vui lòng thử lại sau.'
          );
        }
      } catch (error) {
      console.error('Error opening VNPAY website:', error);
      Alert.alert('Lỗi', 'Không thể mở trang thanh toán VNPAY');
    }
  };
  
  const handlePaymentMethod = async (method: string) => {
    try {
      setIsProcessing(true);
      
      if (method === 'VNPAY') {
        // Xử lý thanh toán VNPAY
        await createVNPayPayment();
      } else {
      // Lấy thông tin user từ AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      // Giả lập quá trình thanh toán
        setTimeout(() => {
          Alert.alert(
            'Quét mã QR',
            `Vui lòng quét mã QR bằng ứng dụng ${method} để thanh toán.`,
            [
              {
                text: 'Đã thanh toán',
                onPress: async () => {
                  try {
                    // Gọi API xác nhận thanh toán
                    const { success, message } = await api.post<PaymentResponse>('/bookings/confirm-payment', {
                      bookingId: bookingId || '',
                      paymentStatus: 'completed'
                    });
                    
                    console.log('Payment confirmation response:', { success, message });
                    
                    if (success) {
                      // Lưu thông tin đặt chỗ vào AsyncStorage để xem lại sau này
                        const bookingInfo = {
                          bookingId: bookingId || '',
                          spotCode: spotCode || '',
                          zoneId: zoneId || '',
                          bookingDate: bookingDate || '',
                          startTime: startTime || '',
                          endTime: endTime || '',
                          duration: duration || '',
                        bookingType: bookingTypeValue || 'daily',
                          totalPrice: spotPrice || 0,
                          licensePlate: licensePlate || '',
                        phoneNumber: phoneNumber || '',
                        timestamp: new Date().toISOString(),
                        paymentMethod: method
                        };
                        
                        await AsyncStorage.setItem('last_booking', JSON.stringify(bookingInfo));
                      await AsyncStorage.removeItem('pending_booking');
                      
                      Alert.alert(
                        'Thanh toán thành công',
                        'Bạn có muốn xem thông tin đặt chỗ không?',
                        [
                          {
                            text: 'Xem thông tin',
                            onPress: () => {
                              navigation.replace('BookingConfirmationScreen', {
                                bookingId: bookingId || '',
                                spotCode: spotCode || '',
                                zoneId: zoneId || '',
                                phoneNumber: phoneNumber || '',
                                bookingDate: bookingDate || '',
                                startTime: startTime || '',
                                endTime: endTime || '',
                                duration: duration || '',
                                bookingType: bookingTypeValue || undefined,
                                totalPrice: spotPrice || 0,
                                licensePlate: licensePlate || ''
                              });
                            }
                          },
                          {
                            text: 'Đóng',
                            style: 'cancel'
                          }
                        ]
                      );
                    } else {
                      Alert.alert('Lỗi', message || 'Không thể xác nhận thanh toán. Vui lòng thử lại.');
                    }
                  } catch (error: any) {
                    Alert.alert('Lỗi', error?.message || 'Không thể xác nhận thanh toán.');
                  }
                }
              },
              {
                text: 'Hủy',
                style: 'cancel',
                onPress: async () => {
                  try {
                    if (bookingId && licensePlate) {
                      const response = await api.Booking.cancelBooking(bookingId, licensePlate);
                      
                      if (response.success) {
                        await AsyncStorage.removeItem('pending_booking');
                        await AsyncStorage.removeItem('booking_license_plate');
                        await AsyncStorage.removeItem('license_plate');
                        
                        console.log('Đã hủy booking và giải phóng biển số xe');
                      } else {
                        throw new Error(response.message);
                      }
                    }
                    
                    navigation.goBack();
                  } catch (error: any) {
                    console.error('Lỗi khi hủy booking:', error);
                    Alert.alert('Lỗi', error.message || 'Không thể hủy đặt chỗ. Vui lòng thử lại sau.');
                  }
                }
              }
            ]
          );
      }, 1500);
      }
    } catch (error: any) {
      console.error('Lỗi khi xử lý thanh toán:', error);
      Alert.alert('Lỗi', 'Không thể xử lý thanh toán. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Thêm effect để kiểm tra trạng thái thanh toán khi quay lại app
  useEffect(() => {
    // Xử lý khi app thay đổi trạng thái (background -> active)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App vừa quay lại từ background!');
        
        try {
          // Kiểm tra xem có đang trong tiến trình thanh toán VNPAY không
          const currentBookingId = await AsyncStorage.getItem('current_vnpay_booking');
          
          if (currentBookingId) {
            console.log('Đang kiểm tra thanh toán cho booking:', currentBookingId);
            setIsProcessing(true);
            
            // Gọi API kiểm tra trạng thái thanh toán mới
            const response = await vnpayApi.checkPaymentStatus(currentBookingId);
            
            if (response && response.success) {
              // Kiểm tra đúng cấu trúc dữ liệu trả về
              const paymentData = response.data || response;
              const isCompleted = 
                (paymentData.paymentStatus === 'completed') || 
                (paymentData.status === 'confirmed') || 
                (paymentData.isPaymentCompleted === true);
              
              if (isCompleted) {
                console.log('Thanh toán đã hoàn tất!');
                await vnpayApi.processPaymentResult(currentBookingId);
                await handleSuccessfulPayment('vnpay');
              } else {
                console.log('Thanh toán chưa hoàn tất hoặc lỗi');
                Alert.alert(
                  'Thông báo',
                  'Chưa nhận được xác nhận thanh toán. Nếu bạn đã thanh toán, vui lòng đợi trong giây lát.',
                  [{ text: 'OK' }]
                );
              }
            }
            
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Lỗi khi kiểm tra trạng thái thanh toán:', error);
          setIsProcessing(false);
        }
      }
      
      setAppState(nextAppState);
    });

    // Clean up khi component unmount
    return () => {
      subscription.remove();
    };
  }, [appState]);
  
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
        
        {/* Hiển thị đếm ngược */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Thời gian thanh toán:</Text>
          <Text style={[styles.timerValue, { color: timerColor }]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle}>Thông tin đặt chỗ</Text>
      
          <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đặt chỗ:</Text>
            <Text style={styles.infoValue}>{bookingId}</Text>
          </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vị trí:</Text>
              <Text style={styles.infoValue}>{spotCode}, Khu {zoneId}</Text>
            </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại vé:</Text>
              <Text style={styles.infoValue}>{bookingTypeValue === 'monthly' ? 'Vé tháng' : bookingTypeValue === 'daily' ? 'Vé ngày' : 'Không xác định'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày đặt:</Text>
              <Text style={styles.infoValue}>{bookingDate}</Text>
            </View>
            {bookingTypeValue === 'monthly' ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời hạn:</Text>
                <Text style={styles.infoValue}>{`${bookingDate} - ${endDate}`}</Text>
          </View>
            ) : (
              <>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian:</Text>
                  <Text style={styles.infoValue}>{`${startTime} - ${endTime}`}</Text>
          </View>
          {duration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời lượng:</Text>
              <Text style={styles.infoValue}>{duration}</Text>
            </View>
          )}
              </>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Biển số xe:</Text>
              <Text style={styles.infoValue}>{licensePlate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
              <Text style={styles.infoValue}>{phoneNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng tiền:</Text>
              <Text style={[styles.infoValue, styles.priceText]}>{displayPrice.toLocaleString('vi-VN')} {currency}</Text>
            </View>
          </View>
        </View>
        
          <>
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
                onPress={() => handlePaymentMethod('VNPAY')}
            >
                <View style={[styles.paymentIcon, styles.vnpayIcon]}>
                  <Text style={{fontSize: 24}}>💳</Text>
              </View>
              <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>VNPAY</Text>
                  <Text style={styles.paymentDescription}>Thanh toán qua VNPAY</Text>
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
          </>
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
  infoContainer: {
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
  priceText: {
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  timerLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // VNPAY specific styles
  vnpayIcon: {
    backgroundColor: '#e5f3ff',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  debugInfo: {
    marginBottom: 12,
  },
  debugText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PaymentScreen;