/**
 * ========================================
 * SHARED CONFIGURATION
 * ========================================
 * مفاتيح التشفير المشتركة بين جميع المكونات
 */

// مفتاح التشفير الرئيسي (32 بايت)
// !!! تحذير: غير هذا المفتاح قبل النشر الإنتاجي !!!
const ENCRYPTION_KEY = 'MySecretKey123456789012345678ab'; // 32 characters = 32 bytes

// مفتاح electron-store
const STORE_ENCRYPTION_KEY = 'electron-store-secret-key-2024';

module.exports = {
  ENCRYPTION_KEY,
  STORE_ENCRYPTION_KEY
};
