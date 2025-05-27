import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {

  BookingScreen: {
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    monthlyStartDate?: string;
    selectedSpotId?: number;
    selectedZoneId?: string;
    selectedSpotCode?: string;
    action?: 'proceed_to_payment';
    ticketType?: 'daily' | 'monthly';
    selectedTimeSlots?: string;
    selectedTimeSlotNames?: string;
    pricePerSpot?: number;
  };
  ChooseTime: {
    type: 'daily' | 'monthly';
  };
  BarkingLayoutScreen: {
    zoneId: string;
    totalSpots: number;
    availableSpots: number;
    zoneData: string;
    pricePerHour?: number;
    bookingDate?: string;
    monthlyStartDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    totalPrice?: number;
    priceId?: number;
    bookingType?: 'daily' | 'monthly';
  };
  PaymentScreen: {
    bookingId: string;
    totalPrice: number;
    currency: string;
    spotCode: string;
    zoneId: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    bookingType?: 'daily' | 'monthly';
    licensePlate?: string;
    phoneNumber?: string;
    qrCodeData?: string;
    endDate?: string;
  };
  PaymentResultScreen: {
    vnp_ResponseCode?: string;
    vnp_TxnRef?: string;
    vnp_Amount?: string;
    vnp_BankCode?: string;
    vnp_PayDate?: string;
    vnp_OrderInfo?: string;
    vnp_TransactionNo?: string;
    orderId?: string;
    amount?: string;
    message?: string;
  };
  BookingConfirmationScreen: {
    bookingId: string;
    spotCode: string;
    zoneId: string;
    userName?: string;
    phoneNumber?: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    bookingType?: 'daily' | 'monthly';
    totalPrice?: number;
    licensePlate?: string;
  };
  HomeScreen: undefined;
  InsuranceScreen: undefined;
  AboutScreen: undefined;
  SpecialOffersScreen: undefined;
  HomeTab: undefined;
  ProfileTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  RegisterScreen: undefined;
  LoginScreen: undefined;
  ForgetPasswordScreen: undefined;
  TabNavigator: undefined;

  ServicesScreen: {id: string};


  };
  
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
  Settings: undefined;
};
export type BookingStackParamList = {
  BookingScreen: {
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    monthlyStartDate?: string;
    selectedSpotId?: number;
    selectedZoneId?: string;
    selectedSpotCode?: string;
    action?: 'proceed_to_payment';
    ticketType?: 'daily' | 'monthly';
    selectedTimeSlots?: string;
    selectedTimeSlotNames?: string;
    pricePerSpot?: number;
  };
};
