# BIC-QA 小程序改造方案

## 📋 项目概述

将现有的 Chrome 扩展应用改造为小程序（支持微信小程序、支付宝小程序等）。

## 🔍 当前架构分析

### 使用的 Chrome API

1. **chrome.runtime**
   - `chrome.runtime.getURL()` - 获取扩展资源 URL
   - `chrome.runtime.sendMessage()` - 消息通信
   - `chrome.runtime.onMessage` - 监听消息

2. **chrome.tabs**
   - `chrome.tabs.query()` - 查询标签页
   - `chrome.tabs.sendMessage()` - 向 content script 发送消息
   - `chrome.tabs.create()` - 创建新标签页

3. **chrome.storage**
   - `chrome.storage.sync.get()` - 读取同步存储
   - `chrome.storage.sync.set()` - 写入同步存储

4. **chrome.scripting**
   - `chrome.scripting.executeScript()` - 执行脚本

5. **chrome.notifications**
   - 通知功能（可选）

### 核心功能模块

1. **问答功能** - AI 对话、流式响应
2. **知识库查询** - 数据库知识库集成
3. **AWR 分析** - 数据库性能分析
4. **巡检诊断** - 数据库巡检
5. **历史记录** - 对话历史管理
6. **设置管理** - 配置管理
7. **国际化** - 多语言支持

## 🎯 小程序平台选择

### 推荐方案：微信小程序

**优势**:
- 用户基数大
- 开发工具完善
- 文档齐全
- 支持云开发

**其他选择**:
- 支付宝小程序
- 百度小程序
- 字节跳动小程序
- 跨平台方案（uni-app、Taro）

## 🔄 改造方案

### 阶段一：架构设计

#### 1.1 项目结构重构

```
miniprogram/
├── app.js                 # 小程序入口
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
├── pages/
│   ├── index/            # 主页面（问答）
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── settings/         # 设置页面
│   ├── history/          # 历史记录
│   ├── awr/              # AWR 分析
│   └── inspection/       # 巡检诊断
├── components/           # 组件
│   ├── conversation/     # 对话组件
│   ├── model-selector/   # 模型选择器
│   └── knowledge-base/   # 知识库选择器
├── utils/
│   ├── request.js        # 请求工具（复用）
│   ├── i18n.js          # 国际化（复用）
│   └── storage.js       # 存储工具
├── i18n/                # 国际化文件（复用）
└── config/              # 配置文件（复用）
```

#### 1.2 API 替换映射

| Chrome API | 小程序 API | 说明 |
|-----------|-----------|------|
| `chrome.runtime.getURL()` | `wx.getFileSystemManager()` 或直接使用相对路径 | 资源路径 |
| `chrome.storage.sync` | `wx.setStorageSync()` / `wx.getStorageSync()` | 本地存储 |
| `chrome.tabs.query()` | ❌ 不支持 | 需要移除或替代 |
| `chrome.tabs.sendMessage()` | ❌ 不支持 | 需要移除或替代 |
| `chrome.tabs.create()` | `wx.navigateTo()` / `wx.redirectTo()` | 页面跳转 |
| `chrome.scripting.executeScript()` | ❌ 不支持 | 需要移除或替代 |

### 阶段二：核心功能改造

#### 2.1 存储系统改造

**原代码**:
```javascript
// Chrome 扩展
chrome.storage.sync.get(['uiLanguage'], (items) => {
    const language = items.uiLanguage || 'zhcn';
});

chrome.storage.sync.set({ uiLanguage: 'en' }, () => {
    console.log('保存成功');
});
```

**小程序改造**:
```javascript
// 小程序
// utils/storage.js
export const storage = {
    get(key) {
        try {
            return wx.getStorageSync(key);
        } catch (e) {
            console.error('读取存储失败:', e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            wx.setStorageSync(key, value);
            return true;
        } catch (e) {
            console.error('写入存储失败:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            wx.removeStorageSync(key);
            return true;
        } catch (e) {
            console.error('删除存储失败:', e);
            return false;
        }
    }
};

// 使用
const language = storage.get('uiLanguage') || 'zhcn';
storage.set('uiLanguage', 'en');
```

#### 2.2 请求工具改造

**原代码** (`js/popup/utils/request.js`):
- 使用原生 `fetch` API
- 支持流式请求

