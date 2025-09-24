// Mock authentication controller for development/testing when MongoDB is unavailable
const asyncHandler = require('express-async-handler');

// Mock user data store (in-memory)
let mockUsers = [
  {
    _id: 'mock-user-1',
    name: 'Demo User',
    email: 'demo@example.com',
    role: 'customer',
    isVerified: true,
    createdAt: new Date().toISOString(),
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
  }
];

let nextUserId = 2;

// Mock JWT token generation
const generateMockToken = (userId) => {
  return `mock-jwt-token-${userId}-${Date.now()}`;
};

const generateMockRefreshToken = (userId) => {
  return `mock-refresh-token-${userId}-${Date.now()}`;
};

// Mock register function
const mockRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Check if user already exists
  const existingUser = mockUsers.find(user =>
    user.email.toLowerCase() === email.toLowerCase() ||
    (phone && user.phone === phone)
  );

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: {
        type: 'DUPLICATE_RESOURCE',
        message: 'An account with this email or phone number already exists',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Create new mock user
  const newUser = {
    _id: `mock-user-${nextUserId++}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim(),
    role: role || 'customer',
    isVerified: true, // Mock users are auto-verified
    createdAt: new Date().toISOString(),
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

  mockUsers.push(newUser);

  const response = {
    success: true,
    message: 'Registration successful (Mock Mode)',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt
      },
      tokens: {
        accessToken: generateMockToken(newUser._id),
        refreshToken: generateMockRefreshToken(newUser._id)
      },
      nextSteps: [
        'Mock registration completed',
        'All features available in mock mode'
      ]
    },
    metadata: {
      processingTime: 10,
      requiresVerification: false,
      mockMode: true
    },
    timestamp: new Date().toISOString()
  };

  // Set mock cookies
  res.cookie('refreshToken', response.data.tokens.refreshToken, {
    httpOnly: true,
    secure: false, // Allow in development
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json(response);
});

// Mock login function
const mockLogin = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Find user by email
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString()
      }
    });
  }

  const tokenExpiry = rememberMe ? '30d' : '1d';
  const accessToken = generateMockToken(user._id);
  const refreshToken = generateMockRefreshToken(user._id);

  const response = {
    success: true,
    message: 'Login successful (Mock Mode)',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        lastLogin: new Date().toISOString(),
        preferences: user.preferences
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: tokenExpiry
      },
      session: {
        loginTime: new Date().toISOString(),
        rememberMe: !!rememberMe,
        deviceInfo: {
          ip: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent')
        }
      }
    },
    metadata: {
      processingTime: 5,
      securityLevel: 'mock',
      mockMode: true
    },
    timestamp: new Date().toISOString()
  };

  // Set mock cookies
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('sessionId', `mock-session-${Date.now()}`, cookieOptions);

  res.json(response);
});

// Mock get profile function
const mockGetProfile = asyncHandler(async (req, res) => {
  // In mock mode, we assume the user is authenticated via middleware
  // Return the first mock user or create a generic one
  const user = mockUsers[0] || {
    _id: 'mock-user-generic',
    name: 'Mock User',
    email: 'mock@example.com',
    role: 'customer',
    isVerified: true,
    createdAt: new Date().toISOString(),
    preferences: {
      notifications: { email: true, sms: false, push: true },
      privacy: { profileVisible: false, dataSharing: false }
    }
  };

  res.json({
    success: true,
    data: user,
    metadata: { mockMode: true },
    timestamp: new Date().toISOString()
  });
});

// Mock update profile function
const mockUpdateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, preferences } = req.body;

  // In mock mode, find and update the first user
  let user = mockUsers[0];
  if (user) {
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
  } else {
    // Create a default user if none exists
    user = {
      _id: 'mock-user-1',
      name: name || 'Mock User',
      email: email || 'mock@example.com',
      phone: phone || '',
      role: 'customer',
      isVerified: true,
      createdAt: new Date().toISOString(),
      preferences: preferences || {
        notifications: { email: true, sms: false, push: true },
        privacy: { profileVisible: false, dataSharing: false }
      }
    };
    mockUsers.push(user);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully (Mock Mode)',
    data: user,
    metadata: { mockMode: true },
    timestamp: new Date().toISOString()
  });
});

// Mock Apple authentication functions
const mockAppleLogin = asyncHandler(async (req, res) => {
  // Mock Apple authentication response
  const mockUser = {
    _id: 'mock-apple-user',
    name: 'Apple User',
    email: 'apple@example.com',
    role: 'customer',
    isVerified: true,
    createdAt: new Date().toISOString(),
    preferences: {
      notifications: { email: true, sms: false, push: true },
      privacy: { profileVisible: false, dataSharing: false }
    }
  };

  const response = {
    success: true,
    message: 'Apple authentication successful (Mock Mode)',
    data: {
      user: mockUser,
      tokens: {
        accessToken: generateMockToken(mockUser._id),
        refreshToken: generateMockRefreshToken(mockUser._id)
      }
    },
    metadata: { mockMode: true },
    timestamp: new Date().toISOString()
  };

  res.json(response);
});

module.exports = {
  mockRegister,
  mockLogin,
  mockGetProfile,
  mockUpdateProfile,
  mockAppleLogin
};