import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Định nghĩa URL base cho API
// const BASE_URL = 'http://192.168.0.101:3000/api';
const BASE_URL = 'http://192.168.169.161:3000/api';
// Fallback URL nếu CloudFront chặn request
const DIRECT_BASE_URL = 'http://192.168.169.161:3000/api';

// Định nghĩa các interface để làm việc với API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Tạo API Service
class ApiService {
  axiosInstance: AxiosInstance;
  directAxiosInstance: AxiosInstance;

  constructor() {
    // Tạo instance chính
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Tạo instance trực tiếp (không qua CloudFront)
    this.directAxiosInstance = axios.create({
      baseURL: DIRECT_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  // Cài đặt interceptors để xử lý token và lỗi
  private setupInterceptors() {
    // Request interceptor để thêm token vào mỗi request
    const setupRequestInterceptor = (instance: AxiosInstance) => {
      instance.interceptors.request.use(
        async (config) => {
          try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
              if (!config.headers) {
                config.headers = {} as AxiosRequestHeaders;
              }
              // Đặt token trong header
              config.headers['Authorization'] = `Bearer ${token}`;
              console.log('Token added to request:', token.substring(0, 15) + '...');
            } else {
              console.log('No token found in AsyncStorage');
            }
          } catch (error) {
            console.error('Error retrieving token:', error);
          }
          return config;
        },
        (error) => {
          console.error('Request Interceptor Error:', error);
          return Promise.reject(error);
        }
      );
    };

    // Response interceptor để xử lý lỗi chung
    const setupResponseInterceptor = (instance: AxiosInstance) => {
      instance.interceptors.response.use(
        (response) => {
          return response.data;
        },
        async (error) => {
          console.error('Response Interceptor Error:', error.response?.data || error.message);
          
          // Xử lý lỗi token hết hạn
          if (error.response?.status === 401) {
            const errorMsg = error.response?.data?.message;
            if (errorMsg && (
              errorMsg.includes('Phiên đăng nhập đã hết hạn') || 
              errorMsg.includes('Token expired') ||
              errorMsg.includes('Invalid token')
            )) {
              console.log('Token expired, clearing login info');
              await AsyncStorage.multiRemove(['token', 'user', 'userInfo']);
              // Xử lý chuyển hướng sẽ được thực hiện ở component
            }
          }
          
          return Promise.reject(error);
        }
      );
    };

    // Setup cho cả hai instance
    setupRequestInterceptor(this.axiosInstance);
    setupRequestInterceptor(this.directAxiosInstance);
    setupResponseInterceptor(this.axiosInstance);
    setupResponseInterceptor(this.directAxiosInstance);
  }

  // Phương thức GET
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<any, ApiResponse<T>>(url, { params });
      return response;
    } catch (error: any) {
      console.error(`GET request to ${url} failed:`, error);
      
      // Nếu bị lỗi 403 CloudFront, thử lại với URL trực tiếp
      if (error.response?.status === 403) {
        try {
          console.log(`Retrying GET request to ${url} with direct URL`);
          const directResponse = await this.directAxiosInstance.get<any, ApiResponse<T>>(url, { params });
          return directResponse;
        } catch (directError: any) {
          console.error(`Direct GET request to ${url} failed:`, directError);
          if (directError.response) {
            return directError.response.data;
          }
        }
      }
      
      if (error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Lỗi kết nối đến máy chủ',
        data: {} as T
      };
    }
  }

  // Phương thức POST
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<any, ApiResponse<T>>(url, data);
      return response;
    } catch (error: any) {
      console.error(`POST request to ${url} failed:`, error);
      
      // Nếu bị lỗi 403 CloudFront, thử lại với URL trực tiếp
      if (error.response?.status === 403) {
        try {
          console.log(`Retrying POST request to ${url} with direct URL`);
          const directResponse = await this.directAxiosInstance.post<any, ApiResponse<T>>(url, data);
          return directResponse;
        } catch (directError: any) {
          console.error(`Direct POST request to ${url} failed:`, directError);
          if (directError.response) {
            return directError.response.data;
          }
        }
      }
      
      if (error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Lỗi kết nối đến máy chủ',
        data: {} as T
      };
    }
  }

  // Phương thức PUT
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<any, ApiResponse<T>>(url, data);
      return response;
    } catch (error: any) {
      console.error(`PUT request to ${url} failed:`, error);
      
      // Nếu bị lỗi 403 CloudFront, thử lại với URL trực tiếp
      if (error.response?.status === 403) {
        try {
          console.log(`Retrying PUT request to ${url} with direct URL`);
          const directResponse = await this.directAxiosInstance.put<any, ApiResponse<T>>(url, data);
          return directResponse;
        } catch (directError: any) {
          console.error(`Direct PUT request to ${url} failed:`, directError);
          if (directError.response) {
            return directError.response.data;
          }
        }
      }
      
      if (error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Lỗi kết nối đến máy chủ',
        data: {} as T
      };
    }
  }

  // Phương thức DELETE
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<any, ApiResponse<T>>(url);
      return response;
    } catch (error: any) {
      console.error(`DELETE request to ${url} failed:`, error);
      
      // Nếu bị lỗi 403 CloudFront, thử lại với URL trực tiếp
      if (error.response?.status === 403) {
        try {
          console.log(`Retrying DELETE request to ${url} with direct URL`);
          const directResponse = await this.directAxiosInstance.delete<any, ApiResponse<T>>(url);
          return directResponse;
        } catch (directError: any) {
          console.error(`Direct DELETE request to ${url} failed:`, directError);
          if (directError.response) {
            return directError.response.data;
          }
        }
      }
      
      if (error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || 'Lỗi kết nối đến máy chủ',
        data: {} as T
      };
    }
  }

  // Refresh token method
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
        refreshToken
      });
      
      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
        return token;
      } else {
        throw new Error(response.data.message || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'user', 'userInfo']);
      throw error;
    }
  }
}

