import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CommonActions } from '@react-navigation/native';
import { Base64 } from 'js-base64';

// Helper utility for token management
export const TokenHelper = {
  /**
   * Update token in Axios headers
   */
  async updateTokenInHeaders(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Token updated in headers');
        return token;
      } else {
        console.log('No token found to update headers');
        return null;
      }
    } catch (error) {
      console.error('Error updating token in headers:', error);
      return null;
    }
  },

  /**
   * Decode JWT payload (without verification)
   */
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      const jsonPayload = Base64.decode(base64Url);
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Check token expiration
   */
  checkTokenExpiration(token: string): { isExpired: boolean, expiresIn: number } {
    try {
      const decodedToken = this.decodeToken(token);
      if (!decodedToken || !decodedToken.exp) {
        return { isExpired: true, expiresIn: 0 };
      }

      const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeDiff = expirationTime - currentTime;
      
      return {
        isExpired: timeDiff <= 0,
        expiresIn: Math.floor(timeDiff / 1000) // Convert to seconds
      };
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return { isExpired: true, expiresIn: 0 };
    }
  },

  /**
   * Debug token details
   */
  async debugToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        console.log('Token found in AsyncStorage');
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 20) + '...');
        
        const currentAuthHeader = axios.defaults.headers.common['Authorization'];
        console.log('Current Authorization header:', currentAuthHeader ? 'Present' : 'Not set');
        
        const { isExpired, expiresIn } = this.checkTokenExpiration(token);
        console.log('Token expired:', isExpired);
        console.log('Token expires in:', expiresIn, 'seconds');
        
        const decodedToken = this.decodeToken(token);
        console.log('Token payload:', decodedToken);
      } else {
        console.log('No token found in AsyncStorage');
      }
    } catch (error) {
      console.error('Error debugging token:', error);
    }
  },

  /**
   * Clear authentication data and navigate to login
   */
  async clearAuthAndNavigateToLogin(navigation: any): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'user', 'userInfo']);
      console.log('Auth data cleared');
      
      // Reset navigation to login screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  /**
   * Validate token and handle expiration
   */
  async validateToken(navigation: any): Promise<boolean> {
    try {
      const token = await this.updateTokenInHeaders();
      if (!token) {
        console.log('No token found, navigating to login');
        this.clearAuthAndNavigateToLogin(navigation);
        return false;
      }
      
      const { isExpired, expiresIn } = this.checkTokenExpiration(token);
      if (isExpired) {
        console.log('Token expired, clearing auth and navigating to login');
        this.clearAuthAndNavigateToLogin(navigation);
        return false;
      }
      
      if (expiresIn < 3600) { // Less than 1 hour remaining
        console.log('Token expires soon:', expiresIn, 'seconds remaining');
      }
      
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }
}; 