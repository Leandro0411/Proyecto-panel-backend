import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewProduct } from './product.interfaces';
import { PRODUCT_CATEGORIES } from './product.constants';

// ✅ Usamos Record<keyof NewProduct, any> para que TypeScript
// nos avise si nos olvidamos de validar algún campo de la interfaz
const createProductBody: Record<keyof NewProduct, any> = {
  name: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().required().min(0),      // No puede ser negativo
  category: Joi.string().required().valid(...PRODUCT_CATEGORIES),
  stock: Joi.number().integer().min(0),        // Entero, no negativo
  imageUrl: Joi.string().allow('').optional(),
  imageUrls: Joi.array().items(Joi.string()).optional(),
  ratingAverage: Joi.number().min(0).max(5).optional(),
  reviewsCount: Joi.number().integer().min(0).optional(),
  reviews: Joi.array().optional(),
};

// Crear producto — todos los campos requeridos
export const createProduct = {
  body: Joi.object().keys(createProductBody),
};

// Listar productos — filtros opcionales por query string
export const getProducts = {
  query: Joi.object().keys({
    name: Joi.string(),
    category: Joi.string().valid(...PRODUCT_CATEGORIES),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

// Obtener un producto por ID
export const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId), // Valida que sea un ID de MongoDB válido
  }),
};

// Actualizar producto — al menos un campo requerido
export const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    price: Joi.number().min(0),
    category: Joi.string().valid(...PRODUCT_CATEGORIES),
    stock: Joi.number().integer().min(0),
    imageUrl: Joi.string().allow(''),
  }),
};

// Eliminar producto — solo necesita el ID
export const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};

export const createReview = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().min(3).max(600).required(),
  }),
};
