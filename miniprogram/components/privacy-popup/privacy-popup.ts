/**
 * 隐私授权弹窗组件
 *
 * 依据微信《小程序隐私协议开发指南》：
 * - 同意按钮必须使用 open-type="agreePrivacyAuthorization"，用户在按钮上的点击
 *   会被基础库记录，随后在 bindagreeprivacyauthorization 回调中调用
 *   resolve({ buttonId: 'agree-btn', event: 'agree' }) 使原隐私接口继续执行。
 * - 拒绝时调用 resolve({ event: 'disagree' })。
 */
Component({
  data: {
    show: false,
    contractName: '《小程序用户隐私保护指引》',
    resolve: null as ((result: { buttonId?: string; event: 'agree' | 'disagree' }) => void) | null
  },

  methods: {
    // 由页面在 onNeedPrivacyAuthorization 回调中调用
    showPopup(resolve: (result: { buttonId?: string; event: 'agree' | 'disagree' }) => void, contractName?: string) {
      this.setData({
        show: true,
        contractName: contractName || '《小程序用户隐私保护指引》',
        resolve
      });
    },

    hidePopup() {
      this.setData({ show: false, resolve: null });
    },

    // 用户点击「同意」：open-type 已记录点击，此处调用 resolve 继续原隐私接口
    handleAgree() {
      const resolve = this.data.resolve;
      if (resolve) {
        resolve({ buttonId: 'agree-btn', event: 'agree' });
      }
      this.hidePopup();
    },

    // 用户点击「不同意」
    handleDisagree() {
      const resolve = this.data.resolve;
      if (resolve) {
        resolve({ event: 'disagree' });
      }
      this.hidePopup();
    },

    // 查看《小程序用户隐私保护指引》
    openContract() {
      if (typeof wx.openPrivacyContract !== 'function') {
        wx.showToast({ title: '当前微信版本不支持', icon: 'none' });
        return;
      }
      wx.openPrivacyContract({
        fail: () => {
          wx.showToast({ title: '暂无法打开隐私指引', icon: 'none' });
        }
      });
    }
  }
});
