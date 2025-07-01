import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

Page({
  data: {
    jwUrl: ''
  },
  async onLoad(query: { cookie?: string }) {
    // 从缓存获取school_name
    const loginInfo = StorageService.getLoginInfo();
    const schoolName = loginInfo && loginInfo.schoolName ? loginInfo.schoolName : '';
    let baseUrl = '';
    if (schoolName) {
      try {
        const res = await ApiService.getSchoolConfig(schoolName);
        if (res && res.code === 1000 && res.data && typeof res.data === 'object' && 'base_url' in res.data) {
          baseUrl = (res.data as any).base_url;
        }
      } catch (e) {
        // 获取失败，使用默认
        baseUrl = '';
      }
    }
    if (!baseUrl) {
      baseUrl = 'https://jw.example.edu.cn'; // 兜底默认
    }
    let url = baseUrl;
    let cookieStr = '';
    if (query.cookie) {
      try {
        cookieStr = decodeURIComponent(query.cookie);
        // 尝试解析为对象，如果失败则直接用字符串
        try {
          const cookieObj = JSON.parse(cookieStr);
          // 你可以根据实际教务系统需要将cookie对象拼接为字符串
          cookieStr = Object.entries(cookieObj).map(([k, v]) => `${k}=${v}`).join('; ');
        } catch (e) {}
      } catch (e) {}
      url += '?cookie=' + encodeURIComponent(cookieStr);
    }
    this.setData({ jwUrl: url });
  }
}); 