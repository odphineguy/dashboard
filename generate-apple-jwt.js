const jwt = require('jsonwebtoken');

// Replace these with your actual values from Apple Developer Console
const TEAM_ID = 'K5BU9QZMNW';  // 10-character Team ID
const KEY_ID = '5M59T4NP79';    // 10-character Key ID from .p8 filename
const CLIENT_ID = 'K5BU9QZMNW.com.app.mealsaver.app';  // e.g., com.mealsaver.app

// Your private key
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgE3xbz/ZZg3yEqTwk
1mifnY0HdjAAaN7/QFuKaXnMvu+gCgYIKoZIzj0DAQehRANCAAQRuc7yF9MXS/UU
t31k1/kbI4oQdU/Rvcq2HOj2VUckgRR+LBc1/vADCut1jkDbuLsTCE1brJy65dP2
StrcFb6O
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
