import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IProductDoc, IProductModel } from './product.interfaces';
import { PRODUCT_CATEGORIES } from './product.constants';

const productReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

const productSchema = new mongoose.Schema<IProductDoc, IProductModel>(
  {
    name: {
      type: String,
      required: true,   // ← Obligatorio
      trim: true,       // ← Elimina espacios al inicio y al final
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,           // ← No puede ser negativo
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: PRODUCT_CATEGORIES,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,           // ← No puede ser negativo
      default: 0,       // ← Si no se envía, vale 0
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    ratingAverage: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    reviews: {
      type: [productReviewSchema],
      default: [],
    },
  },
  {
    timestamps: true,   // ← Agrega automáticamente createdAt y updatedAt
  }
);

// ✅ Plugin toJSON: transforma _id → id y oculta campos privados
productSchema.plugin(toJSON);

// ✅ Plugin paginate: agrega el método Product.paginate()
productSchema.plugin(paginate);

const Product = mongoose.model<IProductDoc, IProductModel>('Product', productSchema);

export default Product;
