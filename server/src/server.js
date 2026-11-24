import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import './utils/async.js';
import connectDB from './config/db.js';
import employeeRoutes from './routes/employeeRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
app.use(express.json());
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB().then(() => app.listen(port, () => console.log(`API listening on ${port}`)));
