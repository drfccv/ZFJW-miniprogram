import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

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
    ]
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },  // 加载用户信息
  loadUserInfo() {
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
    const apiBaseUrl = StorageService.get<string>(StorageService.KEYS.API_BASE_URL);
    const defaultPage = StorageService.getDefaultStartPage();
    
    // 根据默认页面key找到对应的显示名称
    const defaultPageOption = this.data.defaultPageOptions.find(option => option.key === defaultPage);
    const defaultPageName = defaultPageOption ? defaultPageOption.name : '首页';
    
    this.setData({
      userInfo,
      apiBaseUrl: apiBaseUrl || '',
      selectedDefaultPage: defaultPage,
      defaultPageName
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
      console.error('刷新数据失败:', error);
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
      content: '确定要清除所有缓存数据吗？清除后需要重新加载数据。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除所有缓存数据
            StorageService.clearAllCache();
            
            // 重新加载用户信息（因为用户信息也被清除了）
            this.setData({
              userInfo: null
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
  },  // 显示关于页面
  showAbout() {
    wx.showActionSheet({
      itemList: ['应用信息', '开源地址', '隐私声明', '联系作者'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showAppInfo();
            break;
          case 1:
            this.showOpenSource();
            break;
          case 2:
            this.showPrivacyPolicy();
            break;
          case 3:
            this.showContact();
            break;
        }
      }
    });
  },

  // 显示应用信息
  showAppInfo() {
    const content = `正方教务系统小程序
版本：2.0.0

主要功能：
• 课表查询与显示
• 成绩查询
• 考试安排查看
• 通知公告查看
• 选课管理
• 智能缓存策略
• 记住登录信息
• 个性化设置

系统特色：
• 优雅的UI设计
• 智能数据缓存
• 离线数据查看
• 自定义启动页面
• 多学校支持
• 隐私保护`;

    wx.showModal({
      title: '应用信息',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },
  // 显示开源信息
  showOpenSource() {
    const content = `本应用基于开源项目开发

开源协议：MIT License
项目地址：GitHub

本项目欢迎贡献代码和反馈问题
支持二次开发和定制

感谢开源社区的支持！`;

    wx.showModal({
      title: '开源声明',
      content,
      showCancel: true,
      cancelText: '返回',
      confirmText: '复制地址',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'https://github.com/drfccv/ZFJW-miniprogram',
            success: () => {
              wx.showToast({
                title: 'GitHub地址已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 显示隐私声明
  showPrivacyPolicy() {
    const content = `隐私保护承诺

数据收集：
• 仅收集必要的学号和密码用于登录
• 不收集个人隐私信息
• 不进行用户行为跟踪

数据存储：
• 所有数据仅保存在本地设备
• 支持用户随时清除所有数据
• 密码采用加密存储

数据传输：
• 仅与教务系统进行必要通信
• 不向第三方传输用户数据
• 支持用户自定义API地址

我们承诺保护您的隐私安全！`;

    wx.showModal({
      title: '隐私声明',
      content,
      showCancel: false,
      confirmText: '我已了解'
    });
  },
  // 显示联系方式
  showContact() {
    const content = `联系作者

QQ：2713587802

学习交流：
• 功能使用咨询
• 学习技术讨论
• 问题反馈建议
• 改进意见收集

本项目不保存任何个人信息至云端
均以缓存的形式保存在本地
仅供学习参考，不得违规使用

期待您的交流与反馈！`;

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
});
