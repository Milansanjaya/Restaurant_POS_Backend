import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {createReservation,getReservations,updateReservationStatus,seatReservation} from "./reservation.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_REPORTS"),
  getReservations
);

router.post(
  "/",
  authenticate,
  authorize("CREATE_SALE"),
  createReservation
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("CREATE_SALE"),
  updateReservationStatus
);

router.post(
  "/:id/seat",
  authenticate,
  authorize("CREATE_SALE"),
  seatReservation
);

export default router;