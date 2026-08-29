/**
 * 订阅消息管理器
 *
 * 管理两个一次性订阅模板：
 *   1. 成绩推送模板 — 新成绩通知（模板ID: 2KVe7...）
 *   2. 账号异常模板 — cookies失效通知（模板ID: 0Oc4T...）
 *
 * ── 设计说明 ──
 *
 * wx.requestSubscribeMessage 要求必须由用户 TAP 手势触发。
 * 如果连续 await 两次（分别调用），第二次会丢失点击上下文而失败：
 *   ❌ await sub(gradeId) → 成功 → await sub(abnormalId) → TAP 错误
 *
 * 因此两个模板必须在同一次调用中传入 tmplIds 数组：
 *   ✅ await sub([gradeId, abnormalId]) → 一次弹窗涵盖两个模板
 *
 * 用户勾选"总是保持以上选择，不再询问"后，
 * 后续同一 tmplIds 数组的调用会静默续订（不弹窗）。
 */
import ApiService from './api';
import StorageService from './storage';

/** 后端返回的推送状态 */
export interface PushStatus {
  subscribed: boolean;
  status: 'none' | 'active' | 'exhausted' | 'unsubscribed';
  push_count: number;
  last_push_time: number | null;
  grade_snapshots: Array<{
    year: number;
    term: number;
    update_time: number;
  }>;
}

export class SubscribeManager {
  /** 所有需要订阅的模板ID列表 */
  static get ALL_TEMPLATE_IDS(): string[] {
    return [this.GRADE_TEMPLATE_ID, this.ACCOUNT_ABNORMAL_TEMPLATE_ID];
  }

  static get GRADE_TEMPLATE_ID(): string {
    return StorageService.get<string>(StorageService.KEYS.GRADE_PUSH_TEMPLATE_ID)
      || '2KVe7leduIgeB6CinL8WwKq3OYx_Ddf3h81wG0yIaUE';
  }

  static get ACCOUNT_ABNORMAL_TEMPLATE_ID(): string {
    return StorageService.get<string>(StorageService.KEYS.ACCOUNT_ABNORMAL_TEMPLATE_ID)
      || '0Oc4TiORGaKYVGwwpS5TT7YqFLy0Z0JOFzwxrzYU134';
  }

  /**
   * 一次性订阅所有模板（单次调用，满足 TAP 手势要求）
   * @param tmplIds 模板ID数组，缺省时使用 ALL_TEMPLATE_IDS
   */
  private static async subscribeBatch(
    tmplIds: string[] = this.ALL_TEMPLATE_IDS
  ): Promise<Record<string, boolean>> {
    if (!tmplIds.length) return {};

    try {
      const result = await wx.requestSubscribeMessage({ tmplIds });
      const accepted: Record<string, boolean> = {};

      for (const id of tmplIds) {
        const val = result[id];
        accepted[id] = val === 'accept'
          || val === 'acceptWithAlert'
          || val === 'acceptWithAudio';
      }

      // 向后端报告订阅结果（统一调用一次，不再逐模板上报）
      await this.reportSubscribeResult().catch(() => {});

      return accepted;
    } catch (error) {
      console.error('批量订阅失败:', error);
      const failed: Record<string, boolean> = {};
      for (const id of tmplIds) failed[id] = false;
      return failed;
    }
  }

  // ==================== OpenID 绑定 ====================

  static async bindOpenId(): Promise<string | null> {
    const existing = this.getOpenId();
    if (existing) return existing;

    try {
      const loginRes = await wx.login();
      if (!loginRes.code) return null;

      const loginInfo = StorageService.getLoginInfo();
      const userInfo = StorageService.get<any>(StorageService.KEYS.USER_INFO);
      if (!loginInfo) return null;

      const result = await ApiService.bindOpenId({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        code: loginRes.code,
        sid: userInfo && userInfo.sid || ''
      });

      if (result.code === 1000 && result.data) {
        const data = result.data as { openid?: string };
        if (data.openid) {
          StorageService.set(StorageService.KEYS.OPENID, data.openid);
          return data.openid;
        }
      }
      return null;
    } catch (error) {
      console.error('绑定 OpenID 异常:', error);
      return null;
    }
  }

  static getOpenId(): string | null {
    return StorageService.get<string>(StorageService.KEYS.OPENID);
  }

  // ==================== 状态同步 ====================

  static async syncStatusFromServer(): Promise<PushStatus | null> {
    try {
      const openid = this.getOpenId();
      const loginInfo = StorageService.getLoginInfo();
      if (!openid || !loginInfo) return null;

      const result = await ApiService.getGradePushStatus({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        openid
      });

      if (result.code === 1000 && result.data) {
        const status = result.data as PushStatus;
        StorageService.set(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED, status.subscribed);
        return status;
      }
      return null;
    } catch (error) {
      console.error('同步推送状态失败:', error);
      return null;
    }
  }

  // ==================== 订阅操作 ====================

  /**
   * 请求用户订阅 — 一次性弹窗展示"成绩推送"和"账号异常"两个模板
   *
   * 必须在用户 TAP 事件中触发。用户可分别勾选每个模板，
   * 勾选"总是保持"后后续静默续订不再弹窗。
   */
  static async requestPushSubscribe(): Promise<boolean> {
    const results = await this.subscribeBatch();

    const gradeAccepted = results[this.GRADE_TEMPLATE_ID] || false;
    const abnormalAccepted = results[this.ACCOUNT_ABNORMAL_TEMPLATE_ID] || false;

    console.log('订阅结果:', {
      成绩推送: gradeAccepted ? '已授权 ✓' : '未授权 ✗',
      账号异常: abnormalAccepted ? '已授权 ✓' : '未授权 ✗'
    });

    if (gradeAccepted) {
      StorageService.set(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED, true);
    } else {
      StorageService.set(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED, false);
    }

    return gradeAccepted;
  }

