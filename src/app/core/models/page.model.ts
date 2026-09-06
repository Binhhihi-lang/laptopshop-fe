/**
 * Cấu trúc Page trả về từ backend (Spring Data `org.springframework.data.domain.Page<T>`
 * được unwrap qua `ApiResponse.result`).
 *
 * Tên field dùng camelCase để khớp với JSON Jackson serialize mặc định của
 * Spring (`totalElements`, `totalPages`, `numberOfElements`, `first`, `last`).
 * Field `number` là số trang hiện tại (0-based), `size` là kích thước trang.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
}
