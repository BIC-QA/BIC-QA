# app.js 代码拆分说明

## 概述

为了便于维护和开发，我们将 `app.js`（6542行）按照功能模块进行了拆分。每个模块都是独立的文件，通过工厂函数创建并绑定到主类上。

## 已创建的模块

### 1. config-loader.js (配置加载管理器)
**位置**: `js/popup/managers/config-loader.js`

**功能**:
- `loadSettings()` - 加载设置
- `loadModelOptions()` - 加载模型选项
- `loadKnowledgeServiceConfig()` - 加载知识库服务配置
- `hasConfigChanges()` - 检查配置变化
- `syncConfigFromFile()` - 从文件同步配置
- `getEnvType()` - 获取环境类型

### 2. knowledge-base-manager.js (知识库管理器)
**位置**: `js/popup/managers/knowledge-base-manager.js`

**功能**:
- `loadKnowledgeBaseOptions()` - 加载知识库选项
- `loadKnowledgeBasesFromManager()` - 从管理器加载知识库
- `loadKnowledgeBasesDirectly()` - 直接加载知识库配置
- `loadKnowledgeBasesFromAPI()` - 从API加载知识库列表
- `loadKnowledgeBasesFromConfig()` - 从配置文件加载知识库列表
- `getLanguageCandidateKeys()` - 获取语言候选键
- `getLocalizedValue()` - 获取本地化值
- `formatKnowledgeBaseName()` - 格式化知识库显示名称
- `normalizeDatasetName()` - 标准化数据集名称
- `localizeKnowledgeBase()` - 本地化知识库
- `renderKnowledgeBasesFromData()` - 渲染知识库数据到下拉框
- `loadDefaultKnowledgeBases()` - 加载硬编码的默认知识库

### 3. parameter-rules-manager.js (参数规则管理器)
**位置**: `js/popup/managers/parameter-rules-manager.js`

**功能**:
- `loadParameterRuleOptions()` - 加载参数规则选项
- `getDefaultRulesByLanguage()` - 根据语言获取默认规则
- `mergeRulesWithBuiltInSupport()` - 合并规则并支持内置规则修改
- `mergeRulesWithoutDuplicates()` - 合并规则并去重
- `cleanDuplicateRulesWithBuiltInSupport()` - 清理重复规则（支持内置规则）
- `cleanDuplicateRules()` - 清理重复规则
- `isBuiltInRule()` - 判断是否为内置规则
- `getParameterRuleDisplayName()` - 获取参数规则显示名称

## 集成方式

在 `app.js` 的构造函数中，通过以下方式集成这些模块：

```javascript
// 初始化配置加载管理器
const configLoader = createConfigLoader(this);
this.loadSettings = configLoader.loadSettings.bind(configLoader);
this.loadModelOptions = configLoader.loadModelOptions.bind(configLoader);
// ... 其他方法绑定

// 初始化知识库管理器
const knowledgeBaseManager = createKnowledgeBaseManager(this);
this.loadKnowledgeBaseOptions = knowledgeBaseManager.loadKnowledgeBaseOptions.bind(knowledgeBaseManager);
// ... 其他方法绑定

// 初始化参数规则管理器
const parameterRulesManager = createParameterRulesManager(this);
this.loadParameterRuleOptions = parameterRulesManager.loadParameterRuleOptions.bind(parameterRulesManager);
// ... 其他方法绑定
```

## 待拆分的模块

根据代码分析，以下模块可以继续拆分：

1. **content-formatter.js** - 内容格式化模块
   - `formatContent()` - 格式化内容
   - `formatTableWithNewlines()` - 格式化表格
   - `processTableLinesWithNewlines()` - 处理表格行
   - `isTableRow()` - 检查是否是表格行
   - `isTableSeparator()` - 检查是否是表格分隔行
   - `parseTableRow()` - 解析表格行

2. **translation-manager.js** - 翻译功能模块
   - `translateSelection()` - 翻译选中内容
   - `translateText()` - 翻译文本
   - `showTranslationDialog()` - 显示翻译弹窗
   - `updateTranslationDialog()` - 更新翻译弹窗

3. **ui-manager.js** - UI显示管理模块
   - `showResult()` - 显示结果
   - `showMessage()` - 显示消息
   - `showErrorResult()` - 显示错误结果
   - `showLoadingOverlay()` - 显示加载遮罩
   - `hideLoadingOverlay()` - 隐藏加载遮罩

4. **result-manager.js** - 结果操作模块
   - `copyResult()` - 复制结果
   - `exportResultAsHtml()` - 导出结果为HTML
   - `clearResult()` - 清空结果

5. **feedback-manager.js** - 反馈管理模块
   - `handleFeedback()` - 处理反馈
   - `saveFeedback()` - 保存反馈
   - `sendFeedbackToServer()` - 发送反馈到服务器
   - `doAdviceForAnswer()` - 对答案进行建议
   - `addFeedback()` - 添加反馈
   - `updateFeedback()` - 更新反馈
   - `deleteFeedback()` - 删除反馈

6. **session-manager.js** - 会话管理模块
   - `startNewSession()` - 开启新会话
   - `getCurrentConversationContainer()` - 获取当前会话容器
   - `getOrCreateConversationContainer()` - 获取或创建会话容器

7. **progress-manager.js** - 进度消息管理模块
   - `updateProgressMessages()` - 更新进度消息
   - `startProgressMessageReplacement()` - 开始定期检查提示信息
   - `stopProgressMessageReplacement()` - 停止定期检查
   - `checkAndReplaceProgressMessages()` - 检查并替换提示信息

## 注意事项

1. **方法绑定**: 所有模块方法都需要使用 `.bind()` 绑定到 `popup` 实例，确保 `this` 上下文正确。

2. **依赖关系**: 模块之间可能存在依赖关系，需要确保初始化顺序正确。

3. **向后兼容**: 拆分后的代码应该保持与原有代码的兼容性，不影响现有功能。

4. **代码清理**: 在确认模块正常工作后，可以从 `app.js` 中删除已迁移的重复代码。

## 下一步工作

1. 继续创建剩余的模块文件
2. 更新 `app.js` 集成新模块
3. 删除 `app.js` 中的重复代码
4. 测试确保所有功能正常工作
5. 更新相关文档