// Tạo instance của ApiService
const apiService = new ApiService();

// Tạo API cho booking
const bookingApi = {
  // Lấy danh sách khu vực
  getParkingZones<T>() {
    return apiService.get<T>('/bookings/zones');
  },

  // Lấy chi tiết khu vực
  getZoneDetails<T>(zoneId: string | number) {
    return apiService.get<T>(`/bookings/zones/${zoneId}`);
  },

  // Kiểm tra biển số xe - hỗ trợ cả GET và POST
  checkLicensePlate<T>(licensePlate: string, userId: number) {
    // Thử sử dụng GET (được phép qua CloudFront)
    try {
      return apiService.get<T>(`/bookings/check-license-plate?licensePlate=${encodeURIComponent(licensePlate)}&userId=${userId}`);
    } catch (error) {
      console.log('GET request failed, falling back to POST');
      return apiService.post<T>('/bookings/check-license-plate', { licensePlate, userId });
    }
  },

  // Tính giá booking
  calculatePrice<T>(data: { bookingType: 'daily' | 'monthly', startTime: string, endTime: string }) {
    return apiService.post<T>('/bookings/calculate-price', data);
  },

  // Tạo booking mới
  createBooking<T>(data: {
    userId: number;
    spotId: number;
    zoneId: string | number;
    bookingDate: string;
    startTime: string;
    endTime: string;
    duration: string;
    spotCode: string;
    totalPrice: number;
    currency: string;
    bookingType: 'daily' | 'monthly';
    licensePlate?: string;
    phoneNumber?: string;
    vehicleType?: string;
  }) {
    return apiService.post<T>('/bookings/create', data);
  },

  // Lấy booking của user
  getUserBookings<T>(userId: number) {
    return apiService.get<T>(`/bookings/user/${userId}`);
  },

  // Hủy booking
  cancelBooking<T>(bookingId: number, userId: number) {
    return apiService.post<T>(`/bookings/${bookingId}/cancel`, { userId });
  }
};

// Tạo API cho user/auth
const authApi = {
  // Đăng ký
  register<T>(data: {
    username: string;
    password: string;
    email: string;
    phone?: string;
    full_name?: string;
  }) {
    return apiService.post<T>('/auth/register', data);
  },

  // Đăng nhập
  login<T>(data: { username: string; password: string }) {
    return apiService.post<T>('/auth/login', data);
  },

  // Lấy thông tin user
  getUserInfo<T>() {
    return apiService.get<T>('/auth/user');
  },

  // Cập nhật thông tin user
  updateUserInfo<T>(data: { phone?: string; full_name?: string }) {
    return apiService.put<T>('/auth/user', data);
  },
  
  // Verify token validity
  verifyToken<T>() {
    return apiService.get<T>('/auth/verify-token');
  }
};

// Export các API và service
export default {
  ...bookingApi,
  get: apiService.get.bind(apiService),
  post: apiService.post.bind(apiService),
  put: apiService.put.bind(apiService),
  delete: apiService.delete.bind(apiService),
  refreshToken: apiService.refreshToken.bind(apiService),
  axiosInstance: apiService.axiosInstance,
  directAxiosInstance: apiService.directAxiosInstance,
  auth: authApi
};
