import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '@shared/material.module';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MaterialModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  @Input() userInfo: any = null;
  @Output() logout = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
}