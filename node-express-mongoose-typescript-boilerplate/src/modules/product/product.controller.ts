import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as productService from './product.service';

/**
 * POST /v1/products
 * Crea un producto nuevo
 * Solo admins pueden crear productos (se define en la ruta)
 */
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

/**
 * GET /v1/products
 * Devuelve lista de productos con filtros y paginación
 * Cualquier usuario autenticado puede ver productos
 */
export const getProducts = catchAsync(async (req: Request, res: Response) => {
  // pick() toma solo los campos permitidos del query string
  // Ejemplo: /v1/products?category=electrónica&page=2&limit=5
  const filter = pick(req.query, ['name', 'category']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await productService.queryProducts(filter, options);
  res.send(result);
});

/**
 * GET /v1/products/:productId
 * Devuelve un producto específico por su ID
 */
export const getProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    const product = await productService.getProductById(
      new mongoose.Types.ObjectId(req.params['productId'])
    );
    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
    }
    res.send(product);
  }
});

/**
 * PATCH /v1/products/:productId
 * Actualiza un producto — solo admins
 */
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    const product = await productService.updateProductById(
      new mongoose.Types.ObjectId(req.params['productId']),
      req.body
    );
    res.send(product);
  }
});

/**
 * DELETE /v1/products/:productId
 * Elimina un producto — solo admins
 */
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    await productService.deleteProductById(
      new mongoose.Types.ObjectId(req.params['productId'])
    );
    res.status(httpStatus.NO_CONTENT).send();
  }
});