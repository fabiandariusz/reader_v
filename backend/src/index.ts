import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import videoRoutes from './routes/videos';
import noteRoutes  from './routes/notes';
import tagRoutes   from './routes/tags';
import { errorHandler, notFound } from './middleware/errorHandler';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/videos', videoRoutes);
app.use('/api/notes',  noteRoutes);
app.use('/api/tags',   tagRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
