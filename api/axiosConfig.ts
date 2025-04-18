import axios from 'axios';

// Cấu hình mặc định cho axios
const instance = axios.create({
  baseURL: 'http://192.168.0.101:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Xử lý lỗi request
instance.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Xử lý lỗi response
instance.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });

    // Kiểm tra cấu trúc response
    if (response.data && typeof response.data === 'object') {
      // Nếu response có cấu trúc { success, data }
      if ('success' in response.data) {
        if (response.data.success) {
          return response.data;
        } else {
          throw new Error(response.data.message || 'Yêu cầu thất bại');
        }
      }
      // Nếu response là data trực tiếp
      return response.data;
    }
    
    return response;
  },
  (error) => {
    console.error('Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Kiểm tra lỗi mạng
    if (!error.response) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
    }

    // Lấy thông báo lỗi từ response của server
    const errorMessage = 
      error.response.data.error || 
      error.response.data.message || 
      (error.response.data.data && error.response.data.data.message);

    // Xử lý các mã lỗi HTTP
    switch (error.response.status) {
      case 400:
        throw new Error(errorMessage || 'Yêu cầu không hợp lệ');
      case 401:
        // Xử lý các lỗi xác thực
        if (errorMessage && errorMessage.includes('Tài khoản không tồn tại')) {
          throw new Error('Tài khoản không tồn tại');
        } else if (errorMessage && errorMessage.includes('Mật khẩu không đúng')) {
          throw new Error('Mật khẩu không đúng');
        } else {
          throw new Error(errorMessage || 'Lỗi xác thực');
        }
      case 403:
        throw new Error(errorMessage || 'Bạn không có quyền truy cập');
      case 404:
        throw new Error(errorMessage || 'Không tìm thấy tài nguyên yêu cầu');
      case 500:
        throw new Error(errorMessage || 'Lỗi máy chủ. Vui lòng thử lại sau');
      default:
        throw new Error(errorMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại');
    }
  }
);

export default instance; 