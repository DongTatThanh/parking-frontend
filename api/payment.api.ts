import { ApiService, ApiResponse } from './api.service';

// Payment API interfaces
export interface CreatePaymentRequest {
  bookingId: string;
  amount: number;
  method: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  transactionId?: string;
  amount: number;
  method: string;
  status: string;
  description?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilterParams {
  bookingId?: string;
  status?: string;
  method?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PaymentStatusResponse {
  status: string;
  message: string;
  redirectUrl?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  payment?: Payment;
  message?: string;
}

// Payment API class
export class PaymentApi {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  // Create a payment for a booking
  public async createPayment(data: CreatePaymentRequest): Promise<ApiResponse<Payment>> {
    return this.apiService.post<Payment>('/payments/create', data);
  }

  // Get a specific payment by ID
  public async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return this.apiService.get<Payment>(`/payments/${id}`);
  }

  // Get all payments for a specific booking
  public async getPaymentsByBooking(bookingId: string): Promise<ApiResponse<{ payments: Payment[], total: number }>> {
    return this.apiService.get<{ payments: Payment[], total: number }>(`/payments/booking/${bookingId}`);
  }

  // Check payment status
  public async getPaymentStatus(id: string): Promise<ApiResponse<PaymentStatusResponse>> {
    return this.apiService.get<PaymentStatusResponse>(`/payments/${id}/status`);
  }

  // Request a refund
  public async requestRefund(id: string, reason: string, amount?: number): Promise<ApiResponse<Payment>> {
    return this.apiService.post<Payment>(`/payments/${id}/refund`, { reason, amount });
  }

  // Get all payments for the current user
  public async getMyPayments(params?: PaymentFilterParams): Promise<ApiResponse<{ payments: Payment[], total: number }>> {
    return this.apiService.get<{ payments: Payment[], total: number }>('/payments/my-payments', { params });
  }

  // Verify a payment after return from payment gateway
  public async verifyPayment(paymentId: string, transactionId?: string): Promise<ApiResponse<PaymentVerificationResponse>> {
    return this.apiService.post<PaymentVerificationResponse>('/payments/verify', { paymentId, transactionId });
  }
} 