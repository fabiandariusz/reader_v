import { Router } from 'express';
import { getSettings, updateSettings, testConnection } from '../controllers/settingsController';

const router = Router();

router.get('/',      getSettings);      // GET  /api/settings
router.put('/',      updateSettings);   // PUT  /api/settings
router.post('/test', testConnection);   // POST /api/settings/test

export default router;
