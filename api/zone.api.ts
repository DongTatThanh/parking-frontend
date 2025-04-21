import { ApiService, ApiResponse } from './api.service';

// Zone API interfaces
export interface ParkingZone {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  capacity: number;
  availableSpots: number;
  operatingHours: {
    open: string;
    close: string;
  };
  imageUrl?: string;
  status: 'active' | 'inactive' | 'full';
  hasMonthlyBooking: boolean;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParkingSpot {
  id: string;
  zoneId: string;
  name: string;
  type: 'standard' | 'handicapped' | 'electric' | 'motorcycle';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  floor: number;
  section: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPrice {
  id: string;
  zoneId: string;
  type: 'hourly' | 'daily' | 'monthly';
  price: number;
  description?: string;
  minDuration?: number;
  maxDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneDetailsResponse {
  zone: ParkingZone;
  spots: ParkingSpot[];
  prices: TicketPrice[];
}

export interface ZoneFilterParams {
  city?: string;
  district?: string;
  hasMonthlyBooking?: boolean;
  features?: string[];
  searchTerm?: string;
  page?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
}

// Zone API class
export class ZoneApi {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  // Get all zones with optional filters
  public async getZones(params?: ZoneFilterParams): Promise<ApiResponse<{ zones: ParkingZone[], total: number }>> {
    return this.apiService.get<{ zones: ParkingZone[], total: number }>('/zones', { params });
  }

  // Get zones nearby a location
  public async getNearbyZones(
    latitude: number,
    longitude: number,
    radius = 5 // default 5km
  ): Promise<ApiResponse<{ zones: ParkingZone[], total: number }>> {
    return this.apiService.get<{ zones: ParkingZone[], total: number }>('/zones/nearby', {
      params: { latitude, longitude, radius }
    });
  }

  // Get zone details including spots and prices
  public async getZoneDetails(zoneId: string): Promise<ApiResponse<ZoneDetailsResponse>> {
    return this.apiService.get<ZoneDetailsResponse>(`/zones/${zoneId}`);
  }

  // Check zone availability for a specific time
  public async checkAvailability(
    zoneId: string,
    startTime: string,
    endTime?: string,
    bookingType: 'daily' | 'monthly' = 'daily'
  ): Promise<ApiResponse<{
    available: boolean;
    availableSpots: number;
    suggestedZones?: ParkingZone[];
  }>> {
    return this.apiService.get<{
      available: boolean;
      availableSpots: number;
      suggestedZones?: ParkingZone[];
    }>(`/zones/${zoneId}/availability`, {
      params: { startTime, endTime, bookingType }
    });
  }

  // Get a specific spot in a zone
  public async getSpot(zoneId: string, spotId: string): Promise<ApiResponse<ParkingSpot>> {
    return this.apiService.get<ParkingSpot>(`/zones/${zoneId}/spots/${spotId}`);
  }

  // Get available spots in a zone
  public async getAvailableSpots(
    zoneId: string,
    startTime: string,
    endTime?: string,
    bookingType: 'daily' | 'monthly' = 'daily'
  ): Promise<ApiResponse<{ spots: ParkingSpot[] }>> {
    return this.apiService.get<{ spots: ParkingSpot[] }>(`/zones/${zoneId}/available-spots`, {
      params: { startTime, endTime, bookingType }
    });
  }

  // Get pricing information for a zone
  public async getPrices(zoneId: string): Promise<ApiResponse<{ prices: TicketPrice[] }>> {
    return this.apiService.get<{ prices: TicketPrice[] }>(`/zones/${zoneId}/prices`);
  }
} 