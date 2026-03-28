import { Router } from 'express';
import { getTranscript, startTranscription } from '../controllers/transcriptionController';

const router = Router();

router.get('/:videoId',  getTranscript);      // GET  /api/transcription/:videoId
router.post('/:videoId', startTranscription); // POST /api/transcription/:videoId

export default router;
