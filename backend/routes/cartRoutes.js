const express = require('express');

// Always use real middleware and controllers (no mock fallback)
const { auth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = cartController;

const router = express.Router();

router.use(auth);

router.route('/').get(getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;
