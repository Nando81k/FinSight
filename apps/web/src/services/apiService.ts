/**
 * API Service Utility
 * 
 * Centralized service for making authenticated API requests
 */

class ApiService {
  private baseURL: string;

  constructor() {
    // Use hardcoded API URL for now - in production this would come from environment variables
    this.baseURL = 'http://localhost:4000/api';
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('finsight_token');
  }

  /**
   * Get default headers for API requests
   */
  private getDefaultHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response and throw error if not ok
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('finsight_token');
        // Could dispatch a logout action here if using Redux
        throw new Error('Session expired. Please login again.');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const requestInit: RequestInit = {
      method: 'POST',
      headers: this.getDefaultHeaders(),
    };

    if (data) {
      requestInit.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);
    return this.handleResponse<T>(response);
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const requestInit: RequestInit = {
      method: 'PUT',
      headers: this.getDefaultHeaders(),
    };

    if (data) {
      requestInit.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);
    return this.handleResponse<T>(response);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const requestInit: RequestInit = {
      method: 'PATCH',
      headers: this.getDefaultHeaders(),
    };

    if (data) {
      requestInit.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);
    return this.handleResponse<T>(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getDefaultHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Upload files (multipart/form-data)
   */
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiService = new ApiService();