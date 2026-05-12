import httpStatus from 'http-status';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import Product from './product.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import {
  CreateProductReviewBody,
  IProductDoc,
  NewProduct,
  UpdateProductBody,
} from './product.interfaces';
import { IUserDoc } from '../user/user.interfaces';

const normalizeImageUrls = (imageUrl?: string, imageUrls?: string[]): string[] => {
  const normalizedUrls = (imageUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);

  if (imageUrl?.trim() && !normalizedUrls.includes(imageUrl.trim())) {
    normalizedUrls.unshift(imageUrl.trim());
  }

  return normalizedUrls;
};

const applyImageFields = (target: NewProduct | UpdateProductBody, imageUrls: string[]): void => {
  target.imageUrls = imageUrls;
  target.imageUrl = imageUrls[0] ?? '';
};

const toLocalFilePath = (imageUrl: string): string | null => {
  const normalized = imageUrl.replace(/\\/g, '/');

  if (normalized.startsWith('/uploads/')) {
    return normalized.slice(1);
  }

  if (normalized.startsWith('uploads/')) {
    return normalized;
  }

  return null;
};

const deleteLocalImages = async (imageUrls: string[]): Promise<void> => {
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const filePath = toLocalFilePath(imageUrl);

      if (!filePath) {
        return;
      }

      try {
        await fs.unlink(filePath);
      } catch {
        // Ignora archivos faltantes para no romper el flujo principal.
      }
    })
  );
};

const recalculateReviewStats = (product: IProductDoc): void => {
  product.reviewsCount = product.reviews.length;
  product.ratingAverage = product.reviewsCount
    ? Number(
        (
          product.reviews.reduce((sum, review) => sum + Number(review.rating), 0) / product.reviewsCount
        ).toFixed(1)
      )
    : 0;
};

/**
 * Crear un producto nuevo
 * Recibe los datos, los guarda en MongoDB y devuelve el producto creado
 */
export const createProduct = async (productBody: NewProduct): Promise<IProductDoc> => {
  const normalizedImageUrls = normalizeImageUrls(productBody.imageUrl, productBody.imageUrls);
  applyImageFields(productBody, normalizedImageUrls);
  productBody.reviews = [];
  productBody.reviewsCount = 0;
  productBody.ratingAverage = 0;
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
  const hasNewImages = Array.isArray(updateBody.imageUrls);
  const previousImageUrls = [...product.imageUrls];

  if (hasNewImages) {
    const normalizedImageUrls = normalizeImageUrls(updateBody.imageUrl, updateBody.imageUrls);
    applyImageFields(updateBody, normalizedImageUrls);
  }

  Object.assign(product, updateBody); // ← Copia los campos nuevos sobre el objeto
  await product.save();               // ← Guarda en MongoDB

  if (hasNewImages) {
    await deleteLocalImages(previousImageUrls.filter((imageUrl) => !product.imageUrls.includes(imageUrl)));
  }

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
  await deleteLocalImages(product.imageUrls);
  await product.deleteOne();
  return product;
};

export const addReviewToProduct = async (
  productId: mongoose.Types.ObjectId,
  user: IUserDoc,
  reviewBody: CreateProductReviewBody
): Promise<IProductDoc | null> => {
  const product = await getProductById(productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const existingReviewIndex = product.reviews.findIndex(
    (review) => review.user.toString() === user.id
  );

  const nextReview = {
    user: new mongoose.Types.ObjectId(user.id),
    userName: user.name,
    rating: reviewBody.rating,
    comment: reviewBody.comment.trim(),
  };

  if (existingReviewIndex >= 0) {
    product.reviews[existingReviewIndex] = {
      ...product.reviews[existingReviewIndex],
      ...nextReview,
    } as any;
  } else {
    product.reviews.push(nextReview as any);
  }

  recalculateReviewStats(product);
  await product.save();
  return product;
};
