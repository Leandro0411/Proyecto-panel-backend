import mongoose from 'mongoose';
import paginate from '../paginate/paginate';
import toJSON from '../toJSON/toJSON';
import { PRODUCT_CATEGORIES } from '../product/product.constants';
import { IReservationDoc, IReservationModel } from './reservation.interfaces';

const reservationItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: PRODUCT_CATEGORIES,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const reservationSchema = new mongoose.Schema<IReservationDoc, IReservationModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [reservationItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: 'Reservation must contain at least one item',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    totalItems: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['confirmed'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.plugin(toJSON);
reservationSchema.plugin(paginate);

const Reservation = mongoose.model<IReservationDoc, IReservationModel>('Reservation', reservationSchema);

export default Reservation;
