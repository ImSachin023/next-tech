const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
// Always use real auth middleware
const { auth } = require('../middleware/auth');

// Get all active coupons
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }]
    }).sort({ priority: -1, createdAt: -1 });

    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate coupon
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, orderValue, products, paymentMethod } = req.body;
    const userId = req.user._id;

    const now = new Date();

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid coupon code'
      });
    }

    const couponValidFrom = new Date(coupon.validFrom);
    const couponValidUntil = new Date(coupon.validUntil);
    const couponUsageLimit = coupon.usageLimit;
    const couponUsageCount = coupon.usageCount || 0;
    const couponMinOrderValue = coupon.minOrderValue || 0;
    const couponUserUsageLimit = coupon.userUsageLimit || 1;
    const couponPaymentMethods = coupon.paymentMethods || [];
    const couponDiscountType = coupon.discountType;
    const couponDiscountValue = coupon.discountValue;
    const couponMaxDiscount = coupon.maxDiscount;

    if (couponValidFrom > now || couponValidUntil < now) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon has expired or not yet valid'
      });
    }

    if (couponUsageLimit && couponUsageCount >= couponUsageLimit) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    if (orderValue < couponMinOrderValue) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order value should be ₹${couponMinOrderValue}`
      });
    }

    let userUsage = (coupon.usedBy || []).filter(usage => usage.user.toString() === userId.toString()).length;

    if (userUsage >= couponUserUsageLimit) {
      return res.status(400).json({
        valid: false,
        message: 'You have already used this coupon'
      });
    }

    if (couponPaymentMethods.length > 0 && paymentMethod) {
      if (!couponPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          valid: false,
          message: `This coupon is only valid for ${couponPaymentMethods.join(', ')} payments`
        });
      }
    }

    let discountAmount = 0;
    if (couponDiscountType === 'percentage') {
      discountAmount = (orderValue * couponDiscountValue) / 100;
      if (couponMaxDiscount) {
        discountAmount = Math.min(discountAmount, couponMaxDiscount);
      }
    } else {
      discountAmount = couponDiscountValue;
    }

    discountAmount = Math.min(discountAmount, orderValue);

    return res.json({
      valid: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        discountType: couponDiscountType,
        discountValue: couponDiscountValue
      },
      discountAmount,
      finalAmount: orderValue - discountAmount
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply coupon (when order is placed)
router.post('/apply', auth, async (req, res) => {
  try {
    const { code, orderValue, discountApplied } = req.body;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.usedBy.push({
      user: userId,
      usedAt: new Date(),
      orderValue,
      discountApplied
    });

    coupon.usageCount += 1;

    await coupon.save();
    return res.json({ message: 'Coupon applied successfully' });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's available coupons
router.get('/user/available', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }]
    });

    const availableCoupons = coupons.filter(coupon => {
      let userUsage = (coupon.usedBy || []).filter(
        usage => usage.user.toString() === userId.toString()
      ).length;

      if (userUsage >= (coupon.userUsageLimit || 1)) {
        return false;
      }

      if (coupon.userRestrictions && coupon.userRestrictions.specificUsers && coupon.userRestrictions.specificUsers.length > 0) {
        return coupon.userRestrictions.specificUsers.includes(userId);
      }

      return true;
    });

    res.json(availableCoupons);
  } catch (error) {
    console.error('Get user coupons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create coupon (admin)
router.post('/', auth, async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update coupon (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get coupon analytics (admin)
router.get('/analytics/:id', auth, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('usedBy.user', 'name email');

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const analytics = {
      totalUsage: coupon.usageCount,
      totalDiscount: coupon.usedBy.reduce((sum, usage) => sum + usage.discountApplied, 0),
      totalOrderValue: coupon.usedBy.reduce((sum, usage) => sum + usage.orderValue, 0),
      averageOrderValue:
        coupon.usedBy.length > 0
          ? coupon.usedBy.reduce((sum, usage) => sum + usage.orderValue, 0) / coupon.usedBy.length
          : 0,
      usageByDay: {} // You can implement daily usage analytics
    };

    res.json({
      coupon,
      analytics
    });
  } catch (error) {
    console.error('Coupon analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
