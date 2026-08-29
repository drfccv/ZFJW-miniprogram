import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';
import SubscribeManager from '../../utils/subscribeManager';

interface UserInfo {
  name: string;
  sid: string;
  className?: string;
  major?: string;
  [key: string]: any;
}

Page({  data: {
    userInfo: null as UserInfo | null,
    apiBaseUrl: '', // 后端API地址
    showApiUrlDialog: false, // API地址设置对话框
    inputApiUrl: '', // API地址输入框
    defaultPageName: '首页', // 默认页面显示名称
    showDefaultPageDialog: false, // 默认页面选择对话框
    selectedDefaultPage: 'index', // 当前选中的默认页面
    defaultPageOptions: [
      { key: 'index', name: '首页', desc: '课程概览和通知', icon: '🏠' },
      { key: 'schedule', name: '课表', desc: '课程表查看', icon: '📅' },
      { key: 'grade', name: '成绩', desc: '成绩查询', icon: '📊' },
      { key: 'exam', name: '考试', desc: '考试安排', icon: '📝' },
      { key: 'notification', name: '通知', desc: '通知公告', icon: '📢' }
    ],
    gradeApiType: 'normal', // 成绩接口类型 normal/detail
    showGradeApiTypeDialog: false, // 成绩接口类型选择弹窗

    // 成绩推送相关
    gradePushEnabled: false,
    gradePushLoading: false,
    gradePushDesc: '点击开启，新成绩将微信通知',
  },

  onLoad() {
    // 登录校验
    AuthUtils.checkLoginStatus();
    this.loadUserInfo();
    // 读取成绩接口类型
    const gradeApiType = String(StorageService.get('gradeApiType') || 'normal');
    this.setData({ gradeApiType });
  },

  onShow() {
    // 登录校验
    AuthUtils.checkLoginStatus();
    this.loadUserInfo();
  },  // 加载用户信息
  loadUserInfo() {
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
    const apiBaseUrl = StorageService.get<string>(StorageService.KEYS.API_BASE_URL) || '';
    const defaultPage = StorageService.getDefaultStartPage() || 'index';
    
    // 根据默认页面key找到对应的显示名称
    const defaultPageOption = this.data.defaultPageOptions.find(option => option.key === defaultPage);
    const defaultPageName = defaultPageOption ? defaultPageOption.name : '首页';
    
    // 读取成绩推送开关状态
    const gradePushEnabled = SubscribeManager.isPushEnabled();
    const gradePushDesc = gradePushEnabled
      ? '已开启，点击续期可增加推送次数'
      : '点击开启，新成绩将微信通知';

    this.setData({
      userInfo,
      apiBaseUrl,
      selectedDefaultPage: defaultPage,
      defaultPageName,
      gradePushEnabled,
      gradePushDesc
    });
  },

  // 页面导航
  navigateTo(e: any) {
    const { url } = e.currentTarget.dataset;
    if (!this.data.userInfo) {
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
  // 导航到课表设置页面
  navigateToScheduleSettings() {
    wx.navigateTo({
      url: '/pages/schedule-settings/schedule-settings'
    });
  },

  // 显示API URL设置对话框
  showApiUrlDialog() {
    this.setData({
      showApiUrlDialog: true,
      inputApiUrl: this.data.apiBaseUrl
    });
  },

  // 隐藏API URL设置对话框
  hideApiUrlDialog() {
    this.setData({
      showApiUrlDialog: false,
      inputApiUrl: ''
    });  },
  
  // API URL输入
  onApiUrlInput(e: any) {
    this.setData({
      inputApiUrl: e.detail.value
    });  },

  // 保存API URL
  saveApiUrl() {
    const url = this.data.inputApiUrl.trim();
    if (!url) {
      wx.showToast({
        title: '请输入后端API地址',
        icon: 'none'
      });
      return;
    }

    // 简单的URL格式验证
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      wx.showToast({
        title: '请输入正确的URL格式',
        icon: 'none'
      });
      return;
    }

    StorageService.set(StorageService.KEYS.API_BASE_URL, url);
    this.setData({
      apiBaseUrl: url,
      showApiUrlDialog: false
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 刷新数据
  async refreshData() {
    if (!this.data.userInfo) {
      this.goToLogin();
      return;
    }

    wx.showLoading({
      title: '刷新中...'
    });

    try {
      const loginInfo = StorageService.getLoginInfo();
      if (!loginInfo) {
        throw new Error('登录信息已失效');
      }

      // 重新获取用户信息
      const userResult = await ApiService.getInfo({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName
      });      if (userResult.code === 1000 && userResult.data) {
        const userData = userResult.data as UserInfo;
        StorageService.set(StorageService.KEYS.USER_INFO, userData);
        this.setData({ userInfo: userData });
      }

      // 清除所有缓存，强制重新获取数据
      StorageService.clearAllCache();

      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }

    wx.hideLoading();
  },
  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有缓存数据吗？清除后需要重新加载数据，并取消消息推送。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 取消消息推送
            SubscribeManager.unsubscribe().catch(() => {});

            // 清除所有缓存数据
            StorageService.clearAllCache();
            
            // 重新加载用户信息（因为用户信息也被清除了）
            this.setData({
              userInfo: null,
              gradePushEnabled: false
            });
            
            wx.showToast({
              title: '清除成功',
              icon: 'success',
              duration: 2000
            });
            
            // 延迟提示用户重新登录
            setTimeout(() => {
              wx.showModal({
                title: '提示',
                content: '缓存已清除，建议重新登录以获取最新数据',
                showCancel: true,
                confirmText: '去登录',
                cancelText: '稍后',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.navigateTo({
                      url: '/pages/login/login'
                    });
                  }
                }
              });
            }, 2500);
            
          } catch (error) {
            console.error('清除缓存失败:', error);
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // ==================== 成绩推送 ====================

  // 开关切换：开 = 开启状态，关 = 取消订阅
  async toggleGradePush(e: any) {
    if (this.data.gradePushLoading) return;
    const enabled = e.detail.value;
    this.setData({ gradePushLoading: true });

    try {
      if (enabled) {
        // 开启：先绑定 OpenID
        wx.showLoading({ title: '开启中...' });

        const loginInfo = StorageService.getLoginInfo();
        if (!loginInfo) {
          wx.hideLoading();
          wx.showToast({ title: '请先登录', icon: 'none' });
          this.setData({ gradePushEnabled: false, gradePushLoading: false });
          return;
        }

        let openid = SubscribeManager.getOpenId();
        if (!openid) {
          openid = await SubscribeManager.bindOpenId();
          if (!openid) {
            wx.hideLoading();
            wx.showToast({ title: '绑定微信账号失败', icon: 'none' });
            this.setData({ gradePushEnabled: false, gradePushLoading: false });
            return;
          }
        }

        wx.hideLoading();

        // 开启后立即申请一次授权
        const subscribed = await SubscribeManager.requestPushSubscribe();
        if (subscribed) {
          SubscribeManager.setPushEnabled(true);
          this.setData({
            gradePushEnabled: true,
            gradePushDesc: '已开启，点击续期可增加推送次数'
          });
          wx.showToast({ title: '授权成功，可接收通知', icon: 'success' });
        } else {
          // 用户拒绝了首次授权，关闭开关
          SubscribeManager.setPushEnabled(false);
          this.setData({
            gradePushEnabled: false,
            gradePushDesc: '点击开启，新成绩将微信通知'
          });
          wx.showModal({
            title: '授权被拒绝',
            content: '未获得授权，将无法接收微信通知。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      } else {
        // 关闭：取消订阅
        const unsubscribed = await SubscribeManager.unsubscribe();
        if (unsubscribed) {
          this.setData({
            gradePushEnabled: false,
            gradePushDesc: '点击开启，新成绩将微信通知'
          });
          wx.showToast({ title: '已关闭成绩推送', icon: 'success' });
        } else {
          this.setData({ gradePushEnabled: true });
          wx.showToast({ title: '取消失败', icon: 'none' });
        }
      }
    } catch (error) {
      console.error('切换推送状态失败:', error);
      this.setData({ gradePushEnabled: !enabled });
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }

    this.setData({ gradePushLoading: false });
  },

  // 点击卡片续期 — 只有开启状态可用，每点一次申请一次授权
  async onTapRenew() {
    if (!this.data.gradePushEnabled) {
      // 关闭状态点击提示先开启
      wx.showToast({ title: '请先开启推送开关', icon: 'none' });
      return;
    }
    if (this.data.gradePushLoading) return;
    this.setData({ gradePushLoading: true });

    wx.showLoading({ title: '申请授权中...' });

    try {
      // 确保已绑定 OpenID
      let openid = SubscribeManager.getOpenId();
      if (!openid) {
        openid = await SubscribeManager.bindOpenId();
        if (!openid) {
          wx.hideLoading();
          wx.showToast({ title: '绑定微信账号失败', icon: 'none' });
          this.setData({ gradePushLoading: false });
          return;
        }
      }

      wx.hideLoading();

      // 申请订阅授权（每次续期获得一次推送配额）
      const subscribed = await SubscribeManager.requestPushSubscribe();
      if (subscribed) {
        wx.showToast({ title: '续期成功，可继续接收通知', icon: 'success' });
      } else {
        wx.showModal({
          title: '续期被拒绝',
          content: '未获得续期授权，推送次数用完后可能无法接收通知。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('续期授权失败:', error);
      wx.showToast({ title: '续期失败', icon: 'none' });
    }

    this.setData({ gradePushLoading: false });
  },

  // 显示关于页面
  showAbout() {
    wx.showActionSheet({
      itemList: ['应用信息', '隐私声明', '联系作者'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showAppInfo();
            break;
          case 1:
            this.showPrivacyPolicy();
            break;
          case 2:
            this.showContact();
            break;
        }
      }
    });
  },

  // 显示应用信息
  showAppInfo() {
    const content = `Drfccv助手
版本 2.0.0`;

    wx.showModal({
      title: '应用信息',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },
  // 显示隐私声明
  showPrivacyPolicy() {
    const content = `🔒 隐私保护承诺

📌 数据收集
• 仅收集登录所需的学号和密码
• 仅与教务系统通信获取课表/成绩等数据
• 不收集任何个人隐私信息
• 不进行用户行为跟踪分析

💾 数据存储
• 所有数据仅保存在微信本地缓存
• 登录凭证和密码（如选择记住）仅存于本地
• 支持用户在设置中随时清除所有数据
• 关闭账号不会在服务器留下任何痕迹

🌐 数据传输
• 仅与学校教务系统和用户自设后端通信
• 默认连接用户自定义 API 地址
• 不向第三方传输任何用户数据
• 所有网络请求均不含额外埋点

🛡️ 安全说明
• 建议使用 HTTPS 连接后端服务
• 密码本地加密存储

📅 最近更新：2026 年 7 月

以上承诺适用于 Drfccv 助手 小程序 V2.0.0`;

    wx.showModal({
      title: '隐私声明',
      content,
      showCancel: false,
      confirmText: '我已了解'
    });
  },
  // 显示联系方式
  showContact() {
    const content = `📬 联系作者

👤 作者：drfccv
� QQ：2713587802

📢 反馈渠道
• 功能使用咨询
• 问题反馈建议
• 改进意见收集
• QQ：直接联系作者

📌 说明
• 所有数据仅保存在本地，不上传云端
• 仅供学习参考，不得违规使用

🤝 期待您的反馈与建议！`;

    wx.showModal({
      title: '联系作者',
      content,
      showCancel: true,
      cancelText: '返回',
      confirmText: '复制QQ',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: '2713587802',
            success: () => {
              wx.showToast({
                title: 'QQ号已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息和缓存
          StorageService.clearLoginInfo();
          StorageService.clearAllCache();
            this.setData({
            userInfo: null,
            baseUrl: '',
            apiBaseUrl: ''
          });

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          // 跳转到登录页面
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }, 1500);        }
      }
    });
  },

  // 显示默认页面选择对话框
  showDefaultPageDialog() {
    this.setData({
      showDefaultPageDialog: true
    });
  },

  // 隐藏默认页面选择对话框
  hideDefaultPageDialog() {
    this.setData({
      showDefaultPageDialog: false
    });
  },

  // 选择默认页面
  selectDefaultPage(e: any) {
    const page = e.currentTarget.dataset.page;
    this.setData({
      selectedDefaultPage: page
    });
  },

  // 保存默认页面设置
  saveDefaultPage() {
    const selectedPage = this.data.selectedDefaultPage;
    const selectedOption = this.data.defaultPageOptions.find(option => option.key === selectedPage);
    
    if (selectedOption) {
      StorageService.setDefaultStartPage(selectedPage);
      
      this.setData({
        defaultPageName: selectedOption.name,
        showDefaultPageDialog: false
      });
      
      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });
    }
  },

  // 显示功能开发中提示
  showComingSoon(e: any) {
    const feature = e.currentTarget.dataset.feature;
    wx.showModal({
      title: '功能开发中',
      content: `${feature}功能还在开发中，敬请期待！`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 显示成绩接口类型选择弹窗
  showGradeApiTypeDialog() {
    this.setData({ showGradeApiTypeDialog: true });
  },
  // 隐藏成绩接口类型选择弹窗
  hideGradeApiTypeDialog() {
    this.setData({ showGradeApiTypeDialog: false });
  },
  // 切换成绩接口类型
  onGradeApiTypeChange(e: any) {
    const value = e.currentTarget.dataset.value;
    this.setData({ gradeApiType: value, showGradeApiTypeDialog: false });
    StorageService.set('gradeApiType', value);
    wx.showToast({ title: '已切换', icon: 'success' });
  },

  goToProfileDetail() {
    wx.navigateTo({
      url: '/pages/profile-detail/profile-detail',
    });
  },

  // 跳转到官方教务webview页面
  goToOfficialJw() {
    wx.navigateTo({
      url: '/pages/official-jw/official-jw'
    });
  },

  onShareAppMessage() {
    return {
      title: '我的 - Drfccv助手小程序',
      path: '/pages/profile/profile',
      imageUrl: '/images/share-default.png'
    };
  },

  onShareTimeline() {
    return {
      title: '我的 - Drfccv助手小程序',
      query: '',
      imageUrl: '/images/share-default.png'
    };
  },
});
