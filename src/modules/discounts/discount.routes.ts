import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/permission.middleware';
import {
  createDiscount,
  deleteDiscount,
  getDiscountById,
  getDiscounts,
  toggleDiscount,
  updateDiscount,
} from './discount.controller';

const router = Router();

router.post('/', authenticate, authorize('CREATE_DISCOUNT'), createDiscount);
router.get('/', authenticate, authorize('VIEW_DISCOUNTS'), getDiscounts);
router.get('/:id', authenticate, authorize('VIEW_DISCOUNTS'), getDiscountById);
router.put('/:id', authenticate, authorize('EDIT_DISCOUNT'), updateDiscount);
router.patch('/:id', authenticate, authorize('EDIT_DISCOUNT'), updateDiscount);
router.patch('/:id/toggle', authenticate, authorize('EDIT_DISCOUNT'), toggleDiscount);
router.delete('/:id', authenticate, authorize('DELETE_DISCOUNT'), deleteDiscount);

export default router;
