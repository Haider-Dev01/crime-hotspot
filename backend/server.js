const express = require('express');
const cors = require('cors');
const path = require('path');
const crimeRoutes = require('./routes/crimeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS)
// Allows frontend applications (e.g. on other ports/hosts) to make requests to the REST API
app.use(cors());

// Body parser middleware (if any POST requests are introduced later)
app.use(express.json());

// Log incoming API requests to the console for easier debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount crime REST API routes at /api
app.use('/api', crimeRoutes);

// Base health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chicago Crime Hotspot Visualization API is running!',
    endpoints: {
      allCrimes: '/api/crimes',
      crimesByType: '/api/crimes?type=THEFT',
      uniqueCrimeTypes: '/api/crimes/types',
      statsByType: '/api/stats/types'
    }
  });
});

// 404 Route handler for unregistered paths
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.url}`
  });
});

// Centralized Error-Handling Middleware
// Captures errors thrown anywhere in the application and returns a standardized JSON response
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err.stack || err.message);
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start listening on the specified port
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  CRIME HOTSPOT BACKEND STARTED SUCCESSFULLY!`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Health Check:     http://localhost:${PORT}/`);
  console.log(`==================================================\n`);
});
