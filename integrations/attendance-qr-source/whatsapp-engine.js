const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { app } = require('electron');

// Get the correct path for WhatsApp auth data
function getWhatsAppAuthPath() {
  try {
    // In production (Electron), use AppData
    if (app) {
      return path.join(app.getPath('userData'), 'whatsapp-session');
    }
  } catch (err) {
    console.error('Error getting app path:', err);
  }
  
  // Fallback to AppData
  const appDataPath = process.env.APPDATA || process.env.HOME;
  return path.join(appDataPath, 'student-attendance-center', 'whatsapp-session');
}

function findChromeExeInDir(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return null;

  const direct = path.join(dirPath, 'chrome.exe');
  if (fs.existsSync(direct)) return direct;

  const chromeWin = path.join(dirPath, 'chrome-win', 'chrome.exe');
  if (fs.existsSync(chromeWin)) return chromeWin;

  try {
    const level1 = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const dir1 of level1) {
      const candidate1 = path.join(dirPath, dir1, 'chrome.exe');
      if (fs.existsSync(candidate1)) return candidate1;

      const candidate2 = path.join(dirPath, dir1, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(candidate2)) return candidate2;

      const level2Path = path.join(dirPath, dir1);
      const level2 = fs.readdirSync(level2Path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      for (const dir2 of level2) {
        const candidate3 = path.join(dirPath, dir1, dir2, 'chrome-win', 'chrome.exe');
        if (fs.existsSync(candidate3)) return candidate3;
      }
    }
  } catch (err) {
    console.warn('⚠️  Error scanning Chromium directory:', err.message);
  }

  return null;
}

function findChromiumExecutable() {
  const candidates = [];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  }

  const systemChrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  candidates.push(...systemChrome);

  const resourceRoot = process.resourcesPath || '';
  const appUnpacked = path.join(resourceRoot, 'app.asar.unpacked', 'vendor', 'chromium');
  const devVendor = path.join(__dirname, 'vendor', 'chromium');
  candidates.push(appUnpacked, devVendor);

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.endsWith('chrome.exe') && fs.existsSync(candidate)) return candidate;

    const found = findChromeExeInDir(candidate);
    if (found) return found;
  }

  return null;
}

class WhatsAppEngine {
  constructor() {
    this.client = null;
    this.initPromise = null;
    this.queue = [];
    this.processing = false;
    this.enabled = false;
    this.executablePath = null;
    this.status = {
      state: 'disabled',
      isReady: false,
      lastQR: null,
      lastQRAt: null,
      message: 'WhatsApp feature is not available in this environment'
    };
    this.delayMs = 3000; // فاصل بين الرسائل لتجنب الحظر
    
    // Check if we can use WhatsApp (requires Chrome/Chromium)
    try {
      const chromiumPath = findChromiumExecutable();
      if (chromiumPath) {
        this.enabled = true;
        this.executablePath = chromiumPath;
        this.status.state = 'disconnected';
        this.status.message = '';
        console.log('ℹ️  WhatsApp engine enabled with Chromium:', chromiumPath);
      } else {
        console.warn('⚠️  WhatsApp engine disabled: Chrome/Chromium not found');
      }
    } catch (err) {
      console.warn('⚠️  WhatsApp engine disabled:', err.message);
    }
  }

  formatPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) throw new Error('رقم غير صالح');

    let phone = digits;
    if (phone.startsWith('00')) phone = phone.slice(2);
    if (phone.startsWith('0')) phone = `2${phone}`;
    if (!phone.startsWith('20')) phone = `20${phone}`;

    return `${phone}@c.us`;
  }

  async initialize() {
    if (this.initPromise) return this.initPromise;

    // If WhatsApp is not enabled, return safely
    if (!this.enabled) {
      console.warn('⚠️  WhatsApp engine is disabled - Chrome/Chromium not found');
      this.status.state = 'disabled';
      this.status.isReady = false;
      this.initPromise = Promise.resolve({ 
        success: false, 
        message: 'WhatsApp feature is disabled in this environment' 
      });
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const authDir = getWhatsAppAuthPath();
      
      // Ensure auth directory exists
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      
      console.log('WhatsApp auth path:', authDir);
      
      const client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: 'attendance-engine',
          dataPath: authDir
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath: this.executablePath || undefined
        }
      });

      this.client = client;
      this.status.state = 'initializing';

      client.on('qr', async (qr) => {
        try {
          console.log('📱 QR code received, converting to Base64...');
          this.status.lastQR = await qrcode.toDataURL(qr);
          this.status.lastQRAt = Date.now();
          this.status.state = 'qr';
          this.status.isReady = false;
          console.log('✅ QR code ready:', this.status.lastQR.substring(0, 50) + '...');
        } catch (err) {
          console.error('❌ QR encode error:', err);
        }
      });

      client.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated');
        this.status.state = 'authenticated';
        this.status.isReady = true;
      });

      client.on('ready', () => {
        console.log('✅ WhatsApp ready');
        this.status.state = 'ready';
        this.status.isReady = true;
        
        // إعادة معالجة الطابور إذا كانت هناك رسائل معلقة
        if (this.queue.length > 0) {
          console.log('📤 إعادة معالجة الرسائل المعلقة:', this.queue.length);
          this.processQueue();
        }
      });

      client.on('disconnected', (reason) => {
        console.warn('WhatsApp disconnected:', reason);
        this.status.state = 'disconnected';
        this.status.isReady = false;
        this.initPromise = null;
      });

      client.initialize()
        .then(() => resolve({ success: true }))
        .catch((err) => {
          console.error('WhatsApp init error:', err);
          this.initPromise = null;
          reject(err);
        });
    });

    return this.initPromise;
  }

  getStatus() {
    const statusData = { 
      ...this.status, 
      queueLength: this.queue.length 
    };
    console.log('📊 Status requested:', statusData);
    return statusData;
  }

  async ensureReady() {
    await this.initialize();
    return this.status.isReady;
  }

  async enqueueMessage({ phone, studentName, score, message }) {
    // Check if WhatsApp is enabled
    if (!this.enabled) {
      console.warn('⚠️  WhatsApp is disabled - message cannot be sent');
      return { 
        success: false, 
        message: 'WhatsApp feature is not available',
        queued: false 
      };
    }
    
    console.log('📥 جاري إضافة رسالة للطابور...', { phone, studentName, score: score ? score : 'custom message' });
    
    const to = this.formatPhone(phone);
    console.log('📱 الرقم بعد التنسيق:', to);
    
    // إذا كانت هناك رسالة مخصصة، استخدمها
    let finalMessage;
    if (message) {
      finalMessage = message;
      console.log('✉️ رسالة مخصصة:', message.substring(0, 50) + '...');
    } else if (score !== undefined && score !== null) {
      // التحقق من حالة الغياب عن الامتحان
      const isAbsent = String(score).includes('غائب');
      if (isAbsent) {
        finalMessage = `📚 الطالب: ${studentName}\n\n⚠️ ${score}\n\nتحياتي،\nأ/محمد الربيعي`;
      } else {
        finalMessage = `📚 درجات الطالب: ${studentName}\n\n✅ إجمالي الدرجات: ${score}/20\n\nتحياتي،\nأ/محمد الربيعي`;
      }
      console.log('📊 رسالة درجات لـ:', studentName, 'الدرجة:', score);
    } else {
      throw new Error('يجب تحديد رسالة أو درجة');
    }
    
    this.queue.push({ to, message: finalMessage });
    console.log('✅ تمت الإضافة للطابور. العدد الحالي:', this.queue.length);
    
    this.processQueue();
    return { success: true, queued: true };
  }

  // Send message directly (for broadcast feature)
  async sendMessage(phone, message) {
    console.log('📤 إرسال رسالة مباشرة إلى:', phone);
    return await this.enqueueMessage({ phone, message });
  }

  async processQueue() {
    // Skip if WhatsApp is not enabled
    if (!this.enabled) {
      console.warn('⚠️  WhatsApp is disabled - queue processing skipped');
      this.queue = []; // Clear queue
      return;
    }
    
    if (this.processing) {
      console.log('⏸️ معالجة الطابور قيد التنفيذ بالفعل...');
      return;
    }
    
    console.log('🚀 بدء معالجة الطابور. عدد الرسائل:', this.queue.length);
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      console.log('📤 محاولة إرسال رسالة إلى:', job.to);
      console.log('📝 نص الرسالة:', job.message.substring(0, 100) + '...');
      
      try {
        console.log('🔍 التحقق من جاهزية WhatsApp...');
        const ready = await this.ensureReady();
        
        if (!ready) {
          console.error('❌ WhatsApp غير جاهز! الحالة:', this.status.state);
          console.warn('⏸️ سيتم إعادة إضافة الرسالة للطابور عند الاتصال');
          
          // إعادة الرسالة للطابور
          this.queue.unshift(job);
          this.processing = false;
          return;
        }
        
        console.log('✅ WhatsApp جاهز. جاري الإرسال...');
        await this.client.sendMessage(job.to, job.message, { sendSeen: false });
        console.log('✅ تم الإرسال بنجاح إلى:', job.to);
        
        if (this.queue.length > 0) {
          console.log('⏳ انتظار', this.delayMs / 1000, 'ثانية قبل الرسالة التالية...');
          await new Promise((res) => setTimeout(res, this.delayMs));
        }
      } catch (err) {
        console.error('❌ خطأ في إرسال الرسالة:', err.message);
        console.error('❌ التفاصيل:', err);
      }
    }

    console.log('✅ انتهت معالجة الطابور');
    this.processing = false;
  }

  async hardReset() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('Destroy client error:', err);
      }
      this.client = null;
    }

    // Use correct auth path
    const authPath = getWhatsAppAuthPath();
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('WhatsApp auth cleared:', authPath);
      } catch (err) {
        console.error('Error clearing WhatsApp auth:', err);
      }
    }

    this.initPromise = null;
    this.status = { state: 'disconnected', isReady: false, lastQR: null, lastQRAt: null };
    this.queue = [];
    this.processing = false;
    return this.initialize();
  }

  async restart() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('Destroy client error:', err);
      }
      this.client = null;
    }

    this.initPromise = null;
    this.status = { state: 'disconnected', isReady: false, lastQR: null, lastQRAt: null };
    this.processing = false;
    return this.initialize();
  }

  async cleanup() {
    // Skip if WhatsApp is not enabled
    if (!this.enabled) {
      console.log('ℹ️  WhatsApp cleanup skipped (not enabled)');
      return;
    }
    
    console.log('🧹 تنظيف WhatsApp Engine...');
    
    // إيقاف معالجة الطابور مؤقتاً (نحتفظ بالرسائل)
    this.processing = false;
    console.log('📦 الرسائل المتبقية في الطابور:', this.queue.length);
    
    // إغلاق الـ client بدون logout (للحفاظ على الجلسة)
    if (this.client) {
      try {
        console.log('📴 إغلاق WhatsApp client (مع الحفاظ على الجلسة)...');
        
        // destroy فقط بدون logout لحفظ الجلسة
        await Promise.race([
          this.client.destroy(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        console.log('✅ تم destroy client مع الحفاظ على الجلسة');
        
      } catch (err) {
        console.error('❌ خطأ في إغلاق client:', err.message);
      } finally {
        this.client = null;
      }
    }
    
    // إغلاق أي عمليات Puppeteer متبقية
    try {
      const { exec } = require('child_process');
      exec('taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq DevTools*" 2>nul', (err) => {
        if (!err) console.log('✅ تم إغلاق عمليات Chrome');
      });
    } catch (err) {
      console.error('تحذير: فشل إغلاق Chrome:', err.message);
    }
    
    this.initPromise = null;
    this.status = { state: 'disconnected', isReady: false, lastQR: null, lastQRAt: null };
    console.log('✅ تم تنظيف WhatsApp Engine');
  }
}

module.exports = new WhatsAppEngine();
