import { Request, Response } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as reservationService from './reservation.service';

export const createReservation = catchAsync(async (req: Request, res: Response) => {
  const reservation = await reservationService.createReservation(
    new mongoose.Types.ObjectId(req.user.id),
    req.body
  );

  res.status(httpStatus.CREATED).send(reservation);
});

export const getMyReservations = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const reservations = await reservationService.queryReservationsByUser(
    new mongoose.Types.ObjectId(req.user.id),
    options
  );

  res.send(reservations);
});

export const getAdminOverview = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const overview = await reservationService.getAdminOverview(options);

  res.send(overview);
});
