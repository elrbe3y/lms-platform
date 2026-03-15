/**
 * License Key Generator
 * مولد أكواد التفعيل
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Secret key للتشفير (يجب أن يكون نفسه في التطبيق)
const SECRET_KEY = '8663bea296241ad3e816dc564b2115f5';
const SIGNATURE_KEY = '14644a6a2b497eb7c39d9257e6b33825ee15335df11cbdc4f8ea9c19367e7d85058cef9f3f36b518d00e91fe72199c6b517be08fde27680f8e10c06f21802bf487e6fd251c3795e2a73196820cd67f202c';

// دالة لتوليد كود تفعيل مرتبط بجهاز محدد
function generateLicenseKey(deviceId, durationMs = 365 * 24 * 60 * 60 * 1000, durationDays = 365, type = 'year') {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const data = {
    id: crypto.randomBytes(8).toString('hex'),
    createdAt: new Date().toISOString(),
    expiryDate: durationMs === -1 ? null : new Date(Date.now() + durationMs).toISOString(),
    type: type,
    durationDays: durationDays,
    deviceId: deviceId
  };

  // تحويل البيانات إلى JSON
  const jsonData = JSON.stringify(data);
  
  // ترميز البيانات بـ Base64 (محاكاة للتشفير)
  const encrypted = Buffer.from(jsonData).toString('base64');
  
  // إنشاء التوقيع
  const hmac = crypto.createHmac('sha256', SIGNATURE_KEY);
  hmac.update(encrypted + deviceId);
  const signature = hmac.digest('hex').substr(0, 64);
  
  // ترميز Device ID
  const encodedDeviceId = Buffer.from(deviceId).toString('base64');
  
  // دمج الكود والتوقيع و Device ID
  const licenseKey = `${encrypted}:${signature}:${encodedDeviceId}`;
  
  // ترميز بـ Base64
  return Buffer.from(licenseKey).toString('base64');
}

// دالة للتحقق من صحة الكود
function verifyLicenseKey(licenseKey, deviceId) {
  try {
    // فك ترميز Base64
    const decoded = Buffer.from(licenseKey, 'base64').toString('utf8');
    const parts = decoded.split(':');
    
    if (parts.length !== 3) {
      return { valid: false, error: 'تنسيق غير صحيح' };
    }
    
    const [encrypted, signature, encodedDeviceId] = parts;
    
    // التحقق من Device ID
    const expectedDeviceId = Buffer.from(encodedDeviceId, 'base64').toString('utf8');
    if (expectedDeviceId !== deviceId) {
      return { valid: false, error: 'هذا الكود غير صالح لهذا الجهاز' };
    }
    
    // التحقق من التوقيع
    const hmac = crypto.createHmac('sha256', SIGNATURE_KEY);
    hmac.update(encrypted + deviceId);
    const expectedSignature = hmac.digest('hex').substr(0, 64);
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'توقيع غير صحيح' };
    }
    
    // فك الترميز
    const jsonData = Buffer.from(encrypted, 'base64').toString('utf8');
    const data = JSON.parse(jsonData);
    
    // التحقق من انتهاء الصلاحية
    if (data.type !== 'lifetime' && data.expiryDate && new Date(data.expiryDate) < new Date()) {
      return { valid: false, error: 'انتهت صلاحية الكود', data };
    }
    
    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: 'كود غير صحيح: ' + err.message };
  }
}

// توليد مفاتيح مختلفة لجهاز محدد
function generateKeysForDevice(deviceId) {
  if (!deviceId) {
    console.error('❌ Device ID is required!');
    console.log('Usage: node generator.js <DEVICE_ID>');
    return null;
  }

  const keys = {
    hour: generateLicenseKey(deviceId, 60 * 60 * 1000, 1/24, 'hour'),
    day: generateLicenseKey(deviceId, 24 * 60 * 60 * 1000, 1, 'day'),
    week: generateLicenseKey(deviceId, 7 * 24 * 60 * 60 * 1000, 7, 'week'),
    month: generateLicenseKey(deviceId, 30 * 24 * 60 * 60 * 1000, 30, 'month'),
    '3months': generateLicenseKey(deviceId, 90 * 24 * 60 * 60 * 1000, 90, '3months'),
    '6months': generateLicenseKey(deviceId, 180 * 24 * 60 * 60 * 1000, 180, '6months'),
    year: generateLicenseKey(deviceId, 365 * 24 * 60 * 60 * 1000, 365, 'year'),
    '2years': generateLicenseKey(deviceId, 730 * 24 * 60 * 60 * 1000, 730, '2years'),
    '3years': generateLicenseKey(deviceId, 1095 * 24 * 60 * 60 * 1000, 1095, '3years'),
    lifetime: generateLicenseKey(deviceId, -1, -1, 'lifetime')
  };
  
  return keys;
}

// إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  const deviceId = process.argv[2];
  
  if (!deviceId) {
    console.log('❌ Device ID is required!');
    console.log('\n📖 Usage:');
    console.log('   node generator.js <DEVICE_ID>');
    console.log('\n📝 Example:');
    console.log('   node generator.js DVC-ABC123XYZ-456789\n');
    process.exit(1);
  }
  
  console.log('🔑 مولد أكواد التفعيل - بـ Device ID\n');
  console.log('📱 Device ID:', deviceId);
  console.log('━'⏱️  Hour License (1 Hour):');
  console.log(keys.hour);
  
  console.log('\n📅 Day License (1 Day):');
  console.log(keys.day);
  
  console.log('\n📅 Week License (7 Days):');
  console.log(keys.week);
  
  console.log('\n📅 Month License (30 Days):');
  console.log(keys.month);
  
  console.log('\n📅 3 Months License (90 Days):');
  console.log(keys['3months']);
  
  console.log('\n📅 6 Months License (180 Days):');
  console.log(keys['6months']);
  
  console.log('\n📦 Year License (365 Days):');
  console.log(keys.year);
  
  console.log('\n📦 2 Years License (730 Days):');
  console.log(keys['2years']);
  
  console.log('\n📦 3 Years License (1095 Days):');
  console.log(keys['3years']);
  
  console.log('\n♾️ 
    process.exit(1);
  }
  
  console.log('\n📦 Yearly License (1 Year):');
  console.log(keys.yearly);
  console.log('\n✅ Verification:', verifyLicenseKey(keys.yearly, deviceId));
  
  console.log('\n📦 Lifetime License (Forever):');
  console.log(keys.lifetime);
  console.log('\n✅ Verification:', verifyLicenseKey(keys.lifetime, deviceId));
  
  // حفظ المفاتيح في ملف
  const outputPath = path.join(__dirname, '../license.json');
  const licenseData = {
    deviceId: deviceId,
    generatedAt: new Date().toISOString(),
    keys: keys
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(licenseData, null, 2));
  console.log('\n✅ تم حفظ المفاتيح في:', outputPath);
  console.log('\n⚠️  ملاحظة هامة: هذه المفاتيح تعمل فقط مع Device ID المحدد أعلاه');
}

module.exports = { generateLicenseKey, verifyLicenseKey };
