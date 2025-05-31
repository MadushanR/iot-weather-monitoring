import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword
} from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private auth: Auth, private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      // Simplify error message for user
      if (err.code === 'auth/user-not-found') {
        this.errorMessage = 'No account found with that email.';
      } else if (err.code === 'auth/wrong-password') {
        this.errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        this.errorMessage = 'Invalid email address.';
      } else {
        this.errorMessage = 'Login failed. Please try again.';
      }
    }
  }
}
