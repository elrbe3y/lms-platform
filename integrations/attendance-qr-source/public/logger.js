/**
 * Advanced Logging System
 * نظام تسجيل متقدم لتتبع جميع الأحداث والأخطاء
 */

(function() {
  'use strict';

  const Logger = {
    // إعدادات Logger
    config: {
      maxLogs: 10000, // الحد الأقصى لعدد السجلات
      logToConsole: true, // طباعة في Console
      logLevels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        CRITICAL: 4
      },
      currentLevel: 0 // DEBUG - تسجيل كل شيء
    },

    // مخزن اللوجات
    logs: [],
    sessionId: null,
    startTime: null,

    // تهيئة Logger
    init() {
      this.sessionId = this.generateSessionId();
      this.startTime = new Date().toISOString();
      
      // تحميل اللوجات السابقة
      this.loadLogs();
      
      // تسجيل بداية الجلسة
      this.info('SYSTEM', 'تم بدء جلسة جديدة', {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        url: window.location.href
      });

      // مراقبة الأخطاء العامة
      this.setupErrorHandlers();
      
      // مراقبة النقرات
      this.setupClickTracking();
      
      // مراقبة التنقل
      this.setupNavigationTracking();
      
      // حفظ اللوجات قبل إغلاق الصفحة
      window.addEventListener('beforeunload', () => {
        this.info('SYSTEM', 'إغلاق الصفحة', { url: window.location.href });
        this.saveLogs();
      });

      // حفظ دوري كل 30 ثانية
      setInterval(() => this.saveLogs(), 30000);

      console.log('✅ Logger initialized successfully');
    },

    // توليد معرف فريد للجلسة
    generateSessionId() {
      return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // تسجيل حدث
    log(level, category, message, data = {}) {
      if (this.config.logLevels[level] < this.config.currentLevel) {
        return; // تجاهل اللوجات الأقل من المستوى المطلوب
      }

      const logEntry = {
        id: this.logs.length + 1,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        level: level,
        category: category,
        message: message,
        data: data,
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      this.logs.push(logEntry);

      // طباعة في Console
      if (this.config.logToConsole) {
        const emoji = this.getLevelEmoji(level);
        const style = this.getLevelStyle(level);
        console.log(
          `%c${emoji} [${level}] ${category}: ${message}`,
          style,
          data
        );
      }

      // حفظ تلقائي عند الأخطاء الحرجة
      if (level === 'ERROR' || level === 'CRITICAL') {
        this.saveLogs();
      }

      // تنظيف السجلات القديمة
      if (this.logs.length > this.config.maxLogs) {
        this.logs = this.logs.slice(-this.config.maxLogs);
      }
    },

    // مستويات التسجيل المختلفة
    debug(category, message, data) {
      this.log('DEBUG', category, message, data);
    },

    info(category, message, data) {
      this.log('INFO', category, message, data);
    },

    warn(category, message, data) {
      this.log('WARN', category, message, data);
    },

    error(category, message, data) {
      this.log('ERROR', category, message, data);
    },

    critical(category, message, data) {
      this.log('CRITICAL', category, message, data);
    },

    // رموز المستويات
    getLevelEmoji(level) {
      const emojis = {
        DEBUG: '🔍',
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌',
        CRITICAL: '🔥'
      };
      return emojis[level] || '📝';
    },

    // ألوان المستويات
    getLevelStyle(level) {
      const styles = {
        DEBUG: 'color: #95a5a6; font-weight: normal;',
        INFO: 'color: #3498db; font-weight: bold;',
        WARN: 'color: #f39c12; font-weight: bold;',
        ERROR: 'color: #e74c3c; font-weight: bold;',
        CRITICAL: 'color: #c0392b; font-weight: bold; font-size: 14px;'
      };
      return styles[level] || '';
    },

    // إعداد معالجات الأخطاء
    setupErrorHandlers() {
      // أخطاء JavaScript العامة
      window.addEventListener('error', (event) => {
        this.error('JS_ERROR', 'خطأ JavaScript', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? event.error.stack : null
        });
      });

      // أخطاء Promise غير المعالجة
      window.addEventListener('unhandledrejection', (event) => {
        this.error('PROMISE_ERROR', 'خطأ Promise غير معالج', {
          reason: event.reason,
          promise: event.promise
        });
      });

      // اعتراض console.error
      const originalError = console.error;
      console.error = (...args) => {
        this.error('CONSOLE_ERROR', 'رسالة خطأ من Console', {
          arguments: args
        });
        originalError.apply(console, args);
      };
    },

    // مراقبة النقرات
    setupClickTracking() {
      document.addEventListener('click', (event) => {
        const target = event.target;
        const tagName = target.tagName;
        const id = target.id;
        const className = target.className;
        const text = target.textContent?.trim().substring(0, 50);

        this.debug('USER_INTERACTION', 'نقر على عنصر', {
          tagName: tagName,
          id: id,
          className: className,
          text: text,
          href: target.href || null,
          coordinates: { x: event.clientX, y: event.clientY }
        });
      }, true);

      // مراقبة الأزرار خصيصاً
      document.addEventListener('click', (event) => {
        if (event.target.matches('button') || event.target.closest('button')) {
          const button = event.target.matches('button') ? event.target : event.target.closest('button');
          this.info('BUTTON_CLICK', 'نقر على زر', {
            buttonId: button.id,
            buttonClass: button.className,
            buttonText: button.textContent?.trim(),
            formId: button.form?.id || null
          });
        }
      }, true);
    },

    // مراقبة التنقل
    setupNavigationTracking() {
      // تسجيل تغيير الصفحة
      let previousUrl = window.location.href;
      
      const observer = new MutationObserver(() => {
        if (window.location.href !== previousUrl) {
          this.info('NAVIGATION', 'تغيير الصفحة', {
            from: previousUrl,
            to: window.location.href
          });
          previousUrl = window.location.href;
        }
      });

      observer.observe(document, { subtree: true, childList: true });
    },

    // حفظ اللوجات
    saveLogs() {
      try {
        const logsData = {
          version: '1.0',
          sessionId: this.sessionId,
          startTime: this.startTime,
          lastUpdate: new Date().toISOString(),
          totalLogs: this.logs.length,
          logs: this.logs
        };

        localStorage.setItem('appLogs', JSON.stringify(logsData));
        
        // نسخة احتياطية في sessionStorage
        sessionStorage.setItem('appLogsBackup', JSON.stringify(logsData));
        
        this.debug('LOGGER', 'تم حفظ اللوجات', {
          count: this.logs.length,
          size: new Blob([JSON.stringify(logsData)]).size
        });
      } catch (error) {
        console.error('فشل حفظ اللوجات:', error);
      }
    },

    // تحميل اللوجات
    loadLogs() {
      try {
        const saved = localStorage.getItem('appLogs');
        if (saved) {
          const logsData = JSON.parse(saved);
          // الاحتفاظ بالسجلات القديمة
          this.logs = logsData.logs || [];
          console.log(`✅ تم تحميل ${this.logs.length} سجل سابق`);
        }
      } catch (error) {
        console.error('فشل تحميل اللوجات:', error);
        this.logs = [];
      }
    },

    // تصدير اللوجات كملف
    exportLogs(filename = null) {
      const logsData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        sessionId: this.sessionId,
        startTime: this.startTime,
        totalLogs: this.logs.length,
        logs: this.logs
      };

      const blob = new Blob([JSON.stringify(logsData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `app_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.info('LOGGER', 'تم تصدير اللوجات', {
        filename: a.download,
        count: this.logs.length
      });
    },

    // مسح اللوجات
    clearLogs() {
      this.logs = [];
      localStorage.removeItem('appLogs');
      sessionStorage.removeItem('appLogsBackup');
      this.info('LOGGER', 'تم مسح جميع اللوجات');
    },

    // الحصول على اللوجات حسب الفلتر
    getLogs(filter = {}) {
      let filtered = [...this.logs];

      if (filter.level) {
        filtered = filtered.filter(log => log.level === filter.level);
      }

      if (filter.category) {
        filtered = filtered.filter(log => log.category === filter.category);
      }

      if (filter.startDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
      }

      if (filter.endDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },

    // الحصول على إحصائيات
    getStats() {
      const stats = {
        total: this.logs.length,
        byLevel: {},
        byCategory: {},
        errors: 0,
        warnings: 0
      };

      this.logs.forEach(log => {
        // حسب المستوى
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        
        // حسب الفئة
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        
        // عدد الأخطاء والتحذيرات
        if (log.level === 'ERROR' || log.level === 'CRITICAL') {
          stats.errors++;
        }
        if (log.level === 'WARN') {
          stats.warnings++;
        }
      });

      return stats;
    }
  };

  // تهيئة Logger عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Logger.init());
  } else {
    Logger.init();
  }

  // إتاحة Logger عالمياً
  window.AppLogger = Logger;

  // إضافة اختصار للوصول السريع
  window.logger = {
    debug: (category, message, data) => Logger.debug(category, message, data),
    info: (category, message, data) => Logger.info(category, message, data),
    warn: (category, message, data) => Logger.warn(category, message, data),
    error: (category, message, data) => Logger.error(category, message, data),
    critical: (category, message, data) => Logger.critical(category, message, data)
  };

})();
