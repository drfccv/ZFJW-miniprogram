import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';
import SubscribeManager from '../../utils/subscribeManager';
import { registerPrivacyListener, unregisterPrivacyListener } from '../../utils/privacy';

interface UserInfo {
  name: string;
  sid: string;
  className?: string;
  major?: string;
  [key: string]: any;
}

Page({  data: {
    userInfo: null as UserInfo | null,
    defaultPageName: '首页', // 默认页面显示名称
    showDefaultPageDialog: false, // 默认页面选择对话框
    selectedDefaultPage: 'index', // 当前选中的默认页面
    defaultPageOptions: [
      { key: 'index', name: '首页', desc: '课程概览和通知' },
      { key: 'schedule', name: '课表', desc: '课程表查看' },
      { key: 'grade', name: '成绩', desc: '成绩查询' },
      { key: 'exam', name: '考试', desc: '考试安排' },
      { key: 'notification', name: '通知', desc: '通知公告' }
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
    // 注册隐私授权监听（覆盖式注册，当前页生效）
    registerPrivacyListener(this.handlePrivacyAuthorization);
  },

  onHide() {
    unregisterPrivacyListener(this.handlePrivacyAuthorization);
  },

  onUnload() {
    unregisterPrivacyListener(this.handlePrivacyAuthorization);
  },

  // 微信隐私授权事件：调用隐私接口且用户未同意时触发，弹出隐私弹窗
  handlePrivacyAuthorization(resolve: any, eventInfo?: { privacyContractName: string }) {
    const popup = this.selectComponent('#privacy-popup');
    if (popup) {
      popup.showPopup(resolve, eventInfo && eventInfo.privacyContractName);
    }
  },  // 加载用户信息
  loadUserInfo() {
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
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
      selectedDefaultPage: defaultPage,
      defaultPageName,
      gradePushEnabled,
      gradePushDesc
    });

    // 已登录但本地缺少用户信息（如被清缓存删掉）时，主动拉取一次
    if (StorageService.isLoggedIn() && !userInfo) {
      this.fetchUserInfo();
    }

    // 异步同步后端推送状态（不影响首屏渲染）
    this.syncPushStatusFromServer();
  },

  // 登录状态下补拉用户信息（避免顶部个人信息消失）
  async fetchUserInfo() {
    try {
      const loginInfo = StorageService.getLoginInfo();
      if (!loginInfo) return;

      const result = await ApiService.getInfo({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName
      });

      if (result.code === 1000 && result.data) {
        const userData = result.data as UserInfo;
        StorageService.set(StorageService.KEYS.USER_INFO, userData);
        this.setData({ userInfo: userData });
      }
    } catch (error) {
      console.error('自动拉取用户信息失败:', error);
    }
  },

  // 从后端同步推送状态到页面开关与描述（后端为准）
  syncPushStatusFromServer() {
    SubscribeManager.syncStatusFromServer()
      .then((status) => {
        // 结构校验：subscribed 必须是 boolean 才处理，避免 mock/异常数据误关开关
        if (!status || typeof status.subscribed !== 'boolean' || !this.data.userInfo) return;

        // 已订阅：subscribed 为 true，或 status 枚举为 active（兼容后端只返回 status 的情况）
        const subscribed = status.subscribed || status.status === 'active';

        // 后端确认未订阅（用户在微信设置取消授权 / 后端已清理）→ 关闭开关
        if (!subscribed) {
          if (this.data.gradePushEnabled) {
            SubscribeManager.setPushEnabled(false);
            this.setData({
              gradePushEnabled: false,
              gradePushDesc: '点击开启，新成绩将微信通知'
            });
          }
        }
      })
      .catch(() => {
        // 同步失败静默忽略，保持本地状态展示
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
    } finally {
      wx.hideLoading();
    }
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
          // 稍后从后端刷新剩余推送次数（等后端处理订阅上报）
          setTimeout(() => this.syncPushStatusFromServer(), 800);
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
          wx.showToast({ title: '绑定微信账号失败', icon: 'none' });
          this.setData({ gradePushLoading: false });
          return;
        }
      }

      // 申请订阅授权（每次续期获得一次推送配额）
      const subscribed = await SubscribeManager.requestPushSubscribe();
      if (subscribed) {
        wx.showToast({ title: '续期成功，可继续接收通知', icon: 'success' });
        // 从后端刷新剩余推送次数
        setTimeout(() => this.syncPushStatusFromServer(), 800);
      } else {
        wx.showModal({
          title: '续期被拒绝',
          content: '未获得续期授权，推送次数用完后可能无法接收通知。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (error) {
      console.error('续期授权失败:', error);
      wx.showToast({ title: '续期失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }

    this.setData({ gradePushLoading: false });
  },

  // 显示关于页面
  showAbout() {
    wx.showActionSheet({
      itemList: ['应用信息', '隐私声明'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showAppInfo();
            break;
          case 1:
            this.showPrivacyPolicy();
            break;
        }
      }
    });
  },

  // 显示应用信息
  showAppInfo() {
    const content = this.getAppInfoContent();

    wx.showModal({
      title: '应用信息',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 动态获取应用与环境信息（全部本地读取，不上传服务器，不涉及微信隐私接口）
  getAppInfoContent(): string {
    const lines: string[] = ['Drfccv助手'];

    // 版本与环境（wx.getAccountInfoSync 基础库 2.10.0+）
    lines.push(this.getVersionInfo());

    // 小程序账号信息（appId）
    try {
      const accountInfo = wx.getAccountInfoSync();
      if (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.appId) {
        lines.push(`AppID：${accountInfo.miniProgram.appId}`);
      }
    } catch (error) {
      console.error('获取账号信息失败:', error);
    }

    // 微信 APP 信息（wx.getAppBaseInfo 基础库 2.20.1+）
    try {
      const appBaseInfo = wx.getAppBaseInfo();
      if (appBaseInfo) {
        if (appBaseInfo.version) {
          lines.push(`微信版本：${appBaseInfo.version}`);
        }
        if (appBaseInfo.SDKVersion) {
          lines.push(`基础库：${appBaseInfo.SDKVersion}`);
        }
      }
    } catch (error) {
      console.error('获取微信基础信息失败:', error);
    }

    // 设备信息（wx.getDeviceInfo 基础库 2.20.1+）
    try {
      const deviceInfo = wx.getDeviceInfo();
      if (deviceInfo) {
        const brand = deviceInfo.brand || '';
        const model = deviceInfo.model || '';
        const system = deviceInfo.system || '';
        const deviceStr = [brand, model].filter(Boolean).join(' ');
        lines.push(`设备：${deviceStr || '未知'}`);
        if (system) {
          lines.push(`系统：${system}`);
        }
      }
    } catch (error) {
      console.error('获取设备信息失败:', error);
    }

    return lines.join('\n');
  },

  // 动态获取版本信息（不硬编码）：wx.getAccountInfoSync 返回当前环境与线上版本号
  getVersionInfo(): string {
    const envMap: { [key: string]: string } = {
      develop: '开发版',
      trial: '体验版',
      release: '正式版'
    };

    try {
      const info = wx.getAccountInfoSync();
      const env = (info && info.miniProgram && envMap[info.miniProgram.envVersion]) || '';
      const version = (info && info.miniProgram && info.miniProgram.version) || '';

      if (version) {
        return `版本 ${version}${env ? `（${env}）` : ''}`;
      }
      if (env) {
        return `${env}（版本号仅正式版可见）`;
      }
      return '版本未知';
    } catch (error) {
      console.error('获取版本信息失败:', error);
      return '版本未知';
    }
  },
  // 显示隐私声明
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
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
            userInfo: null
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
