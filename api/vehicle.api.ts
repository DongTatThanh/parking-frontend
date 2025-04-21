import { ApiService, ApiResponse } from './api.service';

// Vehicle API interfaces
export interface Vehicle {
  id: string;
  licensePlate: string;
  type: string;
  brand?: string;
  model?: string;
  color?: string;
  isRegistered: boolean;
  isDefault?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  type: string;
  brand?: string;
  model?: string;
  color?: string;
  isDefault?: boolean;
}

export interface CheckLicensePlateResponse {
  exists: boolean;
  isRegistered: boolean;
  vehicle?: Vehicle;
  message?: string;
}

export interface VehicleFilterParams {
  type?: string;
  isRegistered?: boolean;
  page?: number;
  limit?: number;
}

// Vehicle API class
export class VehicleApi {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  // Create a new vehicle
  public async createVehicle(data: CreateVehicleRequest): Promise<ApiResponse<Vehicle>> {
    return this.apiService.post<Vehicle>('/vehicles/create', data);
  }

  // Get a specific vehicle by ID
  public async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return this.apiService.get<Vehicle>(`/vehicles/${id}`);
  }

  // Get all vehicles for the current user
  public async getMyVehicles(params?: VehicleFilterParams): Promise<ApiResponse<{ vehicles: Vehicle[], total: number }>> {
    return this.apiService.get<{ vehicles: Vehicle[], total: number }>('/vehicles/my-vehicles', { params });
  }

  // Update a vehicle
  public async updateVehicle(id: string, data: Partial<CreateVehicleRequest>): Promise<ApiResponse<Vehicle>> {
    return this.apiService.put<Vehicle>(`/vehicles/${id}`, data);
  }

  // Delete a vehicle
  public async deleteVehicle(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.apiService.delete<{ success: boolean }>(`/vehicles/${id}`);
  }

  // Check if a license plate exists or is registered
  public async checkLicensePlate(licensePlate: string): Promise<ApiResponse<CheckLicensePlateResponse>> {
    return this.apiService.get<CheckLicensePlateResponse>(`/vehicles/check-license-plate/${licensePlate}`);
  }

  // Set a vehicle as default
  public async setDefaultVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return this.apiService.put<Vehicle>(`/vehicles/${id}/set-default`, {});
  }
} 