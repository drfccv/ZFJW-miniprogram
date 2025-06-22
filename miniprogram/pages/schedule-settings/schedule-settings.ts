import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';
import { AuthUtils } from '../../utils/authUtils';

interface ScheduleSettings {
  currentYear: number;
  currentTerm: number;
  weekStartDay: number; // 0=周日, 1=周一
  firstWeekDate: string; // 第一周开始日期 YYYY-MM-DD
  currentWeek?: number; // 当前周次 1-20（兼容旧版本）
  totalWeeks?: number; // 总周次 1-20
}

Page({  data: {
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0,
    weekStartDay: 1, // 0=周日, 1=周一
    weekStartIndex: 1,
    weekStartOptions: ['周日', '周一'],
    firstWeekDate: '',
    totalWeeks: 16, // 总周次，默认16周
    weekList: [] as number[],
    refreshing: false
  },  onLoad() {
    this.initData();
    this.loadSettings();
  },

  // 初始化数据
  initData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    let academicYear: number;
    let currentTerm: number;
    
    // 精确的学年和学期判断逻辑
    // 第一学期：9月1日 - 次年3月1日
    // 第二学期：3月2日 - 8月31日
    if ((currentMonth === 9) || 
        (currentMonth === 10) || 
        (currentMonth === 11) || 
        (currentMonth === 12) ||
        (currentMonth === 1) ||
        (currentMonth === 2) ||
        (currentMonth === 3 && currentDay <= 1)) {
      // 第一学期
      if (currentMonth >= 9) {
        academicYear = currentYear;
      } else {
        academicYear = currentYear - 1;
      }
      currentTerm = 1;
    } else {
      // 第二学期（3月2日-8月31日）
      academicYear = currentYear - 1;
      currentTerm = 2;
    }
      // 生成学年范围
    const yearRange = [];
    for (let i = academicYear - 3; i <= academicYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);
    }    // 生成周次列表（1-20周）
    const weekList = [];
    for (let i = 1; i <= 20; i++) {
      weekList.push(i);
    }

    // 计算默认的第一周日期（学期开始日期）
    let firstWeekDate: string;
    if (currentTerm === 1) {
      // 第一学期：9月第一个周一
      firstWeekDate = this.getFirstMondayOfSeptember(academicYear);
    } else {
      // 第二学期：2月第三个周一（寒假后）
      firstWeekDate = this.getThirdMondayOfFebruary(academicYear + 1);
    }

    // 默认总周次为16周
    const totalWeeks = 16;
    
    this.setData({
      currentYear: academicYear,
      currentTerm,
      yearRange,
      yearIndex: yearRange.findIndex(year => year === `${academicYear}-${academicYear + 1}`),
      termIndex: currentTerm - 1,
      firstWeekDate,
      totalWeeks,
      weekList
    });
  },  // 加载保存的设置
  loadSettings() {
    try {
      const settings = StorageService.getScheduleSettings();
      if (settings) {
        const { currentYear, currentTerm, weekStartDay, firstWeekDate, totalWeeks } = settings;
        
        // 向后兼容：如果没有 totalWeeks 但有 currentWeek，则默认设置为20周
        const finalTotalWeeks = totalWeeks || 20;
        
        // 确保 weekList 始终存在
        let weekList = this.data.weekList;
        if (!weekList || weekList.length === 0) {
          weekList = [];
          for (let i = 1; i <= 20; i++) {
            weekList.push(i);
          }
        }
        
        // 更新学年范围索引
        const yearIndex = this.data.yearRange.findIndex(year => 
          year === `${currentYear}-${currentYear + 1}`
        );
        
        this.setData({
          currentYear: currentYear || this.data.currentYear,
          currentTerm: currentTerm || this.data.currentTerm,
          yearIndex: yearIndex >= 0 ? yearIndex : this.data.yearIndex,
          termIndex: (currentTerm - 1) || this.data.termIndex,
          weekStartDay: weekStartDay !== undefined ? weekStartDay : this.data.weekStartDay,
          weekStartIndex: weekStartDay !== undefined ? weekStartDay : this.data.weekStartIndex,
          firstWeekDate: firstWeekDate || this.data.firstWeekDate,
          totalWeeks: finalTotalWeeks,
          weekList: weekList
        });
          console.log('已加载课表设置:', settings);
      }
    } catch (error) {
      console.error('加载课表设置失败:', error);
    }
  },// 保存设置
  saveSettings() {
    try {      const settings: ScheduleSettings = {
        currentYear: this.data.currentYear,
        currentTerm: this.data.currentTerm,
        weekStartDay: this.data.weekStartDay,
        firstWeekDate: this.data.firstWeekDate,
        totalWeeks: this.data.totalWeeks
      };
      
      // 使用StorageService保存设置
      StorageService.setScheduleSettings(settings);
      
      // 同时更新 StorageService 中的当前学期设置
      StorageService.setCurrentTerm(this.data.currentYear, this.data.currentTerm);
      
      wx.showToast({
        title: '设置已保存',
        icon: 'success'
      });
      
      console.log('课表设置已保存:', settings);
    } catch (error) {
      console.error('保存课表设置失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 显示学年选择器
  showYearPicker() {
    wx.showActionSheet({
      itemList: this.data.yearRange,
      success: (res) => {
        const yearStr = this.data.yearRange[res.tapIndex];
        const year = parseInt(yearStr.split('-')[0]);
        
        this.setData({
          yearIndex: res.tapIndex,
          currentYear: year
        });
        
        // 更新第一周日期
        this.updateFirstWeekDate();
      }
    });
  },

  // 显示学期选择器
  showTermPicker() {
    wx.showActionSheet({
      itemList: ['第一学期', '第二学期'],
      success: (res) => {
        this.setData({
          termIndex: res.tapIndex,
          currentTerm: res.tapIndex + 1
        });
        
        // 更新第一周日期
        this.updateFirstWeekDate();
      }
    });
  },

  // 显示每周起始日选择器
  showWeekStartPicker() {
    wx.showActionSheet({
      itemList: this.data.weekStartOptions,
      success: (res) => {
        this.setData({
          weekStartIndex: res.tapIndex,
          weekStartDay: res.tapIndex
        });
      }
    });
  },  // 显示第一周日期选择器
  showFirstWeekDatePicker() {
    wx.showModal({
      title: '设置第一周日期',
      content: '请选择学期第一周的开始日期',
      showCancel: true,
      confirmText: '选择日期',
      success: (res) => {
        if (res.confirm) {
          wx.showActionSheet({
            itemList: ['使用日期选择器', '手动输入日期'],
            success: (actionRes) => {
              if (actionRes.tapIndex === 0) {
                // 使用picker-view实现日期选择
                this.showDatePicker();
              } else {
                // 手动输入
                this.showManualDateInput();
              }
            }
          });
        }
      }
    });
  },
  // 显示日期选择器
  showDatePicker() {
    wx.showModal({
      title: '输入日期',
      content: '请输入日期(YYYY-MM-DD格式)',
      editable: true,
      placeholderText: this.data.firstWeekDate,
      success: (inputRes) => {
        if (inputRes.confirm && inputRes.content) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(inputRes.content)) {
            // 验证日期是否有效
            const testDate = new Date(inputRes.content);
            if (testDate.getTime()) {
              // 重新计算当前周次
              const currentWeek = this.calculateCurrentWeek(inputRes.content);
              
              this.setData({
                firstWeekDate: inputRes.content,
                currentWeek
              });
              wx.showToast({
                title: '日期设置成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '日期无效',
                icon: 'error'
              });
            }
          } else {
            wx.showToast({
              title: '日期格式错误',
              icon: 'error'
            });
          }
        }
      }
    });
  },
  // 手动输入日期
  showManualDateInput() {
    wx.showModal({
      title: '输入日期',
      content: '请输入日期(YYYY-MM-DD格式)',
      editable: true,
      placeholderText: this.data.firstWeekDate,
      success: (inputRes) => {
        if (inputRes.confirm && inputRes.content) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(inputRes.content)) {
            // 验证日期是否有效
            const testDate = new Date(inputRes.content);
            if (testDate.getTime()) {
              // 重新计算当前周次
              const currentWeek = this.calculateCurrentWeek(inputRes.content);
              
              this.setData({
                firstWeekDate: inputRes.content,
                currentWeek
              });
              wx.showToast({
                title: '日期设置成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '日期无效',
                icon: 'error'
              });
            }
          } else {
            wx.showToast({
              title: '日期格式错误',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 刷新课表
  async refreshSchedule() {
    if (!AuthUtils.getApiParamsWithTerm(this.data.currentYear, this.data.currentTerm)) {
      return;
    }

    this.setData({ refreshing: true });

    try {      // 清除课表缓存
      StorageService.clearAllCache();
      
      // 重新获取课表数据
      const apiParams = AuthUtils.getApiParamsWithTerm(this.data.currentYear, this.data.currentTerm);
      const result = await ApiService.getSchedule(apiParams!);
      
      if (result.code === 1000 && result.data) {
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        });
      } else {
        AuthUtils.handleApiError(result.code, result.msg);
      }
    } catch (error) {
      console.error('刷新课表失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    }

    this.setData({ refreshing: false });
  },
  // 更新第一周日期
  updateFirstWeekDate() {
    let firstWeekDate: string;
    if (this.data.currentTerm === 1) {
      firstWeekDate = this.getFirstMondayOfSeptember(this.data.currentYear);
    } else {
      firstWeekDate = this.getThirdMondayOfFebruary(this.data.currentYear + 1);
    }
    
    // 重新计算当前周次
    const currentWeek = this.calculateCurrentWeek(firstWeekDate);
    
    this.setData({ 
      firstWeekDate,
      currentWeek
    });
  },

  // 计算当前周次
  calculateCurrentWeek(firstWeekDate: string): number {
    try {
      const firstWeek = new Date(firstWeekDate);
      const today = new Date();
      
      // 计算天数差
      const diffTime = today.getTime() - firstWeek.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // 计算周次
      const currentWeek = Math.floor(diffDays / 7) + 1;
      
      // 确保周次在合理范围内
      return Math.max(1, Math.min(currentWeek, 20));
    } catch (error) {
      console.error('计算当前周次失败:', error);
      return 2; // 默认第2周
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
  },  // 新增：总周次picker变更事件
  onTotalWeeksChange(e: any) {
    const index = e.detail.value;
    const weeks = this.data.weekList[index];
    this.setData({ totalWeeks: weeks });
    wx.showToast({ title: `设置为${weeks}周`, icon: 'success' });
  },
  // 新增：官方picker日期变更事件
  onFirstWeekDateChange(e: any) {
    const date = e.detail.value;
    // 校验格式（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      wx.showToast({ title: '日期格式错误', icon: 'error' });
      return;
    }
    // 验证日期有效性
    const testDate = new Date(date);
    if (!testDate.getTime()) {
      wx.showToast({ title: '日期无效', icon: 'error' });
      return;
    }
    // 重新计算当前周次
    const currentWeek = this.calculateCurrentWeek(date);
    this.setData({
      firstWeekDate: date,
      currentWeek
    });
    wx.showToast({ title: '日期设置成功', icon: 'success' });
  }
});
