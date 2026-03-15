/**
 * ✅ OPTIMIZATIONS FOR main.js
 * نقاط تحسين معمارية Electron وأداء النظام
 */

// ============================================================
// 1️⃣ ERROR HANDLING & RETRY LOGIC
// ============================================================

class RetryableError extends Error {
  constructor(message, retryable = true) {
    super(message);
    this.retryable = retryable;
  }
}

const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,  // 1 second
  maxDelay: 10000,     // 10 seconds
};

async function retryOperation(fn, name = 'Operation') {
  let lastError;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`🔄 محاولة ${attempt}/${retryConfig.maxRetries}: ${name}`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!(error instanceof RetryableError) || !error.retryable) {
        throw error;  // لا نحاول مرة أخرى
      }
      
      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(2, attempt - 1),
          retryConfig.maxDelay
        );
        console.warn(`⏳ إعادة محاولة بعد ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw new Error(`${name} فشل بعد ${retryConfig.maxRetries} محاولات: ${lastError.message}`);
}

// ============================================================
// 2️⃣ SAFE IPC HANDLER WRAPPER
// ============================================================

function createSafeHandler(fn, timeout = 30000) {
  return async (event, ...args) => {
    try {
      // 🔐 أضف timeout للعملية
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation Timeout')), timeout)
        )
      ]);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Handler Error:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      };
    }
  };
}

// ============================================================
// 3️⃣ DATABASE CONNECTION POOLING & CACHING
// ============================================================

const dbConnectionPool = {
  primary: null,
  lastAccess: Date.now(),
  accessTimeout: 5 * 60 * 1000,  // 5 minutes idle timeout
  
  getConnection() {
    this.lastAccess = Date.now();
    if (!this.primary) {
      throw new Error('Database not initialized');
    }
    return this.primary;
  },
  
  setConnection(db) {
    this.primary = db;
  },
  
  isIdle() {
    return Date.now() - this.lastAccess > this.accessTimeout;
  },
  
  reset() {
    this.primary = null;
  }
};

// ============================================================
// 4️⃣ REQUEST DEDUPLICATION & CACHING
// ============================================================

const requestCache = {
  store: new Map(),
  ttl: 60000,  // 1 minute
  
  key(handler, args) {
    return `${handler}::${JSON.stringify(args)}`;
  },
  
  get(handler, args) {
    const k = this.key(handler, args);
    const entry = this.store.get(k);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(k);
      return null;
    }
    
    console.log(`💾 Cache Hit: ${handler}`);
    return entry.value;
  },
  
  set(handler, args, value) {
    const k = this.key(handler, args);
    this.store.set(k, {
      value,
      timestamp: Date.now()
    });
  },
  
  invalidate(pattern) {
    for (const [key] of this.store) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }
};

// ============================================================
// 5️⃣ OPTIMIZED IPC HANDLERS
// ============================================================

// مثال: optimized student:getAll with caching
function setupOptimizedHandlers(ipcMain) {
  
  // ✅ GET ALL STUDENTS - مع Caching
  ipcMain.handle('student:getAll', createSafeHandler(async () => {
    const cached = requestCache.get('student:getAll', []);
    if (cached) return cached;
    
    // يفترض أن db من database.js
    // const db = dbConnectionPool.getConnection();
    // const students = db.prepare('SELECT * FROM students').all();
    
    // في الواقع:
    const Student = require('./models/Student');
    const students = await Student.getAll();
    
    requestCache.set('student:getAll', [], students);
    return students;
  }));
  
  // ✅ ADD STUDENT - مع Invalidation للـ Cache
  ipcMain.handle('student:add', createSafeHandler(async (data) => {
    const Student = require('./models/Student');
    const result = await Student.add(
      data.name,
      data.studentPhone,
      data.guardianPhone,
      data.photo,
      data.qr_code
    );
    
    // تنظيف Cache عند الإضافة
    requestCache.invalidate('student:');
    
    return result;
  }));
  
  // ✅ UPDATE STUDENT - مع Invalidation
  ipcMain.handle('student:update', createSafeHandler(async (data) => {
    const Student = require('./models/Student');
    
    // منع تعديل الـ ID
    if (data.code) {
      const current = await Student.getById(data.id);
      if (current && current.code !== data.code) {
        throw new RetryableError('لا يمكن تعديل رقم الطالب', false);
      }
    }
    
    const result = await Student.update(
      data.id,
      data.name,
      data.studentPhone,
      data.guardianPhone,
      data.photo
    );
    
    // تنظيف Cache
    requestCache.invalidate('student:');
    
    return result;
  }, 15000));  // 15 second timeout
  
  // ✅ DELETE STUDENT - مع Invalidation
  ipcMain.handle('student:remove', createSafeHandler(async (id) => {
    const Student = require('./models/Student');
    const result = await Student.remove(id);
    
    // تنظيف Cache
    requestCache.invalidate('student:');
    
    return result;
  }));
  
  console.log('✅ تم تثبيت Optimized IPC Handlers');
}

// ============================================================
// 6️⃣ PERFORMANCE MONITORING
// ============================================================

const performanceMonitor = {
  operations: new Map(),
  
  start(name) {
    this.operations.set(name, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage().heapUsed
    });
  },
  
  end(name) {
    const op = this.operations.get(name);
    if (!op) return;
    
    const duration = Number(process.hrtime.bigint() - op.startTime) / 1e6;  // ms
    const memoryDelta = (process.memoryUsage().heapUsed - op.startMemory) / 1e6;  // MB
    
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms, Memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)}MB`);
    
    this.operations.delete(name);
  },
  
  report() {
    console.log('📊 Performance Report:');
    console.log(`Memory: ${(process.memoryUsage().heapUsed / 1e6).toFixed(2)}MB`);
    console.log(`Uptime: ${(process.uptime() / 60).toFixed(2)} minutes`);
  }
};

