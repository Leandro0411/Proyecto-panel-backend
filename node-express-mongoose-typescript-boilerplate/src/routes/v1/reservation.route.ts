import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import { validate } from '../../modules/validate';
import { reservationController, reservationValidation } from '../../modules/reservation';

const router: Router = express.Router();

router
  .route('/')
  .post(auth(), validate(reservationValidation.createReservation), reservationController.createReservation);

router
  .route('/my')
  .get(auth(), validate(reservationValidation.getMyReservations), reservationController.getMyReservations);

router
  .route('/admin/overview')
  .get(
    auth('manageProducts'),
    validate(reservationValidation.getAdminOverview),
    reservationController.getAdminOverview
  );

export default router;
