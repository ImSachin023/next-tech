// Mock order controller for development/testing when MongoDB is unavailable
const asyncHandler = require('express-async-handler');

// Mock order data store (in-memory)
let mockOrders = [];
let nextOrderId = 1;

// Mock order functions
const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No order items (Mock Mode)'
    });
  }

  // Create mock order
  const mockOrder = {
    _id: `mock-order-${nextOrderId++}`,
    user: req.user?._id || 'mock-user-1',
    orderItems: orderItems.map(item => ({
      product: item.product,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image
    })),
    shippingAddress,
    paymentMethod,
    paymentResult: paymentMethod === 'cod' ? {} : {
      id: 'mock-payment-id',
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: 'mock@example.com'
    },
    itemsPrice: itemsPrice || 0,
    taxPrice: taxPrice || 0,
    shippingPrice: shippingPrice || 0,
    totalPrice: totalPrice || 0,
    isPaid: paymentMethod === 'cod' ? false : true,
    paidAt: paymentMethod === 'cod' ? null : new Date(),
    isDelivered: false,
    deliveredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockOrders.push(mockOrder);

  res.status(201).json({
    success: true,
    message: 'Order created successfully (Mock Mode)',
    data: mockOrder
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = mockOrders.find(o => o._id === req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found (Mock Mode)'
    });
  }

  // Check if order belongs to user (unless admin)
  if (order.user !== req.user?._id && req.user?.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to view this order (Mock Mode)'
    });
  }

  res.json({
    success: true,
    data: order
  });
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = mockOrders.find(o => o._id === req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found (Mock Mode)'
    });
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentResult = {
    id: req.body.id || 'mock-payment-id',
    status: req.body.status || 'completed',
    update_time: new Date().toISOString(),
    email_address: req.body.email_address || 'mock@example.com'
  };

  res.json({
    success: true,
    message: 'Order marked as paid (Mock Mode)',
    data: order
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const userOrders = mockOrders.filter(o => o.user === req.user?._id);

  res.json({
    success: true,
    data: userOrders,
    count: userOrders.length
  });
});

const getOrders = asyncHandler(async (req, res) => {
  // In mock mode, return all orders for admin view
  res.json({
    success: true,
    data: mockOrders,
    count: mockOrders.length
  });
});

const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = mockOrders.find(o => o._id === req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found (Mock Mode)'
    });
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();

  res.json({
    success: true,
    message: 'Order marked as delivered (Mock Mode)',
    data: order
  });
});

const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  // Mock Stripe payment intent response
  res.json({
    success: true,
    clientSecret: `mock_client_secret_${Date.now()}`,
    amount: amount,
    currency: 'usd',
    metadata: {
      mockMode: true
    }
  });
});

const trackOrder = asyncHandler(async (req, res) => {
  const order = mockOrders.find(o => o._id === req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found (Mock Mode)'
    });
  }

  // Mock tracking information
  const trackingInfo = {
    orderId: order._id,
    status: order.isDelivered ? 'delivered' : order.isPaid ? 'shipped' : 'processing',
    trackingNumber: order.isPaid ? `MOCK${order._id.split('-')[2]}` : null,
    estimatedDelivery: order.isDelivered ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        status: 'Order Placed',
        timestamp: order.createdAt,
        location: 'Mock Warehouse'
      },
      ...(order.isPaid ? [{
        status: 'Payment Confirmed',
        timestamp: order.paidAt,
        location: 'Mock Payment Processor'
      }] : []),
      ...(order.isDelivered ? [{
        status: 'Delivered',
        timestamp: order.deliveredAt,
        location: 'Mock Delivery Location'
      }] : [])
    ]
  };

  res.json({
    success: true,
    data: trackingInfo
  });
});

module.exports = {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  createPaymentIntent,
  trackOrder
};