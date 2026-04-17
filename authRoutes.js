import express from 'express';
import{login} from '../controller/authController.js';
const router = express.router()
router.get('/signup')

export default router;
