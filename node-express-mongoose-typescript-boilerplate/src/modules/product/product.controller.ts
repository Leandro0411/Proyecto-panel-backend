import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import buildSearchRegex from '../utils/buildSearchRegex';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as productService from './product.service';

const buildAssetUrl = (req: Request, assetPath: string): string => {
  if (!assetPath) {
    return '';
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${req.protocol}://${req.get('host')}${assetPath.startsWith('/') ? assetPath : `/${assetPath}`}`;
};

const formatProductResponse = (req: Request, productDoc: any): any => {
  const product = productDoc?.toJSON ? productDoc.toJSON() : productDoc;
  const imageUrls = (product.imageUrls ?? [])
    .map((imageUrl: string) => buildAssetUrl(req, imageUrl))
    .filter(Boolean);

  return {
    ...product,
    imageUrls,
    imageUrl: imageUrls[0] ?? buildAssetUrl(req, product.imageUrl ?? ''),
  };
};

const extractUploadedImageUrls = (req: Request): string[] =>
  ((req.files as Express.Multer.File[] | undefined) ?? []).map((file) => `/uploads/products/${file.filename}`);

/**
 * POST /v1/products
 * Crea un producto nuevo
 * Solo admins pueden crear productos (se define en la ruta)
 */
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct({
    ...req.body,
    imageUrls: extractUploadedImageUrls(req),
  });
  res.status(httpStatus.CREATED).send(formatProductResponse(req, product));
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

  if (typeof filter['name'] === 'string' && filter['name'].trim()) {
    filter['name'] = buildSearchRegex(filter['name']);
  }

  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await productService.queryProducts(filter, options);
  res.send({
    ...result,
    results: result.results.map((product) => formatProductResponse(req, product)),
  });
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
    res.send(formatProductResponse(req, product));
  }
});

/**
 * PATCH /v1/products/:productId
 * Actualiza un producto — solo admins
 */
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    const uploadedImageUrls = extractUploadedImageUrls(req);
    const product = await productService.updateProductById(
      new mongoose.Types.ObjectId(req.params['productId']),
      {
        ...req.body,
        ...(uploadedImageUrls.length ? { imageUrls: uploadedImageUrls } : {}),
      }
    );
    res.send(formatProductResponse(req, product));
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

export const createReview = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] !== 'string') {
    return;
  }

  if (req.user.role !== 'user') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Solo los usuarios pueden dejar reseñas.');
  }

  const product = await productService.addReviewToProduct(
    new mongoose.Types.ObjectId(req.params['productId']),
    req.user,
    req.body
  );

  res.send(formatProductResponse(req, product));
});
