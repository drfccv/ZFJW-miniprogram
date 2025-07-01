import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';

interface EvaluationItem {
  content: string;
  has_input: boolean;
  pjzbxm_id: string;
  score: string;
  min_score: number;
  max_score: number;
  current_value?: string;
  input_name?: string;
}

interface EvaluateDetail {
  action: string;
  comment_max_length: number;
  comment_name: string;
  course_name: string;
  evaluation_items: EvaluationItem[];
  is_evaluated: boolean;
  jxb_id: string;
  kch_id: string;
  teacher_name: string;
  comment: string;
}

Page({
  data: {
    courseUrl: '',
    courseName: '',
    teacher: '',
    courseId: '',
    evaluateDetail: {
      action: '',
      comment_max_length: 500,
      comment_name: '',
      course_name: '',
      evaluation_items: [],
      is_evaluated: false,
      jxb_id: '',
      kch_id: '',
      teacher_name: '',
      comment: ''
    } as EvaluateDetail,
    selectedScores: [] as { pjzbxm_id: string; value: string }[],
    comment: '',
    loading: false,
    saving: false,
    submitting: false,
    submitted: false,
    error: ''
  },

  onLoad(options: any) {
    if (options.courseUrl && options.courseName) {
      this.setData({
        courseUrl: decodeURIComponent(options.courseUrl),
        courseName: decodeURIComponent(options.courseName),
        teacher: options.teacher ? decodeURIComponent(options.teacher) : '',
        courseId: options.courseId ? decodeURIComponent(options.courseId) : ''
      });
      this.loadEvaluateDetail();
    } else {
      this.setData({
        error: '课程信息错误'
      });
    }
  },

  // 从URL中提取jxb_id参数
  extractJxbIdFromUrl(url: string): string | null {
    try {
      const match = url.match(/[?&]jxb_id=([^&]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('解析URL失败:', error);
      return null;
    }
  },

  // 加载评价详情
  async loadEvaluateDetail() {
    const apiParams = AuthUtils.getApiParams();
    if (!apiParams) {
      this.setData({ error: '请先登录', loading: false });
      return;
    }
    const jxbId = this.extractJxbIdFromUrl(this.data.courseUrl);
    if (!jxbId) {
      this.setData({ error: '无法获取课程评价ID', loading: false });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const result = await ApiService.getEvaluateDetail({
        ...apiParams,
        jxb_id: jxbId
      });
      if (result.code === 1000 && result.data) {
        const detail: EvaluateDetail = result.data;
        let comment = detail.comment || '';
        // 过滤掉前缀的0/500、0/500 | [0,500]等计数提示，保留实际评语内容
        comment = comment.replace(/^\d+\s*\/\s*\d+\s*\|?\s*\[?\d*,?\d*\]?/, '').trim();
        this.setData({
          evaluateDetail: detail,
          selectedScores: detail.evaluation_items.map(item => ({ pjzbxm_id: item.pjzbxm_id, value: item.current_value || item.score || '' })),
          comment,
          loading: false
        });
      } else {
        this.setData({ error: result.msg || '获取评价详情失败', loading: false });
      }
    } catch (error) {
      console.error('加载评价详情失败:', error);
      this.setData({ error: '网络错误，请检查网络连接', loading: false });
    }
  },

  // 输入分数
  onScoreInput(e: any) {
    const { pjzbxm_id, min, max } = e.currentTarget.dataset;
    let value = e.detail.value;
    // 只允许输入数字
    value = value.replace(/[^\d]/g, '');
    // 校验范围
    let num = parseInt(value, 10);
    if (!isNaN(num)) {
      if (min !== undefined && num < Number(min)) num = Number(min);
      if (max !== undefined && num > Number(max)) num = Number(max);
      value = String(num);
    } else {
      value = '';
    }
    const selectedScores = this.data.selectedScores.map(item =>
      item.pjzbxm_id === pjzbxm_id ? { ...item, value } : item
    );
    // 若没有则新增
    if (!selectedScores.find(item => item.pjzbxm_id === pjzbxm_id)) {
      selectedScores.push({ pjzbxm_id, value });
    }
    this.setData({ selectedScores });
  },

  // 获取输入框当前值
  getInputValue(pjzbxm_id: string) {
    const selected = this.data.selectedScores.find(item => item.pjzbxm_id === pjzbxm_id);
    return selected ? selected.value : '';
  },

  // 评语输入
  onCommentInput(e: any) {
    this.setData({ comment: e.detail.value });
  },

  // 保存评价
  async saveEvaluate() {
    if (!this.validateForm()) return;
    this.setData({ saving: true });
    try {
      const apiParams = AuthUtils.getApiParams();
      if (!apiParams) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      const { evaluateDetail, selectedScores, comment } = this.data;
      let commentValue = comment;
      // 过滤掉0/500、0/500 | [0,500]等默认计数提示
      if (/^0\s*\/\s*\d+/.test(commentValue) || /\|\s*\[0,?\d*\]/.test(commentValue)) {
        commentValue = '';
      }
      const evaluation_data = {
        items: selectedScores.map(item => {
          const evalItem = evaluateDetail.evaluation_items.find(i => i.pjzbxm_id === item.pjzbxm_id);
          return {
            input_name: evalItem && evalItem.input_name ? evalItem.input_name : '',
            score: item.value
          };
        })
      };
      const params = {
        ...apiParams,
        jxb_id: evaluateDetail.jxb_id,
        kch_id: evaluateDetail.kch_id,
        comment_name: evaluateDetail.comment_name,
        comment: commentValue,
        evaluation_data
      };
      const result = await ApiService.saveEvaluate(params);
      if (result.code === 1000) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.msg || '保存失败', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  // 提交评价
  async submitEvaluate() {
    if (!this.validateForm()) return;
    wx.showModal({
      title: '确认提交',
      content: '提交后将无法修改，确定要提交吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.doSubmitEvaluate();
        }
      }
    });
  },

  async doSubmitEvaluate() {
    this.setData({ submitting: true });
    try {
      const apiParams = AuthUtils.getApiParams();
      if (!apiParams) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      const { evaluateDetail, selectedScores, comment } = this.data;
      const evaluation_data = {
        items: selectedScores.map(item => {
          const evalItem = evaluateDetail.evaluation_items.find(i => i.pjzbxm_id === item.pjzbxm_id);
          return {
            input_name: evalItem && evalItem.input_name ? evalItem.input_name : '',
            score: item.value
          };
        })
      };
      const params = {
        ...apiParams,
        jxb_id: evaluateDetail.jxb_id,
        kch_id: evaluateDetail.kch_id,
        comment_name: evaluateDetail.comment_name,
        comment,
        evaluation_data
      };
      const result = await ApiService.submitEvaluate(params);
      if (result.code === 1000) {
        this.setData({ submitted: true });
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => { wx.navigateBack(); }, 1500);
      } else {
        wx.showToast({ title: result.msg || '提交失败', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 校验表单
  validateForm(): boolean {
    const { evaluateDetail, selectedScores, comment } = this.data;
    if (!evaluateDetail.evaluation_items || evaluateDetail.evaluation_items.length === 0) {
      wx.showToast({ title: '没有评价项目', icon: 'none' });
      return false;
    }
    for (const item of evaluateDetail.evaluation_items) {
      const selected = selectedScores.find(s => s.pjzbxm_id === item.pjzbxm_id);
      if (!selected || !selected.value) {
        wx.showToast({ title: `请完成\"${item.content}\"的评价`, icon: 'none' });
        return false;
      }
      const num = parseInt(selected.value, 10);
      if (isNaN(num) || num < item.min_score || num > item.max_score) {
        wx.showToast({ title: `分数需在${item.min_score}-${item.max_score}之间`, icon: 'none' });
        return false;
      }
    }
    if (evaluateDetail.comment_max_length && comment.length > evaluateDetail.comment_max_length) {
      wx.showToast({ title: `评语不能超过${evaluateDetail.comment_max_length}字`, icon: 'none' });
      return false;
    }
    return true;
  },

  // 获取已选择的分数
  getSelectedScore(pjzbxm_id: string) {
    const selected = this.data.selectedScores.find((item: { pjzbxm_id: string; value: string }) => item.pjzbxm_id === pjzbxm_id);
    return selected ? selected.value : '';
  }
});