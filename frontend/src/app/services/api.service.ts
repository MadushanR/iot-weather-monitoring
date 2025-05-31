import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { WeatherReading } from './weather-data.service';

interface ApiResponse {
  status: string;
  data: WeatherReading[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Point this to your Flask back-end
  private baseUrl = 'http://127.0.0.1:5000/api';

  constructor(private http: HttpClient) {}

  fetchRecentReadings(limit: number): Observable<WeatherReading[]> {
    return this.http
      .get<ApiResponse>(`${this.baseUrl}/readings/recent?limit=${limit}`)
      .pipe(map(res => res.data));
  }
}
