// src/app/services/user-settings.service.ts
import { Injectable } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface UserSettings {
  displayName?: string;
  farmLocation: { lat: number; lng: number };
  irrigationThresholds: { soilMoistureMin: number; soilMoistureMax: number };
  alertPreferences: { emailAlerts: boolean; smsAlerts: boolean };
  updated_ts?: any;
}

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  constructor(private auth: Auth, private firestore: Firestore) {}

  /**
   * Fetch the current user’s settings as an Observable<UserSettings>.
   * Uses docData() on a DocumentReference.
   */
  getSettings(): Observable<UserSettings | null> {
    return authState(this.auth).pipe(
      switchMap((user: User | null) => {
        if (user) {
          // Create a DocumentReference to "users/{uid}"
          const ref = doc(this.firestore, `users/${user.uid}`);
          // Use docData() (not collectionData) to read a single document
          return docData(ref) as Observable<UserSettings>;
        } else {
          return of(null);
        }
      })
    );
  }

  /**
   * Save or merge user settings under users/{uid}.
   */
  saveSettings(settings: UserSettings): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return Promise.reject('Not authenticated');
    const ref = doc(this.firestore, `users/${user.uid}`);
    return setDoc(ref, { ...settings, updated_ts: serverTimestamp() }, { merge: true });
  }
}
