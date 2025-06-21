// API工具类 - 处理所有后端接口请求
import StorageService from './storage';

interface ApiResponse<T = any> {
  code: number;
  msg?: string;
  data?: T;
  cookies?: any;
  captcha?: string;
}

// 学校信息接口
interface SchoolInfo {
  name: string;
  school_name: string;
  id?: string;
  description?: string;
  requires_captcha?: boolean;
}

interface LoginParams {
  sid: string;
  password: string;
  school_name: string;
}

interface LoginWithKaptchaParams {
  school_name: string;
  kaptcha: string; // 用户输入的验证码
  csrf_token: string;
  cookies: any;
  modulus: string;
  exponent: string;
  sid: string;
  password: string;
}

interface GetCaptchaParams {
  sid: string;
  password: string;
  school_name: string;
}

interface DetectCaptchaParams {
  school_name: string;
}

interface DebugLoginParams {
  sid: string;
  password: string;
  school_name: string;
}

interface AuthParams {
  cookies: any;
  school_name: string;
}

interface TermParams extends AuthParams {
  year: number;
  term: number;
}

interface BlockCoursesParams extends TermParams {
  block_id: number; // API文档明确指定为int类型
}

interface CourseClassesParams extends TermParams {
  course_id: string;
}

interface SelectCourseParams extends TermParams {
  sid: string;
  course_id: string;
  do_id: string;
  kklxdm: string; // API文档明确指定为string类型
}

interface DropCourseParams extends AuthParams {
  do_id: string;
  course_id: string;
  year: number;
  term: number;
}

interface EmptyClassroomParams {
  school_name: string;
}

class ApiService {
  // 处理API响应，检查cookie失效等状态
  private static handleResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    // 检查cookie失效
    if (response.code === 1006) {
      console.warn('Cookies失效，需要重新登录');
      StorageService.clearLoginInfo();
      // 可以触发全局登录失效事件
      wx.showToast({
        title: '登录失效，请重新登录',
        icon: 'none'
      });
      // 跳转到登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
    }
    return response;
  }  // 获取学校列表的专用GET方法
  private static requestGet<T>(url: string): Promise<ApiResponse<T>> {
    const apiBaseUrl = StorageService.getApiBaseUrl();
    const cleanBaseUrl = apiBaseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    const fullUrl = `${cleanBaseUrl}${cleanUrl}`;
    
    return new Promise((resolve, reject) => {
      console.log('API GET请求:', fullUrl);
      wx.request({
        url: fullUrl,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        success(res) {
          console.log('API GET响应:', res);
          if (res.statusCode === 200) {
            const responseData = res.data as ApiResponse<T>;
            resolve(ApiService.handleResponse(responseData));
          } else {
            resolve({
              code: 999,
              msg: `HTTP ${res.statusCode}: ${res.data || '请求失败'}`
            });
          }
        },
        fail(err) {
          console.error('API GET请求失败:', err);
          reject(new Error(err.errMsg || 'Network Error'));
        }
      });
    });
  }

  // 通用POST请求方法
  private static request<T>(url: string, data: any): Promise<ApiResponse<T>> {
    // 使用配置的API地址或默认地址
    const apiBaseUrl = StorageService.getApiBaseUrl();
    const cleanBaseUrl = apiBaseUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    const fullUrl = `${cleanBaseUrl}${cleanUrl}`;
    
    return new Promise((resolve, reject) => {
      console.log('API请求:', fullUrl, data);
      wx.request({
        url: fullUrl,
        method: 'POST',
        data,
        header: {
          'Content-Type': 'application/json'
        },        success(res) {
          console.log('API响应:', res);
          if (res.statusCode === 200) {
            const responseData = res.data as ApiResponse<T>;
            // 处理响应
            resolve(ApiService.handleResponse(responseData));
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail(err) {
          console.error('API请求失败:', err);
          reject(err);
        }
      });
    });
  }

  // 1. 登录
  static login(params: LoginParams) {
    return this.request('/api/login', params);
  }  // 0. 获取学校列表
  static getSchools(): Promise<ApiResponse<SchoolInfo[]>> {
    return this.requestGet('/api/schools');
  }

  // 2. 验证码登录
  static loginWithKaptcha(params: LoginWithKaptchaParams) {
    return this.request('/api/login_with_kaptcha', params);
  }

  // 3. 强制获取验证码
  static getCaptcha(params: GetCaptchaParams) {
    return this.request('/api/get_captcha', params);
  }

  // 4. 验证码检测
  static detectCaptcha(params: DetectCaptchaParams) {
    return this.request('/api/detect_captcha', params);
  }

  // 5. 详细登录调试
  static debugLoginDetailed(params: DebugLoginParams) {
    return this.request('/api/debug_login_detailed', params);
  }

  // 6. 获取个人信息
  static getInfo(params: AuthParams) {
    return this.request('/api/info', params);
  }

  // 7. 获取成绩
  static getGrade(params: TermParams) {
    return this.request('/api/grade', params);
  }

  // 8. 获取考试信息
  static getExam(params: TermParams) {
    return this.request('/api/exam', params);
  }

  // 9. 获取课表
  static getSchedule(params: TermParams) {
    return this.request('/api/schedule', params);
  }

  // 10. 获取学业生涯
  static getAcademia(params: AuthParams) {
    return this.request('/api/academia', params);
  }

  // 11. 获取通知消息
  static getNotifications(params: AuthParams) {
    return this.request('/api/notifications', params);
  }

  // 12. 获取已选课程
  static getSelectedCourses(params: TermParams) {
    return this.request('/api/selected_courses', params);
  }  // 13. 获取选课板块课程列表
  static getBlockCourses(params: BlockCoursesParams) {
    return this.request('/api/block_courses', params);
  }

  // 14. 获取课程教学班
  static getCourseClasses(params: CourseClassesParams) {
    return this.request('/api/course_classes', params);
  }

  // 15. 选课
  static selectCourse(params: SelectCourseParams) {
    return this.request('/api/select_course', params);
  }

  // 16. 退课
  static dropCourse(params: DropCourseParams) {
    return this.request('/api/drop_course', params);
  }

  // 16. 空教室查询
  static getEmptyClassroom(params: EmptyClassroomParams) {
    return this.request('/api/empty_classroom', params);
  }

  // 17. 课表PDF导出
  static getSchedulePdf(params: TermParams) {
    return this.request('/api/schedule_pdf', params);
  }

  // 18. 学业生涯PDF导出
  static getAcademiaPdf(params: AuthParams) {
    return this.request('/api/academia_pdf', params);
  }

  // 19. 获取学校列表
  static getSchoolList() {
    return this.request('/api/school_list', {});
  }
}

// 错误码说明
export const ERROR_CODES = {
  1000: '请求成功',
  1001: '需要验证码',
  1002: '用户名或密码错误',
  1003: '请求超时',
  1004: '验证码错误',
  1005: '内容为空',
  1006: 'cookies 失效',
  1007: '接口失效',
  998: '网页弹窗未处理',
  999: '逻辑或未知错误',
  2333: '系统维护/被ban'
};

export default ApiService;
export type { 
  ApiResponse, 
  SchoolInfo,
  LoginParams, 
  LoginWithKaptchaParams,
  GetCaptchaParams,
  DetectCaptchaParams,
  DebugLoginParams,
  AuthParams, 
  TermParams, 
  BlockCoursesParams,
  SelectCourseParams,
  DropCourseParams,
  EmptyClassroomParams
};
