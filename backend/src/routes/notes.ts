import { Router } from 'express';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  addTagToNote,
  removeTagFromNote,
} from '../controllers/noteController';

const router = Router();

router.get('/',                      listNotes);        // GET  /api/notes?videoId=x
router.get('/:id',                   getNote);          // GET  /api/notes/:id
router.post('/',                     createNote);       // POST /api/notes
router.put('/:id',                   updateNote);       // PUT  /api/notes/:id
router.delete('/:id',                deleteNote);       // DEL  /api/notes/:id
router.post('/:id/tags',             addTagToNote);     // POST /api/notes/:id/tags
router.delete('/:id/tags/:tagId',    removeTagFromNote);// DEL  /api/notes/:id/tags/:tagId

export default router;
