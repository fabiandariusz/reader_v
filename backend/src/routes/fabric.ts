import { Router } from 'express';
import {
  getPatterns,
  getConfig,
  saveConfig,
  runFabricPattern,
  getEnabledPatterns,
  saveEnabledPatterns,
  updatePatterns,
} from '../controllers/fabricController';

const router = Router();

router.get('/patterns/enabled', getEnabledPatterns);   // GET  /api/fabric/patterns/enabled
router.put('/patterns/enabled', saveEnabledPatterns);   // PUT  /api/fabric/patterns/enabled
router.post('/patterns/update', updatePatterns);        // POST /api/fabric/patterns/update
router.get('/patterns',         getPatterns);           // GET  /api/fabric/patterns
router.get('/config',           getConfig);             // GET  /api/fabric/config
router.put('/config',           saveConfig);            // PUT  /api/fabric/config
router.post('/run',             runFabricPattern);      // POST /api/fabric/run  (SSE)

export default router;
