import { Router } from 'express';
import { listTags, createTag, deleteTag } from '../controllers/tagController';

const router = Router();

router.get('/',      listTags);   // GET  /api/tags
router.post('/',     createTag);  // POST /api/tags
router.delete('/:id',deleteTag);  // DEL  /api/tags/:id

export default router;
