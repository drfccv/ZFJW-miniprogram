import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface Classroom {
  roomNumber: string;
  building: string;
  capacity: number;
  type: string;
  [key: string]: any;
}

interface GroupedClassroom {
  building: string;
  rooms: Classroom[];
}

interface Campus {
  campus_id: string;
  campus_name: string;
  is_default?: boolean;
}

interface Building {
  building_code: string;
  building_name: string;
  campus_id: string;
}

interface TimeSlot {
  period: string;
  time: string;
  slot_number: number;
  total_slots: number;
}

Page({
  data: {
    // 基础信息
    yearOptions: [2023, 2024, 2025, 2026, 2027],
    termOptions: [1, 2],
    year: 2025,
    term: 2,
    
    // 选择器数据
    campusList: [] as Campus[],
    campusIndex: 0,
    buildingList: [] as Building[],
    buildingNames: [] as string[],
    buildingIndex: 0,
    
    // 周次选项（可多选）
    weekOptions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
    selectedWeeks: [] as number[],
    
    // 星期选项（可多选）
    dayOptions: [
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' },
      { value: 7, label: '周日' }
    ],
    selectedDays: [] as number[],
    
    // 节次选项（可多选，从接口获取）
    timeSlots: [] as TimeSlot[],
    selectedTimeSlots: [] as number[],
    
    // 结果数据
    classrooms: [] as Classroom[],
    groupedClassrooms: [] as GroupedClassroom[],
    loading: false,
    hasQueried: false,
    
    // 折叠状态（key为building名称）
    collapsedBuildings: {} as { [key: string]: boolean },
    
    // 选中的教室详情
    selectedClassroom: null as Classroom | null,
    showClassroomDetail: false
  },

  async onLoad() {
    await this.loadSchoolYearTerm();
    await this.loadCampusList();
  },

  // 加载学年学期
  async loadSchoolYearTerm() {
    const scheduleSettings = StorageService.getScheduleSettings();
    if (scheduleSettings && scheduleSettings.year && scheduleSettings.term) {
      this.setData({
        year: scheduleSettings.year,
        term: scheduleSettings.term
      });
    }
  },

  // 加载校区列表
  async loadCampusList() {
    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) return;

    try {
      const result = await ApiService.getCampusList({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName
      });

      if (result.code === 1000 && result.data && (result.data as any).campuses) {
        const campusList = (result.data as any).campuses;
        const defaultIndex = campusList.findIndex((c: Campus) => c.is_default) || 0;
        
        this.setData({ 
          campusList,
          campusIndex: defaultIndex
        });

        // 加载教学楼列表
        await this.loadBuildingList();
      }
    } catch (error) {
      console.error('加载校区列表失败:', error);
    }
  },

  // 加载教学楼列表
  async loadBuildingList() {
    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) return;

    const { campusList, campusIndex, year, term } = this.data;
    const campusId = campusList[campusIndex] ? campusList[campusIndex].campus_id : '1';

    try {
      const result = await ApiService.getBuildingList({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year,
        term,
        campus_id: campusId
      });

      if (result.code === 1000 && result.data) {
        const buildingList = (result.data as any).buildings || [];
        const buildingNames = ['全部', ...buildingList.map((b: Building) => b.building_name)];
        
        this.setData({ 
          buildingList,
          buildingNames,
          timeSlots: (result.data as any).time_slots || []
        });
      }
    } catch (error) {
      console.error('加载教学楼列表失败:', error);
    }
  },

  // 学年变化
  onYearChange(e: any) {
    const index = parseInt(e.detail.value);
    const year = this.data.yearOptions[index];
    this.setData({ year });
    this.loadBuildingList();
  },

  // 学期变化
  onTermChange(e: any) {
    const index = parseInt(e.detail.value);
    const term = this.data.termOptions[index];
    this.setData({ term });
    this.loadBuildingList();
  },

  // 校区变化
  onCampusChange(e: any) {
    const index = parseInt(e.detail.value);
    this.setData({ campusIndex: index });
    this.loadBuildingList();
  },

  // 教学楼变化
  onBuildingChange(e: any) {
    const index = parseInt(e.detail.value);
    this.setData({ buildingIndex: index });
  },

  // 切换周次选择
  toggleWeek(e: any) {
    const week = parseInt(e.currentTarget.dataset.week);
    const selectedWeeks = [...this.data.selectedWeeks];
    const index = selectedWeeks.indexOf(week);
    
    if (index > -1) {
      selectedWeeks.splice(index, 1);
    } else {
      selectedWeeks.push(week);
    }
    
    selectedWeeks.sort((a, b) => a - b);
    this.setData({ selectedWeeks });
  },

  // 切换星期选择
  toggleDay(e: any) {
    const day = parseInt(e.currentTarget.dataset.day);
    const selectedDays = [...this.data.selectedDays];
    const index = selectedDays.indexOf(day);
    
    if (index > -1) {
      selectedDays.splice(index, 1);
    } else {
      selectedDays.push(day);
    }
    
    selectedDays.sort((a, b) => a - b);
    this.setData({ selectedDays });
  },

  // 切换节次选择
  toggleTimeSlot(e: any) {
    const slotNumber = parseInt(e.currentTarget.dataset.slot);
    const selectedTimeSlots = [...this.data.selectedTimeSlots];
    const index = selectedTimeSlots.indexOf(slotNumber);
    
    if (index > -1) {
      selectedTimeSlots.splice(index, 1);
    } else {
      selectedTimeSlots.push(slotNumber);
    }
    
    selectedTimeSlots.sort((a, b) => a - b);
    this.setData({ selectedTimeSlots });
  },

  // 查询空教室
  async queryClassrooms() {
    const loginInfo = StorageService.getLoginInfo();
    if (!loginInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const { selectedTimeSlots, selectedWeeks, selectedDays, year, term, campusList, campusIndex, buildingList, buildingIndex } = this.data;

    // 验证必选项
    if (selectedWeeks.length === 0) {
      wx.showToast({
        title: '请选择周次',
        icon: 'none'
      });
      return;
    }

    if (selectedDays.length === 0) {
      wx.showToast({
        title: '请选择星期',
        icon: 'none'
      });
      return;
    }

    if (selectedTimeSlots.length === 0) {
      wx.showToast({
        title: '请选择节次',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 构建参数
      const weeks = selectedWeeks.length === 1 ? selectedWeeks[0] : selectedWeeks.join(',');
      const dayOfWeeks = selectedDays.length === 1 ? selectedDays[0] : selectedDays.join(',');
      const timeSlotStr = selectedTimeSlots.length === 1 
        ? selectedTimeSlots[0].toString()
        : `${selectedTimeSlots[0]}-${selectedTimeSlots[selectedTimeSlots.length - 1]}`;

      const campusId = campusList[campusIndex] ? campusList[campusIndex].campus_id : '1';
      const building = buildingIndex > 0 && buildingList[buildingIndex - 1] ? buildingList[buildingIndex - 1].building_name : undefined;

      const result = await ApiService.getEmptyClassroom({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year,
        term,
        weeks,
        day_of_weeks: dayOfWeeks,
        time_slots: timeSlotStr,
        campus_id: campusId,
        building
      });

      if (result.code === 1000 && result.data) {
        let classrooms: Classroom[] = [];
        
        // 处理返回的数据 - 适配新的API结构
        if ((result.data as any).classrooms && Array.isArray((result.data as any).classrooms)) {
          // 创建 building_code 到 building_name 的映射
          const buildingMap: { [key: string]: string } = {};
          this.data.buildingList.forEach(b => {
            buildingMap[b.building_code] = b.building_name;
          });
          
          classrooms = (result.data as any).classrooms.map((item: any) => {
            // 通过 building_code 查找对应的 building_name
            const buildingName = buildingMap[item.building_code] || item.building_code || '未知楼栋';
            
            return {
              roomNumber: item.name || '未知',
              building: buildingName,
              capacity: item.capacity || 0,
              type: item.type || '普通教室',
              campus: item.campus || '未知校区',
              code: item.code || '',
              examCapacity: item.exam_capacity || 0,
              buildingCode: item.building_code || '',
              department: item.department || ''
            };
          });
        } else if (Array.isArray(result.data)) {
          // 兼容旧的数据结构
          classrooms = result.data.map((item: any) => ({
            roomNumber: item.roomNumber || item.room_number || item.jasmc || '未知',
            building: item.building || item.building_name || item.jxlmc || '未知楼栋',
            capacity: item.capacity || item.zws || 0,
            type: item.type || item.room_type || item.cdlx || '普通教室',
            ...item
          }));
        }

        // 按楼栋分组
        const grouped = this.groupClassroomsByBuilding(classrooms);
        
        this.setData({ 
          classrooms,
          groupedClassrooms: grouped,
          hasQueried: true
        });

        if (classrooms.length === 0) {
          wx.showToast({
            title: '该时间段暂无空教室',
            icon: 'none'
          });
        } else {
          wx.showToast({
            title: `找到${classrooms.length}间空教室`,
            icon: 'success'
          });
        }
      } else {
        throw new Error(result.msg || '查询失败');
      }
    } catch (error) {
      console.error('查询空教室失败:', error);
      wx.showToast({
        title: error instanceof Error ? error.message : '查询失败',
        icon: 'none'
      });
      
      this.setData({ 
        classrooms: [],
        groupedClassrooms: [],
        hasQueried: true
      });
    }

    this.setData({ loading: false });
  },

  // 切换楼栋折叠状态
  toggleBuilding(e: any) {
    const building = e.currentTarget.dataset.building;
    const collapsedBuildings = { ...this.data.collapsedBuildings };
    collapsedBuildings[building] = !collapsedBuildings[building];
    this.setData({ collapsedBuildings });
  },

  // 显示教室详情
  showRoomDetail(e: any) {
    const index = e.currentTarget.dataset.index;
    const buildingIndex = e.currentTarget.dataset.buildingIndex;
    const room = this.data.groupedClassrooms[buildingIndex].rooms[index];
    this.setData({
      selectedClassroom: room,
      showClassroomDetail: true
    });
  },

  // 关闭教室详情
  closeRoomDetail() {
    this.setData({
      showClassroomDetail: false
    });
  },

  // 按楼栋分组教室
  groupClassroomsByBuilding(classrooms: Classroom[]): GroupedClassroom[] {
    const groups: { [key: string]: Classroom[] } = {};
    
    classrooms.forEach(room => {
      if (!groups[room.building]) {
        groups[room.building] = [];
      }
      groups[room.building].push(room);
    });

    // 转换为数组并排序
    return Object.keys(groups)
      .sort()
      .map(building => ({
        building,
        rooms: groups[building].sort((a, b) => 
          a.roomNumber.localeCompare(b.roomNumber, 'zh-CN', { numeric: true })
        )
      }));
  },

  // 刷新数据
  onPullDownRefresh() {
    if (this.data.hasQueried) {
      this.queryClassrooms().then(() => {
        wx.stopPullDownRefresh();
      }).catch(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '空教室查询 - Drfccv助手小程序',
      path: '/pages/classroom/classroom',
      imageUrl: '/images/share-default.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '空教室查询 - Drfccv助手小程序',
      query: '',
      imageUrl: '/images/share-default.png'
    };
  }
});
