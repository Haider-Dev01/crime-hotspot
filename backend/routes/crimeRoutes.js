const express = require('express');
const router = express.Router();
const { getCrimes, getCrimeTypes, getCrimeStatsByType } = require('../controllers/crimeController');
const { getMeta, getDemographicsSummary, getDistrictSocio } = require('../controllers/socioController');

router.get('/meta', getMeta);
router.get('/demographics/summary', getDemographicsSummary);
router.get('/stats/districts', getDistrictSocio);

router.get('/crimes/types', getCrimeTypes);
router.get('/crimes', getCrimes);
router.get('/stats/types', getCrimeStatsByType);

module.exports = router;
