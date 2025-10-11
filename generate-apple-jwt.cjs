const jwt = require('jsonwebtoken');

// Replace these with your actual values from Apple Developer Console
const TEAM_ID = 'K5BU9QZMNW';  // 10-character Team ID
const KEY_ID = 'YGYBT3QLDA';    // 10-character Key ID from .p8 filename
const CLIENT_ID = 'K5BU9QZMNW.app.mealsaver.app';  // Full Services ID with Team ID prefix

// Your private key
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg2pUbAFB9+2jyUJpR
j7H0wTOhsKL1VivBfsZOFKS0gJigCgYIKoZIzj0DAQehRANCAAS94OTcrfW1wDnM
qNl4jEZ61mbO6PpvQNYNxX1c9CinEllf6Yi0SZlzsOZ73kMSGihhv5eEmEXoGxXw
NXOyMhqr
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
}
