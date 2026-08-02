export interface ProductResponse {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  image: string;
  sold: number;
  categoryId: number;
  categoryName: string;
}
export interface Product{

}
export interface ProductCreationRequest {
  name: string;
  price: number;
  quantity: number;
  description: string;
  image?: File;
  categoryId: number;
}
