import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL của server API
const BASE_URL = 'http://172.20.10.4:3000/api';

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
  
  // Lấy instance gốc của Axios nếu cần
  axiosInstance
};

export default api;
