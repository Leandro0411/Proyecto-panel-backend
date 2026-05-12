import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { productController, productValidation } from '../../modules/product';
import { productUpload } from '../../modules/product/product.upload';

const router: Router = express.Router();

router
  .route('/')
  // POST /v1/products → solo admins pueden crear productos
  .post(
    auth('manageUsers'),
    productUpload.array('images', 4),
    validate(productValidation.createProduct),
    productController.createProduct
  )
  // GET /v1/products → cualquier usuario autenticado puede ver productos
  .get(auth(), validate(productValidation.getProducts), productController.getProducts);

router
  .route('/:productId/reviews')
  .post(auth(), validate(productValidation.createReview), productController.createReview);

router
  .route('/:productId')
  // GET /v1/products/:productId → cualquier usuario autenticado
  .get(auth(), validate(productValidation.getProduct), productController.getProduct)
  // PATCH /v1/products/:productId → solo admins
  .patch(
    auth('manageUsers'),
    productUpload.array('images', 4),
    validate(productValidation.updateProduct),
    productController.updateProduct
  )
  // DELETE /v1/products/:productId → solo admins
  .delete(auth('manageUsers'), validate(productValidation.deleteProduct), productController.deleteProduct);

export default router;
 
/**
 * ============================================================================
 * DOCUMENTACIÓN SWAGGER
 * ============================================================================
 *
 * A partir de acá, todo son comentarios JSDoc que swagger-jsdoc parsea
 * automáticamente cuando corre en modo desarrollo.
 *
 * El formato es:
 *   @swagger
 *   /ruta:
 *     método:
 *       ...especificación OpenAPI 3.0...
 *
 */
 
/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gestión de productos del catálogo
 */
 
/**
 * @swagger
 * /products:
 *   post:
 *     summary: Crear un producto
 *     description: Solo los administradores pueden crear productos.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - category
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del producto
 *               description:
 *                 type: string
 *                 description: Descripción detallada del producto
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Precio del producto (no puede ser negativo)
 *               category:
 *                 type: string
 *                 description: Categoría del producto (se normaliza a minúsculas)
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Cantidad disponible en inventario
 *             example:
 *               name: Laptop Gaming Pro
 *               description: Laptop de alto rendimiento para gaming profesional
 *               price: 1299.99
 *               category: electronica
 *               stock: 50
 *     responses:
 *       "201":
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "400":
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Listar todos los productos
 *     description: Todos los usuarios autenticados pueden ver el catálogo de productos.
 *       Soporta paginación, filtros por nombre y categoría, y ordenamiento.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de producto (coincidencia exacta)
 *         example: Laptop Gaming Pro
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría del producto
 *         example: electronica
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "Ordenar por campo. Formato: campo:asc o campo:desc. Múltiples: price:asc,name:desc"
 *         example: price:asc
 *       - in: query
 *         name: projectBy
 *         schema:
 *           type: string
 *         description: "Proyección de campos. Formato: campo:hide o campo:include"
 *         example: description:hide
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Cantidad máxima de productos por página
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *     responses:
 *       "200":
 *         description: Lista paginada de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 totalResults:
 *                   type: integer
 *                   example: 48
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */
 
/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     description: Todos los usuarios autenticados pueden ver un producto específico.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto (MongoDB ObjectId)
 *         example: 5ebac534954b54139806c112
 *     responses:
 *       "200":
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Actualizar un producto
 *     description: Solo los administradores pueden modificar productos.
 *       Se pueden actualizar uno o más campos parcialmente (PATCH).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto a actualizar
 *         example: 5ebac534954b54139806c112
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *             minProperties: 1
 *             example:
 *               price: 999.99
 *               stock: 35
 *     responses:
 *       "200":
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       "400":
 *         description: Datos inválidos o body vacío
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Eliminar un producto
 *     description: Solo los administradores pueden eliminar productos.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto a eliminar
 *         example: 5ebac534954b54139806c112
 *     responses:
 *       "204":
 *         description: Producto eliminado exitosamente (sin contenido en respuesta)
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
 
