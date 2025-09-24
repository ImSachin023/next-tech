// Mock authentication middleware for development/testing when MongoDB is unavailable

const mockAuth = (req, res, next) => {
  // Check for mock token in header
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // In mock mode, we accept any token that starts with 'mock-jwt-token-'
  if (token && token.startsWith('mock-jwt-token-')) {
    // Extract user ID from mock token
    const userId = token.split('-')[3]; // mock-jwt-token-{userId}-{timestamp}

    // Mock user object
    req.user = {
      _id: userId || 'mock-user-1',
      name: 'Mock User',
      email: 'mock@example.com',
      role: 'customer',
      isVerified: true,
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisible: false,
          dataSharing: false
        }
      }
    };

    return next();
  }

  // Check for token in cookies as fallback
  if (req.cookies && req.cookies.refreshToken && req.cookies.refreshToken.startsWith('mock-refresh-token-')) {
    const userId = req.cookies.refreshToken.split('-')[3];

    req.user = {
      _id: userId || 'mock-user-1',
      name: 'Mock User',
      email: 'mock@example.com',
      role: 'customer',
      isVerified: true,
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisible: false,
          dataSharing: false
        }
      }
    };

    return next();
  }

  // If no valid token, return unauthorized
  return res.status(401).json({
    success: false,
    error: {
      type: 'AUTHENTICATION_ERROR',
      message: 'Not authorized, no valid token (Mock Mode)',
      timestamp: new Date().toISOString()
    }
  });
};

const mockAdminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Not authorized as admin (Mock Mode)',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const mockSeller = (req, res, next) => {
  if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Not authorized as seller (Mock Mode)',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const mockOptional = (req, res, next) => {
  // Try to authenticate, but continue even if it fails
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token && token.startsWith('mock-jwt-token-')) {
    const userId = token.split('-')[3];

    req.user = {
      _id: userId || 'mock-user-1',
      name: 'Mock User',
      email: 'mock@example.com',
      role: 'customer',
      isVerified: true,
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisible: false,
          dataSharing: false
        }
      }
    };
  } else {
    req.user = null;
  }

  next();
};

module.exports = {
  auth: mockAuth,
  adminAuth: mockAdminAuth,
  seller: mockSeller,
  optional: mockOptional
};