// generate-key.js
const crypto = require('crypto');

// Generate a strong random key (64 characters)
const internalApiKey = crypto.randomBytes(32).toString('hex');

console.log('Your INTERNAL_API_KEY:');
console.log(internalApiKey);
console.log('\nAdd this to your .env file:');
console.log(`INTERNAL_API_KEY=${internalApiKey}`);