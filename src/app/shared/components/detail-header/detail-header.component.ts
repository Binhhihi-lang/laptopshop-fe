import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-detail-header',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './detail-header.component.html',
  styleUrl: './detail-header.component.css',
})
export class DetailHeaderComponent {
  title = input.required<string>();
  backLabel = input<string>('Quay lại');
  backAriaLabel = input<string>('');
  showBack = input<boolean>(true);
  backClick = output<void>();
}
