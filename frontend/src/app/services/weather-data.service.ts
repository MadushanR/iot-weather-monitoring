import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  getDocs
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Matches the fields you save in Firestore
export interface WeatherReading {
  timestamp: number;
  owm_temp: number;
  owm_humidity: number;
  owm_pressure: number;
  owm_wind_speed: number;
  owm_weather: string;
  server_received_ts?: number;
}

@Injectable({ providedIn: 'root' })
export class WeatherDataService {
  constructor(private firestore: Firestore) {}

  // Real-time observable for the single latest document in `weather_readings`
  subscribeLiveData(): Observable<WeatherReading | null> {
    const colRef = collection(this.firestore, 'weather_readings');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(1));
    return collectionData(q, { idField: 'id' }).pipe(
      map((arr: any[]) => (arr.length ? (arr[0] as WeatherReading) : null))
    );
  }

  // One-time fetch of last `limitCount` readings
  async getHistorical(limitCount: number): Promise<WeatherReading[]> {
    const colRef = collection(this.firestore, 'weather_readings');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    const arr: WeatherReading[] = [];
    snapshot.forEach(doc => arr.push(doc.data() as WeatherReading));
    return arr.reverse(); // return ascending (old→new)
  }
}
