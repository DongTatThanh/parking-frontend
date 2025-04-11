export type RootStackParamList = {
  
  
  BookingScreen: {
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
  };
 
  BarkingLayoutScreen: { 
    zoneId: string,
    totalSpots: number;
    availableSpots: number;
   };
  PaymentScreen: {
    spotId: string;
    bookingCode?: string;
    userName?: string;
    phone?: string;
    bookingTime?: string;
    ticketType?: string;
    expiryTime?: string;
    totalAmount?: number;
  };
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
  ChooseTime: undefined;
  
    
  
};

export type BottomTabParamList = {
  HomeScreen: undefined;
  HistorySreen: undefined;
  NotificationScreen: undefined;
  ProfileScreen: undefined;
};
