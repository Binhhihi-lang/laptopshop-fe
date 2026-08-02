import { Component } from '@angular/core';
import { MaterialModule } from '@shared/material.module';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [
    MaterialModule,
    RouterModule,
    RouterLink
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {}
