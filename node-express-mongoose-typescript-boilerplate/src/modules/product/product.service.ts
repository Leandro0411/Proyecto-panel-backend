import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Product from './product.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { IProductDoc, NewProduct, UpdateProductBody } from './product.interfaces';

/**
 * Crear un producto nuevo
 * Recibe los datos, los guarda en MongoDB y devuelve el producto creado
 */
export const createProduct = async (productBody: NewProduct): Promise<IProductDoc> => {
  return Product.create(productBody);
};

/**
 * Obtener productos con filtros y paginación
 * filter: { category: 'electrónica' } por ejemplo
 * options: { page: 1, limit: 10, sortBy: 'price:asc' }
 */
export const queryProducts = async (
  filter: Record<string, any>,
  options: IOptions
): Promise<QueryResult> => {
  const products = await Product.paginate(filter, options);
  return products;
};

/**
 * Buscar un producto por su ID
 * Si no existe → devuelve null (el controlador maneja el error)
 */
export const getProductById = async (
  id: mongoose.Types.ObjectId
): Promise<IProductDoc | null> => Product.findById(id);

/**
 * Actualizar un producto por su ID
 * Si no existe → lanza un ApiError 404
 */
export const updateProductById = async (
  productId: mongoose.Types.ObjectId,
  updateBody: UpdateProductBody
): Promise<IProductDoc | null> => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  Object.assign(product, updateBody); // ← Copia los campos nuevos sobre el objeto
  await product.save();               // ← Guarda en MongoDB
  return product;
};

/**
 * Eliminar un producto por su ID
 * Si no existe → lanza un ApiError 404
 */
export const deleteProductById = async (
  productId: mongoose.Types.ObjectId
): Promise<IProductDoc | null> => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.deleteOne();
  return product;
};