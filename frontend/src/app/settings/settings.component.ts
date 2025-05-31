import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { UserSettingsService, UserSettings } from '../services/user-settings.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settings: UserSettings = {
    farmLocation: { lat: 43.5, lng: -79.6667 },
    irrigationThresholds: { soilMoistureMin: 30, soilMoistureMax: 70 },
    alertPreferences: { emailAlerts: true, smsAlerts: false }
  };
  error: string | null = null;
  successMsg: string | null = null;

  constructor(
    private userSettingsService: UserSettingsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userSettingsService.getSettings().subscribe({
      next: settings => {
        if (settings) {
          this.settings = settings;
        }
      },
      error: err => {
        this.error = 'Cannot load settings: ' + err;
      }
    });
  }

  save() {
    this.error = null;
    this.successMsg = null;
    this.userSettingsService
      .saveSettings(this.settings)
      .then(() => (this.successMsg = 'Settings saved successfully!'))
      .catch(err => (this.error = 'Error saving settings: ' + err.message));
  }

  signOut() {
    this.authService.signOut().then(() => this.router.navigate(['/login']));
  }
}
