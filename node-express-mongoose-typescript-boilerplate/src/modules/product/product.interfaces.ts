import { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { ProductCategory } from './product.constants';

// ✅ Define cómo luce un producto en la base de datos
export interface IProduct {
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  stock: number;
  imageUrl?: string;
}

// ✅ IProductDoc = IProduct + métodos de Mongoose (save, delete, etc.)
export interface IProductDoc extends IProduct, Document {}

// ✅ IProductModel = el modelo con métodos estáticos (paginate, isNameTaken, etc.)
export interface IProductModel extends Model<IProductDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

// ✅ Para crear un producto nuevo (todos los campos son obligatorios)
export type NewProduct = IProduct;

// ✅ Para actualizar un producto (todos los campos son opcionales)
export type UpdateProductBody = Partial<IProduct>;
