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

Page({
  data: {
    currentDate: '',
    currentSlot: 0,
    timeSlots: [
      '第1-2节 (08:00-09:40)',
      '第3-4节 (10:00-11:40)', 
      '第5-6节 (14:00-15:40)',
      '第7-8节 (16:00-17:40)',
      '第9-10节 (19:00-20:40)'
    ],
    classrooms: [] as Classroom[],
    groupedClassrooms: [] as GroupedClassroom[],
    loading: false,
    hasQueried: false
  },

  onLoad() {
    this.initDate();
  },

  // 初始化日期
  initDate() {
    const today = new Date();
    const dateStr = this.formatDate(today);
    this.setData({ currentDate: dateStr });
  },

  // 格式化日期
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 日期变化
  onDateChange(e: any) {
    this.setData({ currentDate: e.detail.value });
  },

  // 选择时间段
  selectTimeSlot(e: any) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentSlot: index });
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

    this.setData({ loading: true });

    try {
      const result = await ApiService.getEmptyClassroom({
        school_name: loginInfo.schoolName
      });

      if (result.code === 1000 && result.data) {
        let classrooms: Classroom[] = [];
        
        // 处理返回的数据
        if (Array.isArray(result.data)) {
          classrooms = result.data.map((item: any) => ({
            roomNumber: item.roomNumber || item.room_number || '未知',
            building: item.building || item.building_name || '未知楼栋',
            capacity: item.capacity || 0,
            type: item.type || item.room_type || '普通教室',
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
        title: '查询失败',
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
      this.queryClassrooms().finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  }
});
