import React, { useEffect, useState } from 'react';
// Link is needed if navigating back or to other pages, but for a standalone simplified version,
// its direct usage within this component might be limited without a router context.
// However, it's good practice to keep it if the intention is to place this component
// within a routing environment.
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { formatCurrency } from '../utils';

// Define interfaces for order data structure (extended for detail page)
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
  country: string; // Added for OrderDetailPage
}

interface Order {
  _id: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string; // Added for OrderDetailPage
  isPaid: boolean; // Added for OrderDetailPage
  paidAt?: string; // Added for OrderDetailPage (optional)
  deliveredAt?: string; // Added for OrderDetailPage (optional)
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
const MapPin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin">
    <path d="M12 18.3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
  </svg>
);

const CreditCard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-credit-card">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
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

const DollarSign = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);


const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch order by ID from API
  useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      if (!id) { setCurrentOrder(null); setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const res = await axiosInstance.get(`/orders/${id}`);
        const data = res.data;
        // Normalize minimal fields used in UI if needed
        const normalized: Order = {
          _id: data._id || id,
          createdAt: data.createdAt || new Date().toISOString(),
          totalPrice: Number(data.totalPrice || 0),
          status: data.status || 'pending',
          orderItems: (data.orderItems || []).map((it: any) => ({
            product: typeof it.product === 'object' && it.product !== null
              ? { name: it.product.name || it.name || 'Item', images: it.product.images || it.images || [] }
              : { name: it.name || 'Item', images: it.images || [] },
            quantity: Number(it.quantity || 0),
            price: Number(it.price || it.product?.price || 0),
          })),
          shippingAddress: data.shippingAddress || { street: '', city: '', state: '', zipCode: '', country: '' },
          paymentMethod: data.paymentMethod || 'card',
          isPaid: Boolean(data.isPaid),
          paidAt: data.paidAt,
          deliveredAt: data.deliveredAt,
        };
        if (isMounted) setCurrentOrder(normalized);
      } catch (error: any) {
        // API call failed, set order to null
        console.error('Failed to fetch order:', error);
        if (isMounted) setCurrentOrder(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchOrder();
    return () => { isMounted = false; };
  }, [id]);

  // Calculate subtotal
  const subtotal = currentOrder ? currentOrder.orderItems.reduce((total, item) => total + (item.price * item.quantity), 0) : 0;
  // Assuming a fixed tax rate (e.g., 8%)
  const taxRate = 0.08;
  const taxAmount = subtotal * taxRate;
  // Shipping is total - subtotal - tax
  const shippingCost = currentOrder ? (currentOrder.totalPrice - subtotal - taxAmount) : 0;


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you are looking for does not exist or an error occurred.</p>
          {/* Optional: Link back to orders page or home */}
          <Link
            to="/orders"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success banner and quick access to My Orders */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-green-800 font-semibold">Order placed successfully</p>
          </div>
          <Link to="/orders" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600">
            My Orders
          </Link>
        </div>
        {/* Page Title and Back Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Order Details <span className="text-gray-600 text-2xl">#{currentOrder._id.slice(-8).toUpperCase()}</span></h1>
          {/* Example of a back button, assuming /orders is your orders list page */}
          <Link
            to="/orders"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            &larr; Back to Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content Area (Order Items) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {currentOrder.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
                    <img
                      src={item.product.images?.[0]?.url || `https://placehold.co/80x80/E0E0E0/333333?text=${item.product.name.split(' ').map(n => n[0]).join('')}`}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        e.currentTarget.src = `https://placehold.co/80x80/E0E0E0/333333?text=No+Image`;
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-gray-900">{item.product.name}</p>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-gray-800 font-medium">{formatCurrency(item.price, 'INR')} each</p>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(item.price * item.quantity, 'INR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal, 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{formatCurrency(shippingCost, 'INR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium">{formatCurrency(taxAmount, 'INR')}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">{formatCurrency(currentOrder.totalPrice, 'INR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
              </div>
              <div className="text-gray-700 leading-relaxed">
                <p>{currentOrder.shippingAddress.street}</p>
                <p>
                  {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state}{' '}
                  {currentOrder.shippingAddress.zipCode}
                </p>
                <p>{currentOrder.shippingAddress.country}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
              </div>
              <p className="text-gray-700 capitalize">{currentOrder.paymentMethod}</p>
              <p className="text-sm mt-1">
                {currentOrder.isPaid ? (
                  <span className="text-green-600 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Paid on {new Date(currentOrder.paidAt!).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Not Paid
                  </span>
                )}
              </p>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Order Placed</span>
                  <span className="text-sm text-gray-500">
                    {new Date(currentOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {currentOrder.paidAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Payment Confirmed</span>
                    <span className="text-sm text-gray-500">
                      {new Date(currentOrder.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {currentOrder.deliveredAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Delivered</span>
                    <span className="text-sm text-gray-500">
                      {new Date(currentOrder.deliveredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
