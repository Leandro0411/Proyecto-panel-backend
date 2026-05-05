import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import Product from '../product/product.model';
import Reservation from './reservation.model';
import {
  CreateReservationBody,
  IReservationAdminOverview,
  IReservationAdminRecord,
  IReservationCategoryBreakdown,
  IReservationDoc,
  IReservationMonthlySale,
} from './reservation.interfaces';

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

export const getAdminOverview = async (options: IOptions): Promise<IReservationAdminOverview> => {
  const totalsAggregation = await Reservation.aggregate<{
    totalRevenue: number;
    totalReservations: number;
    totalItemsSold: number;
  }>([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalReservations: { $sum: 1 },
        totalItemsSold: { $sum: '$totalItems' },
      },
    },
  ]);

  const totals = totalsAggregation[0] ?? {
    totalRevenue: 0,
    totalReservations: 0,
    totalItemsSold: 0,
  };

  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthBuckets = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (11 - index), 1);
    const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      month,
      revenue: 0,
      reservations: 0,
      itemsSold: 0,
    };
  });

  const firstMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1);

  const monthlyAggregation = await Reservation.aggregate<IReservationMonthlySale>([
    {
      $match: {
        createdAt: { $gte: firstMonthDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$total' },
        reservations: { $sum: 1 },
        itemsSold: { $sum: '$totalItems' },
      },
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' },
              ],
            },
          ],
        },
        revenue: 1,
        reservations: 1,
        itemsSold: 1,
      },
    },
    {
      $sort: { month: 1 },
    },
  ]);

  const monthlyByKey = new Map(monthlyAggregation.map((item) => [item.month, item]));
  const monthlySales = monthBuckets.map((bucket) => monthlyByKey.get(bucket.month) ?? bucket);

  const categoryBreakdown = await Reservation.aggregate<IReservationCategoryBreakdown>([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        revenue: { $sum: '$items.subtotal' },
        itemsSold: { $sum: '$items.quantity' },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        revenue: 1,
        itemsSold: 1,
      },
    },
    {
      $sort: { revenue: -1 },
    },
  ]);

  const limit = options.limit && parseInt(options.limit.toString(), 10) > 0 ? parseInt(options.limit.toString(), 10) : 10;
  const page = options.page && parseInt(options.page.toString(), 10) > 0 ? parseInt(options.page.toString(), 10) : 1;
  const skip = (page - 1) * limit;
  const totalResults = await Reservation.countDocuments({});
  const reservationDocs = await Reservation.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email role')
    .lean();

  const recentReservations: QueryResult = {
    results: reservationDocs.map((reservation: any) => {
      const user = reservation.user ?? {};

      const adminReservation: IReservationAdminRecord = {
        id: reservation._id.toString(),
        user: {
          id: user._id?.toString?.() ?? '',
          name: user.name ?? 'Usuario sin nombre',
          email: user.email ?? 'Sin email',
          role: user.role ?? 'user',
        },
        items: reservation.items ?? [],
        total: reservation.total ?? 0,
        totalItems: reservation.totalItems ?? 0,
        status: reservation.status ?? 'confirmed',
        createdAt: reservation.createdAt,
      };

      return adminReservation as any;
    }),
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
  };

  return {
    summary: {
      totalRevenue: totals.totalRevenue,
      totalReservations: totals.totalReservations,
      totalItemsSold: totals.totalItemsSold,
      averageTicket: totals.totalReservations ? totals.totalRevenue / totals.totalReservations : 0,
    },
    monthlySales,
    categoryBreakdown,
    recentReservations,
  };
};
