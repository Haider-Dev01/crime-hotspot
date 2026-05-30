const express = require('express');
const router = express.Router();
const { getCrimes, getCrimeTypes, getCrimeStatsByType } = require('../controllers/crimeController');

// Route for getting unique crime types
// Note: Placed before dynamic/general routes for safety and clarity
router.get('/crimes/types', getCrimeTypes);

// Route for getting all crimes (supports optional filtering via ?type=...)
router.get('/crimes', getCrimes);

// Route for getting crime count statistics by type
router.get('/stats/types', getCrimeStatsByType);

module.exports = router;
