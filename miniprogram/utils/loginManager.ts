// 登录管理器 - 完整的验证码登录流程
import ApiService from './api';
import StorageService from './storage';

export interface LoginResult {
  success: boolean;
  needCaptcha?: boolean;
  captchaData?: any;
  captchaImage?: string;
  error?: string;
}

export interface CaptchaData {
  kaptcha_pic: string;
  csrf_token: string;
  cookies: any;
  modulus: string;
  exponent: string;
  sid: string;
  password: string;
}

export class LoginManager {
  private static instance: LoginManager;

  static getInstance(): LoginManager {
    if (!LoginManager.instance) {
      LoginManager.instance = new LoginManager();
    }
    return LoginManager.instance;
  }  /**
   * 开始登录流程
   * @param credentials 登录凭据
   * @param schoolName 学校名称
   */
  async login(credentials: { sid: string; password: string }, _unused?: any, schoolName?: string): Promise<LoginResult> {
    try {
      console.log('开始登录流程...');
      
      if (!schoolName) {
        throw new Error('必须提供学校名称');
      }
      
      // 构建登录参数
      const loginParams = {
        sid: credentials.sid,
        password: credentials.password,
        school_name: schoolName
      };
      
      // 第一步：尝试直接登录
      const result = await ApiService.login(loginParams);if (result.code === 1000) {        // 无验证码，直接登录成功
        console.log('登录成功（无验证码）');
        // 保存登录信息
        this.saveCookies((result.data as any).cookies, schoolName);
        return { success: true, needCaptcha: false };} else if (result.code === 1001) {
        // 需要验证码
        console.log('需要验证码');
        const data = result.data as any;
        console.log('验证码响应数据:', data);
        console.log('完整数据结构:', JSON.stringify(data, null, 2));
        
        // 检查必要的字段
        if (!data.csrf_token || !data.cookies || !data.modulus || !data.exponent) {
          console.error('验证码数据缺少必要字段:', {
            csrf_token: !!data.csrf_token,
            cookies: !!data.cookies,
            modulus: !!data.modulus,
            exponent: !!data.exponent
          });
          return { 
            success: false, 
            error: '验证码数据不完整' 
          };
        }
        
        // 检查kaptcha字段是否存在且不为空
        const kaptchaData = data.kaptcha || data.kaptcha_pic;
        if (!kaptchaData) {
          console.error('验证码数据为空');
          return { 
            success: false, 
            error: '验证码数据获取失败' 
          };
        }
        
        // 构建完整的验证码数据，包含用户凭据
        const captchaData = {
          kaptcha_pic: kaptchaData,
          csrf_token: data.csrf_token,
          cookies: data.cookies,
          modulus: data.modulus,
          exponent: data.exponent,
          sid: credentials.sid,  // 添加用户凭据
          password: credentials.password  // 添加用户凭据
        };
        
        console.log('构建的验证码数据:', captchaData);
        
        return { 
          success: false, 
          needCaptcha: true, 
          captchaData: captchaData,
          captchaImage: 'data:image/jpeg;base64,' + kaptchaData
        };      } else if (result.code === 2333) {
        // 登录失败，根据新文档建议，尝试强制获取验证码
        console.log('登录失败(2333)，尝试强制获取验证码...');
        console.log('失败原因:', result.msg);
        
        // 如果有debug_info，记录详细信息
        if ((result as any).debug_info) {
          console.log('调试信息:', (result as any).debug_info);
        }
        
        return await this.forceCaptcha(credentials, schoolName);
        
      } else {
        // 其他错误
        return { 
          success: false, 
          error: result.msg || '登录失败' 
        };
      }
      
    } catch (error) {
      console.error('登录请求失败:', error);
      return { success: false, error: '网络请求失败' };
    }
  }  /**
   * 强制获取验证码
   * @param credentials 登录凭据
   * @param schoolName 学校名称
   */
  async forceCaptcha(credentials: { sid: string; password: string }, schoolName: string): Promise<LoginResult> {
    try {
      console.log('强制获取验证码...');
      
      // 构建请求参数
      const params = {
        sid: credentials.sid,
        password: credentials.password,
        school_name: schoolName
      };
      
      console.log('使用school_name:', schoolName);
      
      const result = await ApiService.getCaptcha(params);if (result.code === 1001) {
        // 成功获取验证码
        console.log('成功获取验证码');
        const data = result.data as any;
        console.log('强制获取验证码响应数据:', data);
        console.log('完整数据结构:', JSON.stringify(data, null, 2));
        
        // 检查必要的字段
        if (!data.csrf_token || !data.cookies || !data.modulus || !data.exponent) {
          console.error('验证码数据缺少必要字段:', {
            csrf_token: !!data.csrf_token,
            cookies: !!data.cookies,
            modulus: !!data.modulus,
            exponent: !!data.exponent
          });
          return { 
            success: false, 
            error: '验证码数据不完整' 
          };
        }
        
        // 检查kaptcha字段是否存在且不为空
        const kaptchaData = data.kaptcha || data.kaptcha_pic;
        if (!kaptchaData) {
          console.error('强制获取验证码数据为空');
          return { 
            success: false, 
            error: '验证码数据获取失败' 
          };
        }
        
        // 构建完整的验证码数据，包含用户凭据
        const captchaData = {
          kaptcha_pic: kaptchaData,
          csrf_token: data.csrf_token,
          cookies: data.cookies,
          modulus: data.modulus,
          exponent: data.exponent,
          sid: credentials.sid,  // 添加用户凭据
          password: credentials.password  // 添加用户凭据
        };
        
        console.log('构建的验证码数据:', captchaData);
        
        return { 
          success: false, 
          needCaptcha: true, 
          captchaData: captchaData,
          captchaImage: 'data:image/jpeg;base64,' + kaptchaData
        };      } else if (result.code === 1000) {
        // 无需验证码，直接登录成功
        console.log('无需验证码，直接登录成功');
        this.saveCookies((result.data as any).cookies, schoolName);
        return { success: true, needCaptcha: false };
        
      } else {
        return { 
          success: false, 
          error: result.msg || '获取验证码失败' 
        };
      }
      
    } catch (error) {
      console.error('获取验证码失败:', error);
      return { success: false, error: '网络请求失败' };
    }
  }  /**
   * 提交验证码
   * @param captchaData 验证码相关数据
   * @param userInputCaptcha 用户输入的验证码
   * @param schoolName 学校名称
   */
  async submitCaptcha(captchaData: CaptchaData, userInputCaptcha: string, schoolName: string): Promise<LoginResult> {
    try {
      console.log('提交验证码...');
      console.log('captchaData:', captchaData);
      console.log('userInputCaptcha:', userInputCaptcha);
      
      // 构建完整的请求参数
      const params = {
        school_name: schoolName,
        kaptcha: userInputCaptcha,
        csrf_token: captchaData.csrf_token,
        cookies: captchaData.cookies,
        modulus: captchaData.modulus,
        exponent: captchaData.exponent,
        sid: captchaData.sid,
        password: captchaData.password
      };
      
      console.log('提交验证码请求参数:', params);
      
      const result = await ApiService.loginWithKaptcha(params);if (result.code === 1000) {
        // 验证码登录成功
        console.log('验证码登录成功');
        this.saveCookies((result.data as any).cookies, schoolName);
        return { success: true };
        
      } else if (result.code === 1004) {
        // 验证码错误
        return { 
          success: false, 
          error: '验证码错误，请重新输入' 
        };
        
      } else {
        return { 
          success: false, 
          error: result.msg || '验证码登录失败' 
        };
      }
      
    } catch (error) {
      console.error('验证码登录失败:', error);
      return { success: false, error: '网络请求失败' };
    }
  }
  /**
   * 检测教务系统是否需要验证码
   * @param schoolName 学校名称
   */
  async detectCaptcha(schoolName: string): Promise<{ hasCaptcha: boolean; error?: string }> {
    try {
      const result = await ApiService.detectCaptcha({ school_name: schoolName });
        if (result.code === 1000) {
        const data = result.data as any;
        return { hasCaptcha: (data && data.has_captcha) || false };
      } else {
        return { hasCaptcha: false, error: result.msg };
      }
      
    } catch (error) {
      console.error('检测验证码失败:', error);
      return { hasCaptcha: false, error: '网络请求失败' };
    }
  }  /**
   * 保存登录凭证
   * @param cookies 登录cookies
   * @param schoolName 学校名称
   */
  private saveCookies(cookies: any, schoolName: string): void {
    StorageService.saveLoginInfo(cookies, schoolName);
    console.log('登录凭证已保存到全局存储');
  }/**
   * 获取已保存的登录凭证
   */
  getCookies(): { cookies: any; schoolName: string } | null {
    try {
      const loginInfo = StorageService.getLoginInfo();
      if (loginInfo) {
        return { 
          cookies: loginInfo.cookies, 
          schoolName: loginInfo.schoolName 
        };
      }
      return null;
    } catch (error) {
      console.error('获取登录凭证失败:', error);
      return null;
    }
  }
  /**
   * 清除登录凭证
   */
  clearCookies(): void {
    StorageService.clearLoginInfo();
    console.log('登录凭证已清除');
  }

