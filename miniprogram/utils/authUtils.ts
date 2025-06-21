// 认证工具类 - 处理登录状态检查和重定向
import StorageService from './storage';

// 从storage模块导入LoginInfo类型
type LoginInfo = {
  cookies: any;
  schoolName: string;
  loginTime: number;
};

export class AuthUtils {
  /**
   * 检查登录状态，如果未登录则跳转到登录页
   * @returns 如果已登录返回登录信息，否则返回null
   */
  static checkLoginStatus(): LoginInfo | null {
    const loginInfo = StorageService.getLoginInfo();
    
    if (!loginInfo) {
      console.warn('用户未登录，跳转到登录页');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
      
      return null;
    }
    
    return loginInfo;
  }

  /**
   * 检查登录状态，如果未登录则显示提示但不跳转
   * @returns 如果已登录返回登录信息，否则返回null
   */
  static checkLoginStatusSilent(): LoginInfo | null {
    return StorageService.getLoginInfo();
  }

  /**
   * 处理API错误，特别是cookie失效的情况
   * @param code API返回的错误码
   * @param msg API返回的错误信息
   */
  static handleApiError(code: number, msg?: string): void {
    switch (code) {
      case 1006: // cookies失效
        console.warn('Cookies失效，清除登录信息');
        StorageService.clearLoginInfo();
        wx.showToast({
          title: '登录失效，请重新登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }, 1500);
        break;
      
      case 1007: // 接口失效
        wx.showToast({
          title: '接口失效，请联系管理员',
          icon: 'none'
        });
        break;
      
      case 2333: // 系统维护
        wx.showToast({
          title: '系统维护中，请稍后再试',
          icon: 'none'
        });
        break;
      
      default:
        wx.showToast({
          title: msg || '请求失败',
          icon: 'none'
        });
    }
  }
  /**
   * 获取标准的API请求参数（包含cookies和school_name）
   * @returns API请求参数，如果未登录返回null
   */
  static getApiParams(): { cookies: any; school_name: string } | null {
    const loginInfo = this.checkLoginStatusSilent();
    if (!loginInfo) {
      return null;
    }
    
    return {
      cookies: loginInfo.cookies,
      school_name: loginInfo.schoolName
    };
  }
  /**
   * 获取带学期参数的API请求参数
   * @param year 学年
   * @param term 学期
   * @returns API请求参数，如果未登录返回null
   */
  static getApiParamsWithTerm(year: number, term: number): { cookies: any; school_name: string; year: number; term: number } | null {
    const baseParams = this.getApiParams();
    if (!baseParams) {
      return null;
    }
    
    return {
      ...baseParams,
      year,
      term
    };
  }
}
