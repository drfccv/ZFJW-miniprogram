# 正方教务系统微信小程序

![GitHub](https://img.shields.io/badge/License-MIT-yellow.svg)
![WeChat Mini Program](https://img.shields.io/badge/微信小程序-v2.0.0-brightgreen)
![Backend](https://img.shields.io/badge/后端项目-ZFJW--backend-blue)

> 一个功能完整的正方教务系统微信小程序，支持课表查询、成绩管理、选课操作等功能
> 
> 🔗 **配套后端项目**: [ZFJW-backend](https://github.com/drfccv/ZFJW-backend)

## ✨ 特性

- 🔐 **安全登录** - 支持验证码登录，记住密码功能
- 📅 **智能课表** - 周视图展示，自动计算当前周次，支持手势切换
- 📊 **成绩管理** - 多学期成绩查询，数据统计分析
- 📝 **考试安排** - 考试信息查看，时间提醒
- 📚 **选课系统** - 在线选课退课(暂仅支持查看)，板块分类管理
- 📢 **通知公告** - 实时获取学校通知
- 💾 **智能缓存** - 离线数据查看，减少网络请求
- 🎨 **优雅界面** - 现代化UI设计，良好的用户体验
- 🔒 **隐私保护** - 数据本地存储，不上传云端

## 📱 功能截图

### 核心功能
- **登录页面** - 学校选择、记住密码、验证码登录
- **课表页面** - 周视图课表、课程详情、手势切换
- **成绩查询** - 学期成绩、统计分析、详细信息
- **个人中心** - 用户信息、系统设置、缓存管理

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
- 配置后端API地址

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
├── pages/                   # 页面目录
│   ├── index/              # 首页
│   ├── login/              # 登录页
│   ├── schedule/           # 课表页
│   ├── grade/              # 成绩查询
│   ├── exam/               # 考试安排
│   ├── profile/            # 个人中心
│   ├── course/             # 选课管理
│   ├── notification/       # 通知公告
│   ├── export/             # PDF导出(暂未实现)
│   └── classroom/          # 空教室查询(暂未实现)
├── utils/                   # 工具类
│   ├── api.ts              # API服务
│   ├── storage.ts          # 存储管理
│   ├── authUtils.ts        # 认证工具
│   └── loginManager.ts     # 登录管理
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
- GPA自动计算
- 成绩统计图表
- 学分统计分析
- 成绩趋势展示
- 支持查询平时分（含平时成绩、期末成绩等明细）

### 数据缓存
- 智能缓存策略
- 离线数据查看
- 缓存过期检测
- 数据同步机制
- 清除缓存功能

### 用户体验
- 记住登录信息
- 自定义启动页面
- 夜间模式支持
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
- ✅ 密码采用加密存储
- ✅ 仅与教务系统必要通信

## 🤝 贡献指南

我们热烈欢迎任何形式的贡献！无论您是修复Bug、添加新功能、改进文档还是优化界面，都非常欢迎提交Pull Request。

### 如何贡献

1. **Fork 本仓库** 到您的GitHub账号
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request** 并详细描述您的更改

### 贡献类型
- 🐛 **Bug修复** - 修复已知问题和错误
- ✨ **新功能开发** - 添加新的功能特性
- 📝 **文档改进** - 完善README、注释和使用说明
- 🎨 **UI/UX优化** - 改进界面设计和用户体验
- ⚡ **性能优化** - 提升应用性能和响应速度
- 🔧 **代码重构** - 优化代码结构和质量
- 🌐 **多语言支持** - 添加国际化支持
- 📱 **兼容性改进** - 提升设备和系统兼容性

### 贡献建议
- 在开始开发前，建议先创建Issue讨论您的想法
- 确保代码符合项目的编码规范
- 添加适当的注释和文档
- 测试您的更改确保功能正常
- Pull Request请包含清晰的描述和截图（如适用）

### 开发环境设置
1. Fork并克隆仓库
2. 使用微信开发者工具打开项目
3. 配置后端API服务（参考 [ZFJW-backend](https://github.com/drfccv/ZFJW-backend)）
4. 开启"不校验合法域名"进行本地开发

### 代码审查
所有的Pull Request都会经过代码审查，我们会：
- 检查代码质量和规范
- 验证功能的正确性
- 确保不会破坏现有功能
- 提供建设性的反馈建议

感谢您为开源社区做出的贡献！🎉

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

- **QQ**: 2713587802
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

## 接口说明

- 课表数据接口
- 成绩查询接口（支持普通成绩和详细成绩，详细成绩可查询平时分、期末分等明细）
- 考试安排接口
- 通知公告接口
- 选课管理接口