**小程序改造**:
```javascript
// utils/request.js
class RequestUtil {
    async request(url, options = {}) {
        return new Promise((resolve, reject) => {
            wx.request({
                url: url,
                method: options.method || 'GET',
                header: options.headers || {},
                data: options.body,
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(res.data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusText}`));
                    }
                },
                fail: (err) => {
                    reject(err);
                }
            });
        });
    }
    
    // 流式请求需要使用 WebSocket 或分块请求
    async stream(url, options = {}) {
        // 方案1: 使用 WebSocket
        // 方案2: 使用分块请求（轮询）
        // 方案3: 使用 wx.request 的 enableChunked 选项（如果支持）
    }
}
```

**流式请求改造方案**:

1. **WebSocket 方案**（推荐）:
```javascript
async stream(url, options = {}) {
    return new Promise((resolve, reject) => {
        const wsUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
        const socketTask = wx.connectSocket({
            url: wsUrl,
            header: options.headers || {}
        });
        
        let fullContent = '';
        
        socketTask.onMessage((res) => {
            const data = JSON.parse(res.data);
            if (data.content) {
                fullContent += data.content;
                if (options.onMessage) {
                    options.onMessage(data.content, fullContent);
                }
            }
            if (data.done) {
                socketTask.close();
                resolve(fullContent);
            }
        });
        
        socketTask.onError((err) => {
            reject(err);
        });
        
        socketTask.onOpen(() => {
            // 发送请求数据
            socketTask.send({
                data: JSON.stringify(options.body)
            });
        });
    });
}
```

2. **分块请求方案**:
```javascript
async stream(url, options = {}) {
    // 使用轮询方式模拟流式
    let fullContent = '';
    let offset = 0;
    
    while (true) {
        const res = await this.request(url, {
            method: 'POST',
            body: { ...options.body, offset }
        });
        
        if (res.done) {
            break;
        }
        
        fullContent += res.content;
        offset = res.nextOffset;
        
        if (options.onMessage) {
            options.onMessage(res.content, fullContent);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return fullContent;
}
```

#### 2.3 页面跳转改造

**原代码**:
```javascript
chrome.tabs.create({ url: chrome.runtime.getURL('pages/settings.html') });
```

**小程序改造**:
```javascript
wx.navigateTo({
    url: '/pages/settings/settings'
});
```

#### 2.4 文件上传改造

**原代码**:
```javascript
// 使用 FormData
const formData = new FormData();
formData.append('file', file);
```

**小程序改造**:
```javascript
// pages/awr/awr.js
chooseFile() {
    wx.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
            const file = res.tempFiles[0];
            this.uploadFile(file);
        }
    });
},

uploadFile(file) {
    wx.uploadFile({
        url: 'https://api.example.com/upload',
        filePath: file.path,
        name: 'file',
        formData: {
            // 其他表单数据
        },
        success: (res) => {
            const data = JSON.parse(res.data);
            console.log('上传成功:', data);
        }
    });
}
```

#### 2.5 移除浏览器特定功能

需要移除或替代的功能：

1. **Content Script 功能**:
   - 获取页面内容 → 小程序不支持，需要用户手动输入或粘贴

2. **标签页操作**:
   - 查询当前标签页 → 移除
   - 向页面注入脚本 → 移除

3. **扩展资源访问**:
   - `chrome.runtime.getURL()` → 使用相对路径或云存储

### 阶段三：UI/UX 适配

#### 3.1 页面布局适配

**小程序限制**:
- 页面大小限制（主包 2MB，分包 2MB）
- 不支持 `<iframe>`
- 样式需要适配小程序规范

**改造要点**:
1. 使用小程序组件替代自定义 HTML 元素
2. 使用 `rpx` 单位替代 `px`（响应式）
3. 使用小程序导航栏替代自定义导航

#### 3.2 组件化改造

**对话组件** (`components/conversation/index.wxml`):
```xml
<view class="conversation-container">
    <view class="question-section">
        <text class="question-text">{{question}}</text>
    </view>
    <view class="answer-section">
        <view class="answer-content" wx:if="{{!streaming}}">
            {{answer}}
        </view>
        <view class="answer-content streaming" wx:else>
            {{streamingContent}}
            <text class="cursor">|</text>
        </view>
    </view>
