import { Document, Model, Types } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { ProductCategory } from '../product/product.constants';

export interface IReservationItem {
  product: Types.ObjectId;
  name: string;
  category: ProductCategory;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface IReservation {
  user: Types.ObjectId;
  items: IReservationItem[];
  total: number;
  totalItems: number;
  status: 'confirmed';
}

export interface IReservationDoc extends IReservation, Document {}

export interface IReservationModel extends Model<IReservationDoc> {
  paginate(filter: Record<string, unknown>, options: Record<string, unknown>): Promise<QueryResult>;
}

export interface ReservationCheckoutItem {
  productId: string;
  quantity: number;
}

export interface CreateReservationBody {
  items: ReservationCheckoutItem[];
}
