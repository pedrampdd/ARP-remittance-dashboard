const express = require('express');
const router = express.Router();

let cachedData = null;

/**
 * Sets the cached corridor data (called from index.js after startup fetch)
 */
function setCachedData(data) {
  cachedData = data;
}

/**
 * GET /api/corridors
 * Returns pre-computed corridor scores for UAE, Bahrain, and All markets
 */
router.get('/', (req, res) => {
  if (!cachedData) {
    return res.status(503).json({ error: 'Data not yet loaded. Please try again shortly.' });
  }
  res.json(cachedData);
});

module.exports = router;
module.exports.setCachedData = setCachedData;
