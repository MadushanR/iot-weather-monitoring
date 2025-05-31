import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { WeatherDataService, WeatherReading } from '../services/weather-data.service';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { UserSettingsService, UserSettings } from '../services/user-settings.service';

import { Chart, registerables } from 'chart.js';
// Import the date adapter so Chart.js’s time scale works
import 'chartjs-adapter-date-fns';

import * as L from 'leaflet';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  latestReading: WeatherReading | null = null;
  historicalData: WeatherReading[] = [];
  error: string | null = null;
  countInput = 24;

  // Chart.js instances (we’ll store refs here)
  tempChart: Chart | null = null;
  humidityChart: Chart | null = null;
  pressureChart: Chart | null = null;
  windChart: Chart | null = null;

  // Leaflet map instance
  private map!: L.Map;

  userSettings: UserSettings | null = null;

  // Subscriptions so we can unsubscribe on destroy
  private liveSub?: Subscription;
  private settingsSub?: Subscription;

  constructor(
    private weatherDataService: WeatherDataService,
    private apiService: ApiService,
    private authService: AuthService,
    private userSettingsService: UserSettingsService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // 1) Subscribe to real-time “latestReading.”
    // Once it arrives, we store it so that *ngIf="latestReading" becomes true.
    this.liveSub = this.weatherDataService.subscribeLiveData().subscribe({
      next: reading => {
        // Use NgZone to run change detection if needed
        this.ngZone.run(() => {
          this.latestReading = reading;
        });
      },
      error: err => {
        console.error('Live data error:', err);
        this.error = 'Live data error: ' + (err.message || err);
      }
    });

    // 2) Subscribe to user settings (for Leaflet map marker)
    this.settingsSub = this.userSettingsService.getSettings().subscribe({
      next: settings => {
        this.userSettings = settings;
        // If map is already initialized, update view & marker
        if (this.map && this.userSettings) {
          const { lat, lng } = this.userSettings.farmLocation;
          this.map.setView([lat, lng], 13);
          L.marker([lat, lng], { riseOnHover: true })
            .addTo(this.map)
            .bindPopup('Farm Location')
            .openPopup();
        }
      },
      error: err => {
        console.error('Cannot load user settings:', err);
        this.error = 'Cannot load user settings: ' + (err.message || err);
      }
    });
  }

  ngAfterViewInit() {
    // 3) Initialize Leaflet map now that <div id="farmMap"> definitely exists
    const defaultLat = this.userSettings?.farmLocation.lat ?? 43.6532;
    const defaultLng = this.userSettings?.farmLocation.lng ?? -79.3832;

    this.map = L.map('farmMap').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.userSettings) {
      const { lat, lng } = this.userSettings.farmLocation;
      L.marker([lat, lng], { riseOnHover: true })
        .addTo(this.map)
        .bindPopup('Farm Location')
        .openPopup();
    }

    // 4) Only once the first latestReading arrives (so *ngIf has rendered the canvases),
    //    do we call loadHistorical(). If latestReading is already non-null, call immediately;
    //    otherwise, wait for the first non-null reading to trigger it.
    if (this.latestReading !== null) {
      this.loadHistorical(this.countInput);
    } else {
      // Create a temporary subscription to know when latestReading becomes non-null
      const tempSub = this.weatherDataService.subscribeLiveData().subscribe({
        next: r => {
          if (r !== null) {
            this.loadHistorical(this.countInput);
            tempSub.unsubscribe();
          }
        },
        error: () => {
          // Even if live data fails, attempt to load history once
          this.loadHistorical(this.countInput);
          tempSub.unsubscribe();
        }
      });
    }
  }

  ngOnDestroy() {
    // Unsubscribe from both observables
    this.liveSub?.unsubscribe();
    this.settingsSub?.unsubscribe();

    // Destroy Leaflet map if it exists
    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    // Destroy any existing Chart.js instances
    Chart.getChart('tempChart')?.destroy();
    Chart.getChart('humidityChart')?.destroy();
    Chart.getChart('pressureChart')?.destroy();
    Chart.getChart('windChart')?.destroy();
  }

  loadHistorical(limitCount: number) {
    this.apiService.fetchRecentReadings(limitCount).subscribe({
      next: readings => {
        this.historicalData = readings;
        this.drawCharts(readings);
      },
      error: err => {
        console.error('Error fetching history:', err);
        this.error =
          'Error fetching history: ' +
          (err.error?.message || err.statusText || err.message || 'unknown');
      }
    });
  }

  drawCharts(readings: WeatherReading[]) {
    // Build arrays of labels (Date objects) and data points
    const labels = readings.map(r => new Date(r.timestamp));
    const tempData = readings.map(r => r.owm_temp);
    const humidityData = readings.map(r => r.owm_humidity);
    const pressureData = readings.map(r => r.owm_pressure);
    const windData = readings.map(r => r.owm_wind_speed);

    // 1) Destroy existing charts (if any), by looking up their canvas IDs
    Chart.getChart('tempChart')?.destroy();
    Chart.getChart('humidityChart')?.destroy();
    Chart.getChart('pressureChart')?.destroy();
    Chart.getChart('windChart')?.destroy();

    // 2) Temperature Chart
    const tempCanvas = document.getElementById('tempChart') as HTMLCanvasElement;
    if (tempCanvas && tempCanvas.getContext) {
      const ctxT = tempCanvas.getContext('2d')!;
      this.tempChart = new Chart(ctxT, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Temperature (°C)',
              data: tempData,
              fill: false,
              borderWidth: 2,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'hour', tooltipFormat: 'MMM d, h:mm a' }
            },
            y: { beginAtZero: false }
          }
        }
      });
    }

    // 3) Humidity Chart
    const humidityCanvas = document.getElementById('humidityChart') as HTMLCanvasElement;
    if (humidityCanvas && humidityCanvas.getContext) {
      const ctxH = humidityCanvas.getContext('2d')!;
      this.humidityChart = new Chart(ctxH, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Humidity (%)',
              data: humidityData,
              fill: false,
              borderWidth: 2,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'hour', tooltipFormat: 'MMM d, h:mm a' }
            },
            y: { beginAtZero: false }
          }
        }
      });
    }

    // 4) Pressure Chart
    const pressureCanvas = document.getElementById('pressureChart') as HTMLCanvasElement;
    if (pressureCanvas && pressureCanvas.getContext) {
      const ctxP = pressureCanvas.getContext('2d')!;
      this.pressureChart = new Chart(ctxP, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pressure (hPa)',
              data: pressureData,
              fill: false,
              borderWidth: 2,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'hour', tooltipFormat: 'MMM d, h:mm a' }
            },
            y: { beginAtZero: false }
          }
        }
      });
    }

    // 5) Wind Speed Chart
    const windCanvas = document.getElementById('windChart') as HTMLCanvasElement;
    if (windCanvas && windCanvas.getContext) {
      const ctxW = windCanvas.getContext('2d')!;
      this.windChart = new Chart(ctxW, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Wind Speed (m/s)',
              data: windData,
              fill: false,
              borderWidth: 2,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: { unit: 'hour', tooltipFormat: 'MMM d, h:mm a' }
            },
            y: { beginAtZero: false }
          }
        }
      });
    }
  }

  signOut() {
    this.authService.signOut().then(() => this.router.navigate(['/login']));
  }
}
