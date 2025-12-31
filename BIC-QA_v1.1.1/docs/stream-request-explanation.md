# 流式请求方法详细讲解

## 概述

流式请求（Stream Request）是一种实时接收服务器数据的技术，数据以流（Stream）的形式逐步传输，而不是等待所有数据准备好后一次性返回。这在 AI 对话场景中特别有用，可以让用户看到回答逐步生成的过程，提升用户体验。

## 流式请求的完整流程

### 1. 请求准备阶段（`buildFetchOptions` 方法）

**位置**: `js/popup/utils/request.js` (86-121行)

```javascript
buildFetchOptions(url, options = {}) {
    // 1. 构建请求头（包括 Accept-Language、认证头等）
    const finalHeaders = this.buildHeaders(headers, provider, isFormData);
    
    // 2. 处理请求体（如果是对象，转换为 JSON 字符串）
    let finalBody = body;
    if (body !== null && typeof body === 'object' && !(body instanceof FormData)) {
        finalBody = JSON.stringify(body);
    }
    
    // 3. 返回 fetch 配置对象
    return {
        method: 'POST',
        headers: finalHeaders,
        body: finalBody,
        signal: abortSignal  // 用于取消请求
    };
}
```

**作用**:
- 统一构建请求配置
- 自动添加 `Accept-Language` 头部
- 自动添加认证头部（API Key 等）
- 处理请求体的序列化

### 2. 发送流式请求（`callAIAPI` 或 `callOllamaAPI` 方法）

**位置**: `js/popup/app.js` (3105-3373行, 3374-3683行)

**关键步骤**:

```javascript
// 1. 检查是否需要流式请求
if (requestBody.stream) {
    // 2. 创建 AbortController（用于取消请求）
    this.abortController = new AbortController();
    
    // 3. 使用 buildFetchOptions 构建配置
    const fetchOptions = this.requestUtil.buildFetchOptions(provider.apiEndpoint, {
        method: 'POST',
        body: requestBody,
        provider: provider,
        signal: this.abortController.signal
    });
    
    // 4. 发送 fetch 请求（注意：这里使用原生 fetch，不是 requestUtil）
    const response = await fetch(provider.apiEndpoint, fetchOptions);
    
    // 5. 检查响应状态
    if (!response.ok) {
        // 处理错误...
    }
    
    // 6. 处理流式响应
    const result = await this.handleStreamResponse(response, conversationContainer, question);
}
```

**为什么使用原生 fetch 而不是 requestUtil？**
- 流式响应需要直接访问 `response.body.getReader()`
- `requestUtil.request()` 方法会等待完整响应后解析，不适合流式场景
- 流式请求需要实时处理数据块，不能等待完整响应

### 3. 处理流式响应（`handleStreamResponse` 方法）

**位置**: `js/popup/app.js` (3685-3936行)

这是流式请求的核心方法，详细流程如下：

#### 3.1 初始化阶段

```javascript
async handleStreamResponse(response, container = null, question = '') {
    // 1. 获取流读取器
    const reader = response.body.getReader();
    
    // 2. 创建文本解码器（将二进制数据转换为文本）
    const decoder = new TextDecoder();
    
    // 3. 初始化缓冲区（用于存储不完整的数据行）
    let buffer = '';
    
    // 4. 初始化内容累积变量
    let fullContent = '';
    
    // 5. 初始化防抖相关变量
    let lastUpdateTime = 0;
    let updateQueue = [];
    let isUpdating = false;
}
```

**关键概念**:
- **Reader**: 用于逐块读取流数据
- **Decoder**: 将二进制数据（Uint8Array）转换为字符串
- **Buffer**: 存储不完整的行（因为数据可能分多次传输）

#### 3.2 DOM 结构初始化

```javascript
// 获取结果容器
const resultText = targetContainer.querySelector('.result-text');

// 创建或获取提示元素和内容元素
let tipsEl = resultText.querySelector('.result-text-tips');  // 提示信息（如"正在生成..."）
let contentEl = resultText.querySelector('.result-text-content');  // 实际内容

// 如果不存在则创建
if (!tipsEl) {
    tipsEl = document.createElement('p');
    tipsEl.className = 'result-text-tips';
    resultText.appendChild(tipsEl);
}
if (!contentEl) {
    contentEl = document.createElement('div');
    contentEl.className = 'result-text-content';
    resultText.appendChild(contentEl);
}
```

