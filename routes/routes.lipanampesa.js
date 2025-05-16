import express from 'express'
const router = express.Router()
import {
    initiateSTKPush,
    initiateB2CTransaction,
    confirmPayment
} from "../controllers/controllers.lipanampesa.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {accessToken} from "../middlewares/middlewares.generateAccessToken.js";

router.route('/stkPush').post(accessToken, verifyToken, initiateSTKPush)
router.route('/withdraw/:userId').post(accessToken, verifyToken,initiateB2CTransaction)
router.route('/confirmPayment/:CheckoutRequestID').post(accessToken, verifyToken,confirmPayment)

export default router