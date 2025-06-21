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
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
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
    isFromCache: false  // 是否来自缓存
  },
  onLoad() {
    this.initData();
    this.loadGrades();
  },
  onShow() {
    // 如果数据为空，重新加载
    if (this.data.gradeList.length === 0) {
      this.loadGrades();
    } else {
      // 检查缓存是否仍然有效
      const cachedData = StorageService.getCachedGrade(this.data.currentYear, this.data.currentTerm);
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
        this.loadGrades();
      }
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时强制从网络获取
    this.loadGrades(true).finally(() => {
      wx.stopPullDownRefresh();
    });
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

    const yearIndex = yearRange.findIndex(year => year === `${academicYear}-${academicYear + 1}`);

    this.setData({
      currentYear: academicYear,
      currentTerm,
      yearRange,
      yearIndex: yearIndex >= 0 ? yearIndex : Math.floor(yearRange.length / 2),
      termIndex: currentTerm - 1
    });
    
    console.log('成绩页面初始化完成:', {
      currentYear: this.data.currentYear,
      currentTerm: this.data.currentTerm,
      termIndex: this.data.termIndex,
      yearIndex: this.data.yearIndex
    });
  },// 加载成绩
  async loadGrades(forceRefresh: boolean = false) {
    console.log('开始加载成绩，当前参数:', {
      currentYear: this.data.currentYear,
      currentTerm: this.data.currentTerm,
      termIndex: this.data.termIndex,
      forceRefresh
    });
    
    // 检查登录状态
    const apiParams = AuthUtils.getApiParamsWithTerm(this.data.currentYear, this.data.currentTerm);
    if (!apiParams) {
      return; // AuthUtils已经处理了未登录的情况
    }

    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedGrade = StorageService.getCachedGrade(this.data.currentYear, this.data.currentTerm);
      if (cachedGrade) {
        console.log('从缓存加载成绩数据');
        const gradeList = Array.isArray(cachedGrade) ? cachedGrade : [];
        const gradeStats = this.calculateStats(gradeList);
        
        this.setData({
          gradeList,
          gradeStats,
          lastUpdateTime: `（${StorageService.formatUpdateTime(Date.now())}）`, // 需要从缓存时间戳获取
          isFromCache: true
        });
        
        // 显示缓存数据后，仍然尝试从网络更新（静默更新）
        this.loadGrades(true);
        return;
      }
    }

    this.setData({ loading: true });

    try {
      // 先尝试从缓存获取时间戳信息
      let gradeData = StorageService.getCachedGrade(this.data.currentYear, this.data.currentTerm);
      
      if (!gradeData || forceRefresh) {
        // 缓存中没有数据或强制刷新，从API获取
        const result = await ApiService.getGrade(apiParams);
        
        console.log('成绩API返回结果:', result);
        
        if (result.code === 1000 && result.data) {
          // 解析API返回的数据结构
          const responseData = result.data as any;
            console.log('成绩响应数据结构:', {
            hasData: !!responseData.data,
            hasCourses: !!(responseData.data && responseData.data.courses),
            coursesLength: (responseData.data && responseData.data.courses && responseData.data.courses.length) || 0,
            responseData
          });
          
          // 提取courses数组 - 支持多种数据结构
          let coursesData = [];
          if (responseData.data && responseData.data.courses && Array.isArray(responseData.data.courses)) {
            // 新格式: result.data.data.courses
            coursesData = responseData.data.courses;
            console.log('使用新格式: result.data.data.courses');
          } else if (responseData.courses && Array.isArray(responseData.courses)) {
            // 中间格式: result.data.courses
            coursesData = responseData.courses;
            console.log('使用中间格式: result.data.courses');
          } else if (Array.isArray(responseData)) {
            // 旧格式: result.data直接是数组
            coursesData = responseData;
            console.log('使用旧格式: result.data直接是数组');
          } else if (responseData.data && Array.isArray(responseData.data)) {
            // 另一种可能格式: result.data.data是数组
            coursesData = responseData.data;
            console.log('使用格式: result.data.data是数组');
          } else {
            console.warn('未能识别的成绩数据结构:', responseData);
          }
            console.log('解析出的成绩课程数据:', coursesData);
          
          if (!Array.isArray(coursesData) || coursesData.length === 0) {
            console.warn('成绩数据为空或格式错误');
            wx.showToast({
              title: '暂无成绩数据',
              icon: 'none'
            });
            return;
          }
            // 转换数据格式以适配界面
          gradeData = coursesData.map((course: any, index: number) => {
            console.log(`转换第${index + 1}门课程:`, course);
            
            // 尝试多种字段映射方式
            const converted = {
              courseName: course.title || course.courseName || course.name || course.course_name || '未知课程',
              teacher: course.teacher || course.teacher_name || course.instructor || '',
              credit: parseFloat(course.credit || course.credits || course.xf || '0') || 0,
              courseType: course.category || course.courseType || course.nature || course.type || course.course_type || '',
              totalScore: course.grade || course.totalScore || course.score || course.cj || '未出分',
              gpa: parseFloat(course.grade_point || course.gpa || course.jd || '0') || undefined,
              gradeNature: course.grade_nature || course.gradeNature || '',
              mark: course.mark || course.bz || '',
              startCollege: course.start_college || course.startCollege || course.college || '',
              courseId: course.course_id || course.courseId || course.id || '',
              className: course.class_name || course.className || course.class || '',
              // 预计算分数等级CSS类
              gradeClass: this.getGradeClass(course.grade || course.totalScore || course.score || course.cj || '未出分')
            };
            
            console.log(`转换后的课程${index + 1}:`, converted);
            return converted;
          });
            console.log('转换后的成绩数据:', gradeData);
          
          // 缓存数据
          StorageService.cacheGrade(this.data.currentYear, this.data.currentTerm, gradeData);
          
          // 更新显示数据
          const gradeList = Array.isArray(gradeData) ? gradeData : [];
          const gradeStats = this.calculateStats(gradeList);
          
          this.setData({
            gradeList,
            gradeStats,
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
              title: `加载成功，共${gradeList.length}门课程`,
              icon: 'success'
            });
          }
        } else {
          // 使用AuthUtils处理API错误
          AuthUtils.handleApiError(result.code, result.msg);
          return;
        }
      } else if (gradeData) {
        // 使用缓存数据
        const gradeList = Array.isArray(gradeData) ? gradeData : [];
        const gradeStats = this.calculateStats(gradeList);
        
        this.setData({
          gradeList,
          gradeStats,
          lastUpdateTime: '（从缓存加载）',
          isFromCache: true
        });
      }
    } catch (error) {
      console.error('加载成绩失败:', error);
      
      // 网络请求失败时，尝试加载缓存数据
      if (!this.data.isFromCache) {
        const cachedGrade = StorageService.getCachedGrade(this.data.currentYear, this.data.currentTerm);
        if (cachedGrade) {
          console.log('网络请求失败，显示缓存成绩数据');
          const gradeList = Array.isArray(cachedGrade) ? cachedGrade : [];
          const gradeStats = this.calculateStats(gradeList);
          
          this.setData({
            gradeList,
            gradeStats,
            lastUpdateTime: '（网络异常，显示缓存）',
            isFromCache: true
          });
          
          wx.showToast({
            title: '网络异常，显示缓存数据',
            icon: 'none'
          });
        } else {
          wx.showToast({
            title: '网络请求失败',
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
  // 计算成绩统计
  calculateStats(gradeList: Grade[]): GradeStats {
    const totalCourses = gradeList.length;
    let passedCourses = 0;
    let failedCourses = 0;
    let totalScore = 0;
    let validScores = 0;
    
    // 用于计算加权平均分和GPA
    let totalWeightedScore = 0; // 总的加权成绩（成绩×学分）
    let totalCredits = 0; // 总学分
    let totalGradePoints = 0; // 总学分绩点（绩点×学分）
    let earnedCredits = 0; // 已获得学分（及格课程的学分）

    gradeList.forEach(grade => {
      const score = parseFloat((grade.totalScore && grade.totalScore.toString()) || '0');
      const credit = parseFloat((grade.credit && grade.credit.toString()) || '0');
      const gpa = parseFloat((grade.gpa && grade.gpa.toString()) || '0');
      
      // 统计总学分
      if (credit > 0) {
        totalCredits += credit;
      }
      
      if (!isNaN(score) && score > 0) {
        // 普通平均分计算
        totalScore += score;
        validScores++;
        
        // 加权平均分计算（成绩×学分）
        if (credit > 0) {
          totalWeightedScore += score * credit;
        }
        
        // 及格判断
        if (score >= 60) {
          passedCourses++;
          if (credit > 0) {
            earnedCredits += credit;
          }
        } else {
          failedCourses++;
        }
      }
      
      // GPA计算（学分绩点×学分）
      if (!isNaN(gpa) && gpa > 0 && credit > 0) {
        totalGradePoints += gpa * credit;
      }
    });

    // 计算各种平均值
    const avgGrade = validScores > 0 ? (totalScore / validScores).toFixed(1) : '0.0';
    const weightedAvgGrade = totalCredits > 0 ? (totalWeightedScore / totalCredits).toFixed(1) : '0.0';
    const gpaAverage = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

    console.log('成绩统计计算:', {
      totalCourses,
      passedCourses,
      failedCourses,
      avgGrade,
      weightedAvgGrade,
      gpa: gpaAverage,
      totalCredits: totalCredits.toFixed(1),
      earnedCredits: earnedCredits.toFixed(1),
      计算详情: {
        totalScore,
        validScores,
        totalWeightedScore,
        totalGradePoints
      }
    });

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
    
    let content = `课程名称：${grade.courseName}
任课教师：${grade.teacher || '未知'}
课程学分：${grade.credit}
课程类型：${grade.courseType || '未知'}
总成绩：${grade.totalScore || '未出分'}`;
    
    // 添加绩点信息
    if (grade.gpa && grade.gpa > 0) {
      content += `\n学分绩点：${grade.gpa}`;
    }
    
    // 添加成绩性质
    if (grade.gradeNature) {
      content += `\n成绩性质：${grade.gradeNature}`;
    }
    
    // 添加开课学院
    if (grade.startCollege) {
      content += `\n开课学院：${grade.startCollege}`;
    }
    
    // 添加班级信息
    if (grade.className) {
      content += `\n班级：${grade.className}`;
    }
    
    // 添加课程标记
    if (grade.mark) {
      content += `\n课程标记：${grade.mark}`;
    }
    
    wx.showModal({
      title: '成绩详情',
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },// 学年变更
  onYearChange(e: any) {
    const yearIndex = e.detail.value;
    const yearStr = this.data.yearRange[yearIndex];
    const year = parseInt(yearStr.split('-')[0]);
    
    console.log('成绩页面学年变更:', yearStr, '→', year);
    
    this.setData({
      yearIndex,
      currentYear: year
    });
    
    // 保存到存储
    StorageService.setCurrentTerm(year, this.data.currentTerm);
    
    this.loadGrades();
  },  // 学期变更
  onTermChange(e: any) {
    const termIndex = parseInt(e.detail.value);
    const term = termIndex + 1;
    
    console.log('成绩页面学期变更事件:', {
      eventDetail: e.detail,
      parsedTermIndex: termIndex,
      oldTermIndex: this.data.termIndex,
      newTermIndex: termIndex,
      oldTerm: this.data.currentTerm,
      newTerm: term,
      termName: term === 1 ? '第一学期' : '第二学期'
    });
    
    // 确保数据类型正确
    this.setData({
      termIndex: termIndex,
      currentTerm: term
    }, () => {
      // 在setData完成后执行回调
      console.log('成绩页面学期变更后的数据:', {
        termIndex: this.data.termIndex,
        currentTerm: this.data.currentTerm
      });
      
      // 保存到存储
      StorageService.setCurrentTerm(this.data.currentYear, term);
      
      this.loadGrades();
    });
  }
});
