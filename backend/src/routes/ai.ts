import { Router } from 'express';
import {
  streamSummary,
  streamConcepts,
  streamQuiz,
  streamChat,
  getCachedSummary,
  getCachedQuiz,
} from '../controllers/aiController';

const router = Router();

// Streaming generation (SSE)
router.post('/summarize',    streamSummary);   // POST /api/ai/summarize
router.post('/concepts',     streamConcepts);  // POST /api/ai/concepts
router.post('/quiz',         streamQuiz);      // POST /api/ai/quiz
router.post('/chat',         streamChat);      // POST /api/ai/chat

// Cached results
router.get('/summary/:videoId', getCachedSummary); // GET /api/ai/summary/:videoId
router.get('/quiz/:videoId',    getCachedQuiz);     // GET /api/ai/quiz/:videoId

export default router;
