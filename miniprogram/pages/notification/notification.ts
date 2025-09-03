import ApiService from '../../utils/api';
import StorageService from '../../utils/storage';

interface Notification {
  content: string;
  create_time: string;
  type: string;
  // 兼容字段
  title?: string;
  summary?: string;
  publishDate?: string;
  author?: string;
}

Page({
  data: {
    notificationList: [] as Notification[],
    loading: false,
    lastUpdateTime: '', // 最后更新时间显示文本
    isFromCache: false  // 是否来自缓存
  },  onLoad() {
    this.loadNotifications();
  },
  onShow() {
    // 如果数据为空，重新加载
    if (this.data.notificationList.length === 0) {
      this.loadNotifications();
    } else {
      // 检查缓存是否仍然有效
      const cachedData = StorageService.getCachedNotifications();
      if (!cachedData || !cachedData.data || !Array.isArray(cachedData.data) || cachedData.data.length === 0) {
        console.log('检测到通知缓存已被清除，重新加载数据');
        this.setData({ 
          notificationList: [],
          updateTime: '',
          isFromCache: false
        });
        this.loadNotifications();
      }
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时强制从网络获取
    this.loadNotifications(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },  // 加载通知公告
  async loadNotifications(forceRefresh: boolean = false) {
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
      const cachedNotifications = StorageService.getCachedNotifications();
      if (cachedNotifications) {
        console.log('从缓存加载通知数据');
        this.setData({
          notificationList: cachedNotifications.data,
          lastUpdateTime: `（${StorageService.formatUpdateTime(cachedNotifications.timestamp)}）`,
          isFromCache: true
        });
        // 显示缓存数据后，仍然尝试从网络更新（静默更新）
        this.loadNotifications(true);
        return;
      }
    }

    this.setData({ loading: true });

    try {
      const result = await ApiService.getNotifications({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName
      });

      console.log('API返回的完整响应:', result);
      
      // 检查响应结构：API直接返回 {code: 1000, data: Array, msg: "..."}
      if (result && result.code === 1000) {
        let rawNotifications: any[] = [];
        
        if (Array.isArray(result.data)) {
          rawNotifications = result.data;
        } else {
          console.error('API数据格式异常，期望数组但得到:', typeof result.data, result.data);
          throw new Error('API返回数据格式异常');
        }

        // 转换数据格式，适配页面显示
        const notificationList = rawNotifications.map((item: any, index: number) => {
          if (!item || typeof item !== 'object') {
            console.warn(`第${index + 1}条通知数据格式异常:`, item);
            return null; // 返回null，后续过滤掉
          }
          
          const processedItem = {
            ...item,
            // 兼容字段映射，确保每个字段都有值
            title: String(item.type || item.title || '系统通知'),
            summary: this.getNotificationSummary(item.content || ''),
            publishDate: String(item.create_time || new Date().toISOString()),
            author: String(item.author || '教务处')
          };
          
          return processedItem;
        }).filter(item => item !== null); // 过滤掉无效数据

        if (notificationList.length > 0) {
          // 缓存数据
          StorageService.cacheNotifications(notificationList);
          
          this.setData({
            notificationList,
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
              title: `加载成功，共${notificationList.length}条通知`,
              icon: 'success'
            });
          }
        } else {
          // 如果API没有返回有效数据，显示空状态
          wx.showToast({
            title: 'API数据为空',
            icon: 'none'
          });
        }
      } else {
        console.error('API响应格式异常:', result);
        throw new Error((result && result.msg) || '获取通知失败');
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      
      // 网络请求失败时，尝试加载缓存数据
      if (!this.data.isFromCache) {
        const cachedNotifications = StorageService.getCachedNotifications();
        if (cachedNotifications) {
          console.log('网络请求失败，显示缓存数据');
          this.setData({
            notificationList: cachedNotifications.data,
            lastUpdateTime: `（${StorageService.formatUpdateTime(cachedNotifications.timestamp)}）`,
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
  // 生成通知摘要（截取前50个字符）
  getNotificationSummary(content: string): string {
    if (!content || typeof content !== 'string') {
      return '暂无内容';
    }
    
    try {
      // 移除多余的空白字符
      const cleanContent = content.replace(/\s+/g, ' ').trim();
      // 截取前50个字符作为摘要
      return cleanContent.length > 50 ? cleanContent.substring(0, 50) + '...' : cleanContent;
    } catch (error) {
      console.error('生成摘要失败:', error);
      return '内容解析失败';
    }
  },  // 显示通知详情
  showNotificationDetail(e: any) {
    try {
      const index = e.currentTarget.dataset.index;
      
      if (index === undefined || index === null || index < 0) {
        wx.showToast({
          title: '无法获取通知信息',
          icon: 'none'
        });
        return;
      }
      
      if (!this.data.notificationList || this.data.notificationList.length === 0) {
        wx.showToast({
          title: '通知列表为空',
          icon: 'none'
        });
        return;
      }
      
      if (index >= this.data.notificationList.length) {
        wx.showToast({
          title: '通知索引超出范围',
          icon: 'none'
        });
        return;
      }
      
      const notification = this.data.notificationList[index];
      
      if (!notification || typeof notification !== 'object') {
        wx.showToast({
          title: '通知数据异常',
          icon: 'none'
        });
        return;
      }

      // 提取 title 和 content，提供多种后备方案
      let title = notification.title || notification.type || '系统通知';
      let content = notification.content || notification.summary || '暂无详细内容';
      
      // 确保都是字符串类型
      title = String(title).trim();
      content = String(content).trim();
      
      // 最终验证
      if (!title || title === 'undefined' || title === 'null') {
        title = '系统通知';
      }
      if (!content || content === 'undefined' || content === 'null') {
        content = '暂无详细内容';
      }
      
      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '确定'
      });
      
    } catch (error) {
      console.error('显示通知详情失败:', error);
      wx.showToast({
        title: '显示通知失败',
        icon: 'none'
      });    }
  },
  onShareAppMessage() {
    return {
      title: '通知公告 - 正方教务系统小程序',
      path: '/pages/notification/notification',
      imageUrl: '/images/share-default.png'
    };
  },
  onShareTimeline() {
    return {
      title: '通知公告 - 正方教务系统小程序',
      query: '',
      imageUrl: '/images/share-default.png'
    };
  },
});
