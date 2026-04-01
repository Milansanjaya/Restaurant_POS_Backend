import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {createReservation,getReservations,updateReservationStatus,seatReservation} from "./reservation.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_RESERVATIONS"),
  getReservations
);

router.post(
  "/",
  authenticate,
  authorize("CREATE_RESERVATION"),
  createReservation
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("MANAGE_RESERVATIONS"),
  updateReservationStatus
);

router.post(
  "/:id/seat",
  authenticate,
  authorize("MANAGE_RESERVATIONS"),
  seatReservation
);

export default router;