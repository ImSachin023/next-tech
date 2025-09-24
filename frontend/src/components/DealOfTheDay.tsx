import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Star, 
  ShoppingCart, 
  Heart, 
  Zap, 
  TrendingUp,
  Users,
  Timer,
  Gift,
  Flame
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../store/store';
import { addToCart } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { useCountdown } from '../hooks/useCountdown';
import toast from 'react-hot-toast';

interface DealProduct {
  _id: string;
  name: string;
  price: number;
  images: { url: string; alt: string }[];
  rating: number;
  numReviews: number;
  dealPrice: number;
  dealEndTime: string;
  dealStock: number;
  dealSold: number;
  isLimitedTime: boolean;
  dealBadge?: string;
}

interface DealOfTheDayProps {
  deals: DealProduct[];
  onViewAll?: () => void;
}

const DealOfTheDay: React.FC<DealOfTheDayProps> = ({ deals, onViewAll }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { wishlist } = useAppSelector(state => state.wishlist);
  const { user } = useAppSelector(state => state.auth);
  const wishlistItems = wishlist?.items || [];
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const currentDeal = deals[currentDealIndex];
  const timeLeft = useCountdown(currentDeal?.dealEndTime);

  // Auto-rotate deals every 10 seconds
  useEffect(() => {
    if (!isAutoPlay || deals.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentDealIndex((prev) => (prev + 1) % deals.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [deals.length, isAutoPlay]);

  const handleAddToCart = async (product: DealProduct) => {
    // Check if user is logged in using Redux state first, then localStorage as fallback
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const isAuthenticated = user || (storedUser && storedToken);
    
    if (!isAuthenticated) {
      // User not logged in - redirect to login
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (product.dealStock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    // User is logged in - use Redux/API cart system
    try {
      await dispatch(addToCart({
        productId: product._id,
        quantity: 1
      })).unwrap();
      toast.success(`${product.name} added to cart at deal price!`);
    } catch (error: any) {
      console.error('Cart error:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  const handleToggleWishlist = (productId: string) => {
    dispatch(toggleWishlist(productId));
    const isInWishlist = wishlistItems.some(item => item.product._id === productId);
    toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.product._id === productId);
  };

  const getDiscountPercentage = (original: number, deal: number) => {
    return Math.round(((original - deal) / original) * 100);
  };

  const getStockPercentage = (sold: number, total: number) => {
    return Math.min((sold / total) * 100, 100);
  };

  const formatTime = (time: number) => {
    return time.toString().padStart(2, '0');
  };

  // Show blank placeholder card as requested
if (true) return (
  <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full"></div>
    </div>

    <div className="relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 p-2 rounded-lg">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Deal of the Day</h2>
            <p className="text-white text-opacity-80">Limited time offers</p>
          </div>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Placeholder Image */}
        <div className="relative">
          <div className="aspect-square bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="w-full h-full rounded-lg bg-white bg-opacity-20 animate-pulse"></div>
          </div>
        </div>

        {/* Placeholder Details */}
        <div className="space-y-4">
          <div className="h-6 w-2/3 bg-white bg-opacity-30 rounded animate-pulse"></div>
          <div className="h-4 w-1/2 bg-white bg-opacity-20 rounded animate-pulse"></div>
          <div className="h-8 w-1/3 bg-white bg-opacity-30 rounded animate-pulse"></div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="h-10 bg-white bg-opacity-30 rounded animate-pulse"></div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <div className="h-2 bg-white bg-opacity-30 rounded animate-pulse"></div>
          </div>
          <div className="flex space-x-3">
            <div className="flex-1 h-12 bg-white bg-opacity-30 rounded animate-pulse"></div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

  return (
    <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Deal of the Day</h2>
              <p className="text-white text-opacity-80">Limited time offers</p>
            </div>
          </div>
          
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
            >
              View All Deals
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentDealIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-6 items-center"
          >
            {/* Product Image */}
            <div className="relative">
              <div className="aspect-square bg-white bg-opacity-10 rounded-2xl p-6 backdrop-blur-sm">
                <img
                  src={currentDeal.images[0]?.url || '/placeholder-product.jpg'}
                  alt={currentDeal.name}
                  className="w-full h-full object-contain rounded-lg"
                />
                
                {/* Deal Badge */}
                {currentDeal.dealBadge && (
                  <div className="absolute top-4 left-4 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                    {currentDeal.dealBadge}
                  </div>
                )}

                {/* Discount Badge */}
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {getDiscountPercentage(currentDeal.price, currentDeal.dealPrice)}% OFF
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2 line-clamp-2">
                  {currentDeal.name}
                </h3>
                
                {/* Rating */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-300 fill-current" />
                    <span className="font-medium">{currentDeal.rating}</span>
                  </div>
                  <span className="text-white text-opacity-70">({currentDeal.numReviews} reviews)</span>
                </div>

                {/* Price */}
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl font-bold">
                    ₹{currentDeal.dealPrice.toLocaleString()}
                  </span>
                  <span className="text-lg text-white text-opacity-70 line-through">
                    ₹{currentDeal.price.toLocaleString()}
                  </span>
                  <span className="bg-green-400 text-green-900 px-2 py-1 rounded text-sm font-bold">
                    Save ₹{(currentDeal.price - currentDeal.dealPrice).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Countdown Timer */}
              {timeLeft && (
                <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Timer className="h-4 w-4" />
                    <span className="text-sm font-medium">Deal ends in:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-white bg-opacity-30 rounded px-2 py-1 min-w-[40px] text-center">
                      <div className="text-lg font-bold">{formatTime(timeLeft.hours)}</div>
                      <div className="text-xs opacity-80">HRS</div>
                    </div>
                    <span className="text-xl">:</span>
                    <div className="bg-white bg-opacity-30 rounded px-2 py-1 min-w-[40px] text-center">
                      <div className="text-lg font-bold">{formatTime(timeLeft.minutes)}</div>
                      <div className="text-xs opacity-80">MIN</div>
                    </div>
                    <span className="text-xl">:</span>
                    <div className="bg-white bg-opacity-30 rounded px-2 py-1 min-w-[40px] text-center">
                      <div className="text-lg font-bold">{formatTime(timeLeft.seconds)}</div>
                      <div className="text-xs opacity-80">SEC</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Progress */}
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {currentDeal.dealSold} sold out of {currentDeal.dealStock}
                    </span>
                  </div>
                  <span className="text-sm">
                    {Math.round(getStockPercentage(currentDeal.dealSold, currentDeal.dealStock))}% claimed
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
                  <motion.div
                    className="bg-yellow-400 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${getStockPercentage(currentDeal.dealSold, currentDeal.dealStock)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <motion.button
                  type="button"
                  onClick={() => handleAddToCart(currentDeal)}
                  className="flex-1 bg-white text-purple-600 py-3 px-6 rounded-lg font-bold hover:bg-opacity-90 transition-all duration-200 flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Add to Cart</span>
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => handleToggleWishlist(currentDeal._id)}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    isInWishlist(currentDeal._id)
                      ? 'bg-red-500 text-white'
                      : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`${isInWishlist(currentDeal._id) ? 'Remove from' : 'Add to'} wishlist`}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist(currentDeal._id) ? 'fill-current' : ''}`} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Deal Navigation */}
        {deals.length > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            {deals.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setCurrentDealIndex(index);
                  setIsAutoPlay(false);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentDealIndex
                    ? 'bg-white'
                    : 'bg-white bg-opacity-40 hover:bg-opacity-60'
                }`}
                aria-label={`View deal ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealOfTheDay;