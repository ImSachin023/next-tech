import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchCart } from '../store/slices/cartSlice';
import PaymentSelector from '../components/PaymentSelector';
import paymentService from '../services/paymentService';
import { clearCart } from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';
import toast from 'react-hot-toast';

const PaymentPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items, totalAmount } = useSelector((state: RootState) => state.cart);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Shipping address state (editable in checkout)
  const [shippingAddress, setShippingAddress] = useState({
    street: '', city: '', state: '', zipCode: '', country: 'India'
  });

  // Prefill from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('checkout_shipping');
      if (saved) setShippingAddress(JSON.parse(saved));
    } catch {}
  }, []);

  const handleShippingChange = (key: string, value: string) => {
    setShippingAddress((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('checkout_shipping', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Use live cart data instead of static sample (already using items/totalAmount above)
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);
  const orderDetails = {
    amount: totalAmount,
    currency: 'INR',
    orderId: 'ORD_' + Date.now(),
    items: items.map((ci: any) => ({
      name: ci.product?.name || 'Item',
      price: ci.product?.price || 0,
      quantity: ci.quantity || 1
    }))
  } as const;

  const handlePaymentSuccess = async (result: any) => {
    console.log('Payment successful:', result);
    setPaymentResult(result);

    try {
      // Guard: must be logged in
      const storedUserRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
      const storedToken = localStorage.getItem('token') || (() => {
        try { return storedUserRaw ? JSON.parse(storedUserRaw)?.token : null; } catch { return null; }
      })();
      if (!storedToken) {
        toast.error('Please log in to place an order.');
        // Optional redirect to login
        // navigate('/login?redirect=/payment');
        return;
      }

      // 1) Create order after successful payment
      if (!items || items.length === 0) {
        toast.error('Cart is empty, cannot create order.');
        return;
      }

      // Normalize payment method to backend-supported values
      const allowedMethods = ['razorpay', 'paypal', 'stripe', 'googlepay', 'phonepe', 'upi', 'cod'] as const;
      const method = allowedMethods.includes(result?.paymentMethod) ? result.paymentMethod : 'cod';

      const orderData = {
        orderItems: items.map((item: any) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        shippingAddress: shippingAddress,
        paymentMethod: method,
        paymentResult: result,
        totalPrice: totalAmount,
      };

      const created = await dispatch(createOrder(orderData)).unwrap();
      window.dispatchEvent(new Event('ordersUpdated'));
      toast.success('Order placed successfully!');
      navigate(`/orders/${created._id}`);
    } catch (e: any) {
      console.error('Failed to create order after payment:', e);
      const msg = typeof e === 'string' ? e : (e?.message || 'Order creation failed. Please check My Orders.');
      toast.error(msg);
    }

    // 2) Clear cart and update UI
    setPaymentStatus('success');
    try { await dispatch(clearCart()).unwrap(); } catch {}
    localStorage.removeItem('mock_cart_v1');
    localStorage.removeItem('mockCart');
    window.dispatchEvent(new Event('cartUpdated'));
    try { await dispatch(fetchCart()); } catch {}
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setErrorMessage(error);
    setPaymentStatus('error');
  };

  const handleTryAgain = () => {
    setPaymentStatus('pending');
    setPaymentResult(null);
    setErrorMessage('');
  };

  if (paymentStatus === 'success') {
    const isCOD = paymentResult?.paymentMethod === 'cod';
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{isCOD ? 'Order Placed' : 'Payment Successful!'}</h1>
            <p className="text-gray-600 mb-6">
              {isCOD ? 'Payment Mode: COD' : 'Your payment has been processed successfully.'}
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">{isCOD ? 'Order Details' : 'Payment Details'}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono">{paymentResult?.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  {isCOD ? (
                    <span>COD</span>
                  ) : (
                    <span className="capitalize">{paymentResult?.paymentMethod}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">{orderDetails.currency} {orderDetails.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-semibold">{isCOD ? 'Order Placed' : 'Success'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to="/orders"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors inline-block"
              >
                View My Orders
              </Link>
              <Link
                to="/"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium transition-colors inline-block"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'Something went wrong with your payment. Please try again.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleTryAgain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/cart"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium transition-colors inline-block"
              >
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/cart" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Shipping Address Form */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Street"
                    value={shippingAddress.street}
                    onChange={(e) => handleShippingChange('street', e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => handleShippingChange('city', e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="State"
                      value={shippingAddress.state}
                      onChange={(e) => handleShippingChange('state', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="ZIP / PIN Code"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleShippingChange('zipCode', e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Country"
                      value={shippingAddress.country}
                      onChange={(e) => handleShippingChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {orderDetails.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{orderDetails.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{orderDetails.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  🔒 Your payment information is secure and encrypted
                </p>
              </div>
            </div>
          </div>

          {/* Payment Selector */}
          <div className="lg:col-span-2">
            <PaymentSelector
              amount={orderDetails.amount}
              currency={orderDetails.currency}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              allowedProviders={(() => {
                // Prefer per-product acceptance; intersect across cart items
                try {
                  const HIGH_VALUE = 30000;
                  const base = paymentService.getAvailablePaymentMethods();
                  const perItemAllowed = items.map((ci: any) => {
                    const p = ci.product;
                    const productAcceptance = p?.paymentAcceptance;
                    let acceptance = productAcceptance;
                    if (!acceptance) {
                      try {
                        const vendorCfg = localStorage.getItem('vendorPaymentAcceptance');
                        acceptance = vendorCfg ? JSON.parse(vendorCfg) : null;
                      } catch {}
                    }
                    if (!acceptance || acceptance.acceptAll) return base;
                    const isHigh = (p?.price || 0) >= (acceptance.highValueThreshold || HIGH_VALUE);
                    const list = isHigh ? acceptance.acceptedMethodsAboveThreshold : acceptance.acceptedMethods;
                    return (Array.isArray(list) && list.length) ? list : base;
                  });
                  const intersection = perItemAllowed.reduce((acc: any[], curr: any[]) => acc.filter(x => curr.includes(x)), base);
                  return intersection && intersection.length ? intersection : base;
                } catch {
                  return paymentService.getAvailablePaymentMethods();
                }
              })()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;