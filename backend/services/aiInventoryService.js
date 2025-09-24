// AI-Based Inventory Management System
const mongoose = require('mongoose');
const cacheOptimizer = require('./cacheOptimizer');

class AIInventoryService {
  constructor() {
    this.demandForecasts = new Map();
    this.seasonalPatterns = new Map();
    this.reorderPoints = new Map();
    this.priceElasticity = new Map();
    this.inventoryAlerts = [];
    
    // AI model parameters
    this.learningRate = 0.01;
    this.seasonalityWindow = 365; // days
    this.forecastHorizon = 30; // days
    this.confidenceThreshold = 0.8;
    
    this.initializeAIModels();
  }

  // O(1) - Initialize AI models and load historical data
  async initializeAIModels() {
    try {
      console.log('🤖 Initializing AI Inventory System...');
      
      // Check if MongoDB is available before proceeding
      if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️  MongoDB not available, skipping AI inventory initialization (no mock fallback)');
        return;
      }
      
      // Load historical sales data for training
      await this.loadHistoricalData();
      
      // Train demand forecasting models
      await this.trainDemandModels();
      
      // Calculate optimal reorder points
      await this.calculateReorderPoints();
      
      // Set up real-time monitoring
      this.startRealTimeMonitoring();
      
      console.log('✅ AI Inventory System initialized successfully');
    } catch (error) {
      console.error('❌ AI Inventory System initialization failed:', error);
      console.warn('AI Inventory will remain inactive until MongoDB is available.');
    }
  }

  // O(n log n) - Load and process historical sales data
  async loadHistoricalData() {
    const cacheKey = 'ai_inventory:historical_data';
    let historicalData = await cacheOptimizer.get(cacheKey);
    
    if (!historicalData) {
      const Order = mongoose.model('Order');
      const Product = mongoose.model('Product');
      
      // Aggregate sales data by product and date
      const salesData = await Order.aggregate([
        {
          $match: {
            status: { $in: ['delivered', 'shipped'] },
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: {
              productId: '$orderItems.product',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            totalSold: { $sum: '$orderItems.quantity' },
            revenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] } },
            orderCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id.productId',
            date: '$_id.date',
            totalSold: 1,
            revenue: 1,
            orderCount: 1,
            category: '$product.category',
            price: '$product.price',
            seasonality: {
              month: { $month: { $dateFromString: { dateString: '$_id.date' } } },
              dayOfWeek: { $dayOfWeek: { $dateFromString: { dateString: '$_id.date' } } },
              quarter: { $ceil: { $divide: [{ $month: { $dateFromString: { dateString: '$_id.date' } } }, 3] } }
            }
          }
        },
        { $sort: { date: 1 } }
      ]);

      historicalData = this.processHistoricalData(salesData);
      await cacheOptimizer.set(cacheKey, historicalData, 3600); // Cache for 1 hour
    }

    this.historicalData = historicalData;
    return historicalData;
  }

  // O(n) - Process and clean historical data
  processHistoricalData(rawData) {
    const processedData = new Map();
    
    rawData.forEach(record => {
      const productId = record.productId.toString();
      
      if (!processedData.has(productId)) {
        processedData.set(productId, {
          salesHistory: [],
          seasonalPatterns: {
            monthly: new Array(12).fill(0),
            weekly: new Array(7).fill(0),
            quarterly: new Array(4).fill(0)
          },
          trends: {
            growth: 0,
            volatility: 0,
            cyclicality: 0
          },
          category: record.category,
          averagePrice: record.price
        });
      }

      const productData = processedData.get(productId);
      
      // Add sales record
      productData.salesHistory.push({
        date: record.date,
        quantity: record.totalSold,
        revenue: record.revenue,
        orders: record.orderCount
      });

      // Update seasonal patterns
      const month = record.seasonality.month - 1;
      const dayOfWeek = record.seasonality.dayOfWeek - 1;
      const quarter = record.seasonality.quarter - 1;
      
      productData.seasonalPatterns.monthly[month] += record.totalSold;
      productData.seasonalPatterns.weekly[dayOfWeek] += record.totalSold;
      productData.seasonalPatterns.quarterly[quarter] += record.totalSold;
    });

    // Calculate trends and normalize seasonal patterns
    for (const [productId, data] of processedData) {
      this.calculateTrends(data);
      this.normalizeSeasonalPatterns(data);
    }

    return processedData;
  }

  // O(n) - Calculate growth trends and volatility
  calculateTrends(productData) {
    const sales = productData.salesHistory;
    if (sales.length < 7) return;

    // Calculate moving averages
    const shortMA = this.calculateMovingAverage(sales, 7);
    const longMA = this.calculateMovingAverage(sales, 30);

    // Growth trend (slope of regression line)
    productData.trends.growth = this.calculateLinearRegression(sales).slope;

    // Volatility (standard deviation of daily changes)
    const dailyChanges = [];
    for (let i = 1; i < sales.length; i++) {
      const change = (sales[i].quantity - sales[i-1].quantity) / sales[i-1].quantity;
      dailyChanges.push(change);
    }
    productData.trends.volatility = this.calculateStandardDeviation(dailyChanges);

    // Cyclicality (correlation with seasonal patterns)
    productData.trends.cyclicality = this.calculateSeasonalCorrelation(sales);
  }

  // O(n) - Train demand forecasting models using time series analysis
  async trainDemandModels() {
    console.log('🧠 Training demand forecasting models...');
    
    for (const [productId, data] of this.historicalData) {
      try {
        // Simple exponential smoothing for trend
        const forecast = this.exponentialSmoothing(data.salesHistory);
        
        // ARIMA-like model for seasonality
        const seasonalForecast = this.seasonalDecomposition(data);
        
        // Combine forecasts
        const combinedForecast = this.combineForecastModels(forecast, seasonalForecast, data);
        
        this.demandForecasts.set(productId, {
          forecast: combinedForecast,
          confidence: this.calculateForecastConfidence(data),
          lastUpdated: new Date(),
          model: 'hybrid_exponential_seasonal'
        });

        // Store seasonal patterns
        this.seasonalPatterns.set(productId, data.seasonalPatterns);
        
      } catch (error) {
        console.error(`Error training model for product ${productId}:`, error);
      }
    }
    
    console.log(`✅ Trained models for ${this.demandForecasts.size} products`);
  }

  // O(n) - Exponential smoothing for demand forecasting
  exponentialSmoothing(salesHistory, alpha = 0.3, beta = 0.1, gamma = 0.1) {
    if (salesHistory.length < 2) return [];

    const forecast = [];
    let level = salesHistory[0].quantity;
    let trend = 0;
    
    for (let i = 1; i < salesHistory.length; i++) {
      const actual = salesHistory[i].quantity;
      const prevLevel = level;
      
      // Update level (smoothed value)
      level = alpha * actual + (1 - alpha) * (level + trend);
      
      // Update trend
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      
      // Forecast next period
      forecast.push({
        date: salesHistory[i].date,
        predicted: level + trend,
        actual: actual,
        error: Math.abs(actual - (level + trend))
      });
    }

    return forecast;
  }

  // O(n) - Seasonal decomposition for cyclical patterns
  seasonalDecomposition(productData) {
    const sales = productData.salesHistory;
    const seasonalForecast = [];
    
    // Calculate seasonal indices
    const monthlyIndices = this.calculateSeasonalIndices(productData.seasonalPatterns.monthly);
    const weeklyIndices = this.calculateSeasonalIndices(productData.seasonalPatterns.weekly);
    
    // Apply seasonal adjustment to forecast
    sales.forEach((record, index) => {
      const date = new Date(record.date);
      const month = date.getMonth();
      const dayOfWeek = date.getDay();
      
      const seasonalAdjustment = (monthlyIndices[month] + weeklyIndices[dayOfWeek]) / 2;
      
      seasonalForecast.push({
        date: record.date,
        seasonalFactor: seasonalAdjustment,
        adjustedDemand: record.quantity * seasonalAdjustment
      });
    });

    return seasonalForecast;
  }

  // O(1) - Calculate seasonal indices
  calculateSeasonalIndices(seasonalData) {
    const total = seasonalData.reduce((sum, value) => sum + value, 0);
    const average = total / seasonalData.length;
    
    return seasonalData.map(value => 
      average > 0 ? value / average : 1
    );
  }

  // O(n) - Combine multiple forecast models
  combineForecastModels(trendForecast, seasonalForecast, productData) {
    const combinedForecast = [];
    const weight1 = 0.6; // Weight for trend model
    const weight2 = 0.4; // Weight for seasonal model
    
    for (let i = 0; i < Math.min(trendForecast.length, seasonalForecast.length); i++) {
      const trend = trendForecast[i];
      const seasonal = seasonalForecast[i];
      
      const combined = {
        date: trend.date,
        predicted: (weight1 * trend.predicted) + (weight2 * seasonal.adjustedDemand),
        trendComponent: trend.predicted,
        seasonalComponent: seasonal.adjustedDemand,
        confidence: this.calculatePointConfidence(trend, seasonal, productData)
      };
      
      combinedForecast.push(combined);
    }

    return combinedForecast;
  }

  // O(1) - Calculate forecast confidence
  calculateForecastConfidence(productData) {
    const sales = productData.salesHistory;
    if (sales.length < 10) return 0.5;

    // Base confidence on data quality and consistency
    const dataQuality = Math.min(sales.length / 100, 1); // More data = higher confidence
    const volatility = productData.trends.volatility;
    const volatilityPenalty = Math.max(0, 1 - volatility * 2);
    
    return Math.min(dataQuality * volatilityPenalty, 0.95);
  }

  // O(1) - Calculate point-wise confidence
  calculatePointConfidence(trend, seasonal, productData) {
    const baseConfidence = 0.7;
    const errorPenalty = trend.error ? Math.max(0, 1 - trend.error / trend.predicted) : 1;
    const seasonalBonus = seasonal.seasonalFactor > 0.8 ? 0.1 : 0;
    
    return Math.min(baseConfidence * errorPenalty + seasonalBonus, 0.95);
  }

  // O(n) - Calculate optimal reorder points using AI
  async calculateReorderPoints() {
    console.log('📊 Calculating optimal reorder points...');
    
    const Product = mongoose.model('Product');
    const products = await Product.find({ isActive: true }).select('_id name category price countInStock leadTime');
    
    for (const product of products) {
      const productId = product._id.toString();
      const forecast = this.demandForecasts.get(productId);
      
      if (!forecast) continue;

      // Calculate safety stock using AI predictions
      const safetyStock = this.calculateSafetyStock(product, forecast);
      
      // Calculate reorder point
      const leadTimeDemand = this.calculateLeadTimeDemand(product, forecast);
      const reorderPoint = leadTimeDemand + safetyStock;
      
      // Calculate economic order quantity (EOQ)
      const eoq = this.calculateEOQ(product, forecast);
      
      this.reorderPoints.set(productId, {
        reorderPoint: Math.ceil(reorderPoint),
        safetyStock: Math.ceil(safetyStock),
        eoq: Math.ceil(eoq),
        leadTimeDemand: Math.ceil(leadTimeDemand),
        lastCalculated: new Date(),
        confidence: forecast.confidence
      });
    }
    
    console.log(`✅ Calculated reorder points for ${this.reorderPoints.size} products`);
  }

  // O(1) - Calculate safety stock using demand variability
  calculateSafetyStock(product, forecast) {
    const serviceLevel = 0.95; // 95% service level
    const zScore = 1.645; // Z-score for 95% service level
    
    // Calculate demand variability from forecast
    const demandVariability = this.calculateDemandVariability(forecast);
    const leadTime = product.leadTime || 7; // Default 7 days
    
    return zScore * Math.sqrt(leadTime) * demandVariability;
  }

  // O(n) - Calculate demand variability
  calculateDemandVariability(forecast) {
    const predictions = forecast.forecast.map(f => f.predicted);
    return this.calculateStandardDeviation(predictions);
  }

  // O(1) - Calculate lead time demand
  calculateLeadTimeDemand(product, forecast) {
    const leadTime = product.leadTime || 7;
    const avgDailyDemand = this.calculateAverageDailyDemand(forecast);
    
    return avgDailyDemand * leadTime;
  }

  // O(n) - Calculate average daily demand
  calculateAverageDailyDemand(forecast) {
    const recentForecasts = forecast.forecast.slice(-30); // Last 30 days
    const totalDemand = recentForecasts.reduce((sum, f) => sum + f.predicted, 0);
    
    return recentForecasts.length > 0 ? totalDemand / recentForecasts.length : 0;
  }

  // O(1) - Calculate Economic Order Quantity (EOQ)
  calculateEOQ(product, forecast) {
    const annualDemand = this.calculateAverageDailyDemand(forecast) * 365;
    const orderingCost = 50; // Fixed ordering cost
    const holdingCostRate = 0.2; // 20% of product value per year
    const holdingCost = product.price * holdingCostRate;
    
    if (holdingCost <= 0) return 100; // Default EOQ
    
    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
  }

  // O(1) - Get demand forecast for a product
  async getDemandForecast(productId, days = 30) {
    const cacheKey = `ai_inventory:forecast:${productId}:${days}`;
    let forecast = await cacheOptimizer.get(cacheKey);
    
    if (!forecast) {
      const storedForecast = this.demandForecasts.get(productId);
      
      if (!storedForecast) {
        return {
          success: false,
          message: 'No forecast available for this product'
        };
      }

      // Generate future predictions
      forecast = this.generateFutureForecast(productId, days);
      await cacheOptimizer.set(cacheKey, forecast, 1800); // Cache for 30 minutes
    }

    return {
      success: true,
      data: forecast
    };
  }

  // O(n) - Generate future demand forecast
  generateFutureForecast(productId, days) {
    const storedForecast = this.demandForecasts.get(productId);
    const seasonalPattern = this.seasonalPatterns.get(productId);
    
    if (!storedForecast || !seasonalPattern) return [];

    const futureForecast = [];
    const lastForecast = storedForecast.forecast[storedForecast.forecast.length - 1];
    const baselineDemand = lastForecast ? lastForecast.predicted : 10;
    
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      const month = futureDate.getMonth();
      const dayOfWeek = futureDate.getDay();
      
      // Apply seasonal adjustments
      const monthlyFactor = seasonalPattern.monthly[month] || 1;
      const weeklyFactor = seasonalPattern.weekly[dayOfWeek] || 1;
      const seasonalAdjustment = (monthlyFactor + weeklyFactor) / 2;
      
      // Add some randomness for realistic forecasting
      const randomFactor = 0.9 + Math.random() * 0.2; // ±10% variation
      
      const predictedDemand = baselineDemand * seasonalAdjustment * randomFactor;
      
      futureForecast.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: Math.max(0, Math.round(predictedDemand)),
        confidence: storedForecast.confidence * (1 - i * 0.01), // Confidence decreases over time
        seasonalFactor: seasonalAdjustment
      });
    }

    return futureForecast;
  }

  // O(1) - Check if product needs reordering
  async checkReorderStatus(productId) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return { needsReorder: false, message: 'Product not found' };
    }

    const reorderInfo = this.reorderPoints.get(productId);
    
    if (!reorderInfo) {
      return { needsReorder: false, message: 'No reorder point calculated' };
    }

    const currentStock = product.countInStock;
    const needsReorder = currentStock <= reorderInfo.reorderPoint;
    
    return {
      needsReorder,
      currentStock,
      reorderPoint: reorderInfo.reorderPoint,
      recommendedOrderQuantity: reorderInfo.eoq,
      safetyStock: reorderInfo.safetyStock,
      urgency: this.calculateUrgency(currentStock, reorderInfo),
      confidence: reorderInfo.confidence
    };
  }

  // O(1) - Calculate reorder urgency
  calculateUrgency(currentStock, reorderInfo) {
    const stockRatio = currentStock / reorderInfo.reorderPoint;
    
    if (stockRatio <= 0.5) return 'critical';
    if (stockRatio <= 0.8) return 'high';
    if (stockRatio <= 1.0) return 'medium';
    return 'low';
  }

  // O(n) - Generate automated purchase orders
  async generateAutomatedOrders() {
    console.log('🤖 Generating automated purchase orders...');
    
    const Product = mongoose.model('Product');
    const products = await Product.find({ 
      isActive: true,
      autoReorder: true 
    });

    const orders = [];
    
    for (const product of products) {
      const reorderStatus = await this.checkReorderStatus(product._id);
      
      if (reorderStatus.needsReorder && reorderStatus.confidence > this.confidenceThreshold) {
        const order = {
          productId: product._id,
          productName: product.name,
          currentStock: reorderStatus.currentStock,
          reorderPoint: reorderStatus.reorderPoint,
          orderQuantity: reorderStatus.recommendedOrderQuantity,
          urgency: reorderStatus.urgency,
          estimatedCost: product.price * reorderStatus.recommendedOrderQuantity * 0.6, // Assume 60% cost
          supplier: product.supplier || 'Default Supplier',
          expectedDelivery: this.calculateExpectedDelivery(product),
          confidence: reorderStatus.confidence,
          createdAt: new Date()
        };
        
        orders.push(order);
        
        // Create alert
        this.createInventoryAlert({
          type: 'auto_reorder',
          productId: product._id,
          message: `Automated reorder generated for ${product.name}`,
          data: order
        });
      }
    }

    // Save orders to database
    if (orders.length > 0) {
      const PurchaseOrder = mongoose.model('PurchaseOrder');
      await PurchaseOrder.insertMany(orders);
      console.log(`✅ Generated ${orders.length} automated purchase orders`);
    }

    return orders;
  }

  // O(1) - Calculate expected delivery date
  calculateExpectedDelivery(product) {
    const leadTime = product.leadTime || 7;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + leadTime);
    return deliveryDate;
  }

  // O(n) - Analyze inventory performance
  async analyzeInventoryPerformance() {
    const analysis = {
      totalProducts: this.demandForecasts.size,
      forecastAccuracy: 0,
      stockoutRisk: [],
      overstock: [],
      optimalStock: [],
      recommendations: []
    };

    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (const [productId, forecast] of this.demandForecasts) {
      // Calculate forecast accuracy
      const accuracy = this.calculateForecastAccuracy(forecast);
      if (accuracy > 0) {
        totalAccuracy += accuracy;
        accuracyCount++;
      }

      // Check stock status
      const reorderStatus = await this.checkReorderStatus(productId);
      
      if (reorderStatus.needsReorder) {
        analysis.stockoutRisk.push({
          productId,
          urgency: reorderStatus.urgency,
          currentStock: reorderStatus.currentStock,
          reorderPoint: reorderStatus.reorderPoint
        });
      }

      // Generate recommendations
      const recommendation = await this.generateProductRecommendation(productId);
      if (recommendation) {
        analysis.recommendations.push(recommendation);
      }
    }

    analysis.forecastAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;

    return analysis;
  }

  // O(n) - Calculate forecast accuracy
  calculateForecastAccuracy(forecast) {
    const predictions = forecast.forecast.filter(f => f.actual !== undefined);
    
    if (predictions.length === 0) return 0;

    let totalError = 0;
    let totalActual = 0;

    predictions.forEach(prediction => {
      totalError += Math.abs(prediction.predicted - prediction.actual);
      totalActual += prediction.actual;
    });

    const mape = totalActual > 0 ? (totalError / totalActual) * 100 : 100;
    return Math.max(0, 100 - mape); // Convert to accuracy percentage
  }

  // O(1) - Generate product-specific recommendations
  async generateProductRecommendation(productId) {
    const forecast = this.demandForecasts.get(productId);
    const reorderInfo = this.reorderPoints.get(productId);
    
    if (!forecast || !reorderInfo) return null;

    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) return null;

    const recommendations = [];
    
    // Stock level recommendations
    if (product.countInStock > reorderInfo.eoq * 3) {
      recommendations.push({
        type: 'overstock',
        message: 'Consider reducing order quantities or running promotions',
        impact: 'high'
      });
    }

    // Demand trend recommendations
    const historicalData = this.historicalData.get(productId);
    if (historicalData && historicalData.trends.growth > 0.2) {
      recommendations.push({
        type: 'growth_opportunity',
        message: 'High growth trend detected - consider increasing stock levels',
        impact: 'medium'
      });
    }

    // Seasonal recommendations
    const currentMonth = new Date().getMonth();
    const seasonalPattern = this.seasonalPatterns.get(productId);
    if (seasonalPattern && seasonalPattern.monthly[currentMonth] > 1.5) {
      recommendations.push({
        type: 'seasonal_peak',
        message: 'Seasonal peak period - ensure adequate stock',
        impact: 'high'
      });
    }

    return recommendations.length > 0 ? {
      productId,
      productName: product.name,
      recommendations
    } : null;
  }

  // O(1) - Create inventory alert
  createInventoryAlert(alert) {
    this.inventoryAlerts.push({
      ...alert,
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false
    });

    // Keep only last 100 alerts
    if (this.inventoryAlerts.length > 100) {
      this.inventoryAlerts = this.inventoryAlerts.slice(-100);
    }
  }

  // O(1) - Get inventory alerts
  getInventoryAlerts(limit = 20) {
    return this.inventoryAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // O(1) - Start real-time monitoring
  startRealTimeMonitoring() {
    // Monitor every 5 minutes
    setInterval(async () => {
      try {
        await this.monitorStockLevels();
        await this.updateDemandForecasts();
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 5 * 60 * 1000);

    // Generate automated orders daily
    setInterval(async () => {
      try {
        await this.generateAutomatedOrders();
      } catch (error) {
        console.error('Automated ordering error:', error);
      }
    }, 24 * 60 * 60 * 1000);

    console.log('✅ Real-time inventory monitoring started');
  }

  // O(n) - Monitor stock levels
  async monitorStockLevels() {
    const Product = mongoose.model('Product');
    const lowStockProducts = await Product.find({
      isActive: true,
      countInStock: { $lt: 10 } // Products with less than 10 units
    });

    for (const product of lowStockProducts) {
      const reorderStatus = await this.checkReorderStatus(product._id);
      
      if (reorderStatus.needsReorder) {
        this.createInventoryAlert({
          type: 'low_stock',
          productId: product._id,
          message: `Low stock alert: ${product.name} (${product.countInStock} units remaining)`,
          data: reorderStatus
        });
      }
    }
  }

  // O(n) - Update demand forecasts with new data
  async updateDemandForecasts() {
    // This would typically retrain models with new sales data
    // For now, we'll just refresh the cache
    const cacheKeys = Array.from(this.demandForecasts.keys()).map(
      productId => `ai_inventory:forecast:${productId}:30`
    );
    
    // Clear forecast caches to force refresh
    for (const key of cacheKeys) {
      await cacheOptimizer.delete(key);
    }
  }

  // Utility functions
  calculateMovingAverage(data, window) {
    const result = [];
    for (let i = window - 1; i < data.length; i++) {
      const sum = data.slice(i - window + 1, i + 1).reduce((acc, val) => acc + val.quantity, 0);
      result.push(sum / window);
    }
    return result;
  }

  calculateLinearRegression(data) {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.quantity);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  calculateStandardDeviation(data) {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    
    return Math.sqrt(variance);
  }

  calculateSeasonalCorrelation(sales) {
    // Simplified seasonal correlation calculation
    const monthlyTotals = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);
    
    sales.forEach(sale => {
      const month = new Date(sale.date).getMonth();
      monthlyTotals[month] += sale.quantity;
      monthlyCounts[month]++;
    });
    
    const monthlyAverages = monthlyTotals.map((total, i) => 
      monthlyCounts[i] > 0 ? total / monthlyCounts[i] : 0
    );
    
    const overallAverage = monthlyAverages.reduce((a, b) => a + b, 0) / 12;
    const variance = monthlyAverages.reduce((acc, avg) => acc + Math.pow(avg - overallAverage, 2), 0) / 12;
    
    return variance / (overallAverage || 1); // Higher value = more seasonal
  }

  normalizeSeasonalPatterns(productData) {
    const patterns = productData.seasonalPatterns;
    
    // Normalize monthly patterns
    const monthlyTotal = patterns.monthly.reduce((a, b) => a + b, 0);
    if (monthlyTotal > 0) {
      patterns.monthly = patterns.monthly.map(val => val / monthlyTotal * 12);
    }
    
    // Normalize weekly patterns
    const weeklyTotal = patterns.weekly.reduce((a, b) => a + b, 0);
    if (weeklyTotal > 0) {
      patterns.weekly = patterns.weekly.map(val => val / weeklyTotal * 7);
    }
    
    // Normalize quarterly patterns
    const quarterlyTotal = patterns.quarterly.reduce((a, b) => a + b, 0);
    if (quarterlyTotal > 0) {
      patterns.quarterly = patterns.quarterly.map(val => val / quarterlyTotal * 4);
    }
  }

  // O(n) - Get seasonal trends
  getSeasonalTrends() {
    const trends = [];
    
    for (const [productId, patterns] of this.seasonalPatterns) {
      const monthlyTrend = patterns.monthly.map((value, month) => ({
        month: month + 1,
        factor: value,
        name: new Date(2024, month, 1).toLocaleString('default', { month: 'long' })
      }));
      
      const weeklyTrend = patterns.weekly.map((value, day) => ({
        day: day + 1,
        factor: value,
        name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
      }));
      
      trends.push({
        productId,
        monthly: monthlyTrend,
        weekly: weeklyTrend
      });
    }
    
    return trends;
  }

  // O(n) - Get category performance
  async getCategoryPerformance() {
    const Product = mongoose.model('Product');
    
    const categoryPerformance = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          totalStock: { $sum: '$countInStock' },
          lowStockCount: {
            $sum: { $cond: [{ $lt: ['$countInStock', 10] }, 1, 0] }
          },
          autoReorderCount: {
            $sum: { $cond: ['$autoReorder', 1, 0] }
          }
        }
      },
      {
        $addFields: {
          lowStockRatio: { $divide: ['$lowStockCount', '$totalProducts'] },
          autoReorderRatio: { $divide: ['$autoReorderCount', '$totalProducts'] }
        }
      },
      { $sort: { totalProducts: -1 } }
    ]);
    
    return categoryPerformance;
  }

  // Mock initialization removed - no mock fallback
}

module.exports = new AIInventoryService();