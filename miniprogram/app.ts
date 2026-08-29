// app.ts
import StorageService from './utils/storage';
import SubscribeManager from './utils/subscribeManager';

App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  
  onShow() {
    // 检查是否需要跳转到默认页面
    const defaultPage = StorageService.getDefaultStartPage();
    
    // 如果设置的不是首页，且用户已登录，则跳转
    if (defaultPage !== 'index' && StorageService.isLoggedIn()) {
      const pageMap: {[key: string]: string} = {
        'schedule': '/pages/schedule/schedule',
        'grade': '/pages/grade/grade', 
        'exam': '/pages/exam/exam',
        'notification': '/pages/notification/notification'
      };
      
      const targetPage = pageMap[defaultPage];
      if (targetPage) {
        // 延迟跳转，确保app启动完成
        setTimeout(() => {
          // 对于tabBar页面，使用switchTab
          const tabBarPages = ['/pages/index/index', '/pages/schedule/schedule', '/pages/profile/profile'];
          if (tabBarPages.includes(targetPage)) {
            wx.switchTab({
              url: targetPage
            });
          } else {
            // 非tabBar页面使用redirectTo
            wx.redirectTo({
              url: targetPage
            });
          }
        }, 500);
      }
    }

    // 静默续订订阅消息（用户勾选"总是保持"后不会弹窗）
    // 确保推送开关开启的用户能持续收到通知
    if (StorageService.isLoggedIn() && !StorageService.isMockLogin()) {
      setTimeout(() => {
        SubscribeManager.checkAndRenewIfNeeded();
      }, 1000);
    }
  }
})