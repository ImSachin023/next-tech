const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getProductAnalytics,
  bulkUpdateProducts,
  searchProducts
} = require('../controllers/productController');
// Always use real auth middleware (no fallback)
const { auth, seller, adminAuth } = require('../middleware/auth');
const { ValidationRules, handleValidationErrors, rateLimits } = require('../middleware/validation');

const router = express.Router();

// Six Sigma: Define - Apply appropriate rate limiting and validation to each endpoint
// Public routes with general rate limiting
router.get('/', rateLimits.general, ValidationRules.productQuery(), handleValidationErrors, getProducts);
router.get('/search', rateLimits.api, ValidationRules.productQuery(), handleValidationErrors, searchProducts);
router.get('/:id', rateLimits.general, ValidationRules.mongoIdParam(), handleValidationErrors, getProductById);

// Track product click (e.g., when user navigates to vendor product view)
router.post('/:id/track', rateLimits.api, ValidationRules.mongoIdParam(), handleValidationErrors, async (req, res) => {
  try {
    const Product = require('../models/Product');
    const productId = req.params.id;
    await Product.updateOne({ _id: productId }, { $inc: { 'analytics.clicks': 1 } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to track click' });
  }
});

// Protected routes with API rate limiting
router.post('/',
  rateLimits.api,
  auth,
  seller,
  ValidationRules.productCreation(),
  handleValidationErrors,
  createProduct
);

router.put('/:id',
  rateLimits.api,
  auth,
  seller,
  ValidationRules.productUpdate(),
  handleValidationErrors,
  updateProduct
);

router.delete('/:id',
  rateLimits.api,
  auth,
  seller,
  ValidationRules.mongoIdParam(),
  handleValidationErrors,
  deleteProduct
);

// Review routes
router.post('/:id/reviews',
  rateLimits.api,
  auth,
  ValidationRules.mongoIdParam(),
  handleValidationErrors,
  createProductReview
);

// Admin-only routes with stricter rate limiting
router.get('/admin/analytics',
  rateLimits.api,
  auth,
  adminAuth,
  getProductAnalytics
);

router.patch('/admin/bulk',
  rateLimits.api,
  auth,
  adminAuth,
  bulkUpdateProducts
);

// Agile: Health check endpoint for this route group
router.get('/health/status', (req, res) => {
  res.json({
    service: 'products',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
