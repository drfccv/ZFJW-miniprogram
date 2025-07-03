import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';

interface Grade {
  courseName: string;
  teacher?: string;
  credit: number;
  courseType?: string;
  totalScore: number | string;
  gpa?: number;
  gradeNature?: string;
  mark?: string;
  startCollege?: string;
  courseId?: string;
  className?: string;
  gradeClass?: string; // 预计算的分数等级CSS类
  detailItems?: Array<{ xmblmc: string; xmcj: string; weight?: string }>;
  expanded?: boolean; // 新增展开字段
  [key: string]: any;
}

interface GradeStats {
  totalCourses: number;
  passedCourses: number;
  failedCourses: number;
  avgGrade: string;
  weightedAvgGrade: string; // 加权平均分
  gpa: string; // 平均学分绩点
  // 保留但不显示的字段
  totalCredits: number; // 总学分
  earnedCredits: number; // 已获得学分（及格课程）
}

Page({
  data: {
    currentYear: new Date().getFullYear() as number | null,
    currentTerm: 1 as number | null,
    gradeList: [] as Grade[],
    gradeStats: {
      totalCourses: 0,
      passedCourses: 0,
      failedCourses: 0,
      avgGrade: '0.0',
      weightedAvgGrade: '0.0',
      gpa: '0.0',
      totalCredits: 0,
      earnedCredits: 0
    } as GradeStats,
    loading: false,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0,
    lastUpdateTime: '', // 最后更新时间显示文本
    isFromCache: false,  // 是否来自缓存
    gradeApiType: 'normal', // 新增成绩接口类型
  },
  onLoad() {
    this.initData();
    // 读取成绩接口类型
    const gradeApiType = String(StorageService.get('gradeApiType') || 'normal');
    this.setData({ gradeApiType });
    this.loadGrades();
  },
  onShow() {
    // 如果数据为空，重新加载
    if (this.data.gradeList.length === 0) {
      // 读取成绩接口类型
      const gradeApiType = String(StorageService.get('gradeApiType') || 'normal');
      this.setData({ gradeApiType });
      this.loadGrades();
    } else {
      // 检查缓存是否仍然有效
      const cachedData = StorageService.getCachedGrade(this.data.currentYear != null ? this.data.currentYear : 0, this.data.currentTerm != null ? this.data.currentTerm : 0);
      if (!cachedData || !Array.isArray(cachedData) || cachedData.length === 0) {
        console.log('检测到成绩缓存已被清除，重新加载数据');
        this.setData({ 
          gradeList: [],
          gradeStats: {
            totalCourses: 0,
            passedCourses: 0,
            failedCourses: 0,
            avgGrade: '0.0',
            weightedAvgGrade: '0.0',
            gpa: '0.0',
            totalCredits: 0,
            earnedCredits: 0
          }
        });
        // 读取成绩接口类型
        const gradeApiType = String(StorageService.get('gradeApiType') || 'normal');
        this.setData({ gradeApiType });
        this.loadGrades();
      }
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时强制从网络获取
    const refreshPromise = this.loadGrades();
    if (refreshPromise && typeof refreshPromise.then === 'function') {
      refreshPromise.then(() => wx.stopPullDownRefresh()).catch(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },// 初始化数据
  initData() {
    // 优先从存储中获取当前学期设置
    const storedTerm = StorageService.getCurrentTerm();
    let academicYear: number;
    let currentTerm: number;
    
    if (storedTerm) {
      // 如果有存储的学期设置，使用它
      academicYear = storedTerm.year;
      currentTerm = storedTerm.term;
      console.log('成绩页面使用存储的学期设置:', academicYear, currentTerm);
    } else {
      // 否则计算当前学年学期
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentDay = now.getDate();
      
      // 学年和学期判断逻辑
      if (currentMonth >= 9 || (currentMonth <= 3 && currentDay <= 1)) {
        // 9月1日 - 次年3月1日：第一学期
        if (currentMonth >= 9) {
          // 9-12月：当前学年的第一学期 (如2024年9月 = 2024-2025学年第1学期)
          academicYear = currentYear;
        } else {
          // 1-3月1日：上一学年的第一学期 (如2025年1月 = 2024-2025学年第1学期)
          academicYear = currentYear - 1;
        }
        currentTerm = 1;
      } else {
        // 3月2日 - 8月31日：第二学期
        // (如2025年6月 = 2024-2025学年第2学期)
        academicYear = currentYear - 1;
        currentTerm = 2;
      }
      
      console.log('成绩页面计算学期:', {
        当前日期: `${currentYear}-${currentMonth}-${currentDay}`,
        学年: `${academicYear}-${academicYear + 1}`,
        学期: currentTerm === 1 ? '第一学期' : '第二学期',
        academicYear,
        currentTerm
      });
    }
    
    // 生成学年范围（当前学年的前后3年）
    const yearRange = [];
    for (let i = academicYear - 3; i <= academicYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);
    }
    yearRange.push('全部学年');

    const yearIndex = yearRange.findIndex(year => year === `${academicYear}-${academicYear + 1}`);

    this.setData({
      currentYear: academicYear,
      currentTerm: currentTerm,
      yearRange,
      yearIndex: yearIndex >= 0 ? yearIndex : yearRange.length - 1,
      termIndex: currentTerm
    });
    
    console.log('成绩页面初始化完成:', {
      currentYear: this.data.currentYear,
      currentTerm: this.data.currentTerm,
      termIndex: this.data.termIndex,
      yearIndex: this.data.yearIndex
    });
  },// 加载成绩
  async loadGrades() {
    const gradeApiType = this.data.gradeApiType || String(StorageService.get('gradeApiType') || 'normal');
    this.setData({ loading: true });
    try {
      const apiParams = AuthUtils.getApiParamsWithTerm(this.data.currentYear != null ? this.data.currentYear : undefined, this.data.currentTerm != null ? this.data.currentTerm : undefined);
      if (!apiParams) {
        this.setData({ loading: false });
        return;
      }
      let result;
      if (gradeApiType === 'detail') {
        result = await ApiService.getGradeDetail(apiParams);
      } else {
        result = await ApiService.getGrade(apiParams);
      }
      if (result.code === 1000 && result.data) {
        let coursesData = [];
        const responseData = result.data as any;
        if (responseData.data && responseData.data.courses && Array.isArray(responseData.data.courses)) {
          coursesData = responseData.data.courses;
        } else if (responseData.courses && Array.isArray(responseData.courses)) {
          coursesData = responseData.courses;
        } else if (Array.isArray(responseData)) {
          coursesData = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          coursesData = responseData.data;
        }
        if (!Array.isArray(coursesData) || coursesData.length === 0) {
          wx.showToast({ title: '暂无成绩数据', icon: 'none' });
          return;
        }
        const gradeData = coursesData.map((course: any) => {
          const converted = {
            courseName: course.title || course.courseName || course.name || course.course_name || '未知课程',
            teacher: course.teacher || course.teacher_name || course.instructor || '',
            credit: parseFloat(course.credit || course.credits || course.xf || '0') || 0,
            courseType: course.category || course.courseType || course.nature || course.type || course.course_type || '',
            totalScore: course.grade || course.totalScore || course.score || course.cj || '无',
            gpa: parseFloat(course.grade_point || course.gpa || course.jd || '0') || undefined,
            gradeNature: course.grade_nature || course.gradeNature || '',
            mark: course.mark || course.bz || '',
            startCollege: course.start_college || course.startCollege || course.college || '',
            courseId: course.course_id || course.courseId || course.id || '',
            className: course.class_name || course.className || course.class || '',
            gradeClass: this.getGradeClass(course.grade || course.totalScore || course.score || course.cj || '无'),
            expanded: false,
          };
          return converted;
        });
        const gradeList = Array.isArray(gradeData) ? gradeData : [];
        const gradeStats = this.calculateStats(gradeList);
        this.setData({
          gradeList,
          gradeStats,
          lastUpdateTime: '（刚刚刷新）',
          isFromCache: false
        });
        wx.showToast({ title: `加载成功，共${gradeList.length}门课程`, icon: 'success' });
      } else {
        AuthUtils.handleApiError(result.code, result.msg);
      }
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
    this.setData({ loading: false });
  },
  // 计算成绩统计
  calculateStats(gradeList: Grade[]): GradeStats {
    const totalCourses = gradeList.length;
    let passedCourses = 0;
    let failedCourses = 0;
    let totalScore = 0;
    let validScores = 0;
    let totalWeightedScore = 0;
    let totalCredits = 0;
    let totalGradePoints = 0;
    let earnedCredits = 0;

    gradeList.forEach(grade => {
      let score = 0;
      if (grade.totalScore && !isNaN(Number(grade.totalScore))) {
        score = parseFloat(grade.totalScore.toString());
      }
      const credit = parseFloat((grade.credit && grade.credit.toString()) || '0');
      // GPA算法：直接用获取到的绩点
      let gpa = grade.gpa != null ? grade.gpa : 0;
      // 统计总学分
      if (credit > 0) {
        totalCredits += credit;
      }
      if (!isNaN(score) && score > 0) {
        totalScore += score;
        validScores++;
        if (credit > 0) {
          totalWeightedScore += score * credit;
        }
        if (score >= 60) {
          passedCourses++;
          if (credit > 0) {
            earnedCredits += credit;
          }
        } else {
          failedCourses++;
        }
      }
      // GPA加权
      if (!isNaN(gpa) && gpa > 0 && credit > 0) {
        totalGradePoints += gpa * credit;
      }
    });
    const avgGrade = validScores > 0 ? (totalScore / validScores).toFixed(1) : '0.0';
    const weightedAvgGrade = totalCredits > 0 ? (totalWeightedScore / totalCredits).toFixed(1) : '0.0';
    const gpaAverage = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
    return {
      totalCourses,
      passedCourses,
      failedCourses,
      avgGrade,
      weightedAvgGrade,
      gpa: gpaAverage,
      totalCredits: parseFloat(totalCredits.toFixed(1)),
      earnedCredits: parseFloat(earnedCredits.toFixed(1))
    };
  },
  // 获取成绩等级样式类
  getGradeClass(score: number | string): string {
    // 处理各种可能的分数格式
    let numScore: number;
    
    if (typeof score === 'number') {
      numScore = score;
    } else if (typeof score === 'string') {
      // 提取字符串中的数字
      const match = score.match(/\d+\.?\d*/);
      if (match) {
        numScore = parseFloat(match[0]);
      } else {
        return 'unknown'; // 无法解析的分数
      }
    } else {
      return 'unknown';
    }
    
    console.log('分数等级计算:', { 原始分数: score, 解析分数: numScore });
    
    if (isNaN(numScore) || numScore <= 0) {
      return 'unknown';
    }
    
    if (numScore >= 90) {
      return 'excellent'; // 90-100分：优秀（绿色）
    } else if (numScore >= 80) {
      return 'good'; // 80-89分：良好（绿色）
    } else if (numScore >= 60) {
      return 'average'; // 60-79分：及格（黄色）
    } else {
      return 'poor'; // 60分以下：不及格（红色）
    }
  },
  // 刷新成绩
  refreshGrades() {
    // 清除缓存
    const cache = StorageService.get(StorageService.KEYS.GRADE_CACHE) || {};
    const key = `${this.data.currentYear}-${this.data.currentTerm}`;
    if (cache && typeof cache === 'object') {
      delete (cache as any)[key];
      StorageService.set(StorageService.KEYS.GRADE_CACHE, cache);
    }
    
    this.loadGrades();
  },
  // 显示成绩详情
  showGradeDetail(e: any) {
    const index = e.currentTarget.dataset.index;
    const grade = this.data.gradeList[index];
    // 普通模式下保持原有内容
    let content = `课程名称：${grade.courseName}`;
    if (grade.teacher) content += `\n任课教师：${grade.teacher}`;
    if (grade.className) content += `\n班级：${grade.className}`;
    if (grade.startCollege) content += `\n开课学院：${grade.startCollege}`;
    if (grade.gradeNature) content += `\n成绩性质：${grade.gradeNature}`;
    if (grade.mark) content += `\n课程标记：${grade.mark}`;
    if (grade.credit) content += `\n学分：${grade.credit}`;
    if (grade.gpa) content += `\n绩点：${grade.gpa}`;
    if (grade.courseType) content += `\n课程类型：${grade.courseType}`;
    wx.showModal({
      title: '课程详情',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },
  // 学年变更
  onYearChange(e: any) {
    const yearIndex = e.detail.value;
    if (yearIndex === this.data.yearRange.length - 1) {
      this.setData({
        yearIndex,
        currentYear: 0
      });
    } else {
      const yearStr = this.data.yearRange[yearIndex];
      const year = parseInt(yearStr.split('-')[0]);
      this.setData({
        yearIndex,
        currentYear: year
      });
    }
    StorageService.setCurrentTerm(this.data.currentYear != null ? this.data.currentYear : 0, this.data.currentTerm != null ? this.data.currentTerm : 0);
    this.loadGrades();
  },  // 学期变更
  onTermChange(e: any) {
    const termIndex = parseInt(e.detail.value);
    if (termIndex === 0) {
      this.setData({
        termIndex,
        currentTerm: 0
      });
    } else {
      this.setData({
        termIndex,
        currentTerm: termIndex
      });
    }
    StorageService.setCurrentTerm(this.data.currentYear != null ? this.data.currentYear : 0, this.data.currentTerm != null ? this.data.currentTerm : 0);
    this.loadGrades();
  },
  // 新增：展开/收起详细成绩方法
  toggleExpand(e: any) {
    const index = e.currentTarget.dataset.index;
    const gradeList = this.data.gradeList.slice();
    gradeList[index].expanded = !gradeList[index].expanded;
    this.setData({ gradeList });
  },
});
