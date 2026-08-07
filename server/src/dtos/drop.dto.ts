export interface CreateDropRequestDto {
  name: string;
  price: number;
  total_stock: number;
  start_time: string; // ISO String
}

export interface ReserveDropRequestDto {
  drop_id: string;
}

export interface ReserveDropResponseDto {
  reservation_id: string;
  expires_at: Date;
  available_stock: number;
}

export interface PurchaseDropRequestDto {
  reservation_id: string;
}

export interface DropResponseDto {
  id: string;
  name: string;
  price: number;
  total_stock: number;
  available_stock: number;
  start_time: Date;
  purchases?: Array<{
    id: string;
    username: string;
  }>;
}
