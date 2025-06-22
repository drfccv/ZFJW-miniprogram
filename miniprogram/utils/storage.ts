// 存储管理工具类
interface CacheData {
  data: any;
  timestamp: number;
}

interface CacheStorage {
  [key: string]: CacheData;
}

interface LoginInfo {
  cookies: any;
  schoolName: string;
  loginTime: number;
}

class StorageService {  // 存储键名常量
  static get KEYS() {
    return {
      USER_INFO: 'userInfo',
      COOKIES: 'cookies',
      SCHOOL_NAME: 'schoolName',
      API_BASE_URL: 'apiBaseUrl', // 后端API地址
      SCHEDULE_CACHE: 'scheduleCache',
      GRADE_CACHE: 'gradeCache',
      EXAM_CACHE: 'examCache',
      NOTIFICATIONS_CACHE: 'notificationsCache',
      CURRENT_TERM: 'currentTerm',
      SCHEDULE_SETTINGS: 'scheduleSettings',
      DEFAULT_START_PAGE: 'defaultStartPage', // 默认启动页面
      LOGIN_FORM_DATA: 'loginFormData' // 登录表单数据缓存
    };
  }

  // 设置存储
  static set(key: string, value: any): void {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('存储失败:', e);
    }
  }

  // 获取存储
  static get<T>(key: string): T | null {
    try {
      return wx.getStorageSync(key) || null;
    } catch (e) {
      console.error('读取存储失败:', e);
      return null;
    }
  }

  // 删除存储
  static remove(key: string): void {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.error('删除存储失败:', e);
    }
  }

  // 清空所有存储
  static clear(): void {
    try {
      wx.clearStorageSync();
    } catch (e) {
      console.error('清空存储失败:', e);
    }
  }
  // 检查是否已登录
  static isLoggedIn(): boolean {
    const cookies = this.get(this.KEYS.COOKIES);
    const schoolName = this.get(this.KEYS.SCHOOL_NAME);
    return !!(cookies && schoolName);
  }  // 保存用户登录信息
  static saveLoginInfo(cookies: any, schoolName: string, userInfo?: any): void {
    this.set(this.KEYS.COOKIES, cookies);
    this.set(this.KEYS.SCHOOL_NAME, schoolName);
    console.log('保存school_name:', schoolName);
    
    if (userInfo) {
      this.set(this.KEYS.USER_INFO, userInfo);
    }
  }  // 获取登录信息
  static getLoginInfo(): LoginInfo | null {
    const cookies = this.get<any>(this.KEYS.COOKIES);
    const schoolName = this.get<string>(this.KEYS.SCHOOL_NAME);
    
    if (cookies && schoolName) {
      return { 
        cookies, 
        schoolName: schoolName,
        loginTime: Date.now()
      };
    }
    return null;
  }  // 清除登录信息
  static clearLoginInfo(): void {
    this.remove(this.KEYS.COOKIES);
    this.remove(this.KEYS.SCHOOL_NAME);
    this.remove(this.KEYS.USER_INFO);
  }

  // 设置当前学期
  static setCurrentTerm(year: number, term: number): void {
    this.set(this.KEYS.CURRENT_TERM, { year, term });
  }

  // 获取当前学期
  static getCurrentTerm(): { year: number; term: number } | null {
    return this.get(this.KEYS.CURRENT_TERM);
  }

  // 缓存课表数据
  static cacheSchedule(year: number, term: number, data: any): void {
    const cache = this.get<CacheStorage>(this.KEYS.SCHEDULE_CACHE) || {};
    const key = `${year}-${term}`;
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    this.set(this.KEYS.SCHEDULE_CACHE, cache);
  }

  // 获取缓存的课表数据
  static getCachedSchedule(year: number, term: number): any | null {
    const cache = this.get<CacheStorage>(this.KEYS.SCHEDULE_CACHE) || {};
    const key = `${year}-${term}`;
    const cached = cache[key];
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  // 缓存成绩数据
  static cacheGrade(year: number, term: number, data: any): void {
    const cache = this.get<CacheStorage>(this.KEYS.GRADE_CACHE) || {};
    const key = `${year}-${term}`;
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    this.set(this.KEYS.GRADE_CACHE, cache);
  }

  // 获取缓存的成绩数据
  static getCachedGrade(year: number, term: number): any | null {
    const cache = this.get<CacheStorage>(this.KEYS.GRADE_CACHE) || {};
    const key = `${year}-${term}`;
    const cached = cache[key];
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  // 缓存考试数据
  static cacheExam(year: number, term: number, data: any): void {
    const cache = this.get<CacheStorage>(this.KEYS.EXAM_CACHE) || {};
    const key = `${year}-${term}`;
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    this.set(this.KEYS.EXAM_CACHE, cache);
  }

  // 获取缓存的考试数据
  static getCachedExam(year: number, term: number): any | null {
    const cache = this.get<CacheStorage>(this.KEYS.EXAM_CACHE) || {};
    const key = `${year}-${term}`;
    const cached = cache[key];
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  // 保存课表设置
  static setScheduleSettings(settings: any): void {
    this.set(this.KEYS.SCHEDULE_SETTINGS, settings);
  }

  // 获取课表设置
  static getScheduleSettings(): any | null {
    return this.get(this.KEYS.SCHEDULE_SETTINGS);
  }

  // 清除课表设置
  static clearScheduleSettings(): void {
    this.remove(this.KEYS.SCHEDULE_SETTINGS);
  }
  // 获取API基础地址
  static getApiBaseUrl(): string {
    return this.get<string>(this.KEYS.API_BASE_URL) || 'http://localhost:5000';
  }

  // 设置API基础地址
  static setApiBaseUrl(url: string): void {
    this.set(this.KEYS.API_BASE_URL, url);
  }

  // 设置默认启动页面
  static setDefaultStartPage(page: string): void {
    this.set(this.KEYS.DEFAULT_START_PAGE, page);
  }

  // 获取默认启动页面
  static getDefaultStartPage(): string {
    return this.get<string>(this.KEYS.DEFAULT_START_PAGE) || 'index';
  }

  // 保存登录表单数据（不包含密码明文）
  static saveLoginFormData(schoolName: string, sid: string, rememberPassword: boolean = false, password?: string): void {
    const loginFormData = {
      schoolName,
      sid,
      rememberPassword,
      // 只有在用户明确选择记住密码时才保存密码
      password: rememberPassword && password ? this.encryptPassword(password) : '',
      saveTime: Date.now()
    };
    
    this.set(this.KEYS.LOGIN_FORM_DATA, loginFormData);
    console.log('已保存登录表单数据:', { schoolName, sid, rememberPassword });
  }

  // 获取登录表单数据
  static getLoginFormData(): { schoolName: string; sid: string; password: string; rememberPassword: boolean } | null {
    try {
      const data = this.get<any>(this.KEYS.LOGIN_FORM_DATA);
      if (!data) return null;
      
      // 检查数据是否过期（30天）
      const now = Date.now();
      const saveTime = data.saveTime || 0;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
      
      if (now - saveTime > maxAge) {
        this.remove(this.KEYS.LOGIN_FORM_DATA);
        return null;
      }
      
      return {
        schoolName: data.schoolName || '',
        sid: data.sid || '',
        password: data.password ? this.decryptPassword(data.password) : '',
        rememberPassword: data.rememberPassword || false
      };
    } catch (error) {
      console.error('读取登录表单数据失败:', error);
      return null;
    }
  }

  // 清除登录表单数据
  static clearLoginFormData(): void {
    this.remove(this.KEYS.LOGIN_FORM_DATA);
  }  // 简单的密码加密（仅用于本地存储，不是安全加密）
  private static encryptPassword(password: string): string {
    try {
      // 使用简单的Caesar密码进行加密，偏移量为5
      let encrypted = '';
      for (let i = 0; i < password.length; i++) {
        const charCode = password.charCodeAt(i);
        encrypted += String.fromCharCode(charCode + 5);
      }
      // 再加上一个简单的标识符，用于验证解密结果
      return 'enc_' + encrypted + '_end';
    } catch (error) {
      console.error('密码加密失败:', error);
      return password; // 如果编码失败，返回原密码
    }
  }

  // 简单的密码解密
  private static decryptPassword(encryptedPassword: string): string {
    try {
      // 检查是否是有效的加密格式
      if (!encryptedPassword.startsWith('enc_') || !encryptedPassword.endsWith('_end')) {
        return ''; // 无效格式，返回空字符串
      }
      
      // 提取加密内容
      const encrypted = encryptedPassword.slice(4, -4); // 去掉 'enc_' 和 '_end'
      
      // 使用Caesar密码解密，偏移量为-5
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(charCode - 5);
      }
      
      return decrypted;
    } catch (error) {
      console.error('密码解密失败:', error);
      return ''; // 如果解码失败，返回空字符串
    }
  }

  // 获取API参数（使用school_name）
  static getApiParams(): { school_name: string } | null {
    const loginInfo = this.getLoginInfo();
    if (!loginInfo) return null;
    
    console.log('API参数使用school_name:', loginInfo.schoolName);
    return {
      school_name: loginInfo.schoolName
    };
  }

  // 获取API通用参数（包含cookies和school_name）
  static getApiBaseParams(): { cookies: any; school_name: string } | null {
    const loginInfo = this.getLoginInfo();
    if (!loginInfo) return null;
    
    return {
      cookies: loginInfo.cookies,
      school_name: loginInfo.schoolName
    };
  }

  // 检查缓存是否有效（24小时）
  private static isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const diff = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    return diff < maxAge;
  }  // 清除所有缓存
  static clearAllCache(): void {
    console.log('开始清除所有缓存数据...');
    
    // 清除数据缓存
    this.remove(this.KEYS.SCHEDULE_CACHE);
    this.remove(this.KEYS.GRADE_CACHE);
    this.remove(this.KEYS.EXAM_CACHE);
    this.remove(this.KEYS.NOTIFICATIONS_CACHE);
    
    // 清除设置缓存
    this.remove(this.KEYS.CURRENT_TERM);
    this.remove(this.KEYS.SCHEDULE_SETTINGS);
    
    // 清除用户信息（但保留登录凭证）
    this.remove(this.KEYS.USER_INFO);
    
    // 清除登录表单数据
    this.clearLoginFormData();
    
    console.log('缓存清除完成，保留登录信息和API设置');
  }

  // 清除所有数据（包括登录信息）
  static clearAllData(): void {
    console.log('开始清除所有数据...');
    
    // 清除所有缓存
    this.clearAllCache();
    
    // 清除登录信息
    this.clearLoginInfo();
    
    // 清除API设置
    this.remove(this.KEYS.API_BASE_URL);
    
    console.log('所有数据清除完成');
  }

  // 缓存通知数据
  static cacheNotifications(data: any): void {
    const cache = {
      data,
      timestamp: Date.now()
    };
    this.set(this.KEYS.NOTIFICATIONS_CACHE, cache);
  }

  // 获取缓存的通知数据
  static getCachedNotifications(): { data: any; timestamp: number } | null {
    const cached = this.get<CacheData>(this.KEYS.NOTIFICATIONS_CACHE);
    
    if (cached) {
      return cached;
    }
    return null;
  }

  // 格式化时间显示
  static formatUpdateTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    // 小于5分钟显示"刚刚刷新"
    if (diff < 5 * 60 * 1000) {
      return '刚刚刷新';
    }
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 如果是今天，只显示时间
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `上次刷新${hours}:${minutes}`;
    }
    
    // 如果是今年，不显示年份
    if (year === today.getFullYear()) {
      return `上次刷新${month}.${day} ${hours}:${minutes}`;
    }
    
    // 显示完整日期
    return `上次刷新${year}.${month}.${day}`;
  }

  // 缓存详细成绩数据
  static cacheGradeDetail(year: number, term: number, data: any): void {
    const cache = this.get<CacheStorage>(this.KEYS.GRADE_CACHE) || {};
    const key = `${year}-${term}-detail`;
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    this.set(this.KEYS.GRADE_CACHE, cache);
  }

  // 获取缓存的详细成绩数据
  static getCachedGradeDetail(year: number, term: number): any | null {
    const cache = this.get<CacheStorage>(this.KEYS.GRADE_CACHE) || {};
    const key = `${year}-${term}-detail`;
    const cached = cache[key];
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }
}

export default StorageService;