  /**
   * 检查登录状态
   */
  isLoggedIn(): boolean {
    return this.getCookies() !== null;
  }
  /**
   * 详细登录调试（用于排查问题）
   * @param credentials 登录凭据
   * @param schoolName 学校名称
   */
  async debugLogin(credentials: { sid: string; password: string }, schoolName: string): Promise<any> {
    try {
      console.log('开始详细登录调试...');
      
      const result = await ApiService.debugLoginDetailed({
        sid: credentials.sid,
        password: credentials.password,
        school_name: schoolName
      });

      console.log('调试结果:', result);
      return result;
      
    } catch (error) {
      console.error('登录调试失败:', error);
      return { success: false, error: '调试请求失败' };
    }
  }
  /**
   * 改进的登录流程（基于新的API文档）
   */
  async improvedLogin(credentials: { sid: string; password: string }, schoolName: string): Promise<LoginResult> {
    try {
      console.log('开始改进的登录流程...');
      
      // 第一步：获取验证码
      const captchaResult = await this.detectCaptcha(schoolName);
      if (captchaResult.hasCaptcha) {
        console.log('系统检测到需要验证码');
        return await this.forceCaptcha(credentials, schoolName);
      } else {
        console.log('系统未检测到验证码，尝试直接登录');
        return await this.login(credentials, undefined, schoolName);
      }
      
    } catch (error) {
      console.error('改进的登录流程失败:', error);
      return { success: false, error: '网络请求失败' };
    }
  }
}

export default LoginManager;
