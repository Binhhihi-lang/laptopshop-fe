/**
 * Barrel CHỈ dành cho storefront (features/client) — tránh kéo widget admin
 * (table, product-picker, bulk-toolbar...) vào bundle khách hàng.
 * Admin vẫn dùng barrel `@shared/components`.
 */
export { ButtonComponent } from './button/button.component';
export type { ButtonVariant, ButtonSize } from './button/button.component';

export { InputComponent } from './input/input.component';
export type { InputType } from './input/input.component';

export { SelectComponent } from './select/select.component';
export type { SelectOption } from './select/select.component';

export { FormFieldComponent } from './form-field/form-field.component';
export { CardComponent, CardHeaderComponent, CardFooterComponent } from './card/card.component';
export type { CardVariant, CardPadding } from './card/card.component';

export { BadgeComponent } from './badge/badge.component';
export type { BadgeVariant } from './badge/badge.component';

export { LoadingComponent } from './loading/loading.component';
export type { LoadingType, LoadingSize } from './loading/loading.component';

export { SkeletonComponent } from './skeleton/skeleton.component';
export { SkeletonCardComponent } from './skeleton/skeleton-card.component';
export { ProductDetailSkeletonComponent } from './product-detail-skeleton/product-detail-skeleton.component';
export { LoadingGateComponent } from './loading-gate/loading-gate.component';

export { EmptyStateComponent } from './empty-state/empty-state.component';
export type { EmptyStateVariant } from './empty-state/empty-state.component';

export { PageHeaderComponent } from './page-header/page-header.component';

export { AvatarComponent } from './avatar/avatar.component';
export type { AvatarSize, AvatarShape, AvatarShadow } from './avatar/avatar.component';

export { NotificationBellComponent } from './notification-bell/notification-bell.component';

export { PriceComponent } from './price/price.component';
export { PromoBadgeComponent } from './promo-badge/promo-badge.component';
export type { PromoBadgeVariant } from './promo-badge/promo-badge.component';
export { ProductCardComponent } from './product-card/product-card.component';
export { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
export type { BreadcrumbItem } from './breadcrumb/breadcrumb.component';
export { QtyStepperComponent } from './qty-stepper/qty-stepper.component';
export { PaginationComponent } from './pagination/pagination.component';
export { CartLineItemComponent } from './cart-line-item/cart-line-item.component';
export { OrderSummaryComponent } from './order-summary/order-summary.component';
export { PromoOverlayComponent } from './promo-overlay/promo-overlay.component';
export { VoucherCardComponent } from './voucher-card/voucher-card.component';
export { HomeBannerCarouselComponent } from './home-banner-carousel/home-banner-carousel.component';
export { FlashSaleStripComponent } from './flash-sale-strip/flash-sale-strip.component';
export { CheckoutStepsComponent } from './checkout-steps/checkout-steps.component';
export { OrderCardComponent } from './order-card/order-card.component';
export { OrderTimelineComponent } from './order-timeline/order-timeline.component';
export { CategoryTileComponent } from './category-tile/category-tile.component';
