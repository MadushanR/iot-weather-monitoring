import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile
} from '@angular/fire/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  displayName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';

  constructor(private auth: Auth, private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';

    // 1) Basic client‐side validation
    if (!this.displayName.trim()) {
      this.errorMessage = 'Please enter your name.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    try {
      // 2) Create user with email & password
      const credential = await createUserWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );
      // 3) Update displayName on the newly created user
      if (credential.user) {
        await updateProfile(credential.user, {
          displayName: this.displayName.trim()
        });
      }
      // 4) Redirect to dashboard
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      // 5) Friendly error handling
      if (err.code === 'auth/email-already-in-use') {
        this.errorMessage = 'That email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        this.errorMessage = 'Invalid email address.';
      } else if (err.code === 'auth/weak-password') {
        this.errorMessage = 'Password should be at least 6 characters.';
      } else {
        this.errorMessage = 'Registration failed. Please try again.';
      }
    }
  }
}