**作用**: 确保 DOM 结构正确，用于显示流式内容

#### 3.3 防抖更新函数（`debouncedUpdate`）

```javascript
const debouncedUpdate = async (content) => {
    // 1. 检查是否已停止
    if (this.hasBeenStopped) return;
    
    // 2. 防抖：100ms 内只更新一次
    const now = Date.now();
    if (now - lastUpdateTime < 100) {
        return;  // 跳过本次更新
    }
    lastUpdateTime = now;
    
    // 3. 如果正在更新，将内容加入队列
    if (isUpdating) {
        updateQueue.push(content);
        return;
    }
    
    // 4. 标记为正在更新
    isUpdating = true;
    
    try {
        // 5. 更新进度提示信息
        this.updateProgressMessagesBeforeFormat(content);
        
        // 6. 格式化内容（处理 Markdown、代码块等）
        const formattedContent = this.formatContent(content);
        
        // 7. 更新 DOM
        if (contentEl) {
            contentEl.innerHTML = formattedContent;
        }
        
        // 8. 自动滚动到底部
        if (this.resultContainer) {
            this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
        }
    } finally {
        isUpdating = false;
        
        // 9. 处理队列中的更新（只处理最新的）
        if (updateQueue.length > 0) {
            const nextContent = updateQueue.pop();
            updateQueue = [];  // 清空队列
            setTimeout(() => debouncedUpdate(nextContent), 50);
        }
    }
};
```

**为什么需要防抖？**
- 流式数据可能非常频繁（每几毫秒一次）
- 频繁更新 DOM 会导致性能问题
- 防抖可以限制更新频率，提升性能

**更新队列的作用**:
- 如果更新正在进行，新内容会加入队列
- 只处理队列中最新的内容，避免中间状态显示

#### 3.4 主循环：读取流数据

```javascript
while (true) {
    // 1. 检查是否已停止
    if (this.hasBeenStopped) {
        break;
    }
    
    // 2. 读取数据块
    const { done, value } = await reader.read();
    
    // 3. 检查是否完成
    if (done) {
        break;  // 流读取完成
    }
    
    // 4. 解码数据块（二进制 → 字符串）
    const chunk = decoder.decode(value, { stream: true });
    
    // 5. 添加到缓冲区
    buffer += chunk;
    
    // 6. 按行分割（SSE 格式每行以 \n 结尾）
    let lines = buffer.split('\n');
    buffer = lines.pop();  // 最后一行可能不完整，保留到下次
    
    // 7. 处理每一行
    for (const line of lines) {
        if (line.trim() === '') continue;  // 跳过空行
        
        // 8. SSE 格式：以 "data: " 开头
        if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);  // 移除 "data: " 前缀
            
            // 9. 检查结束标记
            if (dataStr.trim() === '[DONE]') {
                // 流式响应结束，执行最终处理
                // ...
                return fullContent;
            }
            
            // 10. 解析 JSON 数据
            try {
                const data = JSON.parse(dataStr);
                
                // 11. 处理 OpenAI 格式
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                    const delta = data.choices[0].delta;
                    if (delta.content) {
                        fullContent += delta.content;  // 累积内容
                        await debouncedUpdate(fullContent);  // 更新显示
                    }
                }
                // 12. 处理其他格式
                else if (data.content) {
                    fullContent += data.content;
                    await debouncedUpdate(fullContent);
                }
            } catch (parseError) {
                console.error('解析流式数据失败:', parseError);
            }
        }
    }
}
```

**关键点解析**:

1. **`reader.read()`**: 
   - 返回 `{ done: boolean, value: Uint8Array }`
   - `done = true` 表示流结束
   - `value` 是二进制数据块

2. **`decoder.decode(value, { stream: true })`**:
   - `stream: true` 表示数据可能不完整（多字节字符可能被分割）
   - 确保正确解码 UTF-8 字符

3. **缓冲区处理**:
   - 数据可能分多次传输，一行可能被分割
   - `buffer` 存储不完整的行，下次继续处理

4. **SSE 格式**:
   - Server-Sent Events 格式
   - 每行以 `data: ` 开头
   - 结束标记为 `data: [DONE]`

#### 3.5 流结束处理

