import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';

interface CourseItem {
  course_id: string;
  course_name: string;
  class_name: string;
  teacher: string;
  college: string;
  classroom?: string;
  time?: string;
  evaluate_url: string;
  jxb_id: string;
  status: string;
  evaluated?: boolean;
}

Page({
  data: {
    courseList: [] as CourseItem[],
    totalCourses: 0,
    evaluatedCourses: 0,
    pendingCourses: 0,
    loading: false,
    error: '',
    autoEvaluating: false,
    autoEvaluateResult: '',
  },

  onLoad() {
    this.loadCourseList();
  },

  onShow() {
    // 页面显示时重新加载数据
    this.loadCourseList();
  },

  onPullDownRefresh() {
    this.loadCourseList(true).then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载课程列表
  async loadCourseList(forceRefresh: boolean = false) {
    // 检查登录状态
    const apiParams = AuthUtils.getApiParams();
    if (!apiParams) {
      this.setData({
        error: '请先登录',
        loading: false
      });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const result = await ApiService.getEvaluateMenu(apiParams);
      
      if (result.code === 1000 && result.data && (result.data as any).courses && Array.isArray((result.data as any).courses)) {
        const courseList = (result.data as any).courses.map((item: any) => ({
          course_id: item.course_id,
          course_name: item.course_name,
          class_name: item.class_name,
          teacher: item.teacher,
          college: item.college,
          classroom: item.classroom,
          time: item.time,
          evaluate_url: item.evaluate_url,
          jxb_id: item.jxb_id,
          status: item.status,
          evaluated: item.status === '提交' // 根据status判断是否已评价
        }));

        this.setData({
          courseList,
          totalCourses: courseList.length,
          evaluatedCourses: courseList.filter((c: CourseItem) => c.evaluated).length,
          pendingCourses: courseList.filter((c: CourseItem) => !c.evaluated).length,
          loading: false
        });
      } else {
        this.setData({
          error: result.msg || '获取评价课程失败',
          loading: false
        });
      }
    } catch (error) {
      console.error('加载评价课程失败:', error);
      this.setData({
        error: '网络错误，请检查网络连接',
        loading: false
      });
    }
  },

  // 跳转到评价详情页
  goToEvaluateDetail(e: any) {
    const course = e.currentTarget.dataset.course;
    if (!course || !course.evaluate_url) {
      wx.showToast({
        title: '课程信息错误',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/evaluate-detail/evaluate-detail?courseUrl=${encodeURIComponent(course.evaluate_url)}&courseName=${encodeURIComponent(course.course_name)}&teacher=${encodeURIComponent(course.teacher)}&courseId=${encodeURIComponent(course.course_id)}`
    });
  },

  // 一键评教
  async autoEvaluateAll() {
    this.setData({ autoEvaluating: true, autoEvaluateResult: '' });
    try {
      const apiParams = AuthUtils.getApiParams();
      if (!apiParams) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        this.setData({ autoEvaluating: false });
        return;
      }
      // 获取最新未评价课程
      await this.loadCourseList();
      const pendingCourses = this.data.courseList.filter((c: CourseItem) => !c.evaluated);
      if (pendingCourses.length === 0) {
        wx.showToast({ title: '暂无未评价课程', icon: 'none' });
        this.setData({ autoEvaluating: false });
        return;
      }
      let successCount = 0;
      let failCount = 0;
      for (const course of pendingCourses) {
        // 获取评价详情
        const detailRes = await ApiService.getEvaluateDetail({ ...apiParams, jxb_id: course.jxb_id });
        if (detailRes.code !== 1000 || !detailRes.data) {
          failCount++;
          continue;
        }
        const detail = detailRes.data;
        // 构造随机分数
        const evaluation_data = {
          items: (detail.evaluation_items || []).map((item: any) => ({
            input_name: item.input_name || item.pjzbxm_id,
            score: String(Math.floor(Math.random() * 6) + 95) // 95-100
          }))
        };
        const params = {
          ...apiParams,
          jxb_id: detail.jxb_id,
          kch_id: detail.kch_id,
          comment_name: detail.comment_name,
          comment: '',
          evaluation_data
        };
        const submitRes = await ApiService.submitEvaluate(params);
        if (submitRes.code === 1000) {
          successCount++;
        } else {
          failCount++;
        }
      }
      wx.showToast({ title: `成功${successCount}门，失败${failCount}门`, icon: 'success' });
      this.setData({ autoEvaluateResult: `成功${successCount}门，失败${failCount}门` });
      // 重新加载课程列表
      await this.loadCourseList();
    } catch (e) {
      wx.showToast({ title: '一键评教失败', icon: 'none' });
      this.setData({ autoEvaluateResult: '一键评教失败' });
    } finally {
      this.setData({ autoEvaluating: false });
    }
  },
}); 