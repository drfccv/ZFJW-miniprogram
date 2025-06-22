import StorageService from '../../utils/storage';

Page({
  data: {
    userInfo: {},
  },
  onLoad() {
    const userInfo = StorageService.get('userInfo') || {};
    this.setData({ userInfo });
  },
}); 