import express from "express";
import cors from "cors";
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lipaNaMpesaRoutes from "./routes/routes.lipanampesa.js";
import transactionRoutes from './routes/transactionRoutes.js';
import userActivityRoutes from './routes/userActivity.js';

const uri = process.env.MONGO_URI;

async function connectToDatabase() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

connectToDatabase();

const app = express();

// Rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 429,
        message: "Too many requests, chill out for a bit 🚫",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply middleware
app.use(express.json());
app.use(cors());
app.use(limiter);

// Route handlers
app.use('/api/mpesa', lipaNaMpesaRoutes);
app.use('/api/activity', userActivityRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
