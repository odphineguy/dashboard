const jwt = require('jsonwebtoken');

// ⚠️ SECURITY WARNING ⚠️
// This is a TEMPLATE file. Copy it to generate-apple-jwt.js and fill in your values.
// NEVER commit the filled version to git!

// Replace these with your actual values from Apple Developer Console
const TEAM_ID = 'YOUR_TEAM_ID';  // 10-character Team ID
const KEY_ID = 'YOUR_KEY_ID';    // 10-character Key ID from .p8 filename
const CLIENT_ID = 'YOUR_CLIENT_ID';  // e.g., TEAM_ID.com.app.mealsaver.app

// Your private key from the .p8 file
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----`;

try {
  const token = jwt.sign(
    {},
    PRIVATE_KEY,
    {
      algorithm: 'ES256',
      expiresIn: '180d',  // 6 months (Apple recommends regenerating every 6 months)
      issuer: TEAM_ID,
      subject: CLIENT_ID,
      audience: 'https://appleid.apple.com',
      keyid: KEY_ID
    }
  );

  console.log('\n✅ Your Apple JWT Token (paste this into Supabase "Secret Key" field):\n');
  console.log(token);
  console.log('\n⚠️  Remember: This token expires in 180 days. Generate a new one before then.\n');
} catch (error) {
  console.error('❌ Error generating JWT:', error.message);
  console.log('\nMake sure you have replaced:');
  console.log('- TEAM_ID with your Apple Team ID');
  console.log('- KEY_ID with your Key ID');
  console.log('- CLIENT_ID with your Services ID');
  console.log('- PRIVATE_KEY with your actual private key content');
}

