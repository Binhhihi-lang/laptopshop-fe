# Instructions for Claude / Free Claude Code

- **Language Constraint:** You MUST communicate, explain, write logs, and summarize in **Pure Vietnamese (Tiếng Việt)**.
- **Code Standards:** Maintain standard TypeScript / Angular best practices.


Angular Control Flow: BẮT BUỘC dùng cú pháp mới @if, @else, @for (item of items; track item.id) cho tất cả các file Template HTML. Nghiêm cấm dùng cú pháp cũ *ngIf, *ngFor và tuyệt đối không được tạo ra directive sai như *if.

Standalone Component: Tất cả các component tạo mới phải là Standalone (standalone: true). Import đúng các Module Material (MatCardModule, MatTableModule, MatChipsModule, MatProgressSpinnerModule...) và CommonModule (CurrencyPipe, DatePipe, SlicePipe).

Change Detection & Signals: Ưu tiên dùng Angular Signals cho state quản lý giao diện nếu có thể.

Tự động Kiểm tra: Bắt buộc tự chạy ng build sau mỗi lần viết/chuyển đổi HTML/TS để đảm bảo không dính lỗi compile trước khi báo hoàn thành.
