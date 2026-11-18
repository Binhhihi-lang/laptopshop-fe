// Cấu hình cho bản build production (deploy lên Cloudflare Pages).
// File này được dùng thay cho environment.ts khi build production — xem
// "fileReplacements" trong angular.json.
//
// QUAN TRỌNG: đổi apiUrl thành địa chỉ backend thật trên Render trước khi deploy.
// Backend hiện đặt tại region Singapore để gần Supabase.
export const environment = {
  production: true,
  apiUrl: 'https://laptopshop-sing.onrender.com/api/v1'
};
