export type RootStackParamList = {
  
  
  BookingScreen: undefined;
  BarkingLayoutScreen: { zoneId: string };
  PaymentScreen: { spotId: string; amount: number; duration: string };
  ServicesScreen: { id: string };
  BookingConfirmationScreen:{
    spotId: string; 
    bookingCode: string;
    userName: string;
    phone: string;
    bookingTime: string; 
    ticketType: string;
    expiryTime: string;
    totalAmount: number;
  
  }
  HomeScreen:undefined;
  InsuranceScreen: undefined;
  AboutScreen: undefined;
  SpecialOffersScreen: undefined;
  
    
  
};

export type BottomTabParamList = {
  HomeScreen: undefined;
  HistorySreen: undefined;
  NotificationScreen: undefined;
  ProfileScreen: undefined;
};