  /**
   * 静默续订 — 单次调用同时续订两个模板
   * 用户勾选"总是保持"后不会弹出授权窗口
   */
  static async silentRenew(): Promise<boolean> {
    const results = await this.subscribeBatch();

    const gradeAccepted = results[this.GRADE_TEMPLATE_ID] || false;

    if (gradeAccepted) {
      StorageService.set(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED, true);
      return true;
    }
    return false;
  }

  static async checkAndRenewIfNeeded(): Promise<boolean> {
    if (!this.isPushEnabled()) return false;

    try {
      // 1. 先尝试从服务端同步状态（可选，失败不影响续订）
      const serverStatus = await this.syncStatusFromServer().catch(() => null);
      
      // 服务端明确返回了未耗尽 → 不需要续订
      if (serverStatus && serverStatus.status === 'active') {
        return true;
      }

      // 2. 用 wx.getSetting 检查本地实际订阅状态
      const localStatus = await this.checkSubscriptionStatus();

      // 3. 如果任意模板未授权或已耗尽，直接尝试静默续订
      const needsRenew = !localStatus
        || localStatus.grade === 'reject'
        || localStatus.grade === 'unsubscribed'
        || localStatus.grade === 'expired';

      if (needsRenew) {
        console.log('检测到订阅状态需续订，尝试静默续订...');
        return await this.silentRenew();
      }

      return true;
    } catch {
      return false;
    }
  }

  /** 向后端报告本次订阅结果（统一调用一次，不再传 template_id） */
  private static async reportSubscribeResult() {
    try {
      const openid = this.getOpenId();
      const loginInfo = StorageService.getLoginInfo();
      const userInfo = StorageService.get<any>(StorageService.KEYS.USER_INFO);
      if (!openid || !loginInfo) return;

      await ApiService.subscribeGradePush({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        openid,
        sid: userInfo && userInfo.sid || ''
      });
    } catch (error) {
      console.error('报告订阅结果失败:', error);
    }
  }

  /** 取消订阅（关闭推送时调用） */
  static async unsubscribe(): Promise<boolean> {
    try {
      const openid = this.getOpenId();
      const loginInfo = StorageService.getLoginInfo();
      if (!openid || !loginInfo) return false;

      const result = await ApiService.unsubscribeGradePush({
        cookies: loginInfo.cookies,
        school_name: loginInfo.schoolName,
        openid
      });

      if (result.code === 1000) {
        StorageService.set(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED, false);
        StorageService.set(StorageService.KEYS.GRADE_PUSH_ENABLED, false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('取消订阅失败:', error);
      return false;
    }
  }

  // ==================== 开启推送完整流程 ====================

  static async enablePushFlow(): Promise<{ success: boolean; message: string }> {
    let openid = this.getOpenId();
    if (!openid) {
      openid = await this.bindOpenId();
      if (!openid) {
        return { success: false, message: '绑定微信账号失败，请稍后重试' };
      }
    }

    const subscribed = await this.requestPushSubscribe();
    if (!subscribed) {
      return { success: false, message: '订阅被拒绝' };
    }

    this.setPushEnabled(true);

    // 用 wx.getSetting 检查最终订阅状态
    this.checkSubscriptionStatus().catch(() => {});

    return { success: true, message: '成绩推送已开启' };
  }

  /**
   * 用 wx.getSetting 检查两个模板的实际订阅状态
   * 返回归一化后的状态字符串: 'accept' | 'reject' | 'unsubscribed' | 'ban'
   */
  static async checkSubscriptionStatus(): Promise<{ grade: string; abnormal: string } | null> {
    try {
      const setting = await wx.getSetting({ withSubscriptions: true });
      const itemSettings = setting.subscriptionsSetting
        ? (setting.subscriptionsSetting as any).itemSettings || {}
        : {};

      // 归一化：WeChat 可能返回字符串或 { status } 对象
      const normalize = (val: any): string => {
        if (!val) return 'unsubscribed';
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val.status) return val.status;
        return 'unsubscribed';
      };

      const gradeStatus = normalize(itemSettings[this.GRADE_TEMPLATE_ID]);
      const abnormalStatus = normalize(itemSettings[this.ACCOUNT_ABNORMAL_TEMPLATE_ID]);

      console.log('订阅消息实际状态:', {
        成绩推送: gradeStatus,
        账号异常: abnormalStatus,
        原始: itemSettings
      });

      return { grade: gradeStatus, abnormal: abnormalStatus };
    } catch (error) {
      console.error('检查订阅状态失败:', error);
      return null;
    }
  }

  // ==================== 本地状态 ====================

  static isPushEnabled(): boolean {
    return !!StorageService.get<boolean>(StorageService.KEYS.GRADE_PUSH_ENABLED);
  }

  static setPushEnabled(enabled: boolean): void {
    StorageService.set(StorageService.KEYS.GRADE_PUSH_ENABLED, enabled);
  }

  static getLocalStatus() {
    return {
      enabled: this.isPushEnabled(),
      subscribed: !!StorageService.get<boolean>(StorageService.KEYS.GRADE_PUSH_SUBSCRIBED),
      openid: this.getOpenId()
    };
  }
}

export default SubscribeManager;
