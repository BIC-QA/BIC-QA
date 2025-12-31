# RequestUtil 使用指南

## 概述

`RequestUtil` 是一个统一的 HTTP 请求工具类，基于原生 `fetch` API，提供了统一的请求接口、错误处理、拦截器等功能。

## 功能特性

1. **自动添加 Accept-Language 头部**：根据当前语言设置自动添加
2. **自动处理认证头部**：支持 Provider 配置，自动添加认证信息
3. **统一错误处理**：自动处理 HTTP 错误和网络错误
4. **请求拦截器**：可以在请求前修改配置
5. **响应拦截器**：可以在响应后处理数据
6. **错误拦截器**：可以统一处理错误
7. **超时控制**：支持请求超时设置
8. **请求取消**：支持取消请求
9. **文件上传**：支持 FormData 上传
10. **流式请求**：支持 SSE 流式响应

## 基本使用

### 1. 初始化

在 `app.js` 或 `settings.js` 中：

```javascript
import { createRequestUtil } from './utils/request.js';

// 在构造函数中初始化
this.requestUtil = createRequestUtil(this);
```

### 2. GET 请求

```javascript
// 原来的方式
const response = await fetch(url, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.getAcceptLanguage()
    }
});
const data = await response.json();

// 使用 RequestUtil
const data = await this.requestUtil.get(url, {
    headers: {
        'Content-Type': 'application/json'
    }
});
```

### 3. POST 请求（JSON）

```javascript
// 原来的方式
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept-Language': this.getAcceptLanguage()
    },
    body: JSON.stringify(requestBody)
});
const data = await response.json();

// 使用 RequestUtil
const data = await this.requestUtil.post(url, requestBody, {
    headers: {
        'Content-Type': 'application/json'
    }
});
```

### 4. POST 请求（带 Provider 认证）

```javascript
// 原来的方式
const headers = {
    'Content-Type': 'application/json'
};
this.setAuthHeaders(headers, provider);
const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
});

// 使用 RequestUtil
const data = await this.requestUtil.post(url, requestBody, {
    provider: provider
});
```

### 5. 文件上传（FormData）

```javascript
// 原来的方式
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

// 使用 RequestUtil
const formData = new FormData();
formData.append('file', file);
const data = await this.requestUtil.upload(url, formData, {
    provider: provider
});
// 或者
const data = await this.requestUtil.post(url, formData, {
    provider: provider
});
```

### 6. 带超时的请求

```javascript
// 使用 RequestUtil
const data = await this.requestUtil.post(url, requestBody, {
    timeout: 30000, // 30秒超时
    provider: provider
});
```

### 7. 可取消的请求

```javascript
// 使用 RequestUtil
const requestId = 'unique-request-id';
const data = await this.requestUtil.post(url, requestBody, {
    requestId: requestId,
    provider: provider
});

// 取消请求
this.requestUtil.cancelRequest(requestId);
```

### 8. 流式请求（SSE）

```javascript
// 使用 RequestUtil
await this.requestUtil.stream(url, {
    method: 'POST',
    body: requestBody,
    provider: provider,
    onMessage: (line) => {
        // 处理每行数据
        console.log('收到数据:', line);
    },
    onError: (error) => {
        // 处理错误
        console.error('流式请求错误:', error);
    },
    onComplete: () => {
        // 处理完成
        console.log('流式请求完成');
    }
});
```

## 替换示例

### 示例1：知识库列表请求

**原来的代码：**
```javascript
const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': this.getAcceptLanguage()
    }
});
const data = await response.json();
```

**替换后：**
```javascript
const data = await this.requestUtil.post(apiUrl, {}, {
    headers: {
        'Accept': 'application/json'
    }
});
```

### 示例2：API 调用（带 Provider）

**原来的代码：**
```javascript
const headers = {
    'Content-Type': 'application/json'
};
this.setAuthHeaders(headers, provider);
const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
});
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const result = await response.json();
```

**替换后：**
```javascript
const result = await this.requestUtil.post(apiEndpoint, requestBody, {
    provider: provider
});
```

### 示例3：文件上传

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
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const result = await response.json();
```

**替换后：**
```javascript
const formData = new FormData();
formData.append('file', file);
const result = await this.requestUtil.upload(url, formData, {
    provider: provider
});
```

### 示例4：用户信息请求

**原来的代码：**
```javascript
const response = await fetch(url, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Language': this.getAcceptLanguage()
    }
});
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
```

**替换后：**
```javascript
// 需要创建一个临时的 provider 对象
const tempProvider = {
    authType: 'Bearer',
    apiKey: apiKey
};
const data = await this.requestUtil.post(url, null, {
    provider: tempProvider
});
```

## 注意事项

1. **Provider 对象**：如果请求需要认证，需要传递 `provider` 对象
2. **FormData**：上传文件时，直接传递 `FormData` 对象，工具类会自动处理
3. **错误处理**：工具类会自动处理 HTTP 错误，抛出包含详细信息的错误对象
4. **超时**：默认超时时间为 30 秒，可以通过 `timeout` 选项自定义
5. **请求取消**：可以通过 `requestId` 和 `cancelRequest` 方法取消请求
6. **流式请求**：流式请求不支持超时，需要通过 `signal` 参数手动控制

## 迁移步骤

1. 在类构造函数中初始化 `requestUtil`
2. 逐步替换 `fetch` 调用为 `requestUtil` 方法
3. 移除手动的 `setAuthHeaders` 调用（工具类会自动处理）
4. 移除手动的 `Accept-Language` 头部设置（工具类会自动添加）
5. 移除手动的错误处理（工具类会自动处理）
6. 测试所有请求功能确保正常工作

