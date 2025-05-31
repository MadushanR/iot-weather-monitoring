import { Injectable } from '@angular/core';
import {
  Auth,
  authState,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user$: Observable<User | null>;

  constructor(private auth: Auth) {
    // Now that `auth` has been injected, it’s safe to call `authState(this.auth)`
    this.user$ = authState(this.auth);
  }

  signUp(email: string, password: string, displayName: string): Promise<void> {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then(cred => {
        if (cred.user) {
          return updateProfile(cred.user, { displayName });
        }
        return Promise.resolve();
      })
      .then(() => void 0);
  }

  signIn(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password).then(() => void 0);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
