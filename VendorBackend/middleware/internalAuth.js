// middleware/internalAuth.js - WITH DEBUG LOGGING
const internalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  console.log('🔐 [Internal Auth] Request path:', req.path);
  console.log('🔐 [Internal Auth] Method:', req.method);
  console.log('🔐 [Internal Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader) {
    console.warn('⚠️ Internal auth: No authorization header');
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing'
    });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔐 [Internal Auth] Token length:', token?.length);
  console.log('🔐 [Internal Auth] Expected key length:', expectedKey?.length);
  
  if (!expectedKey) {
    console.error('❌ INTERNAL_API_KEY not set in environment');
    return res.status(500).json({
      success: false,
      message: 'Internal server configuration error'
    });
  }

  if (token !== expectedKey) {
    console.error('❌ Internal auth: Invalid API key');
    console.error(`   Token: ${token.substring(0, 10)}...`);
    console.error(`   Expected: ${expectedKey.substring(0, 10)}...`);
    return res.status(403).json({
      success: false,
      message: 'Invalid internal API key'
    });
  }

  console.log('✅ Internal auth successful');
  next();
};

module.exports = internalAuth;