import { Router } from 'express';
import { searchNotes } from '../controllers/searchController';

const router = Router();

router.get('/', searchNotes); // GET /api/search?q=...

export default router;
