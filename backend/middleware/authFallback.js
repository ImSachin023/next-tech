// Fallback authentication middleware for development/testing
// This is essentially the same as mockAuth.js but named for fallback usage

const mockAuth = (req, res, next) => {
  // Check for mock token in header
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // In fallback mode, we accept any token that starts with 'mock-jwt-token-'
  if (token && token.startsWith('mock-jwt-token-')) {
    // Extract user ID from mock token
    const userId = token.split('-')[3]; // mock-jwt-token-{userId}-{timestamp}

    // Mock user object
    req.user = {
      _id: userId || 'fallback-user-1',
      name: 'Fallback User',
      email: 'fallback@example.com',
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
      _id: userId || 'fallback-user-1',
      name: 'Fallback User',
      email: 'fallback@example.com',
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
      message: 'Not authorized, no valid token (Fallback Mode)',
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
        message: 'Not authorized as admin (Fallback Mode)',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  auth: mockAuth,
  adminAuth: mockAdminAuth
};