import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface Course {
  courseName: string;
  teacher?: string;
  credit: number;
  time?: string;
  location?: string;
  capacity?: number;
  selected?: number;
  courseId?: string;
  doId?: string;
  kklxdm?: string;
  // 新增字段支持教学班展示
  isExpanded?: boolean; // 是否展开显示教学班
  classes?: CourseClass[]; // 教学班列表
  classCount?: number; // 教学班数量
  [key: string]: any;
}

interface CourseClass {
  classId: string;
  doId: string;
  className: string;
  teacher: string;
  teacherId: string;
  capacity: number;
  selectedNumber: number;
  available: number;
  time: string;
  weeks: string;
  place: string;
  campus: string;
  optional: boolean;
  note: string;
  credit: number;
}

interface Block {
  id: string;
  name: string;
}

interface UserInfo {
  sid: string;
  [key: string]: any;
}

Page({  data: {
    currentTab: 0, // 0: 已选课程, 1: 可选课程
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
    currentBlock: '',
    selectedCourses: [] as Course[],
    availableCourses: [] as Course[],
    blockList: [] as Block[],
    loading: false,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0
  },
  onLoad() {
    this.initData();
    this.loadCurrentData();
  },  // 转换教学班数据
  convertClassesData(classesData: any[], course: Course): CourseClass[] {
    if (!Array.isArray(classesData)) {
      console.warn('教学班数据不是数组格式:', classesData);
      return [];
    }    return classesData.map((classItem: any, index: number) => {
      console.log(`转换教学班第${index + 1}个:`, classItem);
      
      // 计算剩余人数：容量 - 已选人数
      const capacity = parseInt(classItem.capacity) || 0;
      const selectedNumber = parseInt(classItem.selected_number || classItem.selectedNumber || classItem.enrolled) || 0;
      const available = Math.max(0, capacity - selectedNumber);
      
      const converted = {
        classId: classItem.class_id || classItem.classId || classItem.id || '',
        doId: classItem.do_id || classItem.doId || '',
        className: classItem.class_name || classItem.className || classItem.name || `教学班${index + 1}`,
        teacher: classItem.teacher || '',
        teacherId: classItem.teacher_id || classItem.teacherId || '',
        capacity: capacity,
        selectedNumber: selectedNumber,
        available: available,
        time: classItem.time || '',
        weeks: classItem.weeks || '',
        place: classItem.place || classItem.location || '',
        campus: classItem.campus || '',
        optional: classItem.optional !== false,
        note: classItem.note || '',
        credit: parseFloat(classItem.credit) || course.credit || 0
      };
      
      console.log(`转换后的教学班${index + 1}:`, {
        ...converted,
        计算过程: `${capacity} - ${selectedNumber} = ${available}`
      });
      return converted;
    });
  },
  // 更新课程的教学班数据
  updateCourseWithClasses(courseIndex: number, classes: CourseClass[]) {
    console.log(`更新课程${courseIndex}的教学班数据:`, classes);
    
    const updatedCourses = [...this.data.availableCourses];
    updatedCourses[courseIndex] = {
      ...updatedCourses[courseIndex],
      classes,
      isExpanded: true
    };
    
    this.setData({ availableCourses: updatedCourses });
    
    console.log(`课程${courseIndex}已展开，教学班数量: ${classes.length}`);
  },
  // 初始化数据
  initData() {
    // 优先从存储中获取当前学期设置
    const storedTerm = StorageService.getCurrentTerm();
    let academicYear: number;
    let currentTerm: number;
    
    if (storedTerm) {
      // 如果有存储的学期设置，使用它
      academicYear = storedTerm.year;
      currentTerm = storedTerm.term;
      console.log('课程页面使用存储的学期设置:', academicYear, currentTerm);
    } else {
      // 否则计算当前学年学期
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentDay = now.getDate();
      
      // 学年和学期判断逻辑（与成绩页面保持一致）
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
        console.log('课程页面计算学期:', academicYear, currentTerm);
    }
    
    // 生成学年范围（当前学年的前后3年）
    const yearRange = [];
    for (let i = academicYear - 3; i <= academicYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);    }

    const yearIndex = yearRange.findIndex(year => year === `${academicYear}-${academicYear + 1}`);

    this.setData({
      currentYear: academicYear,
      currentTerm: currentTerm,
      yearRange,
      yearIndex: yearIndex >= 0 ? yearIndex : Math.floor(yearRange.length / 2),
      termIndex: currentTerm - 1
    });
    
    console.log('课程页面设置后的数据:', {
      currentYear: this.data.currentYear,
      currentTerm: this.data.currentTerm,
      termIndex: this.data.termIndex,
      yearIndex: this.data.yearIndex
    });
  },

  // 切换选项卡
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });
    this.loadCurrentData();
  },

  // 加载当前数据
  loadCurrentData() {
    if (this.data.currentTab === 0) {
      this.loadSelectedCourses();
    } else {
      this.loadAvailableCourses();
    }
  },
  // 加载已选课程
  async loadSelectedCourses() {
    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {      const result = await ApiService.getSelectedCourses({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year: this.data.currentYear,
        term: this.data.currentTerm
      });

      console.log('已选课程API返回结果:', result);

      if (result.code === 1000 && result.data) {
        // 解析API返回的数据结构
        const responseData = result.data as any;
        
        console.log('已选课程响应数据结构:', {
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
          console.warn('未能识别的已选课程数据结构:', responseData);
        }
        
        console.log('解析出的已选课程数据:', coursesData);
        
        // 转换数据格式以适配界面
        const selectedCourses = coursesData.map((course: any, index: number) => {
          console.log(`转换已选课程第${index + 1}门:`, course);
          
          // 根据API响应结构映射字段
          const converted = {
            courseName: course.title || course.courseName || course.name || course.course_name || '未知课程',
            teacher: course.teacher || course.teacher_name || course.instructor || '',
            credit: parseFloat(course.credit || course.credits || '0') || 0,
            time: course.time || course.schedule || course.class_time || '--',
            location: course.place || course.location || course.classroom || '--',
            capacity: parseInt(course.capacity || '0') || 0,
            selected: parseInt(course.selected_number || course.selected || '0') || 0,
            courseId: course.course_id || course.courseId || course.id || '',
            doId: course.do_id || course.doId || '',
            kklxdm: course.kklxdm || '',
            category: course.category || course.courseType || '',
            classId: course.class_id || course.classId || '',
            teacherId: course.teacher_id || course.teacherId || '',
            optional: course.optional || 0,
            waiting: course.waiting || '0'
          };
          
          console.log(`转换后的已选课程${index + 1}:`, converted);
          return converted;
        });
        
        console.log('转换后的已选课程列表:', selectedCourses);
        
        this.setData({ selectedCourses });
        
        wx.showToast({
          title: `加载成功，共${selectedCourses.length}门课程`,
          icon: 'success'
        });
      } else {
        throw new Error(result.msg || '获取已选课程失败');
      }
    } catch (error) {
      console.error('加载已选课程失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }

    this.setData({ loading: false });
  },

  // 加载可选课程
  async loadAvailableCourses() {
    // 这里需要先加载板块列表，然后根据选择的板块加载课程
    // 由于API限制，这里简化处理
    this.setData({ 
      availableCourses: [],
      blockList: [
        { id: '1', name: '公共必修' },
        { id: '2', name: '专业必修' },
        { id: '3', name: '专业选修' },
        { id: '4', name: '公共选修' }
      ]
    });

    if (!this.data.currentBlock && this.data.blockList.length > 0) {
      this.setData({ currentBlock: this.data.blockList[0].id });
    }

    this.loadBlockCourses();
  },
  // 加载板块课程
  async loadBlockCourses() {
    if (!this.data.currentBlock) return;

    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) return;

    this.setData({ loading: true });

    try {      const result = await ApiService.getBlockCourses({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year: this.data.currentYear,
        term: this.data.currentTerm,
        block_id: parseInt(this.data.currentBlock)
      });

      console.log('板块课程API返回结果:', result);

      if (result.code === 1000 && result.data) {
        // 解析API返回的数据结构
        const responseData = result.data as any;
        
        console.log('板块课程响应数据结构:', {
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
          console.warn('未能识别的板块课程数据结构:', responseData);
        }
        
        console.log('解析出的板块课程数据:', coursesData);        // 转换数据格式以适配界面 - 先去重课程并统计教学班数量
        const courseMap = new Map();
        const courseClassCounts = new Map(); // 统计每个课程的教学班数量
        
        coursesData.forEach((course: any, index: number) => {
          console.log(`处理板块课程第${index + 1}门:`, course);
          
          const courseId = course.course_id || course.courseId || course.id || '';
          if (!courseId) return;
          
          // 统计教学班数量
          if (courseClassCounts.has(courseId)) {
            courseClassCounts.set(courseId, courseClassCounts.get(courseId) + 1);
          } else {
            courseClassCounts.set(courseId, 1);
          }
          
          // 如果课程已存在，跳过重复项（但已经统计了教学班数量）
          if (courseMap.has(courseId)) {
            console.log(`跳过重复课程: ${course.title || '未知课程'}，但已统计教学班数量`);
            return;
          }
          
          // 计算剩余人数：capacity - selected_number
          const capacity = parseInt(course.capacity || '0') || 0;
          const selectedNumber = parseInt(course.selected_number || course.selected || '0') || 0;
          const remainingSpots = Math.max(0, capacity - selectedNumber);
          
          // 根据API响应结构映射字段
          const converted = {
            courseName: course.title || course.courseName || course.name || course.course_name || '未知课程',
            teacher: '', // 不显示具体教师，因为会有多个教学班
            credit: parseFloat(course.credit || course.credits || '0') || 0,
            time: '', // 不显示具体时间，因为会有多个教学班
            location: '', // 不显示具体地点，因为会有多个教学班
            capacity: 0, // 不显示容量，因为会有多个教学班
            selected: 0, // 不显示已选人数，因为会有多个教学班
            available: remainingSpots, // 显示剩余名额
            courseId: courseId,
            doId: course.do_id || course.doId || '',
            kklxdm: course.kklxdm || '',
            category: course.category || course.courseType || '',
            classId: course.class_id || course.classId || '',
            teacherId: course.teacher_id || course.teacherId || '',
            optional: course.optional !== false, // 默认可选
            waiting: course.waiting || '0',
            isExpanded: false, // 默认不展开
            classes: [], // 教学班列表，稍后异步加载
            classCount: 0 // 教学班数量，稍后更新
          };
          
          courseMap.set(courseId, converted);
          console.log(`添加课程: ${converted.courseName} (${courseId})，剩余: ${remainingSpots}`);
        });
        
        // 更新每个课程的教学班数量
        const availableCourses = Array.from(courseMap.values()).map(course => ({
          ...course,
          classCount: courseClassCounts.get(course.courseId) || 0
        }));
        
        console.log('去重后的板块课程列表:', availableCourses);
        console.log('教学班数量统计:', Object.fromEntries(courseClassCounts));
        
        this.setData({ availableCourses });
      } else {
        this.setData({ availableCourses: [] });
        wx.showToast({
          title: result.msg || '暂无可选课程',
          icon: 'none'
        });
      }    } catch (error) {
      console.error('加载板块课程失败:', error);
      this.setData({ availableCourses: [] });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  // 展开/收起课程教学班
  async toggleCourseExpansion(e: any) {
    const index = e.currentTarget.dataset.index;
    const course = this.data.availableCourses[index];
    
    if (!course.courseId) {
      wx.showToast({
        title: '课程ID无效',
        icon: 'none'
      });
      return;
    }
    
    // 如果已展开，则收起
    if (course.isExpanded) {
      const updatedCourses = [...this.data.availableCourses];
      updatedCourses[index].isExpanded = false;
      this.setData({ availableCourses: updatedCourses });
      return;
    }
    
    // 如果未展开，先检查是否已加载教学班
    if (!course.classes || course.classes.length === 0) {
      // 加载教学班信息
      await this.loadCourseClasses(index);
    } else {
      // 直接展开
      const updatedCourses = [...this.data.availableCourses];
      updatedCourses[index].isExpanded = true;
      this.setData({ availableCourses: updatedCourses });
    }
  },
  // 加载课程教学班
  async loadCourseClasses(courseIndex: number) {
    const course = this.data.availableCourses[courseIndex];
    const loginInfo = StorageService.getLoginInfo();
    
    if (!loginInfo || !course.courseId) {
      wx.showToast({
        title: '参数无效',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '加载教学班...' });

    try {      const result = await ApiService.getCourseClasses({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        course_id: course.courseId,
        year: this.data.currentYear,
        term: this.data.currentTerm
      });console.log('教学班API返回结果:', result);      // 处理正常响应（code: 1000）
      if (result.code === 1000 && result.data) {
        const responseData = result.data as any;
        
        console.log('教学班响应数据结构分析:', {
          hasData: !!responseData.data,
          hasClasses: !!(responseData.classes),
          hasDataClasses: !!(responseData.data && responseData.data.classes),
          responseStructure: Object.keys(responseData),
          responseData
        });
        
        // 支持多种数据结构格式
        let classesData = null;
        if (responseData.data && responseData.data.classes && Array.isArray(responseData.data.classes)) {
          // 新格式: result.data.data.classes
          classesData = responseData.data.classes;
          console.log('使用新格式: result.data.data.classes');
        } else if (responseData.classes && Array.isArray(responseData.classes)) {
          // 中间格式: result.data.classes
          classesData = responseData.classes;
          console.log('使用中间格式: result.data.classes');
        } else if (Array.isArray(responseData)) {
          // 旧格式: result.data直接是数组
          classesData = responseData;
          console.log('使用旧格式: result.data直接是数组');
        }
        
        if (classesData && Array.isArray(classesData) && classesData.length > 0) {
          console.log('解析出的教学班数据:', classesData);
          const classes = this.convertClassesData(classesData, course);
          this.updateCourseWithClasses(courseIndex, classes);
          
          wx.showToast({
            title: `加载成功，共${classes.length}个教学班`,
            icon: 'success'
          });
          return;
        } else {
          wx.showToast({
            title: '暂无教学班信息',
            icon: 'none'
          });
        }
      }      // 处理API返回数据类型错误的情况（code: 2333）
      else if (result.code === 2333 && (result as any).debug_info && (result as any).debug_info.response) {
        console.log('检测到数据类型错误，尝试解析debug_info.response');
        
        try {
          // 解析debug_info.response中的JSON字符串
          const debugResponse = (result as any).debug_info.response;
          let classesData = null;
          
          if (typeof debugResponse === 'string') {
            // 如果是字符串，尝试解析JSON
            classesData = JSON.parse(debugResponse);
            console.log('解析debug_info.response字符串成功:', classesData);
          } else if (Array.isArray(debugResponse)) {
            // 如果已经是数组，直接使用
            classesData = debugResponse;
            console.log('debug_info.response已经是数组:', classesData);
          }
          
          if (Array.isArray(classesData) && classesData.length > 0) {
            console.log('从debug_info中解析出教学班数据:', classesData);
            const classes = this.convertClassesData(classesData, course);
            this.updateCourseWithClasses(courseIndex, classes);
            return;
          } else {
            console.log('debug_info中无有效教学班数据');
          }
        } catch (parseError) {
          console.error('解析debug_info.response失败:', parseError);
        }
        
        wx.showToast({
          title: '教学班数据格式异常',
          icon: 'none'
        });
      } 
      else {
        wx.showToast({
          title: result.msg || '暂无教学班信息',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载教学班失败:', error);
      wx.showToast({
        title: '加载教学班失败',
        icon: 'none'
      });
    }

    wx.hideLoading();
  },
  // 选择教学班
  async selectCourseClass(e: any) {
    const { courseIndex, classIndex } = e.currentTarget.dataset;
    const course = this.data.availableCourses[courseIndex];
    
    if (!course.classes || course.classes.length === 0) {
      wx.showToast({
        title: '教学班信息无效',
        icon: 'none'
      });
      return;
    }
    
    const courseClass = course.classes[classIndex];
    const loginInfo = StorageService.getLoginInfo();
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
    
    if (!loginInfo || !userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!courseClass.optional) {
      wx.showToast({
        title: '该教学班不可选',
        icon: 'none'
      });
      return;
    }

    if (courseClass.available <= 0) {
      wx.showToast({
        title: '该教学班已满',
        icon: 'none'
      });
      return;
    }

    if (!course.courseId) {
      wx.showToast({
        title: '课程ID无效',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '选课中...' });

    try {      const result = await ApiService.selectCourse({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        sid: userInfo.sid,
        course_id: course.courseId,
        do_id: courseClass.doId,
        kklxdm: course.kklxdm || '',
        year: this.data.currentYear,
        term: this.data.currentTerm
      });

      if (result.code === 1000) {
        wx.showToast({
          title: '选课成功',
          icon: 'success'
        });
        
        // 刷新数据
        this.loadCurrentData();
      } else {
        throw new Error(result.msg || '选课失败');
      }
    } catch (error) {
      console.error('选课失败:', error);
      wx.showToast({
        title: '选课失败',
        icon: 'none'
      });
    }

    wx.hideLoading();
  },
  // 选择板块
  selectBlock(e: any) {
    const blockId = e.currentTarget.dataset.block;
    this.setData({ currentBlock: blockId });
    this.loadBlockCourses();
  },

  // 阻止选课按钮事件冒泡
  onSelectCourseTap(e: any) {
    // 阻止事件冒泡，防止触发课程展开
    e.stopPropagation();
  },

  // 选课
  async selectCourse(e: any) {
    const course = e.currentTarget.dataset.course;
    const loginInfo = StorageService.getLoginInfo();
    const userInfo = StorageService.get<UserInfo>(StorageService.KEYS.USER_INFO);
    
    if (!loginInfo || !userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '选课中...' });

    try {      const result = await ApiService.selectCourse({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        sid: userInfo.sid,
        course_id: course.courseId,
        do_id: course.doId,
        kklxdm: course.kklxdm || '', // 使用课程对象中的kklxdm字段
        year: this.data.currentYear,
        term: this.data.currentTerm
      });

      if (result.code === 1000) {
        wx.showToast({
          title: '选课成功',
          icon: 'success'
        });
        
        // 刷新数据
        this.loadCurrentData();
      } else {
        throw new Error(result.msg || '选课失败');
      }
    } catch (error) {
      console.error('选课失败:', error);
      wx.showToast({
        title: '选课失败',
        icon: 'none'
      });
    }

    wx.hideLoading();
  },

  // 退课
  async dropCourse(e: any) {
    const course = e.currentTarget.dataset.course;
    const loginInfo = StorageService.getLoginInfo();
    
    if (!loginInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 确认退课
    const res = await new Promise<{ confirm: boolean }>((resolve) => {
      wx.showModal({
        title: '确认退课',
        content: `确定要退选"${course.courseName}"吗？`,
        success: resolve
      });
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '退课中...' });

    try {      const result = await ApiService.dropCourse({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        do_id: course.doId,
        course_id: course.courseId,
        year: this.data.currentYear,
        term: this.data.currentTerm
      });

      if (result.code === 1000) {
        wx.showToast({
          title: '退课成功',
          icon: 'success'
        });
        
        // 刷新数据
        this.loadCurrentData();
      } else {
        throw new Error(result.msg || '退课失败');
      }
    } catch (error) {
      console.error('退课失败:', error);
      wx.showToast({
        title: '退课失败',
        icon: 'none'
      });
    }

    wx.hideLoading();
  },

  // 获取当前列表
  getCurrentList(): Course[] {
    return this.data.currentTab === 0 ? this.data.selectedCourses : this.data.availableCourses;
  },

  // 刷新课程
  refreshCourses() {
    this.loadCurrentData();
  },  // 学年学期选择相关方法
  onYearChange(e: any) {
    const yearIndex = e.detail.value;
    const yearStr = this.data.yearRange[yearIndex];
    const year = parseInt(yearStr.split('-')[0]);
    
    console.log('课程页面学年变更:', yearStr, '→', year);
    
    this.setData({
      yearIndex,
      currentYear: year
    });
    
    // 保存到存储
    StorageService.setCurrentTerm(year, this.data.currentTerm);
    
    this.loadCurrentData();
  },

  onTermChange(e: any) {
    const termIndex = parseInt(e.detail.value);
    const term = termIndex + 1;
    
    console.log('课程页面学期变更事件:', {
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
    });
    
    // 保存到存储
    StorageService.setCurrentTerm(this.data.currentYear, term);
    
    this.loadCurrentData();
  }
});
