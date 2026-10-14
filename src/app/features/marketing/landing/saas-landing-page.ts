import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-saas-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saas-landing-page.html',
  styleUrl: './saas-landing-page.scss',
})
export class SaasLandingPage {}
