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
    isFromCache: false,  // 是否来自缓存
    gradeApiType: 'normal', // normal/detail
  },
  onLoad() {
    this.initData();
    // 读取成绩接口类型
    let gradeApiType = StorageService.get('gradeApiType');
    if (typeof gradeApiType !== 'string') gradeApiType = 'normal';
    this.setData({ gradeApiType });
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
    const refreshPromise = this.loadGrades(true);
    if (refreshPromise && typeof refreshPromise.finally === 'function') {
      refreshPromise.finally(() => {
        wx.stopPullDownRefresh();
      });
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
    const gradeApiType = this.data.gradeApiType || StorageService.get('gradeApiType') || 'normal';
    // 检查登录状态
    const apiParams = AuthUtils.getApiParamsWithTerm(this.data.currentYear, this.data.currentTerm);
    if (!apiParams) {
      return;
    }
    if (gradeApiType === 'detail') {
      // 详细成绩接口缓存key分开
      if (!forceRefresh) {
        const cached = StorageService.getCachedGradeDetail(this.data.currentYear, this.data.currentTerm);
        if (cached) {
          this.setData({
            gradeList: cached,
            gradeStats: this.calculateStats(cached),
            lastUpdateTime: '（从缓存加载）',
            isFromCache: true
          });
          this.loadGrades(true);
          return;
        }
      }
      this.setData({ loading: true });
      try {
        const result = await ApiService.getGradeDetail(apiParams);
        // 兼容API响应结构，正确获取items
        let items: any[] = [];
        if (result && result.data) {
          if (Array.isArray(result.data.items)) {
            items = result.data.items;
          } else if (result.data.data && Array.isArray(result.data.data.items)) {
            items = result.data.data.items;
          }
        }
        if (result.code === 1000 && items.length > 0) {
          // 合并同一课程的所有成绩项
          const courseMap: { [kch_id: string]: Grade } = {};
          items.forEach((item: any) => {
            const kch_id = item.kch_id || item.kch || item.courseId || item.kcmc;
            if (!courseMap[kch_id]) {
              courseMap[kch_id] = {
                courseName: item.kcmc,
                courseId: item.kch_id || item.kch,
                credit: parseFloat(item.xf || '0'),
                className: item.jxbmc,
                startCollege: item.kkbmmc,
                detailItems: [],
                totalScore: '',
                gpa: undefined,
                gradeNature: '',
                mark: '',
                expanded: false,
              };
            }
            // 分类成绩，全部push，解析权重
            let weight = '';
            if (item.xmblmc) {
              const match = item.xmblmc.match(/\(([^)]*)\)/);
              if (match) weight = match[1];
            }
            courseMap[kch_id].detailItems!.push({ xmblmc: item.xmblmc, xmcj: item.xmcj, weight });
            // 识别总评成绩
            if (
              item.xmblmc &&
              (item.xmblmc.includes('总评') ||
                item.xmblmc.includes('总成绩') ||
                item.xmblmc === '总评成绩' ||
                item.xmblmc === '总评')
            ) {
              courseMap[kch_id].totalScore = item.xmcj;
            }
          });
          // 组装gradeList，主卡片显示总评，平时/期中/期末等直接在主卡片下方展示
          const gradeList = Object.values(courseMap).map(course => {
            // 控制台输出格式化后的课程明细
            const logDetail = course.detailItems.map(d => `${d.xmblmc}: ${d.xmcj}${d.weight ? `（${d.weight}）` : ''}`).join('，');
            console.log(`课程：${course.courseName}，明细：${logDetail}`);
            return { ...course, gradeClass: this.getGradeClass(course.totalScore) };
          });
          StorageService.cacheGradeDetail(this.data.currentYear, this.data.currentTerm, gradeList);
          this.setData({
            gradeList,
            gradeStats: this.calculateStats(gradeList),
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
      return;
    } else {
      // 普通成绩接口缓存key分开
      if (!forceRefresh) {
        const cachedGrade = StorageService.getCachedGrade(this.data.currentYear, this.data.currentTerm);
        if (cachedGrade) {
          const gradeList = Array.isArray(cachedGrade) ? cachedGrade : [];
          const gradeStats = this.calculateStats(gradeList);
          this.setData({
            gradeList,
            gradeStats,
            lastUpdateTime: `（${StorageService.formatUpdateTime(Date.now())}）`,
            isFromCache: true
          });
          this.loadGrades(true);
          return;
        }
      }
      this.setData({ loading: true });
      try {
        const result = await ApiService.getGrade(apiParams);
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
          const gradeData = coursesData.map((course: any, index: number) => {
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
              gradeClass: this.getGradeClass(course.grade || course.totalScore || course.score || course.cj || '未出分'),
              expanded: false,
            };
            return converted;
          });
          StorageService.cacheGrade(this.data.currentYear, this.data.currentTerm, gradeData);
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
      return;
    }
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
      // 详细模式下优先用总评分数和学分计算GPA
      let score = 0;
      if (grade.totalScore && !isNaN(Number(grade.totalScore))) {
        score = parseFloat(grade.totalScore.toString());
      }
      const credit = parseFloat((grade.credit && grade.credit.toString()) || '0');
      // GPA算法：常见4分制
      let gpa = 0;
      if (!isNaN(score)) {
        if (score >= 90) gpa = 4.0;
        else if (score >= 85) gpa = 3.7;
        else if (score >= 82) gpa = 3.3;
        else if (score >= 78) gpa = 3.0;
        else if (score >= 75) gpa = 2.7;
        else if (score >= 72) gpa = 2.3;
        else if (score >= 68) gpa = 2.0;
        else if (score >= 66) gpa = 1.7;
        else if (score >= 64) gpa = 1.5;
        else if (score >= 60) gpa = 1.0;
        else gpa = 0;
      }
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
    // 详细模式下展示所有明细项（包括实验成绩等所有项目）
    if (this.data.gradeApiType === 'detail' && Array.isArray(grade.detailItems)) {
      const detailList = grade.detailItems;
      let content = '';
      if (detailList.length === 0) {
        content = '暂无详细成绩';
      } else {
        content = detailList.map(item => `${item.xmblmc}：${item.xmcj}`).join('\n');
      }
      wx.showModal({
        title: '成绩明细',
        content,
        showCancel: false,
        confirmText: '确定'
      });
      return;
    }
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
  },
  // 切换成绩接口类型（供成绩页切换用）
  onGradeApiTypeChange(e: any) {
    const value = e.currentTarget.dataset.value;
    this.setData({ gradeApiType: value });
    StorageService.set('gradeApiType', value);
    wx.showToast({ title: '已切换', icon: 'success' });
    this.loadGrades(true);
  },
  // 新增：展开/收起详细成绩方法
  toggleExpand(e: any) {
    const index = e.currentTarget.dataset.index;
    const gradeList = this.data.gradeList.slice();
    gradeList[index].expanded = !gradeList[index].expanded;
    this.setData({ gradeList });
  },
});
