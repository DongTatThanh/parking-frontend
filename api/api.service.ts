import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenHelper } from '../utils/tokenHelper';

// API Base URL
const API_BASE_URL = 'http://192.168.169.161/api';
// Common API response type
export interface ApiResponse<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

// API service class for handling all API requests
export class ApiService {
  private static instance: ApiService;
  private isRefreshing = false;
  private failedQueue: any[] = [];

  constructor() {
    this.setupInterceptors();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    axios.interceptors.request.use(
      async (config) => {
        if (!config.headers.Authorization) {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // Handle 401 (Unauthorized) errors
        if (error.response?.status === 401 && originalRequest) {
          if (error.response.data.message.includes('expired')) {
            // If token refresh is not already in progress
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              
              try {
                // Try to refresh token
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                if (refreshToken) {
                  const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken
                  });
                  
                  if (response.data.success) {
                    const newToken = response.data.data.token;
                    await AsyncStorage.setItem('token', newToken);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    
                    // Process failed requests queue
                    this.processQueue(null, newToken);
                    
                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return axios(originalRequest);
                  }
                }
                
                // If refresh token fails, clear auth data
                await AsyncStorage.multiRemove(['token', 'refreshToken', 'user', 'userInfo']);
                this.processQueue(new Error('Token refresh failed'));
                return Promise.reject(error);
              } catch (refreshError) {
                // Handle refresh token error
                await AsyncStorage.multiRemove(['token', 'refreshToken', 'user', 'userInfo']);
                this.processQueue(refreshError);
                return Promise.reject(refreshError);
              } finally {
                this.isRefreshing = false;
              }
            } else {
              // Add request to queue if refresh is already in progress
              return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject, request: originalRequest });
              });
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token = null): void {
    this.failedQueue.forEach(item => {
      if (error) {
        item.reject(error);
      } else {
        item.request.headers.Authorization = `Bearer ${token}`;
        item.resolve(axios(item.request));
      }
    });
    this.failedQueue = [];
  }

  private formatError(error: any): string {
    if (error.response) {
      // Server responded with an error status
      const data = error.response.data;
      return data.message || 'Server error occurred';
    } else if (error.request) {
      // Request was made but no response received
      return 'No response from server. Please check your connection.';
    } else {
      // Error setting up the request
      return error.message || 'An unexpected error occurred';
    }
  }

  // Generic GET request
  public async get<T>(endpoint: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`GET request to: ${url}`);
      
      const response: AxiosResponse<ApiResponse<T>> = await axios.get(
        url,
        { params, ...config }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error in GET request to ${endpoint}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Generic POST request
  public async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`POST request to: ${url}`);
      
      const response: AxiosResponse<ApiResponse<T>> = await axios.post(
        url,
        data,
        config
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error in POST request to ${endpoint}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Generic PUT request
  public async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`PUT request to: ${url}`);
      
      const response: AxiosResponse<ApiResponse<T>> = await axios.put(
        url,
        data,
        config
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error in PUT request to ${endpoint}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Generic DELETE request
  public async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`DELETE request to: ${url}`);
      
      const response: AxiosResponse<ApiResponse<T>> = await axios.delete(
        url,
        config
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error in DELETE request to ${endpoint}:`, error);
      throw new Error(this.formatError(error));
    }
  }
} 