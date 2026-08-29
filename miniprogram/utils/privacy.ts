/**
 * 微信隐私合规工具
 *
 * 依据《小程序隐私协议开发指南》实现：
 * https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html
 *
 * 说明：
 * - wx.onNeedPrivacyAuthorization 为「覆盖式注册」监听，同一时间只有最后一次注册生效，
 *   因此需要在每个可能触发隐私接口的页面 onShow 注册、onHide/onUnload 注销，
 *   保证「当前活跃页面」的处理器生效。
 * - 隐私接口（如 wx.setClipboardData、wx.chooseMedia 等）在用户未同意隐私协议时
 *   会被挂起，此时触发 onNeedPrivacyAuthorization 事件，需弹出隐私弹窗，
 *   用户点击同意按钮（open-type="agreePrivacyAuthorization"）后调用 resolve 继续执行。
 */

interface PrivacyEventListener {
  (resolve: (result: { buttonId?: string; event: 'agree' | 'disagree' }) => void, eventInfo?: { privacyContractName: string }): void;
}

/**
 * 注册隐私授权监听（页面 onShow 时调用）
 * @param handler 处理函数：弹出隐私弹窗，用户同意/拒绝后调用 resolve
 */
export function registerPrivacyListener(handler: PrivacyEventListener): void {
  if (typeof wx.onNeedPrivacyAuthorization !== 'function') return;
  wx.onNeedPrivacyAuthorization(handler as any);
}

/**
 * 注销隐私授权监听（页面 onHide / onUnload 时调用，须与注册时使用同一 handler 引用）
 */
export function unregisterPrivacyListener(handler: PrivacyEventListener): void {
  if (typeof wx.offNeedPrivacyAuthorization !== 'function') return;
  wx.offNeedPrivacyAuthorization(handler as any);
}

/**
 * 打开《小程序用户隐私保护指引》（mp 后台配置的隐私协议）
 * 若 app.json 配置了 privacy.link，将打开该链接页面
 */
export function openPrivacyContract(): void {
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

/**
 * 查询隐私授权情况
 * @returns needAuthorization 是否需要用户授权；privacyContractName 隐私协议名称
 */
export function getPrivacySetting(): Promise<{ needAuthorization: boolean; privacyContractName: string }> {
  return new Promise((resolve) => {
    if (typeof wx.getPrivacySetting !== 'function') {
      resolve({ needAuthorization: false, privacyContractName: '' });
      return;
    }
    wx.getPrivacySetting({
      success: (res: any) => {
        resolve({
          needAuthorization: !!res.needAuthorization,
          privacyContractName: res.privacyContractName || ''
        });
      },
      fail: () => {
        resolve({ needAuthorization: false, privacyContractName: '' });
      }
    });
  });
}

/**
 * 主动请求隐私授权（在调用真实隐私接口前调用）
 * - 用户已同意：立即 resolve
 * - 用户未同意：触发 onNeedPrivacyAuthorization 事件 → 弹出隐私弹窗 → 用户同意后 resolve / 拒绝后 reject
 * @returns Promise，用户同意时 resolve，拒绝或失败时 reject
 */
export function requirePrivacyAuthorize(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve();
      return;
    }
    wx.requirePrivacyAuthorize({
      success: () => resolve(),
      fail: () => reject(new Error('用户拒绝隐私授权'))
    });
  });
}

export default {
  registerPrivacyListener,
  unregisterPrivacyListener,
  openPrivacyContract,
  getPrivacySetting,
  requirePrivacyAuthorize
};
