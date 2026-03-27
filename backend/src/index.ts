import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import videoRoutes    from './routes/videos';
import noteRoutes     from './routes/notes';
import tagRoutes      from './routes/tags';
import settingsRoutes from './routes/settings';
import aiRoutes       from './routes/ai';
import { errorHandler, notFound } from './middleware/errorHandler';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api/videos',   videoRoutes);
app.use('/api/notes',    noteRoutes);
app.use('/api/tags',     tagRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai',       aiRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
