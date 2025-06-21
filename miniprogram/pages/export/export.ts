import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface ExportRecord {
  id: string;
  name: string;
  time: string;
  url: string;
  type: string;
}

Page({
  data: {
    currentType: 'grade', // 'grade', 'schedule', 'exam'
    currentYear: new Date().getFullYear(),
    currentTerm: 1,
    includePersonalInfo: true,
    includeStatistics: true,
    highQuality: false,
    loading: false,
    exportHistory: [] as ExportRecord[],
    showYearSelector: false,
    showTermSelector: false,
    yearRange: [] as string[],
    yearIndex: 0,
    termIndex: 0
  },

  onLoad() {
    this.initData();
    this.loadExportHistory();
  },

  // 初始化数据
  initData() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentTerm = currentMonth >= 2 && currentMonth <= 7 ? 2 : 1;
    
    // 生成学年范围
    const yearRange = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      yearRange.push(`${i}-${i + 1}`);
    }

    this.setData({
      currentYear,
      currentTerm,
      yearRange,
      yearIndex: yearRange.findIndex(year => year === `${currentYear}-${currentYear + 1}`),
      termIndex: currentTerm - 1
    });
  },

  // 选择导出类型
  selectType(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type });
  },

  // 切换选项
  onPersonalInfoChange(e: any) {
    this.setData({ includePersonalInfo: e.detail.value });
  },

  onStatisticsChange(e: any) {
    this.setData({ includeStatistics: e.detail.value });
  },

  onQualityChange(e: any) {
    this.setData({ highQuality: e.detail.value });
  },

  // 导出PDF
  async exportPDF() {
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
      let result;
      const params = {
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        year: this.data.currentYear,
        term: this.data.currentTerm,
        include_personal_info: this.data.includePersonalInfo,
        include_statistics: this.data.includeStatistics,
        high_quality: this.data.highQuality
      };      switch (this.data.currentType) {
        case 'grade':
          // 成绩单目前没有专门的PDF导出接口，使用学业生涯PDF
          result = await ApiService.getAcademiaPdf({
            cookies: loginInfo.cookies,
            school_name: loginInfo.schoolName
          });
          break;
        case 'schedule':
          result = await ApiService.getSchedulePdf(params);
          break;
        case 'exam':
          // 考试安排目前没有专门的PDF导出接口，提示用户
          wx.showToast({
            title: '考试安排暂不支持PDF导出',
            icon: 'none'
          });
          this.setData({ loading: false });
          return;
        default:
          throw new Error('未知的导出类型');
      }      if (result.code === 1000 && result.data && (result.data as any).url) {
        // 保存到历史记录
        const record: ExportRecord = {
          id: Date.now().toString(),
          name: this.getExportName(),
          time: new Date().toLocaleString(),
          url: (result.data as any).url,
          type: this.data.currentType
        };
        
        const history = [...this.data.exportHistory, record];
        this.setData({ exportHistory: history });
        this.saveExportHistory(history);

        // 下载文件
        this.downloadFile({ currentTarget: { dataset: { url: (result.data as any).url } } });
        
        wx.showToast({
          title: '导出成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.msg || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }

    this.setData({ loading: false });
  },

  // 获取导出文件名
  getExportName(): string {
    const typeNames = {
      grade: '成绩单',
      schedule: '课表',
      exam: '考试安排'
    };
    const typeName = typeNames[this.data.currentType as keyof typeof typeNames];
    const yearStr = this.data.yearRange[this.data.yearIndex];
    return `${typeName}_${yearStr}_第${this.data.currentTerm}学期`;
  },
  // 下载文件
  downloadFile(e: any) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          // 直接打开文件
          wx.openDocument({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '下载成功',
                icon: 'success'
              });
            },
            fail: (err: any) => {
              console.error('打开文档失败:', err);
              wx.showToast({
                title: '打开失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err: any) => {
        console.error('下载失败:', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载导出历史
  loadExportHistory() {
    const history = StorageService.get<ExportRecord[]>('export_history') || [];
    this.setData({ exportHistory: history });
  },

  // 保存导出历史
  saveExportHistory(history: ExportRecord[]) {
    // 只保留最近20条记录
    const limitedHistory = history.slice(-20);
    StorageService.set('export_history', limitedHistory);
  },

  // 学年学期选择相关方法
  showYearPicker() {
    this.setData({ showYearSelector: true });
  },

  showTermPicker() {
    this.setData({ showTermSelector: true });
  },

  hidePicker() {
    this.setData({ 
      showYearSelector: false,
      showTermSelector: false 
    });
  },

  onYearChange(e: any) {
    const yearIndex = e.detail.value[0];
    const yearStr = this.data.yearRange[yearIndex];
    const year = parseInt(yearStr.split('-')[0]);
    
    this.setData({
      yearIndex,
      currentYear: year,
      showYearSelector: false
    });
  },

  onTermChange(e: any) {
    const termIndex = e.detail.value[0];
    const term = termIndex + 1;
    
    this.setData({
      termIndex,
      currentTerm: term,
      showTermSelector: false
    });
  }
});
