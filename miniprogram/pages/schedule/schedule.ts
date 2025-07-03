import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';

interface ScheduleSettings {
  currentYear: number;
  currentTerm: number;
  weekStartDay: number; // 0=周日, 1=周一
  firstWeekDate: string; // 第一周开始日期 YYYY-MM-DD
  currentWeek: number; // 当前周次 1-20
  totalWeeks?: number; // 总周次 1-20（可选，用于设置页面）
}

interface Course {
  campus: string;
  class_name: string;
  course_id: string;
  credit: number;
  place: string;
  teacher: string;
  time: string;
  title: string;
  total_hours: number;
  weekday: number;
  weeks: string;
  // 以下是解析后的字段
  dayOfWeek?: number;
  startPeriod?: number;
  endPeriod?: number;
  weeksList?: number[];
  courseName?: string;
  location?: string;
}

interface TimeSlot {
  period: number;
  time: string;
}

interface DayHeader {
  name: string;
  date: string;
}

interface ScheduleApiResponse {
  courses: any[];
  count: number;
  name: string;
  sid: string;
  term: number;
  year: number;
}

Page({  data: {
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
    currentWeek: 1,
    scheduleData: [] as Course[],
    scheduleGrid: [] as any[][],
    mergedScheduleGrid: [] as any[][], // 合并连堂课后的课表网格
    maxPeriods: 11, // 实际课程的最大节次，用于自适应表格高度
    loading: false,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0,
    // 滑动手势相关
    touchStartX: 0,
    touchStartY: 0,
    dayHeaders: [
      { name: '周一', date: '' },
      { name: '周二', date: '' },
      { name: '周三', date: '' },
      { name: '周四', date: '' },
      { name: '周五', date: '' },
      { name: '周六', date: '' },
      { name: '周日', date: '' }
    ] as DayHeader[],
    timeSlots: [
      { period: 1, time: '08:00-08:45' },
      { period: 2, time: '08:55-09:40' },
      { period: 3, time: '10:00-10:45' },
      { period: 4, time: '10:55-11:40' },
      { period: 5, time: '14:00-14:45' },
      { period: 6, time: '14:55-15:40' },
      { period: 7, time: '16:00-16:45' },
      { period: 8, time: '16:55-17:40' },
      { period: 9, time: '19:00-19:45' },
      { period: 10, time: '19:55-20:40' },
      { period: 11, time: '20:50-21:35' }    ] as TimeSlot[],    // 课程详情弹窗相关
    showCourseDetailModal: false,
    courseDetail: null as Course | null,
    animationClass: ''
  },  onLoad() {
    console.log('课表页面加载');
    this.initData();
    this.loadFromCacheOrInit();
  },onShow() {
    console.log('课表页面显示，当前数据长度:', this.data.scheduleData.length);
    
    // 重新加载设置（在从设置页面返回时更新）
    const settings = this.loadScheduleSettings();
      // 检查设置是否有变化
    if (settings.currentYear !== this.data.currentYear || 
        settings.currentTerm !== this.data.currentTerm) {
      console.log('检测到设置变化，重新初始化');
      this.initData();
      this.loadFromCacheOrInit(); // 优先使用缓存
      return;
    }
    
    // 更新日期头部（可能周起始日有变化）
    this.updateDayHeaders(settings.weekStartDay);    // 自动计算当前周次（每次显示都重新计算）
    const totalWeeks = settings.totalWeeks || 20;
    const calculatedWeek = this.calculateCurrentWeek(settings.firstWeekDate, totalWeeks);
    if (calculatedWeek !== this.data.currentWeek) {
      console.log('自动更新周次:', this.data.currentWeek, '->', calculatedWeek);
      this.setData({ currentWeek: calculatedWeek }, () => {
        // 在 setData 完成后更新日期头部
        this.updateDayHeaders(settings.weekStartDay);
        this.updateScheduleGrid();
      });
    }    // 如果缓存中有课表数据且当前页面没有数据，则加载
    if (!this.data.scheduleData.length) {
      this.loadFromCacheOrInit();
    } else {
      // 检查缓存是否仍然有效
      const cachedData = StorageService.getCachedSchedule(this.data.currentYear, this.data.currentTerm);
      if (!cachedData || !Array.isArray(cachedData) || cachedData.length === 0) {
        console.log('检测到缓存已被清除，重新初始化课表数据');
        this.setData({ scheduleData: [] });
        this.loadFromCacheOrInit();
      }
    }
  },// 初始化数据
  initData() {
    // 从课表设置中读取配置
    const settings = this.loadScheduleSettings();
    
    console.log('课表设置:', settings);
    
    // 自动计算当前周次（不再依赖设置中的currentWeek）
    const totalWeeks = settings.totalWeeks || 20;
    const currentWeek = this.calculateCurrentWeek(settings.firstWeekDate, totalWeeks);
    
    console.log('初始化课表数据 - 学年:', settings.currentYear, '学期:', settings.currentTerm, '自动计算周次:', currentWeek);
    
    // 生成学年范围（当前学年的前后3年）
    const yearRange = [];
    for (let i = settings.currentYear - 3; i <= settings.currentYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);
    }

    console.log('生成的学年范围:', yearRange);      this.setData({
      currentYear: settings.currentYear,
      currentTerm: settings.currentTerm,
      currentWeek,
      yearRange,
      yearIndex: yearRange.findIndex(year => year === `${settings.currentYear}-${settings.currentYear + 1}`),
      termIndex: settings.currentTerm - 1
    }, () => {
      // 在 setData 完成后更新日期头部，确保 currentWeek 已经设置
      console.log('setData 完成，当前周次:', this.data.currentWeek);
      this.updateDayHeaders(settings.weekStartDay);
      this.updateScheduleGrid();
    });

    console.log('设置的数据 - 学年索引:', yearRange.findIndex(year => year === `${settings.currentYear}-${settings.currentYear + 1}`), '学期索引:', settings.currentTerm - 1, '自动计算周次:', currentWeek);

    // 设置当前学期到存储
    StorageService.setCurrentTerm(settings.currentYear, settings.currentTerm);
  },  // 更新日期头部
  updateDayHeaders(weekStartDay: number = 1) {
    const settings = this.loadScheduleSettings();
    const firstWeekDate = new Date(settings.firstWeekDate);
    const currentWeek = this.data.currentWeek;
    
    console.log('=== updateDayHeaders 开始 ===');
    console.log('当前周次:', currentWeek);
    console.log('第一周日期:', settings.firstWeekDate);
    console.log('周起始日:', weekStartDay === 0 ? '周日' : '周一');
    
    let dayHeaders;
    
    if (weekStartDay === 0) {
      // 周日开始
      dayHeaders = [
        { name: '周日', date: '' },
        { name: '周一', date: '' },
        { name: '周二', date: '' },
        { name: '周三', date: '' },
        { name: '周四', date: '' },
        { name: '周五', date: '' },
        { name: '周六', date: '' }
      ];
    } else {
      // 周一开始（默认）
      dayHeaders = [
        { name: '周一', date: '' },
        { name: '周二', date: '' },
        { name: '周三', date: '' },
        { name: '周四', date: '' },
        { name: '周五', date: '' },
        { name: '周六', date: '' },
        { name: '周日', date: '' }
      ];
    }
    
    // 计算当前周的第一天（基于设置的周起始日）
    let currentWeekFirstDay = new Date(firstWeekDate);
    
    // 调整到当前周
    currentWeekFirstDay.setDate(firstWeekDate.getDate() + (currentWeek - 1) * 7);
    
    // 调整到当前周的起始日
    if (weekStartDay === 0) {
      // 如果设置为周日开始，需要调整到周日
      const dayOfWeek = currentWeekFirstDay.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : -dayOfWeek;
      currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() + daysToSunday);
    } else {
      // 如果设置为周一开始，需要调整到周一
      const dayOfWeek = currentWeekFirstDay.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : (1 - dayOfWeek);
      currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() + daysToMonday);
    }
    
    // 计算每天的日期
    dayHeaders = dayHeaders.map((header, index) => {
      const date = new Date(currentWeekFirstDay);
      date.setDate(currentWeekFirstDay.getDate() + index);
      
      return {
        ...header,
        date: `${date.getMonth() + 1}/${date.getDate()}`
      };
    });

    console.log('更新日期头部 - 当前周:', currentWeek, '第一周日期:', settings.firstWeekDate, '周起始日:', weekStartDay === 0 ? '周日' : '周一', '计算的日期:', dayHeaders.map(h => h.date));
    this.setData({ dayHeaders });
  },

  // 从缓存加载课表
  loadFromCache() {
    const cachedData = StorageService.getCachedSchedule(this.data.currentYear, this.data.currentTerm);
    if (cachedData) {
      this.setData({
        scheduleData: Array.isArray(cachedData) ? cachedData : []
      });
    }
  },

  // 从缓存加载或初始化（优先缓存，无缓存时才网络请求）
  async loadFromCacheOrInit() {
    const cachedData = StorageService.getCachedSchedule(this.data.currentYear, this.data.currentTerm);
    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      console.log('使用缓存的课表数据，共', cachedData.length, '门课程');
      this.setData({
        scheduleData: cachedData
      });
      
      // 更新课表网格
      setTimeout(() => {
        this.updateScheduleGrid();
        this.showScheduleStats();
      }, 100);
    } else {
      console.log('缓存中无数据，从网络加载');
      await this.loadSchedule();
    }
  },

  // 加载课表
  async loadSchedule() {
    console.log('开始加载课表，当前参数:', {
      currentYear: this.data.currentYear,
      currentTerm: this.data.currentTerm,
      termIndex: this.data.termIndex
    });
    
    // 检查登录状态
    const apiParams = AuthUtils.getApiParamsWithTerm(this.data.currentYear, this.data.currentTerm);
    if (!apiParams) {
      return; // AuthUtils已经处理了未登录的情况
    }

    this.setData({ loading: true });

    try {
      const result = await ApiService.getSchedule(apiParams);
      
      if (result.code === 1000 && result.data && (result.data as any).courses) {
        // 解析课程数据
        const rawCourses = (result.data as ScheduleApiResponse).courses;
        const scheduleData = rawCourses.map((course: any) => this.parseCourseData(course));
        
        console.log('课表数据解析完成，共', scheduleData.length, '门课程');
        console.log('解析后的课程数据示例:', scheduleData[0]);
        
        this.setData({ scheduleData });
        
        // 更新课表网格
        setTimeout(() => {
          this.updateScheduleGrid();
          this.showScheduleStats();
        }, 100);
          // 缓存数据
        StorageService.cacheSchedule(this.data.currentYear, this.data.currentTerm, scheduleData);
        
        console.log(`课表加载成功，共${scheduleData.length}门课程`);
      } else {
        // 使用AuthUtils处理API错误
        AuthUtils.handleApiError(result.code, result.msg);
      }    } catch (error) {
      console.error('加载课表失败:', error);
      // 静默处理错误，不显示Toast提示
    } finally {
      // 确保在所有情况下都关闭loading状态
      this.setData({ loading: false });
    }
  },

  // 滑动手势开始
  onTouchStart(e: any) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  // 滑动手势结束
  onTouchEnd(e: any) {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - this.data.touchStartX;
    const minSwipeDistance = 50;
    if (Math.abs(deltaX) > minSwipeDistance) {
      const direction = deltaX > 0 ? -1 : 1; // 右滑上一周，左滑下一周
      const outClass = direction === 1 ? 'slide-out-left' : 'slide-out-right';
      const inClass = direction === 1 ? 'slide-in-left' : 'slide-in-right';
      this.setData({ animationClass: outClass });
      setTimeout(() => {
        const settings = this.loadScheduleSettings();
        const totalWeeks = settings.totalWeeks || 20;
        this.changeWeek(direction, totalWeeks);
        this.setData({ animationClass: inClass });
        setTimeout(() => {
          this.setData({ animationClass: '' });
        }, 250);
      }, 250);
    }
  },
  // 切换周次
  changeWeek(direction: number, totalWeeks: number) {
    const newWeek = this.data.currentWeek + direction;
    // 边界检查
    if (newWeek < 1 || newWeek > totalWeeks) {
      wx.showToast({
        title: newWeek < 1 ? '已是第一周' : '已是最后一周',
        icon: 'none',
        duration: 1000
      });
      return;
    }
    console.log('手动切换周次:', this.data.currentWeek, '->', newWeek);
    this.setData({ currentWeek: newWeek }, () => {
      // 在 setData 完成后更新日期头部和课表网格
      const settings = this.loadScheduleSettings();
      this.updateDayHeaders(settings.weekStartDay);
      this.updateScheduleGrid();
    });
  },

  // 解析课程数据
  parseCourseData(rawCourse: any): Course {
    // 解析时间，如 "1-2节" -> startPeriod: 1, endPeriod: 2
    const timeMatch = rawCourse.time.match(/(\d+)-(\d+)节/);
    const startPeriod = timeMatch ? parseInt(timeMatch[1]) : 1;
    const endPeriod = timeMatch ? parseInt(timeMatch[2]) : 1;

    // 解析周次，如 "2-16周(双)" -> [2,4,6,8,10,12,14,16]
    const weeksList = this.parseWeeks(rawCourse.weeks);

    return {
      ...rawCourse,
      // 兼容字段
      courseName: rawCourse.title,
      location: rawCourse.place,
      dayOfWeek: rawCourse.weekday,
      startPeriod,
      endPeriod,
      weeksList
    };
  },
  // 解析周次字符串
  parseWeeks(weeksStr: string): number[] {
    const weeks: number[] = [];
    
    try {
      console.log('解析周次字符串:', weeksStr);
      
      // 匹配格式：2-16周(双) 或 1-18周 或 5,7,9周
      const rangeMatch = weeksStr.match(/(\d+)-(\d+)周(\((单|双)\))?/);
      const listMatch = weeksStr.match(/^([\d,]+)周$/);
      
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        const type = rangeMatch[4]; // '单' 或 '双'
        
        console.log('范围匹配:', { start, end, type });
        
        for (let i = start; i <= end; i++) {
          if (!type) {
            weeks.push(i); // 每周
          } else if (type === '单' && i % 2 === 1) {
            weeks.push(i); // 单周
          } else if (type === '双' && i % 2 === 0) {
            weeks.push(i); // 双周
          }
        }
      } else if (listMatch) {
        // 格式：5,7,9周
        const weekNumbers = listMatch[1].split(',').map(n => parseInt(n.trim()));
        weeks.push(...weekNumbers);
        console.log('列表匹配:', weekNumbers);
      } else {
        console.warn('未识别的周次格式:', weeksStr);
        // 尝试提取所有数字
        const numbers = weeksStr.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          weeks.push(parseInt(numbers[0])); // 至少添加第一个数字
        } else {
          weeks.push(1); // 默认第1周
        }
      }
      
      console.log('解析结果:', weeks);
    } catch (error) {
      console.error('解析周次失败:', weeksStr, error);
      // 默认返回第1周
      weeks.push(1);
    }
    
    return weeks;
  },// 获取课程数据
  getCourseData(period: number, dayOfWeek: number): Course | null {
    const courses = this.data.scheduleData.filter(course => {
      const dayMatch = course.dayOfWeek === dayOfWeek;
      const periodMatch = course.startPeriod !== undefined && 
                         course.endPeriod !== undefined &&
                         course.startPeriod <= period && 
                         course.endPeriod >= period;
      const weekMatch = course.weeksList && 
                       course.weeksList.includes(this.data.currentWeek);
      
      // 添加调试信息（只对第一个课程显示，避免日志过多）
      if (course === this.data.scheduleData[0] && period === 1 && dayOfWeek === 1) {
        console.log('课程筛选调试 - 第一门课程:', {
          courseName: course.title,
          dayOfWeek: course.dayOfWeek,
          dayMatch,
          startPeriod: course.startPeriod,
          endPeriod: course.endPeriod,
          periodMatch,
          weeksList: course.weeksList,
          currentWeek: this.data.currentWeek,
          weekMatch
        });
      }
      
      return dayMatch && periodMatch && weekMatch;
    });

    return courses.length > 0 ? courses[0] : null;
  },  // 显示课程详情
  showCourseDetail(e: any) {
    const course = e.currentTarget.dataset.course;
    if (!course) return;

    // 设置课程详情数据，确保所有字段都有值
    const courseDetail = {
      ...course,
      title: course.title || course.courseName || '未知课程',
      teacher: course.teacher || '未知教师',
      place: course.place || course.location || '未知地点',
      time: course.time || '未知时间',
      weeks: course.weeks || '未知周次',
      credit: course.credit || '未知',
      total_hours: course.total_hours || '未知'
    };

    this.setData({
      courseDetail,
      showCourseDetailModal: true
    });
  },
  // 隐藏课程详情弹窗
  hideCourseDetail() {
    this.setData({
      showCourseDetailModal: false,
      courseDetail: null
    });
  },// 显示课程统计信息（用于调试）
  showScheduleStats() {
    // 先更新网格，再显示统计
    this.updateScheduleGrid();
    
    const stats = {
      totalCourses: this.data.scheduleData.length,
      currentWeek: this.data.currentWeek,
      maxPeriods: this.data.maxPeriods,
      coursesThisWeek: 0,
      dayDistribution: [0, 0, 0, 0, 0, 0, 0], // 周一到周日
      periodDistribution: {} as {[key: string]: number}
    };

    this.data.scheduleData.forEach(course => {
      if (course.weeksList && course.weeksList.includes(this.data.currentWeek)) {
        stats.coursesThisWeek++;
        if (course.dayOfWeek && course.dayOfWeek >= 1 && course.dayOfWeek <= 7) {
          stats.dayDistribution[course.dayOfWeek - 1]++;
        }
      }
      
      // 统计节次分布
      const timeKey = `${course.startPeriod}-${course.endPeriod}`;
      stats.periodDistribution[timeKey] = (stats.periodDistribution[timeKey] || 0) + 1;
    });

    console.log('课表统计信息:', stats);
    console.log('本周课程详情:', this.data.scheduleData.filter(course => 
      course.weeksList && course.weeksList.includes(this.data.currentWeek)
    ));
  },// 生成课表网格数据
  generateScheduleGrid() {
    const grid: any[][] = [];
    let totalCoursesInGrid = 0;
    
    // 计算实际需要显示的最大节次
    const maxPeriods = this.calculateMaxPeriods();
    
    // 初始化网格（动态节次数 × 7天）
    for (let period = 1; period <= maxPeriods; period++) {
      const row: any[] = [];
      for (let day = 1; day <= 7; day++) {
        const course = this.getCourseData(period, day);
        row.push(course);
        if (course) totalCoursesInGrid++;
      }
      grid.push(row);
    }
    
    console.log('生成课表网格完成:');
    console.log('- 网格大小:', grid.length, 'x', (grid[0] && grid[0].length) || 0);
    console.log('- 显示节次范围: 1 -', maxPeriods);
    console.log('- 网格中课程总数:', totalCoursesInGrid);
    console.log('- 第1行（第1节课）:', grid[0]);
    console.log('- 第1行第1列课程:', grid[0][0]);
    
    return grid;
  },  // 合并连堂课，生成适合显示的课表网格
  generateMergedScheduleGrid() {
    const grid = this.generateScheduleGrid();
    const mergedGrid: any[][] = [];
    const maxPeriods = grid.length; // 使用实际网格的长度
    
    // 初始化合并后的网格
    for (let period = 0; period < maxPeriods; period++) {
      const row: any[] = [];
      for (let day = 0; day < 7; day++) {
        row.push(null);
      }
      mergedGrid.push(row);
    }
    
    // 处理每一天的课程
    for (let day = 0; day < 7; day++) {
      const dayCourses: Array<{course: any, period: number}> = [];
      
      // 收集这一天的所有课程
      for (let period = 0; period < maxPeriods; period++) {
        const course = grid[period][day];
        if (course) {
          dayCourses.push({ course, period });
        }
      }
      
      // 按课程名称和时间分组，合并连堂课
      const groupedCourses = this.groupConsecutiveCourses(dayCourses);
      
      // 填充到合并后的网格中
      groupedCourses.forEach(group => {
        const firstPeriod = group.periods[0];
        const courseData = {
          ...group.course,
          periods: group.periods.length,
          isFirst: true,
          isMerged: group.periods.length > 1
        };
        
        // 设置第一个节次为课程数据
        mergedGrid[firstPeriod][day] = courseData;
        
        // 其他节次设置为占位（用于布局，但在WXML中不显示）
        for (let i = 1; i < group.periods.length; i++) {
          const period = group.periods[i];
          mergedGrid[period][day] = {
            ...group.course,
            isPlaceholder: true,
            isFirst: false,
            originalCourse: group.course // 保留原始课程信息以便调试
          };
        }
      });
    }
    
    console.log('合并连堂课完成:');
    console.log('- 原始网格:', grid);
    console.log('- 合并后网格:', mergedGrid);
    console.log('- 实际显示节次数:', maxPeriods);
    return mergedGrid;
  },
  // 将连续的相同课程分组
  groupConsecutiveCourses(dayCourses: Array<{course: any, period: number}>) {
    const groups: Array<{course: any, periods: number[]}> = [];
    
    // 按课程名称分组
    const courseMap = new Map<string, Array<{course: any, period: number}>>();
    
    dayCourses.forEach(item => {
      const key = `${item.course.title}_${item.course.teacher}_${item.course.place}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, []);
      }
      courseMap.get(key)!.push(item);
    });
    
    // 处理每个课程组，合并连续的节次
    courseMap.forEach((items) => {
      // 按节次排序
      items.sort((a, b) => a.period - b.period);
      
      let currentGroup: {course: any, periods: number[]} | null = null;
      
      items.forEach(item => {
        if (!currentGroup || item.period !== currentGroup.periods[currentGroup.periods.length - 1] + 1) {
          // 开始新的连续组
          if (currentGroup) {
            groups.push(currentGroup);
          }
          currentGroup = {
            course: item.course,
            periods: [item.period]
          };
        } else {
          // 添加到当前连续组
          currentGroup.periods.push(item.period);
        }
      });
      
      if (currentGroup) {
        groups.push(currentGroup);
      }
    });
    
    console.log('连堂课分组结果:', groups);
    return groups;
  },
  // 更新课表网格
  updateScheduleGrid() {
    const scheduleGrid = this.generateScheduleGrid();
    const mergedScheduleGrid = this.generateMergedScheduleGrid();
    const maxPeriods = scheduleGrid.length; // 获取实际显示的节次数
    
    this.setData({ 
      scheduleGrid,
      mergedScheduleGrid,
      maxPeriods
    });
    
    console.log('课表网格已更新，显示节次数:', maxPeriods);
  },

  // 计算实际课程的最大节次
  calculateMaxPeriods(): number {
    let maxPeriod = 0;
    
    this.data.scheduleData.forEach(course => {
      // 检查当前周是否有这门课
      if (course.weeksList && course.weeksList.includes(this.data.currentWeek)) {
        if (course.endPeriod && course.endPeriod > maxPeriod) {
          maxPeriod = course.endPeriod;
        }
      }
    });
    
    // 至少显示6节课（上午4节+下午2节），最多11节
    const finalMaxPeriod = Math.max(6, Math.min(maxPeriod, 11));
    
    console.log('计算最大节次:', {
      原始最大节次: maxPeriod,
      调整后最大节次: finalMaxPeriod,
      当前周次: this.data.currentWeek,
      总课程数: this.data.scheduleData.length
    });
    
    return finalMaxPeriod;
  },

  // 加载课表设置  // 加载课表设置
  loadScheduleSettings(): ScheduleSettings {
    try {
      const settings = StorageService.getScheduleSettings();
      if (settings) {
        return settings;
      }
    } catch (error) {
      console.error('加载课表设置失败:', error);
    }
    
    // 返回默认设置
    return this.getDefaultScheduleSettings();
  },
  // 获取默认课表设置
  getDefaultScheduleSettings(): ScheduleSettings {
    // 优先从存储中获取当前学期设置
    const storedTerm = StorageService.getCurrentTerm();
    let academicYear: number;
    let currentTerm: number;
    if (storedTerm) {
      academicYear = storedTerm.year;
      currentTerm = storedTerm.term;
      console.log('课表页面使用存储的学期设置:', academicYear, currentTerm);
    } else {
      // 否则计算当前学年学期
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      if (currentMonth >= 9 || (currentMonth <= 3 && currentDay <= 1)) {
        if (currentMonth >= 9) {
          academicYear = currentYear;
        } else {
          academicYear = currentYear - 1;
        }
        currentTerm = 1;
      } else {
        academicYear = currentYear - 1;
        currentTerm = 2;
      }
      console.log('课表页面计算学期:', academicYear, currentTerm);
    }
    // 计算默认的第一周日期
    let firstWeekDate: string;
    if (currentTerm === 1) {
      firstWeekDate = this.getFirstMondayOfSeptember(academicYear);
    } else {
      firstWeekDate = this.getThirdMondayOfFebruary(academicYear + 1);
    }
    // 默认总周数16周
    const totalWeeks = 16;
    // 计算当前周次
    const currentWeek = this.calculateCurrentWeek(firstWeekDate, totalWeeks);
    return {
      currentYear: academicYear,
      currentTerm,
      weekStartDay: 1, // 默认周一开始
      firstWeekDate,
      currentWeek,
      totalWeeks
    };
  },
  // 计算当前周次
  calculateCurrentWeek(firstWeekDate: string, totalWeeks: number = 20): number {
    try {
      const firstWeek = new Date(firstWeekDate);
      const today = new Date();
      
      // 计算天数差
      const diffTime = today.getTime() - firstWeek.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // 计算周次
      const calculatedWeek = Math.floor(diffDays / 7) + 1;
      
      // 如果在第一周之前，显示第一周
      if (calculatedWeek < 1) {
        return 1;
      }
      
      // 如果在最后一周之后，显示最后一周
      if (calculatedWeek > totalWeeks) {
        return totalWeeks;
      }
      
      return calculatedWeek;
    } catch (error) {
      console.error('计算当前周次失败:', error);
      return 1; // 默认第1周
    }
  },

  // 获取9月第一个周一
  getFirstMondayOfSeptember(year: number): string {
    const date = new Date(year, 8, 1); // 9月1日
    const dayOfWeek = date.getDay(); // 0=周日, 1=周一
    const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  },
  // 获取2月第三个周一
  getThirdMondayOfFebruary(year: number): string {
    const date = new Date(year, 1, 1); // 2月1日
    const dayOfWeek = date.getDay();
    const daysToFirstMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    date.setDate(date.getDate() + daysToFirstMonday + 14); // 第三个周一
    return date.toISOString().split('T')[0];
  },
});
