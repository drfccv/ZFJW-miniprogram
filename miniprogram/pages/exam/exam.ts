import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface Exam {
  courseName: string;
  examDate: string;
  examTime: string;
  location?: string;
  examType?: string;
  seatNumber?: string;
  status?: string;
  teacher?: string;
  campus?: string;
  className?: string;
  credit?: string;
  [key: string]: any;
}

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
    examList: [] as Exam[],
    loading: false,
    showYearSelector: false,
    showTermSelector: false,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0,
    lastUpdateTime: '', // 最后更新时间显示文本
    isFromCache: false  // 是否来自缓存
  },
  onLoad() {
    this.initData();
    this.loadExams();
  },
  onShow() {
    // 如果数据为空，重新加载
    if (this.data.examList.length === 0) {
      this.loadExams();
    } else {
      // 检查缓存是否仍然有效
      const cachedData = StorageService.getCachedExam(this.data.currentYear, this.data.currentTerm);
      if (!cachedData || !Array.isArray(cachedData) || cachedData.length === 0) {
        console.log('检测到考试缓存已被清除，重新加载数据');
        this.setData({ examList: [] });
        this.loadExams();
      }
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时强制从网络获取
    this.loadExams(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },
  // 初始化数据
  initData() {
    // 优先从存储中获取当前学期设置
    const currentTerm = StorageService.getCurrentTerm();
    let currentYear: number;
    let currentTermNum: number;
    
    if (currentTerm) {
      // 如果有存储的学期设置，使用它
      currentYear = currentTerm.year;
      currentTermNum = currentTerm.term;
      console.log('考试页面使用存储的学期设置:', currentYear, currentTermNum);
    } else {
      // 否则计算当前学年学期
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      const day = now.getDate();
      
      // 学年和学期判断逻辑（与其他页面保持一致）
      if (month >= 9 || (month <= 3 && day <= 1)) {
        // 9月1日 - 次年3月1日：第一学期
        if (month >= 9) {
          // 9-12月：当前学年的第一学期 (如2024年9月 = 2024-2025学年第1学期)
          currentYear = year;
        } else {
          // 1-3月1日：上一学年的第一学期 (如2025年1月 = 2024-2025学年第1学期)
          currentYear = year - 1;
        }
        currentTermNum = 1;
      } else {
        // 3月2日 - 8月31日：第二学期
        // (如2025年6月 = 2024-2025学年第2学期)
        currentYear = year - 1;
        currentTermNum = 2;
      }
      
      console.log('考试页面计算学期:', currentYear, currentTermNum);
    }
    
    // 生成学年范围（当前学年的前后3年）
    const yearRange = [];
    for (let i = currentYear - 3; i <= currentYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);
    }

    const yearIndex = yearRange.findIndex(year => year === `${currentYear}-${currentYear + 1}`);
    
    console.log('考试页面初始化 - 学年:', currentYear, '学期:', currentTermNum, '学年索引:', yearIndex);

    this.setData({
      currentYear,
      currentTerm: currentTermNum,
      yearRange,
      yearIndex: yearIndex >= 0 ? yearIndex : Math.floor(yearRange.length / 2), // 如果找不到，使用中间的学年
      termIndex: currentTermNum - 1
    });
  },

  // 加载考试信息
  async loadExams(forceRefresh: boolean = false) {
    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedExam = StorageService.getCachedExam(this.data.currentYear, this.data.currentTerm);
      if (cachedExam) {
        console.log('从缓存加载考试数据');
        this.setData({
          examList: cachedExam,
          lastUpdateTime: `（${StorageService.formatUpdateTime(Date.now())}）`,
          isFromCache: true
        });
        
        // 显示缓存数据后，仍然尝试从网络更新（静默更新）
        this.loadExams(true);
        return;
      }
    }

    this.setData({ loading: true });

    try {
      const result = await ApiService.getExam({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year: this.data.currentYear,
        term: this.data.currentTerm
      });      if (result.code === 1000 && result.data) {
        // 解析考试数据 - API返回的数据结构是 {courses: [...], count: n, name: "", sid: "", term: n, year: n}
        const responseData = result.data as any;
        let examList = [];
        
        if (responseData.courses && Array.isArray(responseData.courses)) {
          // 使用courses数组
          examList = responseData.courses;
        } else if (Array.isArray(result.data)) {
          // 兼容直接数组格式
          examList = result.data;
        }
        
        console.log('解析考试数据:', {
          原始数据: responseData,
          courses数量: examList.length,
          第一条数据: examList[0]
        });
        
        // 转换考试数据格式，映射字段名称
        examList = examList.map((exam: any) => {
          const mappedExam = {
            courseName: exam.title || exam.courseName || exam.course_name || '未知课程',
            examDate: this.parseExamDateTime(exam.time).date || exam.examDate || exam.exam_date,
            examTime: this.parseExamDateTime(exam.time).time || exam.examTime || exam.exam_time,
            location: exam.location || exam.place || exam.exam_location || '待定',
            examType: exam.ksfs || exam.examType || exam.exam_type || '笔试',
            seatNumber: exam.zwh || exam.seatNumber || exam.seat_number || '',
            teacher: exam.teacher || exam.teacher_name || '',
            campus: exam.xq || exam.campus || '',
            className: exam.class_name || exam.className || '',
            credit: exam.credit || '',
            status: '' // 稍后添加
          };
          
          // 添加考试状态
          mappedExam.status = this.getExamStatus(mappedExam.examDate);
          
          return mappedExam;
        });
          // 按日期排序
        examList.sort((a: any, b: any) => {
          return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
        });
        
        // 缓存数据
        StorageService.cacheExam(this.data.currentYear, this.data.currentTerm, examList);
        
        this.setData({
          examList,
          lastUpdateTime: '（刚刚刷新）',
          isFromCache: false
        });
        
        if (forceRefresh) {
          wx.showToast({
            title: '刷新成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: `加载成功，共${examList.length}场考试`,
            icon: 'success'
          });
        }
      } else {
        throw new Error(result.msg || '获取考试信息失败');
      }
    } catch (error) {
      console.error('加载考试信息失败:', error);
      
      // 网络请求失败时，尝试加载缓存数据
      if (!this.data.isFromCache) {
        const cachedExam = StorageService.getCachedExam(this.data.currentYear, this.data.currentTerm);
        if (cachedExam) {
          console.log('网络请求失败，显示缓存考试数据');
          this.setData({
            examList: cachedExam,
            lastUpdateTime: '（网络异常，显示缓存）',
            isFromCache: true
          });
          
          wx.showToast({
            title: '网络异常，显示缓存数据',
            icon: 'none'
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        });
      }
    }

    this.setData({ loading: false });
  },

  // 获取考试状态
  getExamStatus(examDate: string): string {
    if (!examDate) return 'unknown';
    
    const today = new Date();
    const exam = new Date(examDate);
    const todayStr = today.toDateString();
    const examStr = exam.toDateString();
    
    if (examStr === todayStr) {
      return 'today';
    } else if (exam > today) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  },

  // 获取状态样式类
  getStatusClass(status: string): string {
    return status || 'unknown';
  },

  // 获取状态文本
  getStatusText(status: string): string {
    switch (status) {
      case 'today':
        return '今日考试';
      case 'upcoming':
        return '即将考试';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  },

  // 刷新考试信息
  refreshExams() {
    this.loadExams();
  },
  // 显示考试详情
  showExamDetail(e: any) {
    const index = e.currentTarget.dataset.index;
    const exam = this.data.examList[index];
    
    let content = `课程名称：${exam.courseName}
考试日期：${exam.examDate}
考试时间：${exam.examTime}
考试地点：${exam.location || '待定'}`;

    if (exam.examType) {
      content += `\n考试类型：${exam.examType}`;
    }
    if (exam.seatNumber) {
      content += `\n座位号：${exam.seatNumber}`;
    }
    if (exam.teacher) {
      content += `\n授课教师：${exam.teacher}`;
    }
    if (exam.campus) {
      content += `\n校区：${exam.campus}`;
    }
    if (exam.className) {
      content += `\n班级：${exam.className}`;
    }
    if (exam.credit) {
      content += `\n学分：${exam.credit}`;
    }
    
    wx.showModal({
      title: '考试详情',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 显示学年选择器
  showYearPicker() {
    this.setData({ showYearSelector: true });
  },

  // 隐藏学年选择器
  hideYearPicker() {
    this.setData({ showYearSelector: false });
  },
  // 学年变更
  onYearChange(e: any) {
    const yearIndex = e.detail.value;
    const yearStr = this.data.yearRange[yearIndex];
    const year = parseInt(yearStr.split('-')[0]);
    
    console.log('考试页面学年变更:', year, '索引:', yearIndex);
    
    this.setData({
      yearIndex,
      currentYear: year,
      showYearSelector: false
    });
    
    // 保存到存储
    StorageService.setCurrentTerm(year, this.data.currentTerm);
    
    // 重新加载数据
    this.loadExams();
  },

  // 显示学期选择器
  showTermPicker() {
    this.setData({ showTermSelector: true });
  },

  // 隐藏学期选择器
  hideTermPicker() {
    this.setData({ showTermSelector: false });
  },
  // 学期变更
  onTermChange(e: any) {
    const termIndex = e.detail.value;
    const term = termIndex + 1;
    
    console.log('考试页面学期变更:', term, '索引:', termIndex);
    
    this.setData({
      termIndex,
      currentTerm: term,
      showTermSelector: false
    });
    
    // 保存到存储
    StorageService.setCurrentTerm(this.data.currentYear, term);
    
    // 重新加载数据
    this.loadExams();
  },

  // 解析考试日期时间字符串 (格式如 "2025-06-19(08:30-10:00)")
  parseExamDateTime(timeStr: string): { date: string; time: string } {
    if (!timeStr || typeof timeStr !== 'string') {
      return { date: '', time: '' };
    }
    
    try {
      // 匹配格式 "2025-06-19(08:30-10:00)" 或 "2025-06-19 08:30-10:00"
      const match = timeStr.match(/(\d{4}-\d{2}-\d{2})[(\s]*(\d{2}:\d{2}[-~]\d{2}:\d{2})/);
      if (match) {
        return {
          date: match[1], // 日期部分 "2025-06-19"
          time: match[2]  // 时间部分 "08:30-10:00"
        };
      }
      
      // 如果不匹配，尝试简单分割
      if (timeStr.includes('(')) {
        const parts = timeStr.split('(');
        return {
          date: parts[0] || '',
          time: parts[1] ? parts[1].replace(')', '') : ''
        };
      }
      
      return { date: timeStr, time: '' };
    } catch (error) {
      console.error('解析考试时间失败:', timeStr, error);
      return { date: timeStr, time: '' };
    }
  },

  onShareAppMessage() {
    return {
      title: '考试安排 - 正方教务系统小程序',
      path: '/pages/exam/exam',
      imageUrl: '/images/share-default.png'
    };
  },

  onShareTimeline() {
    return {
      title: '考试安排 - 正方教务系统小程序',
      query: '',
      imageUrl: '/images/share-default.png'
    };
  },
});
