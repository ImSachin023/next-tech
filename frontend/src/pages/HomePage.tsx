import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { fetchProducts } from '../store/slices/productSlice';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import QuickCommerceFeatures from '../components/QuickCommerceFeatures';
import FlashSale from '../components/FlashSale';
import SearchWithSuggestions from '../components/SearchWithSuggestions';
import LocationSelector from '../components/LocationSelector';
import CategoryQuickBrowse from '../components/CategoryQuickBrowse';
import OffersAndCoupons from '../components/OffersAndCoupons';
import LiveOrderUpdates from '../components/LiveOrderUpdates';
import DealOfTheDay from '../components/DealOfTheDay';
import SmartRecommendations from '../components/SmartRecommendations';
import ProductComparison from '../components/ProductComparison';
import BulkOrderManager from '../components/BulkOrderManager';
import HomeSlider from '../components/HomeSlider';
import { ArrowRight, Smartphone, Laptop, Headphones, Watch, MapPin, Clock, Zap, Scale, Package } from 'lucide-react';
import { Location } from '../services/locationService';

const HomePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, isLoading } = useSelector((state: RootState) => state.products);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonProducts, setComparisonProducts] = useState<any[]>([]);
  // Channel toggle: true = Quick Commerce, false = E-commerce only
  const [showQuickCommerce, setShowQuickCommerce] = useState<boolean>((new URLSearchParams(window.location.search).get('channel') || 'quick') === 'quick');

  // Pull any pending compare items from localStorage when coming back from product selection
  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('comparePending');
      const reopen = localStorage.getItem('compareReopen') === '1';
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (Array.isArray(pending) && pending.length) {
          setComparisonProducts((prev) => {
            const merged = [...prev];
            pending.forEach((p: any) => {
              if (!merged.find((x) => x._id === p._id)) merged.push(p);
            });
            return merged;
          });
          localStorage.removeItem('comparePending');
        }
      }
      if (reopen) {
        setShowComparison(true);
        localStorage.removeItem('compareReopen');
      }
    } catch {}
  }, []);
  const [showBulkOrder, setShowBulkOrder] = useState(false);
  const [viewedProducts, setViewedProducts] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channel = showQuickCommerce ? 'quick' : 'ecom';
    params.set('channel', channel);
    try {
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    } catch {}

    // Enforce location for quick commerce
    if (channel === 'quick') {
      try {
        const raw = localStorage.getItem('selectedLocation');
        const loc = raw ? JSON.parse(raw) : null;
        if (!loc) {
          window.location.href = '/quick-coming-soon';
          return;
        }
      } catch {
        window.location.href = '/quick-coming-soon';
        return;
      }
    }

    dispatch(fetchProducts({ page: 1, keyword: undefined } as any));
  }, [dispatch, showQuickCommerce]);

  const categories = [
    { name: 'Smartphones', icon: Smartphone, link: '/products?category=smartphones' },
    { name: 'Laptops', icon: Laptop, link: '/products?category=laptops' },
    { name: 'Audio', icon: Headphones, link: '/products?category=audio' },
    { name: 'Wearables', icon: Watch, link: '/products?category=wearables' },
  ];

  // Channel membership — product can belong to quick, ecom, or both; default to ecom when no metadata
  const inChannel = (p: any, target: 'quick' | 'ecom'): boolean => {
    const raw = (p as any)?.tags ?? (p as any)?.channels ?? (p as any)?.channel ?? [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const norm = arr.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
    const quickTokens = new Set(['quick-commerce','quick','quickcommerce','quick_commerce','instant','express','qc']);
    const ecomTokens = new Set(['e-commerce','ecommerce','e_commerce','e-comm','retail','standard','classic']);
    if (norm.length === 0) return target === 'ecom';
    const hasQuick = norm.some((t) => quickTokens.has(t));
    const hasEcom = norm.some((t) => ecomTokens.has(t));
    if (target === 'quick') return hasQuick;
    return hasEcom || !hasQuick;
  };

  const filteredProducts = (products || []).filter((p: any) => inChannel(p, showQuickCommerce ? 'quick' : 'ecom'));

  const featuredProducts = filteredProducts.slice(0, 8);

  // Mock flash sale data
  // const flashSaleProducts = (products || []).slice(0, 4).map((product: any) => ({
  //   ...product,
  //   image: product.images && product.images.length > 0 ? product.images[0].url : '',
  //   originalPrice: product.price * 1.3,
  //   salePrice: product.price,
  //   discount: 23,
  //   stock: 50,
  //   sold: 30,
  //   rating: 4.5,
  //   reviews: 120
  // }));

  const flashSaleEndTime = new Date();
  flashSaleEndTime.setHours(flashSaleEndTime.getHours() + 2); // 2 hours from now

  // Mock deal of the day data
  const dealProducts = (products || []).slice(0, 3).map((product: any) => ({
    ...product,
    dealPrice: Math.round(product.price * 0.7), // 30% off
    dealEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    dealStock: 100,
    dealSold: Math.floor(Math.random() * 50),
    isLimitedTime: true,
    dealBadge: 'MEGA DEAL'
  }));

  // Handle product comparison
  const addToComparison = (product: any) => {
    setComparisonProducts((prev) => {
      if (prev.length >= 4) {
        alert('You can compare up to 4 products at a time');
        return prev;
      }
      if (prev.find((p) => p._id === product._id)) {
        return prev; // already added
      }
      return [...prev, product];
    });
  };

  const removeFromComparison = (productId: string) => {
    setComparisonProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  // Track viewed products (mock implementation)
  useEffect(() => {
    if (products && products.length > 0) {
      setViewedProducts(products.slice(0, 6));
    }
  }, [products]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Location & Search Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-soft">
        <div className="container-modern py-4">
          <div className="flex items-center space-x-6">
            {/* Location Selector */}
            {/* <button
              onClick={() => setShowLocationSelector(true)}
              className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-4 py-3 rounded-xl transition-all duration-300 hover-lift min-w-0"
            >
              <MapPin className="h-6 w-6 text-red-500" />
              <div className="text-left min-w-0">
                <div className="text-xs text-gray-500 font-medium">Deliver to</div>
                <div className="text-sm font-semibold truncate">
                  {selectedLocation ? selectedLocation.name : 'Select Location'}
                </div>
              </div>
            </button> */}

            {/* Search Bar */}
            <div className="flex-1 max-w-3xl">
              <SearchWithSuggestions />
            </div>

            {/* Action Buttons */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* <div className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
                <span className="text-sm text-gray-600">E-commerce</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCommerce(v => {
                      const next = !v;
                      try {
                        const params = new URLSearchParams(window.location.search);
                        params.set('channel', next ? 'quick' : 'ecom');
                        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                      } catch {}
                      return next;
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showQuickCommerce ? 'bg-red-600' : 'bg-gray-300'}`}
                  aria-pressed={showQuickCommerce}
                  aria-label="Toggle channel"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${showQuickCommerce ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
                <span className="text-sm text-gray-900 font-medium">Quick-Commerce</span>
              </div> */}

              {/* Comparison Button */}
              <button
                type="button"
                onClick={() => setShowComparison(true)}
                className={`relative px-4 py-3 rounded-xl transition-colors flex items-center space-x-2 ${comparisonProducts.length === 0 ? 'bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-pointer' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
              >
                <Scale className="h-5 w-5" />
                <span className="text-sm font-semibold">Compare</span>
                {comparisonProducts.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {comparisonProducts.length}
                  </span>
                )}
              </button>

              {/* Bulk Order Button */}
              <button
                type="button"
                onClick={() => setShowBulkOrder(true)}
                className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl hover:bg-blue-100 transition-colors flex items-center space-x-2"
              >
                <Package className="h-5 w-5" />
                <span className="text-sm font-semibold">Bulk Order</span>
              </button>

              {/* Delivery Info */}
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <Zap className="h-5 w-5" />
                <span className="text-sm font-semibold">10-15 min delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section replaced with slider */}
      {/*
      <section className="bg-gradient-to-r from-orange-600 via-orange-400 to-white text-white section-padding relative overflow-hidden">
        ... previous hero content ...
      </section>
      */}

      {/* Slider */}
      <section className="section-padding">
        <HomeSlider />
      </section>

      {/* Quick Commerce Features */}
      <QuickCommerceFeatures />

      {/* Deal of the Day */}
      {/* <section className="section-padding bg-gray-50">
        <div className="container-modern">
          <DealOfTheDay 
            deals={dealProducts}
            onViewAll={() => window.location.href = '/deals'}
          />
        </div>
      </section> */}

      {/* Flash Sale Section */}
      {/* {flashSaleProducts.length > 0 && (
        <FlashSale
          endTime={flashSaleEndTime}
          products={flashSaleProducts}
          title="⚡ Lightning Deals"
        />
      )} */}

      {/* Category Quick Browse */}
      <CategoryQuickBrowse />

      {/* Offers & Coupons */}
      <OffersAndCoupons />

      {/* Featured Products */}
      <section className="section-padding bg-white">
        <div className="container-modern">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-16 space-y-4 lg:space-y-0">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                🌟 Featured Products
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                Handpicked premium gadgets just for you
              </p>
            </div>
            <Link
              to="/products"
              className="flex btn-outline hover-glow"
            >
              <span>View All Products</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="skeleton h-56 w-full mb-4"></div>
                  <div className="p-6">
                    <div className="skeleton h-4 w-3/4 mb-2"></div>
                    <div className="skeleton h-4 w-1/2 mb-4"></div>
                    <div className="skeleton h-8 w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in">
              {featuredProducts.map((product: any, index: number) => {
                const delayClass = `animate-delay-${Math.min(index * 100, 700)}`;
                return (
                  <div key={product._id} className={delayClass}>
                    <ProductCard 
                      product={product} 
                      showQuickCommerce={showQuickCommerce}
                      forceQuickBadge={showQuickCommerce}
                      onAddToComparison={addToComparison}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Smart Recommendations */}
      <section className="section-padding bg-gray-50">
        <div className="container-modern">
          <SmartRecommendations
            userId={user?._id}
            viewedProducts={viewedProducts}
            cartItems={[]}
            className="shadow-lg"
          />
        </div>
      </section>

      {/* Live Order Updates */}
      <LiveOrderUpdates />

      {/* Modals */}
      <LocationSelector
        isOpen={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onLocationSelect={(location) => {
          setSelectedLocation(location);
          setShowLocationSelector(false);
        }}
        selectedLocation={selectedLocation || undefined}
      />

      <ProductComparison
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        products={comparisonProducts}
        onRemoveProduct={removeFromComparison}
      />

      <BulkOrderManager
        isOpen={showBulkOrder}
        onClose={() => setShowBulkOrder(false)}
        initialProducts={featuredProducts.slice(0, 2)}
      />

      {/* Debug Component removed for production */}
    </div>
  );
};

export default HomePage;
