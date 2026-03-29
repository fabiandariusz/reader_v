import { Router } from 'express';
import {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  streamVideo,
  regenerateThumbnail,
  exportNotes,
  uploadVideo,
  videoUpload,
} from '../controllers/videoController';

const router = Router();

router.get('/',                    listVideos);                              // GET  /api/videos
router.get('/:id/stream',          streamVideo);                             // GET  /api/videos/:id/stream
router.get('/:id/export',          exportNotes);                             // GET  /api/videos/:id/export?format=md|txt|pdf
router.get('/:id',                 getVideo);                                // GET  /api/videos/:id
router.post('/upload',             videoUpload.single('file'), uploadVideo); // POST /api/videos/upload
router.post('/',                   createVideo);                             // POST /api/videos
router.post('/:id/thumbnail',      regenerateThumbnail);                     // POST /api/videos/:id/thumbnail
router.put('/:id',                 updateVideo);                             // PUT  /api/videos/:id
router.delete('/:id',              deleteVideo);                             // DEL  /api/videos/:id

export default router;
