import LoginManager, { LoginResult, CaptchaData } from '../../utils/loginManager';
import StorageService from '../../utils/storage';
import ApiService, { SchoolInfo } from '../../utils/api';
import SubscribeManager from '../../utils/subscribeManager';
import { registerPrivacyListener, unregisterPrivacyListener } from '../../utils/privacy';

interface LoginFormData {
  sid: string;
  password: string;
  kaptcha: string;
  schoolName: string;
}

// 工具函数：判断验证码图片是base64还是URL
function getCaptchaImgSrc(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('data:image')) return raw;
  if (raw.startsWith('/9j/') || raw.length > 100) {
    return 'data:image/jpeg;base64,' + raw;
  }
  return raw + (raw.includes('?') ? '&' : '?') + 't=' + Date.now();
}

// mock 登录凭据（开发调试用）
const MOCK_CREDENTIALS = { sid: 'test', password: 'password' };

Page({  data: {
    formData: {
      sid: '',
      password: '',
      kaptcha: '',
      schoolName: ''
    } as LoginFormData,
    showPassword: false,
    rememberPassword: false, // 是否记住密码
    agreePolicy: false, // 是否同意隐私政策和用户协议
    showCaptcha: false,
    captchaImage: '',
    captchaData: null as CaptchaData | null,
    loading: false,
    showDiagnostic: false, // 是否显示诊断面板
    
    // 学校选择相关
    schoolList: [] as SchoolInfo[],
    schoolIndex: 0, // 当前选择的学校索引
    schoolNames: [] as string[], // 学校名称数组，用于picker
    loadingSchools: false // 是否正在加载学校列表
  },  async onLoad() {
    // 先加载学校列表
    await this.loadSchoolList();
    
    // 学校列表加载完成后，再读取缓存的登录表单数据
    await this.loadCachedFormData();
  },

  onShow() {
    // 注册隐私授权监听（覆盖式注册，页面显示时生效）
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
  },

  // 加载缓存的表单数据
  async loadCachedFormData() {
    const cachedData = await StorageService.getLoginFormData();
    
    if (cachedData) {
      // 找到对应的学校索引
      let schoolIndex = 0;
      if (cachedData.schoolName && this.data.schoolList.length > 0) {
        const foundIndex = this.data.schoolList.findIndex(school => 
          school.name === cachedData.schoolName
        );
        if (foundIndex >= 0) {
          schoolIndex = foundIndex;
        }
      }

      // 更新表单数据
      this.setData({
        'formData.schoolName': cachedData.schoolName || '',
        'formData.sid': cachedData.sid || '',
        'formData.password': cachedData.password || '',
        rememberPassword: cachedData.rememberPassword || false,
        schoolIndex: schoolIndex
      });
    } else {
      // 如果没有缓存数据，但有保存的学校名称，则使用保存的学校
      const savedSchoolName = StorageService.get<string>('school_name');
      
      if (savedSchoolName && this.data.schoolList.length > 0) {
        const schoolIndex = this.data.schoolList.findIndex(school => 
          school.name === savedSchoolName
        );
        this.setData({
          'formData.schoolName': savedSchoolName,
          schoolIndex: schoolIndex >= 0 ? schoolIndex : 0
        });
      } else if (this.data.schoolList.length > 0) {
        // 设置默认学校（第一个）
        this.setData({
          'formData.schoolName': this.data.schoolList[0].name,
          schoolIndex: 0
        });
      }
    }
  },// 加载学校列表
  async loadSchoolList() {
    this.setData({ loadingSchools: true });
    
    try {
      const result = await ApiService.getSchools();
      
      if (result.code === 1000 && result.data) {
        // 正确解析学校列表数据结构: result.data.schools
        const responseData = result.data as any;
        const schoolsArray = responseData.schools;
        
        if (Array.isArray(schoolsArray) && schoolsArray.length > 0) {
          // 转换数据格式
          const schoolList = schoolsArray.map((school: any) => ({
            name: school.school_name || school.name,
            school_name: school.school_name || school.name,
            id: school.school_code || school.id,
            description: school.description,
            requires_captcha: school.requires_captcha
          }));
          
          const schoolNames = schoolList.map(school => school.name);
          
          this.setData({
            schoolList,
            schoolNames
          });
        } else {
          console.error('学校列表数据为空:', responseData);
          wx.showToast({
            title: '学校列表为空',
            icon: 'none'
          });
        }
      } else {
        console.error('获取学校列表失败:', result);
        wx.showToast({
          title: result.msg || '无法获取学校列表',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载学校列表失败:', error);
      wx.showToast({
        title: '加载学校列表失败',
        icon: 'none'
      });
    }
    
    this.setData({ loadingSchools: false });
  },  // 学校选择变更
  onSchoolChange(e: any) {
    const schoolIndex = parseInt(e.detail.value);
    const schoolName = (this.data.schoolList[schoolIndex] && this.data.schoolList[schoolIndex].name) || '';
    
    this.setData({
      schoolIndex,
      'formData.schoolName': schoolName
    });

    // 自动保存表单数据
    this.saveFormData();
  },

  // 处理输入（仅更新 data，不实时保存，避免每输入一个字符就触发存储与日志）
  handleInput(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 输入框失焦时保存表单数据（此时才加密存储）
  onInputBlur() {
    this.saveFormData();
  },

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 切换记住密码选项
  toggleRememberPassword() {
    const newRememberPassword = !this.data.rememberPassword;
    this.setData({
      rememberPassword: newRememberPassword
    });

    // 如果取消记住密码，立即清除保存的密码
    if (!newRememberPassword) {
      this.saveFormData();
    } else {
      // 如果选择记住密码，保存当前表单数据
      this.saveFormData();
    }
  },

  // 切换同意隐私政策
  toggleAgreePolicy() {
    this.setData({
      agreePolicy: !this.data.agreePolicy
    });
  },

  // 保存表单数据到缓存
  saveFormData() {
    const { formData, rememberPassword } = this.data;
    
    StorageService.saveLoginFormData(
      formData.schoolName,
      formData.sid,
      rememberPassword,
      formData.password
    );
  },  // 处理登录
  async handleLogin() {
    const { formData } = this.data;
    
    // 表单验证
    if (!formData.schoolName || !formData.schoolName.trim()) {
      wx.showToast({
        title: '请选择学校',
        icon: 'none'
      });
      return;
    }

    if (!formData.sid.trim()) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none'
      });
      return;
    }

    if (!formData.password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    if (this.data.showCaptcha && !formData.kaptcha.trim()) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      });
      return;
    }

    if (!this.data.agreePolicy) {
      wx.showToast({
        title: '请先阅读并同意隐私政策和用户协议',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // ====== Mock 登录（开发调试用） ======
    const isMock = formData.sid === MOCK_CREDENTIALS.sid
      && formData.password === MOCK_CREDENTIALS.password;
    if (isMock) {
      console.log('使用 Mock 登录');
      // 保存 mock 登录凭证
      StorageService.saveLoginInfo(
        { mock_session: 'mock_session_token_' + Date.now() },
        formData.schoolName
      );
      // 保存 mock 用户信息
      const mockUserInfo = {
        name: '测试用户',
        sid: 'test',
        className: '测试班级',
        major: '测试专业'
      };
      StorageService.set(StorageService.KEYS.USER_INFO, mockUserInfo);
      StorageService.set('school_name', formData.schoolName);
      // 标记 Mock 登录，跳过后续 API 调用以免触发登录失效
      StorageService.set(StorageService.KEYS.IS_MOCK_LOGIN, true);
      wx.showToast({ title: 'Mock 登录成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1000);
      this.setData({ loading: false });
      return;
    }

    try {
      const loginManager = LoginManager.getInstance();
      let result: LoginResult;

      if (this.data.showCaptcha && this.data.captchaData) {
        // 提交验证码
        result = await loginManager.submitCaptcha(
          this.data.captchaData,
          formData.kaptcha,
          formData.schoolName
        );
      } else {
        // 开始登录流程 - 使用学校名称
        result = await loginManager.login(
          { sid: formData.sid, password: formData.password },
          undefined, // baseUrl
          formData.schoolName // schoolName
        );
      }

      this.handleLoginResult(result);

    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },  // 处理登录结果
  handleLoginResult(result: LoginResult) {
    if (result.success) {
      // 登录成功，保存表单数据
      this.saveFormData();
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 获取用户信息并跳转
      this.getUserInfoAndNavigate();

    } else if (result.needCaptcha) {
      // 需要验证码
      wx.showToast({
        title: '需要验证码',
        icon: 'none'
      });

      this.showCaptcha(result);

    } else {
      // 登录失败
      wx.showToast({
        title: result.error || '登录失败',
        icon: 'none'
      });

      // 如果显示了验证码但登录失败，刷新验证码
      if (this.data.showCaptcha) {
        this.refreshCaptcha();
      }
    }
  },
  // 显示验证码
  showCaptcha(result: LoginResult) {
    // 优先用captchaImage（已带前缀），否则尝试captchaData.kaptcha_pic
    let raw = result.captchaImage || (result.captchaData && result.captchaData.kaptcha_pic) || '';
    const imgUrl = getCaptchaImgSrc(raw);
    this.setData({
      showCaptcha: true,
      captchaImage: imgUrl,
      captchaData: result.captchaData,
      'formData.kaptcha': '' // 清空验证码输入
    });
  },
  // 刷新验证码
  async refreshCaptcha() {
    const { formData } = this.data;
    if (!formData.sid || !formData.password || !formData.schoolName) {
      return;
    }
    try {
      const loginManager = LoginManager.getInstance();
      const result = await loginManager.forceCaptcha(
        { sid: formData.sid, password: formData.password },
        formData.schoolName
      );
      if (result.needCaptcha) {
        let raw = result.captchaImage || (result.captchaData && result.captchaData.kaptcha_pic) || '';
        const imgUrl = getCaptchaImgSrc(raw);
        this.setData({
          captchaImage: imgUrl,
          captchaData: result.captchaData,
          'formData.kaptcha': ''
        });
      }
    } catch (error) {
      wx.showToast({
        title: '刷新验证码失败',
        icon: 'none'
      });
    }
  },
  // 获取用户信息并跳转
  async getUserInfoAndNavigate() {
    try {
      const loginManager = LoginManager.getInstance();
      const credentials = loginManager.getCookies();
      
      if (!credentials) {
        throw new Error('未找到登录凭证');
      }      // 保存学校名称
      if (this.data.formData.schoolName) {
        StorageService.set('school_name', this.data.formData.schoolName);
      }      // 获取用户信息
      const result = await ApiService.getInfo({
        cookies: credentials.cookies,
        school_name: credentials.schoolName
      });

      if (result.code === 1000 && result.data) {
        // 保存用户信息
        StorageService.set(StorageService.KEYS.USER_INFO, result.data);
        
        // 静默绑定 OpenID（为成绩推送做准备）
        SubscribeManager.bindOpenId();

        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        console.warn('获取用户信息失败，但仍然跳转');
        // 仍然尝试绑定 OpenID
        SubscribeManager.bindOpenId();
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 即使获取用户信息失败，也跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });      }, 1000);
    }
  },

  // 验证码图片加载成功
  onCaptchaLoad() {
    // 无需日志
  },

  // 验证码图片加载失败
  onCaptchaError(e: any) {
    console.error('验证码图片加载失败:', e.detail);
    wx.showToast({
      title: '验证码加载失败，已自动刷新',
      icon: 'none'
    });
    this.refreshCaptcha();
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 显示用户协议
  showUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  }
});