import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import Product from '../product/product.model';
import Reservation from './reservation.model';
import { CreateReservationBody, IReservationDoc } from './reservation.interfaces';

export const createReservation = async (
  userId: mongoose.Types.ObjectId,
  reservationBody: CreateReservationBody
): Promise<IReservationDoc> => {
  const groupedItems = reservationBody.items.reduce<Map<string, number>>((accumulator, item) => {
    const currentQuantity = accumulator.get(item.productId) ?? 0;
    accumulator.set(item.productId, currentQuantity + item.quantity);
    return accumulator;
  }, new Map<string, number>());

  if (!groupedItems.size) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'La reserva no contiene productos.');
  }

  const decrementedProducts: Array<{ productId: string; quantity: number }> = [];

  try {
    const reservationItems = [];

    for (const [productId, quantity] of groupedItems.entries()) {
      const product = await Product.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(productId),
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        {
          new: true,
        }
      );

      if (!product) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Uno de los productos no tiene stock suficiente para completar la reserva.'
        );
      }

      decrementedProducts.push({ productId, quantity });

      reservationItems.push({
        product: product._id,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl ?? '',
        unitPrice: product.price,
        quantity,
        subtotal: product.price * quantity,
      });
    }

    const total = reservationItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = reservationItems.reduce((sum, item) => sum + item.quantity, 0);

    return Reservation.create({
      user: userId,
      items: reservationItems,
      total,
      totalItems,
      status: 'confirmed',
    });
  } catch (error) {
    await Promise.all(
      decrementedProducts.map((item) =>
        Product.updateOne(
          { _id: new mongoose.Types.ObjectId(item.productId) },
          { $inc: { stock: item.quantity } }
        )
      )
    );

    throw error;
  }
};

export const queryReservationsByUser = async (
  userId: mongoose.Types.ObjectId,
  options: IOptions
): Promise<QueryResult> =>
  Reservation.paginate(
    { user: userId },
    {
      ...options,
      sortBy: options.sortBy || 'createdAt:desc',
    }
  );
