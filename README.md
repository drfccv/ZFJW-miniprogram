# 正方教务系统微信小程序

![GitHub](https://img.shields.io/github/license/drfccv/ZFJW-miniprogram)
![WeChat Mini Program](https://img.shields.io/badge/微信小程序-v2.0.0-brightgreen)
![Backend](https://img.shields.io/badge/后端项目-ZFJW--backend-blue)

> 一个功能完整的正方教务系统微信小程序，支持课表查询、成绩管理、选课操作等功能
> 
> 🔗 **配套后端项目**: [ZFJW-backend](https://github.com/drfccv/ZFJW-backend)

## ✨ 特性

- 🔐 **安全登录** - 支持验证码登录、学校选择、记住密码（微信 AES128 加密存储）
- 📅 **智能课表** - 周视图展示，自动计算当前周次，连堂课自动合并，支持手势切换，按课程配色区分
- 📊 **成绩管理** - 多学期成绩查询，统计分析，支持普通/详细成绩
- 📝 **考试安排** - 考试信息查看
- 📚 **选课系统** - 选课管理，板块分类
- 🏫 **空教室查询** - 按楼栋分组展示，教室详情查看
- 📢 **通知公告** - 实时获取学校通知
- ✅ **成绩推送** - 微信订阅消息，新成绩自动通知
- ⭐ **教学评价** - 课程评教、状态标签、一键评教、评价明细
- 💾 **智能缓存** - 离线查看，减少网络请求
- 🎨 **简约界面** - 统一白卡片风格、SVG 细线图标、无 emoji 的现代化 UI
- 🔒 **隐私合规** - 内置《隐私政策》《用户协议》，微信隐私授权弹窗，本地加密存储

## 🚀 快速开始

### 环境要求
- 微信开发者工具
- Node.js 14+
- TypeScript 支持

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/drfccv/ZFJW-miniprogram.git
cd ZFJW-miniprogram
```

2. **安装依赖**
```bash
npm install
```

3. **配置开发环境**
- 使用微信开发者工具打开项目
- 在设置中开启"不校验合法域名"
- 配置后端 API 地址（默认 `http://localhost:5000`，可通过修改 `miniprogram/utils/storage.ts` 中的 `getApiBaseUrl` 调整）

4. **运行项目**
- 点击编译即可在开发者工具中预览

## ⚙️ 配置说明

### 网络配置
在微信小程序后台配置以下域名：

**request合法域名**：
```
https://你的教务系统域名
https://你的API服务器域名
```

**downloadFile合法域名**：
```
https://你的教务系统域名
```

### 后端项目
本小程序需要配合后端API服务使用：

**🔗 配套后端项目**：[ZFJW-backend](https://github.com/drfccv/ZFJW-backend)

主要接口包括：
- 用户认证：登录、验证码、用户信息
- 学业数据：课表、成绩、考试安排
- 选课管理：已选课程、可选课程、选课操作
- 其他功能：通知公告、空教室查询

请先部署后端服务，然后在小程序中配置对应的API地址。

## 📂 项目结构

```
miniprogram/
├── app.json                 # 小程序配置
├── app.ts                   # 应用入口
├── app.wxss                 # 全局样式
├── components/
│   └── privacy-popup/       # 隐私授权弹窗组件
├── icons/                   # SVG 图标资源
├── pages/                   # 页面目录
│   ├── index/              # 首页
│   ├── login/              # 登录页
│   ├── schedule/           # 课表页
│   ├── grade/              # 成绩查询
│   ├── exam/               # 考试安排
│   ├── profile/            # 个人中心
│   ├── profile-detail/     # 个人信息详情
│   ├── course/             # 选课管理
│   ├── notification/       # 通知公告
│   ├── classroom/          # 空教室查询
│   ├── evaluate/           # 教学评价
│   ├── evaluate-detail/    # 评价明细
│   ├── schedule-settings/  # 课表设置
│   ├── privacy/            # 隐私政策
│   ├── agreement/          # 用户协议
├── utils/                   # 工具类
│   ├── api.ts              # API服务
│   ├── storage.ts          # 存储管理
│   ├── authUtils.ts        # 认证工具
│   ├── loginManager.ts     # 登录管理
│   ├── subscribeManager.ts # 订阅消息管理
│   └── privacy.ts          # 隐私合规工具
├── styles/                  # 样式文件
└── images/                  # 图片资源
```

## 🔧 核心功能

### 智能课表
- 自动计算当前学期和周次
- 支持周一/周日开始设置
- 课程时间冲突检测
- 连堂课程自动合并
- 手势滑动切换周次

### 成绩管理
- 多学期成绩查询
- 普通/详细成绩（含平时分、期末分等明细）
- 成绩统计（总科目、通过/不通过、平均分、加权平均分、GPA）

### 数据缓存
- 智能缓存策略
- 离线数据查看
- 缓存过期检测
- 清除缓存功能

### 用户体验
- 记住登录信息（AES128 加密存储）
- 自定义启动页面
- 响应式布局
- 错误处理机制

## 🛠️ 技术栈

- **前端框架**: 微信小程序原生开发
- **编程语言**: TypeScript
- **样式语言**: WXSS
- **状态管理**: 本地存储 + 内存缓存
- **网络请求**: 封装的HTTP客户端
- **UI组件**: 原生组件 + 自定义组件

## 📋 开发规范

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint代码规范
- 组件化开发模式
- 统一的错误处理机制

### 命名规范
- 文件名使用kebab-case
- 变量名使用camelCase
- 常量使用UPPER_CASE
- 组件名使用PascalCase

## 🔐 隐私声明

本项目严格保护用户隐私：

- ✅ 数据仅存储在本地设备
- ✅ 不收集个人隐私信息
- ✅ 不进行用户行为跟踪
- ✅ 支持随时清除所有数据
- ✅ 密码采用微信 AES128 加密存储
- ✅ 仅与教务系统必要通信

### 📱 微信隐私合规（依据《小程序隐私协议开发指南》）

本项目已按微信规范实现隐私合规能力：

- **隐私授权弹窗**：`components/privacy-popup` 组件 + `wx.onNeedPrivacyAuthorization` 监听，调用隐私接口且用户未同意时自动弹出，同意按钮使用 `open-type="agreePrivacyAuthorization"` 规范实现
- **app.json 配置**：已配置 `__usePrivacyCheck__` 启用隐私检查
- **协议页面**：内置完整《隐私政策》（`pages/privacy`）与《用户协议》（`pages/agreement`）页面，登录页、更多页均可查看

### ⚠️ 上线前必须完成

1. **配置《小程序用户隐私保护指引》**：在 [微信公众平台](https://mp.weixin.qq.com) → 设置 → 服务内容声明 → 用户隐私保护指引中，声明收集的信息类型（如：学号、密码、教务系统登录凭证、订阅消息），生成隐私保护指引。**注意：该指引在 mp 后台配置，app.json 不支持 `privacy` 字段**
2. 若在 mp 后台声明了新的隐私收集类型，已同意过的用户会被重新要求授权

## 🤝 贡献指南

欢迎提交 Pull Request 贡献代码、改进文档、优化界面或反馈问题。

### 如何贡献

1. **Fork 本仓库** 到您的 GitHub 账号
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request** 并详细描述您的更改

> 所有 PR 都会经过代码审查，提交前请确保代码符合项目编码规范、功能经过验证。

## ❓ 常见问题

<details>
<summary>Q: 如何部署和配置后端服务？</summary>
<br>
A: 请参考配套的后端项目：
<br>
• 访问 <a href="https://github.com/drfccv/ZFJW-backend">ZFJW-backend</a> 获取后端源码
<br>
• 按照后端项目的README进行部署
<br>
• 部署完成后在小程序中配置API地址
<br>
• 确保网络可以正常访问后端服务
</details>

<details>
<summary>Q: 登录失败怎么办？</summary>
<br>
A: 请检查以下几点：
- 教务系统地址是否正确
- 学号密码是否正确
- 验证码是否已过期
- 网络连接是否正常
- 后端API服务是否正常运行
</details>

<details>
<summary>Q: 数据不显示怎么办？</summary>
<br>
A: 可以尝试：
- 下拉刷新数据
- 在个人中心清除缓存
- 重新登录账号
- 检查网络连接
- 确认后端服务正常
</details>

<details>
<summary>Q: 如何设置默认启动页面？</summary>
<br>
A: 在个人中心 → 系统设置 → 默认启动页面 中进行设置
</details>

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 📞 联系作者

- **邮箱**: 2713587802@qq.com
- **用途**: 学习交流、问题反馈、功能建议

> 本项目仅供学习参考，请勿违规使用
> 
> 不保存任何个人信息至云端，数据均以缓存形式保存在本地

## ⭐ Star History

如果这个项目对你有帮助，请给一个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=drfccv/ZFJW-miniprogram&type=Date)](https://star-history.com/#drfccv/ZFJW-miniprogram&Date)

---

<div align="center">

**[🏠 首页](../../)** • **[📖 文档](#)** • **[🐛 反馈](../../issues)** • **[💬 讨论](../../discussions)**

Made with ❤️ by [drfccv](https://github.com/drfccv)

</div>

