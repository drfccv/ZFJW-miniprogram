import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface UserInfo {
  name: string;
  sid: string;
  [key: string]: any;
}

interface TodayClass {
  time: string;
  courseName: string;
  location: string;
  teacher: string;
}

interface Notification {
  title: string;
  time: string;
  content: string;
  fullContent?: string; // 完整内容，用于详情显示
}

Page({
  data: {
    userInfo: null as UserInfo | null,
    isLoggedIn: false,
    weather: '',
    todayClasses: [] as TodayClass[],
    notifications: [] as Notification[],
    notificationUpdateTime: '' // 通知更新时间显示文本
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    if (this.data.isLoggedIn) {
      this.loadData();
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = StorageService.isLoggedIn();
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
    
    this.setData({
      isLoggedIn,
      userInfo
    });
  },

  // 加载数据
  async loadData() {
    await Promise.all([
      this.loadTodaySchedule(),
      this.loadNotifications()
    ]);
  },

  // 加载今日课程
  async loadTodaySchedule() {
    try {
      const loginInfo = StorageService.getLoginInfo();
      if (!loginInfo) return;

      const currentTerm = StorageService.getCurrentTerm();
      if (!currentTerm) {
        // 默认使用当前学期
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const term = month >= 2 && month <= 7 ? 2 : 1; // 2-7月为春季学期，8-1月为秋季学期
        StorageService.setCurrentTerm(year, term);
      }

      const term = currentTerm || { year: new Date().getFullYear(), term: 1 };
      
      // 先尝试从缓存获取
      let scheduleData = StorageService.getCachedSchedule(term.year, term.term);
      
      if (!scheduleData) {
        // 缓存中没有数据，从API获取
        const result = await ApiService.getSchedule({
          cookies: loginInfo.cookies,
          school_name: loginInfo.schoolName,
          year: term.year,
          term: term.term
        });

        if (result.code === 1000 && result.data) {
          scheduleData = result.data;
          StorageService.cacheSchedule(term.year, term.term, scheduleData);
        }
      }

      if (scheduleData) {
        // 解析今日课程
        const todayClasses = this.parseTodayClasses(scheduleData);
        this.setData({ todayClasses });
      }
    } catch (error) {
      console.error('加载今日课程失败:', error);
    }
  },

  // 加载通知消息
  async loadNotifications() {
    try {
      const loginInfo = StorageService.getLoginInfo();
      if (!loginInfo) return;

      // 先尝试从缓存加载
      const cachedNotifications = StorageService.getCachedNotifications();
      if (cachedNotifications) {
        console.log('首页从缓存加载通知数据');
        this.processNotificationsData(cachedNotifications.data, cachedNotifications.timestamp);
      }

      // 无论是否有缓存，都尝试从网络更新（首页静默更新）
      const result = await ApiService.getNotifications({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName
      });

      if (result && result.code === 1000 && Array.isArray(result.data)) {
        // 缓存完整数据
        StorageService.cacheNotifications(result.data);
        
        // 处理首页显示数据
        this.processNotificationsData(result.data, Date.now());
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      
      // 网络请求失败时，如果还没有显示缓存数据，则尝试显示
      if (this.data.notifications.length === 0) {
        const cachedNotifications = StorageService.getCachedNotifications();
        if (cachedNotifications) {
          console.log('网络失败，首页显示缓存通知数据');
          this.processNotificationsData(cachedNotifications.data, cachedNotifications.timestamp);
        }
      }
    }
  },

  // 处理通知数据
  processNotificationsData(data: any[], timestamp: number) {
    // 转换数据格式，适配首页显示，只取前3条
    const notifications: Notification[] = [];
    
    data.slice(0, 3).forEach((item: any) => {
      // 处理数据字段映射，确保与API返回格式一致
      if (item && typeof item === 'object') {
        const title = String(item.type || item.title || '系统通知');
        const content = this.getNotificationSummary(item.content || '');
        const fullContent = String(item.content || item.summary || '暂无详细内容');
        
        if (title && content) {
          notifications.push({
            title,
            time: this.formatNotificationTime(item.create_time || ''),
            content,
            fullContent
          });
        }
      }
    });
    
    console.log('首页通知数据转换结果:', notifications);
    this.setData({ 
      notifications,
      notificationUpdateTime: StorageService.formatUpdateTime(timestamp)
    });
  },

  // 解析今日课程
  parseTodayClasses(scheduleData: any): TodayClass[] {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const todayClasses: TodayClass[] = [];

    if (scheduleData && Array.isArray(scheduleData)) {
      scheduleData.forEach((course: any) => {
        if (course.weeks && course.weeks.includes(this.getCurrentWeek())) {
          if (course.dayOfWeek === dayOfWeek) {
            todayClasses.push({
              time: this.formatClassTime(course.startTime, course.endTime),
              courseName: course.courseName || '未知课程',
              location: course.location || '未知地点',
              teacher: course.teacher || '未知教师'
            });
          }
        }
      });
    }

    return todayClasses.sort((a, b) => a.time.localeCompare(b.time));
  },

  // 获取当前周次（简化处理，实际应根据学期开始时间计算）
  getCurrentWeek(): number {
    // 这里简化处理，返回第1周，实际应该根据学期开始时间计算
    return 1;
  },

  // 格式化通知时间
  formatNotificationTime(timeStr: string): string {
    if (!timeStr) return '';
    
    try {
      // 如果是 "2025-03-14 10:19:55" 格式，只返回日期部分
      if (timeStr.includes(' ')) {
        return timeStr.split(' ')[0];
      }
      return timeStr;
    } catch (error) {
      return timeStr;
    }
  },

  // 格式化上课时间
  formatClassTime(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return '时间待定';
    return `${startTime}-${endTime}`;
  },

  // 生成通知摘要（截取前30个字符，适合首页显示）
  getNotificationSummary(content: string): string {
    if (!content || typeof content !== 'string') {
      return '暂无内容';
    }
    
    try {
      // 移除多余的空白字符
      const cleanContent = content.replace(/\s+/g, ' ').trim();
      // 截取前30个字符作为摘要（首页显示空间较小）
      return cleanContent.length > 30 ? cleanContent.substring(0, 30) + '...' : cleanContent;
    } catch (error) {
      console.error('生成摘要失败:', error);
      return '内容解析失败';
    }
  },

  // 页面导航
  navigateTo(e: any) {
    const { url } = e.currentTarget.dataset;
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    wx.navigateTo({ url });
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 查看通知详情
  viewNotification(e: any) {
    try {
      const { index } = e.currentTarget.dataset;
      
      if (index === undefined || index === null || index < 0) {
        console.warn('无法获取通知信息');
        return;
      }
      
      if (!this.data.notifications || this.data.notifications.length === 0) {
        console.warn('通知列表为空');
        return;
      }
      
      if (index >= this.data.notifications.length) {
        console.warn('通知索引超出范围');
        return;
      }
      
      const notification = this.data.notifications[index];
      
      if (!notification || typeof notification !== 'object') {
        console.warn('通知数据异常');
        return;
      }

      // 提取 title 和 content，提供多种后备方案
      let title = notification.title || '系统通知';
      let content = notification.fullContent || notification.content || '暂无详细内容';
      
      // 确保都是字符串类型
      title = String(title).trim();
      content = String(content).trim();
      
      // 最终验证
      if (!title || title === 'undefined' || title === 'null') {
        title = '系统通知';
      }
      if (!content || content === 'undefined' || content === 'null') {
        content = '暂无详细内容';
      }
      
      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '确定'
      });
      
    } catch (error) {
      console.error('显示通知详情失败:', error);
    }
  },

  goToProfileDetail() {
    wx.navigateTo({
      url: '/pages/profile-detail/profile-detail',
    });
  },
});