```javascript
// 当收到 [DONE] 标记时
if (dataStr.trim() === '[DONE]') {
    // 1. 最终格式化并显示内容
    const finalFormattedContent = this.formatContent(fullContent);
    contentEl.innerHTML = finalFormattedContent;
    
    // 2. 更新提示信息
    if (tipsEl) {
        if (this._useKnowledgeBaseThisTime) {
            tipsEl.innerHTML = this.t('popup.progress.kbMatch', { count: this._kbMatchCount });
        } else {
            tipsEl.textContent = this.t('popup.progress.completedWithResult');
        }
    }
    
    // 3. 渲染知识库列表（如果使用了知识库）
    if (this._useKnowledgeBaseThisTime && this._kbItems.length > 0) {
        this.renderKnowledgeList(this._kbItems, targetContainer);
    }
    
    // 4. 替换进度提示信息
    setTimeout(() => {
        this.replaceProgressMessagesAfterStream();
    }, 100);
    
    // 5. 重置反馈按钮状态
    this.resetFeedbackButtons(targetContainer);
    
    // 6. 显示操作按钮（复制、导出等）
    const resultActions = targetContainer.querySelector('.result-actions');
    if (resultActions) {
        resultActions.style.display = 'block';
        resultActions.style.opacity = '1';
    }
    
    // 7. 更新标题（显示完成状态和用时）
    if (this.startTime) {
        const endTime = Date.now();
        const duration = Math.round((endTime - this.startTime) / 1000);
        resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
    }
    
    // 8. 保存到会话历史
    this.addToCurrentSessionHistory(question, fullContent);
    
    return fullContent;
}
```

### 4. 请求取消机制

**AbortController 的使用**:

```javascript
// 1. 创建 AbortController
this.abortController = new AbortController();

// 2. 在 fetch 请求中使用 signal
const fetchOptions = {
    // ...
    signal: this.abortController.signal
};

// 3. 用户点击停止按钮时
stopStreaming() {
    if (this.abortController) {
        this.abortController.abort();  // 取消请求
    }
    this.hasBeenStopped = true;  // 设置停止标志
}
```

**作用**:
- 允许用户中断流式请求
- 停止继续读取流数据
- 避免资源浪费

## 数据流程图

```
用户提问
    ↓
构建请求（buildFetchOptions）
    ↓
发送 fetch 请求（带 stream: true）
    ↓
服务器开始流式返回数据
    ↓
获取 response.body.getReader()
    ↓
循环读取数据块
    ↓
解码二进制数据 → 文本
    ↓
按行分割（SSE 格式）
    ↓
解析 JSON（提取 content）
    ↓
累积内容（fullContent += content）
    ↓
防抖更新 DOM（100ms 一次）
    ↓
格式化内容（Markdown、代码块等）
    ↓
更新页面显示
    ↓
自动滚动到底部
    ↓
收到 [DONE] 标记
    ↓
最终处理（保存历史、显示按钮等）
    ↓
完成
```

## 关键技术点总结

### 1. **流式读取**
- 使用 `ReadableStream` API
- `response.body.getReader()` 获取读取器
- `reader.read()` 逐块读取数据

### 2. **数据解码**
- `TextDecoder` 将二进制数据转换为字符串
- `{ stream: true }` 处理不完整的字符

### 3. **缓冲区管理**
- 处理不完整的行（可能被分割）
- 保留最后一行到下次处理

### 4. **防抖优化**
- 限制 DOM 更新频率（100ms）
- 使用队列处理并发更新
- 只显示最新状态

### 5. **格式化处理**
- 实时格式化 Markdown
- 处理代码块、表格等
- 保持格式一致性

### 6. **错误处理**
- 网络错误处理
- JSON 解析错误处理
- 用户取消处理

## 与普通请求的区别

| 特性 | 普通请求 | 流式请求 |
|------|---------|---------|
| 响应方式 | 等待完整响应 | 实时接收数据块 |
| 用户体验 | 等待后一次性显示 | 逐步显示内容 |
| 实现方式 | `requestUtil.post()` | 原生 `fetch` + `handleStreamResponse` |
| 数据处理 | 一次性解析 JSON | 逐块解析 SSE 格式 |
| DOM 更新 | 一次性更新 | 防抖更新（100ms） |
| 适用场景 | 普通 API 调用 | AI 对话、实时数据 |

## 注意事项

1. **内存管理**: 流式请求会累积内容，注意大响应的内存占用
2. **错误恢复**: 网络中断时的处理机制
3. **性能优化**: 防抖更新避免频繁 DOM 操作
4. **用户体验**: 提供停止按钮，允许用户中断请求

