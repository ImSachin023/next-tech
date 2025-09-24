import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axiosInstance from '../utils/axiosConfig';
import { formatCurrency } from '../utils';

// Define interfaces for order data structure (consistent with OrderDetailPage)
interface ProductImage {
  url: string;
}

interface Product {
  name: string;
  images?: ProductImage[];
}

interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
}

interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string; // Optional for OrdersPage, but good to have for consistency
}

interface Order {
  _id: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod?: string; // Optional for OrdersPage
  isPaid?: boolean; // Optional for OrdersPage
  paidAt?: string; // Optional for OrdersPage
  deliveredAt?: string; // Optional for OrdersPage
}

// Placeholder for a LoadingSpinner component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  let spinnerSize = 'w-8 h-8';
  if (size === 'sm') spinnerSize = 'w-4 h-4';
  if (size === 'lg') spinnerSize = 'w-12 h-12';

  return (
    <div className={`inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-indigo-500 motion-reduce:animate-[spin_1.5s_linear_infinite] ${spinnerSize}`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
    </div>
  );
};

// Complete Placeholder for Lucide React icons
const Package = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package">
    <path d="m7.5 4.274 6.75 3.375L22 4.09 14.5 0.726 7.5 4.274Z" />
    <path d="m7.5 4.274-6.75 3.375L9 11.91 14.5 8.726 7.5 4.274Z" />
    <path d="M12.5 16.726 5 13.09 1.5 14.726 9 18.274 12.5 16.726Z" />
    <path d="M12.5 16.726 20 13.09 22.5 14.726 15 18.274 12.5 16.726Z" />
    <path d="M12 22v-8" />
  </svg>
);

const Eye = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const Calendar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const DollarSign = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);


const OrdersPage: React.FC = () => {
  // Local state for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Actual logged-in user from Redux
  const user = useSelector((state: RootState) => state.auth.user);

  // Fetch orders for logged-in user and refresh on 'ordersUpdated' events
  useEffect(() => {
    let retryTimeout: any;

    const fetchOrders = async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        if (!user) {
          setOrders([]);
          return;
        }
        // Try authenticated endpoint first
        const res = await axiosInstance.get('/orders/myorders');
        const apiOrders = res.data || [];
        setOrders(apiOrders);
      } catch (error: any) {
        // On error, clear orders and surface the issue
        setOrders([]);
        console.error('Failed to fetch orders:', error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    };

    const onOrdersUpdated = () => {
      // Immediate refresh, plus a short retry to catch eventual consistency
      fetchOrders(true);
      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => fetchOrders(true), 800);
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders(true);
      }
    };

    fetchOrders();

    window.addEventListener('ordersUpdated', onOrdersUpdated);
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      window.removeEventListener('ordersUpdated', onOrdersUpdated);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      clearTimeout(retryTimeout);
    };
  }, [user]);

  // Helper function to determine status badge color based on order status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Conditional rendering: If user is not logged in, prompt them to login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Please Log In to View Your Orders</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to access your order history.</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Conditional rendering: Show loading spinner while orders are being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Main component rendering
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 bg-gray-50 min-h-screen font-sans">
      {/* Page Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Package className="h-10 w-10 text-indigo-600" />
        <h1 className="text-4xl font-extrabold text-gray-900">My Orders</h1>
      </div>

      {/* Conditional rendering: If no orders are found */}
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Package className="h-20 w-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No orders yet!</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            It looks like you haven't placed any orders. Start exploring our products and make your first purchase!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
          >
            Start Shopping Now
          </Link>
        </div>
      ) : (
        // Render orders if available
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              {/* Order Header */}
              <div className="bg-gray-100 px-6 py-5 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Order ID</p>
                        <p className="font-semibold text-gray-900 text-base">#{order._id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Order Date</p>
                        <p className="font-semibold text-gray-900 text-base">
                          {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-semibold text-gray-900 text-base">{formatCurrency(order.totalPrice, 'INR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      <span>View Details</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="px-6 py-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items in this order:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {order.orderItems.slice(0, 3).map((item, index) => {
                    const productObj = typeof (item as any).product === 'object' ? (item as any).product : null;
                    const productName = productObj?.name || (item as any).name || 'Item';
                    const initials = productName
                      .split(' ')
                      .map((n: string) => n && n[0])
                      .filter(Boolean)
                      .join('')
                      .slice(0, 3)
                      .toUpperCase();
                    const productImage = productObj?.images?.[0]?.url || (item as any).image || `https://placehold.co/60x60/E0E0E0/333333?text=${encodeURIComponent(initials)}`;
                    return (
                      <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                        <img
                          src={productImage}
                          alt={productName}
                          className="w-16 h-16 object-cover rounded-md border border-gray-200"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            e.currentTarget.src = `https://placehold.co/60x60/E0E0E0/333333?text=No+Image`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-gray-900 truncate">
                            {productName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Qty: <span className="font-medium">{item.quantity}</span> × ${item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {order.orderItems.length > 3 && (
                    <div className="flex items-center justify-center text-base text-gray-500 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                      <span className="font-medium">+{order.orderItems.length - 3} more items</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Shipping Information:</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-medium">Address:</span>{' '}
                  {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                  {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
