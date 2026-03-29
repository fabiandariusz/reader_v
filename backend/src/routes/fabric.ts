import { Router } from 'express';
import { getPatterns, getConfig, saveConfig, runFabricPattern } from '../controllers/fabricController';

const router = Router();

router.get('/patterns', getPatterns);          // GET  /api/fabric/patterns
router.get('/config',   getConfig);            // GET  /api/fabric/config
router.put('/config',   saveConfig);           // PUT  /api/fabric/config
router.post('/run',     runFabricPattern);     // POST /api/fabric/run  (SSE)

export default router;