</view>
```

#### 3.3 样式改造

**原 CSS**:
```css
.popup-container {
    width: 400px;
    height: 600px;
}
```

**小程序 WXSS**:
```css
.container {
    width: 750rpx;  /* 使用 rpx */
    min-height: 100vh;
}
```

### 阶段四：功能增强

#### 4.1 小程序特有功能

1. **分享功能**:
```javascript
onShareAppMessage() {
    return {
        title: 'BIC-QA 智能问答助手',
        path: '/pages/index/index',
        imageUrl: '/images/share.png'
    };
}
```

2. **下拉刷新**:
```json
{
    "enablePullDownRefresh": true
}
```

3. **云开发集成**（可选）:
```javascript
// 使用微信云开发存储配置
const db = wx.cloud.database();
db.collection('settings').get();
```

#### 4.2 性能优化

1. **分包加载**:
```json
{
    "subPackages": [
        {
            "root": "pages/awr",
            "pages": ["awr/index"]
        }
    ]
}
```

2. **图片优化**:
- 使用 CDN
- 压缩图片
- 懒加载

3. **代码优化**:
- 按需加载
- 代码分割
- 减少包体积

## 📝 实施步骤

### 第一步：环境准备

1. 注册小程序账号（微信/支付宝等）
2. 安装开发工具
3. 创建小程序项目

### 第二步：代码迁移

1. **复用代码**:
   - ✅ `utils/request.js` - 需要改造
   - ✅ `i18n/` - 可以直接复用
   - ✅ `config/` - 可以直接复用
   - ✅ 业务逻辑 - 需要适配

2. **新建代码**:
   - 小程序页面结构
   - 小程序组件
   - 小程序配置文件

### 第三步：功能测试

1. 单元测试
2. 集成测试
3. 真机测试

### 第四步：发布上线

1. 代码审核
2. 提交审核
3. 发布版本

## 🔧 技术栈建议

### 方案一：原生小程序开发

**优点**:
- 性能最优
- 体积最小
- 官方支持

**缺点**:
- 需要重写代码
- 平台绑定

### 方案二：uni-app 跨平台

**优点**:
- 一套代码多端运行
- 支持 Vue 语法
- 生态丰富

**缺点**:
- 性能略差
- 包体积较大

### 方案三：Taro 跨平台

**优点**:
- 支持 React
- 多端支持
- 组件丰富

**缺点**:
- 学习成本
- 性能开销

## 📊 工作量评估

| 模块 | 工作量 | 说明 |
|------|--------|------|
| 项目搭建 | 1-2天 | 创建项目结构 |
| 存储改造 | 1天 | API 替换 |
| 请求改造 | 2-3天 | 流式请求较复杂 |
| 页面改造 | 5-7天 | UI/UX 适配 |
| 组件开发 | 3-5天 | 对话、选择器等 |
| 功能测试 | 3-5天 | 全面测试 |
| **总计** | **15-25天** | 约 3-5 周 |

## ⚠️ 注意事项

1. **API 限制**:
   - 小程序有域名白名单限制
   - 需要配置合法域名

2. **审核要求**:
   - 内容审核严格
   - 需要提供隐私政策

3. **性能考虑**:
   - 包体积限制
   - 内存限制
   - 渲染性能

4. **兼容性**:
   - 不同小程序平台差异
   - 版本兼容性

## 🚀 快速开始

### 1. 创建微信小程序项目

```bash
# 使用微信开发者工具创建项目
# 或使用命令行工具
npm install -g @wechat-miniprogram/cli
miniprogram init
```

### 2. 复制可复用代码

```bash
# 复制国际化文件
cp -r i18n miniprogram/

# 复制配置文件
cp -r config miniprogram/

# 复制工具类（需要改造）
cp js/popup/utils/request.js miniprogram/utils/
```

### 3. 创建页面结构

```bash
mkdir -p miniprogram/pages/index
mkdir -p miniprogram/pages/settings
mkdir -p miniprogram/components
```

## 📚 参考资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [uni-app 文档](https://uniapp.dcloud.net.cn/)
- [Taro 文档](https://taro.jd.com/docs/)

## 💡 建议

1. **优先使用原生小程序开发**，性能最优
2. **分阶段实施**，先完成核心功能
3. **充分测试**，特别是流式请求功能
4. **考虑云开发**，简化后端逻辑

