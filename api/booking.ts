import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL của server API
const BASE_URL = 'http:/192.168.0.100:3000/api';

// Interface cho API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Tạo instance Axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 giây
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor cho request - thêm token nếu có
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor cho response - xử lý lỗi, refresh token, etc.
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Xử lý khi server không phản hồi
    if (!error.response) {
      console.error('Network Error: Không thể kết nối đến server');
      return Promise.reject({
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
      });
    }

    // Xử lý Bad Request (400) - Biển số xe đã tồn tại
    if (error.response.status === 400) {
      console.error('Bad Request Error [400]:', error.response.data);
      
      // Hiển thị chi tiết lỗi
      const errorData = error.response.data as any;
      // Đảm bảo chuyển đổi đúng định dạng cho frontend
      return Promise.reject({
        success: false,
        message: errorData.message || 'Yêu cầu không hợp lệ, vui lòng kiểm tra lại thông tin'
      });
    }

    // Xử lý khi token hết hạn (401)
    if (error.response.status === 401 && originalRequest) {
      try {
        // Có thể thêm logic refresh token ở đây
        console.log('Token hết hạn, cần đăng nhập lại');
        
        // Xóa token cũ
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        
        // Redirect về trang login (cần triển khai thông qua context hoặc navigation)
        // Có thể sử dụng event emitter hoặc global state manager
        return Promise.reject({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
      } catch (refreshError) {
        console.error('Error refreshing auth token:', refreshError);
      }
    }

    // Log lỗi chi tiết
    console.error('API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      data: error.response?.data,
      message: error.message
    });

    // Đảm bảo trả về cấu trúc lỗi chuẩn cho frontend
    const errorResponseData = error.response?.data as any;
    return Promise.reject({
      success: false,
      message: 
        (typeof errorResponseData === 'object' && errorResponseData?.message) ||
        error.message ||
        'Có lỗi xảy ra'
    });
  }
);

// Helper functions
const api = {
  // GET request
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.get(url, { params })
      .then(response => response.data);
  },

  // POST request
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.post(url, data, config)
      .then(response => response.data);
  },

  // PUT request
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.put(url, data)
      .then(response => response.data);
  },

  // DELETE request
  delete: <T>(url: string): Promise<ApiResponse<T>> => {
    return axiosInstance.delete(url)
      .then(response => response.data);
  },
  
  // Vehicle functions
  Vehicle: {
    // Delete a vehicle by ID
    deleteVehicle: (vehicleId: number): Promise<ApiResponse<any>> => {
      console.log(`Calling API to delete vehicle ID: ${vehicleId}`);
      return axiosInstance.delete(`/vehicles/${vehicleId}`)
        .then(response => {
          console.log('Delete vehicle response:', response.data);
          return response.data;
        })
        .catch(error => {
          console.error('Error deleting vehicle:', error.response || error);
          // Return standardized error response
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi khi xóa biển số xe',
            data: null
          };
        });
    },
    
    // Giải phóng biển số xe khi hủy booking
    releaseLicensePlate: (licensePlate: string): Promise<ApiResponse<any>> => {
      console.log(`Calling API to release license plate: ${licensePlate}`);
      return axiosInstance.post('/vehicles/release', { licensePlate })
        .then(response => {
          console.log('Release license plate response:', response.data);
          return response.data;
        })
        .catch(error => {
          console.error('Error releasing license plate:', error.response || error);
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi khi giải phóng biển số xe',
            data: null
          };
        });
    }
  },
  
  // Booking functions
  Booking: {
    // Hủy booking khi người dùng chủ động hủy
    cancelBooking: (bookingId: string, licensePlate?: string): Promise<ApiResponse<any>> => {
      console.log(`Calling API to cancel booking ID: ${bookingId}`);
      return axiosInstance.post('/bookings/cancel', { 
        bookingId,
        releaseLicensePlate: !!licensePlate,
        licensePlate
      })
        .then(response => {
          console.log('Cancel booking response:', response.data);
          return response.data;
        })
        .catch(error => {
          console.error('Error cancelling booking:', error.response || error);
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi khi hủy đặt chỗ',
            data: null
          };
        });
    },
    
    // Đánh dấu booking hết hạn khi quá 5 phút không thanh toán
    expireBooking: (bookingId: string, licensePlate?: string): Promise<ApiResponse<any>> => {
      console.log(`Calling API to expire booking ID: ${bookingId}`);
      return axiosInstance.post('/bookings/expire', { 
        bookingId,
        releaseLicensePlate: !!licensePlate,
        licensePlate
      })
        .then(response => {
          console.log('Expire booking response:', response.data);
          return response.data;
        })
        .catch(error => {
          console.error('Error expiring booking:', error.response || error);
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi khi xử lý booking hết hạn',
            data: null
          };
        });
    }
  },
  
  // Lấy instance gốc của Axios nếu cần
  axiosInstance
};

export default api;
