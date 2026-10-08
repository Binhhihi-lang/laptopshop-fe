# ============================================================
# Frontend LaptopShop — Dockerfile multi-stage
# Stage 1 dùng Node để build Angular
# Stage 2 dùng nginx để phục vụ file tĩnh
# ============================================================

# ---------- Stage 1: build ----------
FROM node:24-alpine AS build
WORKDIR /build

# Angular build khá ngốn RAM; mặc định của Node trên alpine dễ bị OOM.
ENV NODE_OPTIONS=--max-old-space-size=4096

# Copy riêng manifest để tận dụng cache: chỉ sửa code Angular thì Docker
# không phải cài lại toàn bộ thư viện.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: phục vụ ----------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/laptopshop-fe/browser /usr/share/nginx/html

EXPOSE 80
