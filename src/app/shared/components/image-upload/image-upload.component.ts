import { Component, input, output, signal, computed, effect, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ButtonComponent } from '../button/button.component';

type ImageUploadSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<ImageUploadSize, string> = {
  sm: 'max-w-[200px] h-32',
  md: 'max-w-xs h-48',
  lg: 'max-w-sm h-64',
};

/**
 * ImageUpload: chọn / xem trước / hủy ảnh.
 * - Hiển thị ảnh hiện tại qua `existingImage` (ảnh đã lưu trên server).
 * - Khi người dùng chọn file mới, preview hiển thị file đó và emit `fileChange(file)`.
 * - Nút X xuất hiện khi có file mới (hủy file mới, emit `fileChange(null)`) HOẶC khi
 *   đang hiển thị ảnh cũ (đánh dấu xóa ảnh hiện tại, emit `imageRemoved(true)`).
 * - Form cha quyết định gửi tín hiệu xóa lên backend (vd. setImage(null)).
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="image-upload-area flex flex-col gap-4">
      <div [class]="boxClass()">
        @if (displayImage()) {
          <img [src]="displayImage()" [alt]="label()" class="w-full h-full object-cover" />
          @if (canRemove()) {
            <button
              type="button"
              class="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors shadow-sm"
              (click)="removeImage()"
              aria-label="Xóa ảnh"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          }
        } @else {
          <div class="flex flex-col items-center justify-center text-center px-4">
            <svg
              class="w-12 h-12 text-slate-400 dark:text-slate-500 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p class="text-slate-500 dark:text-slate-400">Chưa có hình ảnh</p>
          </div>
        }
      </div>

      <div class="image-upload-controls flex flex-wrap gap-3 items-center">
        <input
          type="file"
          [accept]="accept()"
          (change)="onFileSelected($event)"
          class="hidden"
          #fileInput
        />
        <app-button
          type="button"
          variant="outline"
          icon="cloud_upload"
          [label]="displayImage() ? 'Thay đổi ảnh' : buttonLabel()"
          [disabled]="disabled()"
          (click)="fileInput.click()"
          ariaLabel="Chọn ảnh"
        />
        <span class="text-xs text-slate-500 dark:text-slate-400"
          >Chỉ hỗ trợ file ảnh (JPG, PNG, WebP), tối đa {{ maxSizeMB() }}MB</span
        >
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ImageUploadComponent {
  private readonly snackBar = inject(MatSnackBar);

  // Inputs
  existingImage = input<string | null>(null);
  label = input<string>('Hình ảnh');
  accept = input<string>('image/*');
  maxSizeMB = input<number>(5);
  shape = input<'rounded' | 'circle'>('rounded');
  size = input<ImageUploadSize>('md');
  disabled = input<boolean>(false);
  buttonLabel = input<string>('Chọn ảnh');

  // Outputs
  fileChange = output<File | null>();
  // Báo form cha: người dùng muốn xóa ảnh hiện tại (gửi null lên backend)
  imageRemoved = output<boolean>();

  // Trạng thái nội bộ: file mới được chọn (chưa lưu)
  private readonly pendingFile = signal<File | null>(null);
  private readonly previewUrl = signal<string | null>(null);
  // Đánh dấu người dùng đã xóa ảnh hiện tại (ảnh cũ trên server)
  private readonly removed = signal(false);

  // Ảnh hiển thị: null nếu đã xóa, file mới nếu có, ngược lại là existingImage
  readonly displayImage = computed(() =>
    this.removed() ? null : this.pendingFile() ? this.previewUrl() : this.existingImage(),
  );

  // Cho phép xóa khi có file mới được chọn, hoặc đang hiển thị ảnh cũ chưa bị xóa
  readonly canRemove = computed(
    () => this.pendingFile() !== null || (this.existingImage() !== null && !this.removed()),
  );

  readonly boxClass = computed(() => {
    const shapeClass = this.shape() === 'circle' ? 'rounded-full' : 'rounded-lg';
    return [
      'relative overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center',
      SIZE_CLASSES[this.size()],
      shapeClass,
    ].join(' ');
  });

  constructor() {
    // Reset trạng thái khi ảnh hiện tại (existing) thay đổi từ form cha
    effect(() => {
      this.existingImage();
      this.pendingFile.set(null);
      this.previewUrl.set(null);
      this.removed.set(false);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      input.value = '';
      return;
    }
    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Chỉ chấp nhận file hình ảnh', 'Đóng', { duration: 3000 });
      input.value = '';
      return;
    }
    if (file.size > this.maxSizeMB() * 1024 * 1024) {
      this.snackBar.open(`Kích thước file không được vượt quá ${this.maxSizeMB()}MB`, 'Đóng', {
        duration: 3000,
      });
      input.value = '';
      return;
    }

    this.removed.set(false);
    this.pendingFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
    this.fileChange.emit(file);
    input.value = '';
  }

  removeImage(): void {
    if (this.pendingFile()) {
      // Đang có file mới được chọn -> chỉ hủy file mới, quay về ảnh cũ
      this.pendingFile.set(null);
      this.previewUrl.set(null);
      this.fileChange.emit(null);
    } else if (this.existingImage() && !this.removed()) {
      // Đang hiển thị ảnh cũ -> đánh dấu xóa ảnh hiện tại
      this.removed.set(true);
      this.imageRemoved.emit(true);
    }
  }
}
