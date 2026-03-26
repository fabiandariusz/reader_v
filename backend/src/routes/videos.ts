import { Router } from 'express';
import {
  listVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
} from '../controllers/videoController';

const router = Router();

router.get('/',      listVideos);   // GET  /api/videos
router.get('/:id',   getVideo);     // GET  /api/videos/:id
router.post('/',     createVideo);  // POST /api/videos
router.put('/:id',   updateVideo);  // PUT  /api/videos/:id
router.delete('/:id',deleteVideo);  // DEL  /api/videos/:id

export default router;
