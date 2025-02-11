import { Router } from 'express';
import { GuestFormController } from '../controllers/guestFormController';

const router = Router();

router.post('/submit-form', GuestFormController.submitForm);

export default router; 