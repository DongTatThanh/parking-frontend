import { ApiService, ApiResponse } from './api.service';

// Booking API interfaces
export interface CreateBookingRequest {
  spotId: string;
  zoneId: string;
  vehicleId?: string;
  licensePlate?: string;
  startTime: string;
  endTime: string;
  price: number;
  bookingType: string;
  phoneNumber?: string;
  note?: string;
}

export interface Booking {
  id: string;
  userId: string;
  spotId: string;
  zoneId: string;
  vehicleId?: string;
  licensePlate: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: string;
  bookingType: string;
  phoneNumber?: string;
  note?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilterParams {
  status?: string;
  zoneId?: string;
  startDate?: string;
  endDate?: string;
  licensePlate?: string;
  bookingType?: string;
  page?: number;
  limit?: number;
}

export interface BookingPriceRequest {
  spotId?: string;
  zoneId: string;
  startTime: string;
  endTime: string;
  bookingType: string;
}

export interface BookingPriceResponse {
  price: number;
  currency: string;
  breakdown?: {
    basePrice: number;
    discountAmount?: number;
    taxAmount?: number;
    additionalFees?: { name: string; amount: number }[];
  };
}

// Booking API class
export class BookingApi {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  // Create a new booking
  public async createBooking(data: CreateBookingRequest): Promise<ApiResponse<Booking>> {
    return this.apiService.post<Booking>('/bookings/create', data);
  }

  // Calculate price for a booking
  public async calculatePrice(data: BookingPriceRequest): Promise<ApiResponse<BookingPriceResponse>> {
    return this.apiService.post<BookingPriceResponse>('/bookings/calculate-price', data);
  }

  // Get a specific booking by ID
  public async getBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.apiService.get<Booking>(`/bookings/${id}`);
  }

  // Get all bookings for the current user
  public async getMyBookings(params?: BookingFilterParams): Promise<ApiResponse<{ bookings: Booking[], total: number }>> {
    return this.apiService.get<{ bookings: Booking[], total: number }>('/bookings/my-bookings', { params });
  }

  // Update a booking
  public async updateBooking(id: string, data: Partial<CreateBookingRequest>): Promise<ApiResponse<Booking>> {
    return this.apiService.put<Booking>(`/bookings/${id}`, data);
  }

  // Cancel a booking
  public async cancelBooking(id: string, reason?: string): Promise<ApiResponse<Booking>> {
    return this.apiService.post<Booking>(`/bookings/${id}/cancel`, { reason });
  }

  // Check in for a booking
  public async checkInBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.apiService.post<Booking>(`/bookings/${id}/check-in`, {});
  }

  // Check out from a booking
  public async checkOutBooking(id: string): Promise<ApiResponse<Booking>> {
    return this.apiService.post<Booking>(`/bookings/${id}/check-out`, {});
  }
} 