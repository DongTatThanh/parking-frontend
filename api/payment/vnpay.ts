import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import queryString from 'query-string';

// API endpoint của backend
const API_BASE_URL = 'http://192.168.0.100:3000/api';

// Cấu hình VNPAY
const VNPAY_RETURN_SCHEMA = 'parkingapp://payment-result';

// Hàm tạo yêu cầu thanh toán VNPAY
export const createVNPayPayment = async (
  amount: number,
  orderInfo: string,
  bookingId: string,
): Promise<string> => {
  try {
    console.log('Tạo thanh toán VNPAY cho booking:', bookingId);
    console.log('Chi tiết thanh toán:', { amount, orderInfo });
    
    // Gọi API backend để tạo thanh toán
    const response = await axios.post(`${API_BASE_URL}/payment/create-vnpay`, {
      bookingId: bookingId,
      amount: amount,
      orderInfo: orderInfo,
      returnUrl: VNPAY_RETURN_SCHEMA // Thêm returnUrl để backend biết URL callback
    });
    
    console.log('Response từ backend:', response.data);
    
    // Kiểm tra kết quả từ backend và xử lý cả hai định dạng response có thể nhận được
    if (response.data && response.data.success) {
      // Format 1: { success: true, paymentUrl: "..." }
      let paymentUrl = response.data.paymentUrl;
      
      // Format 2: { success: true, data: { paymentUrl: "..." } }
      if (!paymentUrl && response.data.data) {
        paymentUrl = response.data.data.paymentUrl;
      }
      
      if (!paymentUrl) {
        throw new Error('Không tìm thấy URL thanh toán trong response');
      }
      
      console.log('VNPAY Payment URL từ backend:', paymentUrl);
      
      // Lưu thông tin thanh toán và bookingId vào AsyncStorage để kiểm tra sau
      await AsyncStorage.setItem(`vnpay_payment_${bookingId}`, JSON.stringify({
        bookingId,
        amount,
        createdAt: new Date().toISOString()
      }));
      
      // Lưu bookingId hiện tại để kiểm tra khi quay lại app
      await AsyncStorage.setItem('current_vnpay_booking', bookingId);
      
      return paymentUrl;
    } else {
      throw new Error(response.data.message || 'Không thể tạo thanh toán VNPAY');
    }
  } catch (error: any) {
    console.error('Error creating VNPAY payment:', error);
    throw error;
  }
};

// Kiểm tra trạng thái thanh toán sử dụng API mới
export const checkPaymentStatus = async (bookingId: string): Promise<any> => {
  try {
    console.log('Kiểm tra trạng thái thanh toán cho booking:', bookingId);
    
    // Sử dụng API endpoint mới để kiểm tra trạng thái
    const response = await axios.get(`${API_BASE_URL}/payment/check-status/${bookingId}`);
    
    console.log('Kết quả kiểm tra trạng thái:', response.data);
    
    // Đảm bảo trả về đúng cấu trúc dữ liệu
    return response.data;
  } catch (error) {
    console.error('Error checking VNPAY payment status:', error);
    throw error;
  }
};

// Xử lý thông tin từ VNPAY trả về
export const handleVNPayReturn = async (responseData: any): Promise<boolean> => {
  try {
    console.log('Nhận được dữ liệu callback từ VNPAY:', responseData);
    
    // Với VNPAY, vnp_ResponseCode là '00' khi thanh toán thành công
    const vnp_ResponseCode = responseData.vnp_ResponseCode;
    const vnp_TxnRef = responseData.vnp_TxnRef; // Mã đơn hàng từ VNPAY 
    
    if (vnp_ResponseCode === '00') {
      // Thanh toán thành công
      // Tách bookingId từ vnp_TxnRef (theo logic backend)
      const bookingId = vnp_TxnRef?.substring(0, 8) || '';
      
      // Kiểm tra dữ liệu callback
      if (!bookingId) {
        console.error('Không thể xác định bookingId từ dữ liệu callback VNPAY');
        return false;
      }
      
      console.log('Xác định được bookingId:', bookingId);
      
      // Xác nhận thanh toán thành công
      return await processPaymentResult(bookingId);
    } else {
      // Thanh toán thất bại
      console.log('Payment failed with code:', vnp_ResponseCode);
      return false;
    }
  } catch (error) {
    console.error('Error handling VNPAY return:', error);
    return false;
  }
};

// Xử lý callback từ VNPAY
export const processPaymentResult = async (bookingId: string): Promise<boolean> => {
  try {
    console.log('Xử lý kết quả thanh toán cho booking:', bookingId);
    
    // Gọi API để xác nhận thanh toán thành công
    const response = await axios.post(`${API_BASE_URL}/bookings/confirm-payment`, {
      bookingId: bookingId,
      paymentStatus: 'completed',
      paymentMethod: 'vnpay'
    });
    
    if (response.data.success) {
      // Xóa thông tin thanh toán tạm thời
      await AsyncStorage.removeItem(`vnpay_payment_${bookingId}`);
      await AsyncStorage.removeItem('current_vnpay_booking');
      return true;
    } else {
      console.error('Payment confirmation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Error processing payment result:', error);
    return false;
  }
};

export default {
  createVNPayPayment,
  checkPaymentStatus,
  handleVNPayReturn,
  processPaymentResult
}; 