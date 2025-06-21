import LoginManager, { LoginResult, CaptchaData } from '../../utils/loginManager';
import StorageService from '../../utils/storage';
import ApiService from '../../utils/api';

interface LoginFormData {
  baseUrl: string;
  sid: string;
  password: string;
  kaptcha: string;
}

Page({
  data: {
    formData: {
      baseUrl: '',
      sid: '',
      password: '',
      kaptcha: ''
    } as LoginFormData,
    showPassword: false,
    showCaptcha: false,
    captchaImage: '',
    captchaData: null as CaptchaData | null,
    loading: false
  },

  onLoad() {
    // 读取上次保存的教务系统地址
    const savedBaseUrl = StorageService.get<string>(StorageService.KEYS.BASE_URL);
    if (savedBaseUrl) {
      this.setData({
        'formData.baseUrl': savedBaseUrl
      });
    } else {
      // 设置默认的教务系统地址（示例）
      this.setData({
        'formData.baseUrl': 'https://zhjw1.jju.edu.cn/'
      });
    }
  },

  // 处理输入
  handleInput(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 处理登录
  async handleLogin() {
    const { formData } = this.data;
    
    // 表单验证
    if (!formData.baseUrl.trim()) {
      wx.showToast({
        title: '请输入教务系统地址',
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

    this.setData({ loading: true });

    try {
      const loginManager = LoginManager.getInstance();
      let result: LoginResult;

      if (this.data.showCaptcha && this.data.captchaData) {
        // 提交验证码
        result = await loginManager.submitCaptcha(
          this.data.captchaData,
          formData.kaptcha,
          formData.baseUrl
        );
      } else {
        // 开始登录流程
        result = await loginManager.login(
          { sid: formData.sid, password: formData.password },
          formData.baseUrl
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
  },

  // 处理登录结果
  handleLoginResult(result: LoginResult) {
    if (result.success) {
      // 登录成功
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 保存教务系统地址到本地
      StorageService.set(StorageService.KEYS.BASE_URL, this.data.formData.baseUrl);

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
    this.setData({
      showCaptcha: true,
      captchaImage: result.captchaImage || '',
      captchaData: result.captchaData,
      'formData.kaptcha': '' // 清空验证码输入
    });
  },

  // 刷新验证码
  async refreshCaptcha() {
    const { formData } = this.data;
    
    if (!formData.sid || !formData.password || !formData.baseUrl) {
      return;
    }

    try {
      const loginManager = LoginManager.getInstance();
      const result = await loginManager.forceCaptcha(
        { sid: formData.sid, password: formData.password },
        formData.baseUrl
      );

      if (result.needCaptcha) {
        this.setData({
          captchaImage: result.captchaImage || '',
          captchaData: result.captchaData,
          'formData.kaptcha': ''
        });
      }
    } catch (error) {
      console.error('刷新验证码失败:', error);
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
      }

      // 获取用户信息
      const result = await ApiService.getInfo({
        cookies: credentials.cookies,
        base_url: credentials.baseUrl
      });

      if (result.code === 1000 && result.data) {
        // 保存用户信息
        StorageService.set(StorageService.KEYS.USER_INFO, result.data);
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      } else {
        console.warn('获取用户信息失败，但仍然跳转');
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
        });
      }, 1000);
    }
  }
});
