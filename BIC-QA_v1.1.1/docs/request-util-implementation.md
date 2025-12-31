# RequestUtil 实现总结

## 已完成的工作

### 1. 创建 RequestUtil 工具类
- 位置：`js/popup/utils/request.js`
- 功能：
  - 统一的 HTTP 请求接口（GET、POST、PUT、DELETE、PATCH）
  - 自动添加 Accept-Language 头部
  - 自动处理 Provider 认证头部
  - 统一错误处理
  - 请求/响应/错误拦截器
  - 超时控制
  - 请求取消
  - 文件上传支持（FormData）
  - 流式请求支持（SSE）

### 2. 在 app.js 中集成 RequestUtil
- 已导入 RequestUtil
- 已在构造函数中初始化 `this.requestUtil`
- 已替换以下方法：
  - `loadKnowledgeBasesFromAPI()` - 知识库列表
  - `addFeedback()` - 新增反馈
  - `updateFeedback()` - 编辑反馈
  - `deleteFeedback()` - 删除反馈
  - `populateUserProfileFromApi()` - 用户信息
  - `submitAwrAnalysis()` - AWR 上传

### 3. 创建使用文档
- `docs/request-util-usage.md` - 详细使用指南
- `docs/request-util-implementation.md` - 实现总结（本文档）

## 使用示例

### 基本使用

```javascript
// GET 请求
const data = await this.requestUtil.get(url, {
    headers: {
        'Content-Type': 'application/json'
    }
});

// POST 请求（JSON）
const data = await this.requestUtil.post(url, requestBody, {
    headers: {
        'Content-Type': 'application/json'
    }
});

// POST 请求（带 Provider 认证）
const data = await this.requestUtil.post(url, requestBody, {
    provider: provider
});

// 文件上传（FormData）
const formData = new FormData();
formData.append('file', file);
const data = await this.requestUtil.upload(url, formData, {
    provider: provider
});

// 带超时的请求
const data = await this.requestUtil.post(url, requestBody, {
    timeout: 30000, // 30秒
    provider: provider
});

// 可取消的请求
const requestId = 'unique-request-id';
const data = await this.requestUtil.post(url, requestBody, {
    requestId: requestId,
    provider: provider
});
// 取消请求
this.requestUtil.cancelRequest(requestId);
```

## 剩余工作

### 1. 在 app.js 中继续替换 fetch 调用

以下方法仍在使用 `fetch`，需要替换为 `requestUtil`：

1. `getQuestionSuggestions()` - 问题建议（已部分替换）
2. `sendMessage()` - 发送消息（流式请求）
3. `queryKnowledgeBase()` - 知识库查询（流式请求）
4. `requestChatCompletionTranslation()` - 翻译请求
5. 其他使用 fetch 的方法

### 2. 在 settings.js 中集成 RequestUtil

1. 导入 RequestUtil
2. 在构造函数中初始化 `this.requestUtil`
3. 替换所有 fetch 调用

### 3. 在模块文件中集成 RequestUtil

#### diagnosis.js
- `submitInspectionAnalysis()` - 诊断上传
- `loadInspectionHistoryList()` - 诊断历史列表
- `handleInspectionResend()` - 重发邮件

#### awr.js
- `submitAwrAnalysis()` - AWR 上传
- `loadAwrHistoryList()` - AWR 历史列表
- `handleReanalyze()` - 重新分析

## 替换步骤

### 步骤 1：替换简单的 POST 请求

**原来的代码：**
```javascript
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Language': this.getAcceptLanguage()
    },
    body: JSON.stringify(requestBody)
});
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
```

**替换后：**
```javascript
const tempProvider = {
    authType: 'Bearer',
    apiKey: apiKey
};
const data = await this.requestUtil.post(url, requestBody, {
    provider: tempProvider
});
```

### 步骤 2：替换文件上传请求

**原来的代码：**
```javascript
const formData = new FormData();
formData.append('file', file);
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Language': this.getAcceptLanguage()
    },
    body: formData
});
const data = await response.json();
```

**替换后：**
```javascript
const formData = new FormData();
formData.append('file', file);
const tempProvider = {
    authType: 'Bearer',
    apiKey: apiKey
};
const data = await this.requestUtil.upload(url, formData, {
    provider: tempProvider
});
```

### 步骤 3：替换流式请求

**原来的代码：**
```javascript
const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
});
const reader = response.body.getReader();
// ... 处理流式数据
```

**替换后：**
```javascript
await this.requestUtil.stream(url, {
    method: 'POST',
    body: requestBody,
    provider: provider,
    onMessage: (line) => {
        // 处理每行数据
    },
    onError: (error) => {
        // 处理错误
    },
    onComplete: () => {
        // 处理完成
    }
});
```

## 注意事项

1. **Provider 对象**：如果请求需要认证，需要传递 `provider` 对象。如果没有 provider，可以创建临时对象：
   ```javascript
   const tempProvider = {
       authType: 'Bearer',
       apiKey: apiKey
   };
   ```

2. **错误处理**：RequestUtil 会自动处理 HTTP 错误，抛出包含详细信息的错误对象。原有的错误处理逻辑可能需要调整。

3. **响应数据**：RequestUtil 会自动解析 JSON 响应，不需要手动调用 `response.json()`。

4. **FormData**：上传文件时，直接传递 `FormData` 对象，工具类会自动处理 Content-Type。

5. **超时**：默认超时时间为 30 秒，可以通过 `timeout` 选项自定义。设置为 0 表示不超时。

6. **请求取消**：可以通过 `requestId` 和 `cancelRequest` 方法取消请求。这对于长时间运行的请求很有用。

7. **流式请求**：流式请求不支持超时，需要通过 `signal` 参数手动控制。

## 测试建议

1. 测试所有已替换的方法，确保功能正常
2. 测试错误处理，确保错误信息正确显示
3. 测试文件上传，确保文件上传正常
4. 测试流式请求，确保流式响应正常
5. 测试请求取消，确保取消功能正常
6. 测试超时，确保超时功能正常

## 下一步

1. 逐步替换剩余的 fetch 调用
2. 在 settings.js 中集成 RequestUtil
3. 在模块文件中集成 RequestUtil
4. 测试所有功能确保正常工作
5. 优化错误处理和用户体验