// استخدام:
// performanceMonitor.start('database-init');
// ... do work ...
// performanceMonitor.end('database-init');

// ============================================================
// 7️⃣ BATCH OPERATIONS
// ============================================================

function createBatchProcessor(handler, batchSize = 10, delay = 100) {
  let queue = [];
  let timer = null;
  
  return async function addToBatch(item) {
    return new Promise((resolve, reject) => {
      queue.push({ item, resolve, reject });
      
      if (queue.length >= batchSize) {
        processBatch();
      } else if (!timer) {
        timer = setTimeout(processBatch, delay);
      }
    });
  };
  
  async function processBatch() {
    clearTimeout(timer);
    timer = null;
    
    if (queue.length === 0) return;
    
    const batch = queue.splice(0, batchSize);
    
    try {
      const results = await handler(batch.map(b => b.item));
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach(b => b.reject(error));
    }
  }
}

// الاستخدام: للبيانات الضخمة
// const batchAddMarks = createBatchProcessor(async (marks) => {
//   // معالجة عدة علامات بدفعة واحدة
// });

// ============================================================
// 8️⃣ MEMORY MANAGEMENT
// ============================================================

const memoryManager = {
  limits: {
    heapMax: 500e6,  // 500MB
    warningLevel: 400e6  // 400MB
  },
  
  check() {
    const heap = process.memoryUsage().heapUsed;
    
    if (heap > this.limits.warningLevel) {
      console.warn(`⚠️ تحذير الذاكرة: ${(heap / 1e6).toFixed(2)}MB`);
      global.gc && global.gc();  // force garbage collection
    }
    
    if (heap > this.limits.heapMax) {
      console.error('❌ تجاوز حد الذاكرة!');
      return false;
    }
    
    return true;
  },
  
  startMonitoring(interval = 30000) {
    setInterval(() => this.check(), interval);
    console.log('📊 Memory monitoring started');
  }
};

// ============================================================
// 9️⃣ BACKUP OPTIMIZATION
// ============================================================

const backupOptimization = {
  // الحالي: Backup كل 24 ساعة
  // تحسين: تحكم أفضل بحجم الـ Backups
  
  shouldBackup(lastBackupTime) {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - lastBackupTime > twentyFourHours;
  },
  
  getBackupStrategy() {
    return {
      daily: true,      // Backup يومي
      weekly: true,     // Backup أسبوعي (نسخة كاملة)
      monthly: true,    // Backup شهري (ارشيف)
      maxBackups: 30,   // احتفظ بـ 30 نسخة فقط
      compression: 9,   // أقصى ضغط
      incremental: true // Backup إضافي (فقط الملفات المتغيرة)
    };
  }
};

// ============================================================
// 1️⃣0️⃣ SUMMARY & RECOMMENDATIONS
// ============================================================

/*
تحسينات موصى بها للتطبيق:

1. ✅ ERROR HANDLING
   - استخدام Retry Logic مع Exponential Backoff
   - Timeout على جميع العمليات
   - تسجيل تفصيلي للأخطاء

2. ✅ PERFORMANCE
   - Caching ذكي مع TTL
   - Request Deduplication
   - Batch Processing للعمليات الضخمة
   - Performance Monitoring

3. ✅ MEMORY
   - مراقبة الذاكرة المستمرة
   - Garbage Collection عند الحد الأقصى
   - تنظيف الموارد غير المستخدمة

4. ✅ DATABASE
   - Connection Pooling
   - Query Optimization
   - Transaction Support
   - Incremental Backups

5. ✅ USER EXPERIENCE
   - Progress Indicators
   - Offline Support
   - Sync Queue
   - Notification System

التطبيق الحالي ✅ قوي جداً، هذه التحسينات اختيارية للأداء الإضافي
*/

module.exports = {
  retryConfig,
  retryOperation,
  createSafeHandler,
  dbConnectionPool,
  requestCache,
  setupOptimizedHandlers,
  performanceMonitor,
  createBatchProcessor,
  memoryManager,
  backupOptimization
};
