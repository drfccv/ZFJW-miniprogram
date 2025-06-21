/// <reference path="./wx/index.d.ts" />

// 用户信息接口
interface UserInfo {
  sid: string;          // 学号
  name: string;         // 姓名
  college?: string;     // 学院
  major?: string;       // 专业
  className?: string;   // 班级
  grade?: string;       // 年级
  [key: string]: any;   // 其他字段
}

// 登录信息接口
interface LoginInfo {
  cookies: any;
  baseUrl: string;
  loginTime: number;
}

// API 响应接口
interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}
