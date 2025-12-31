## popup.js 模块化拆分规划

### 总体目标
- 降低单文件体积，将 `BicQAPopup` 中的职责拆分至独立模块
- 保留现有功能行为，确保页面加载顺序与 Chrome MV3 限制兼容
- 通过明确的依赖注入，让模块之间仅通过公共接口通信

### 目录结构建议
```
js/
  popup/
    main.js                # 入口，负责初始化
    app.js                 # BicQAPopup 主类
    modules/
      dom-elements.js      # DOM 查询与缓存
      events.js            # 页面级事件绑定
      conversation.js      # 对话主流程（提问、回答、展示）
      history.js           # 历史记录管理
      awr.js               # AWR 分析模块
      diagnosis.js        # 巡检诊断模块
      knowledge-base.js    # 知识库交互
    services/
      i18n-service.js      # 语言与多语言辅助
      storage-service.js   # chrome.storage / localStorage 交互
      api-service.js       # 模型/知识库等 HTTP 请求封装
      translation-service.js
    utils/
      common.js            # escapeHtml、formatTime 等纯函数
      dom.js               # createElement、toggleClass 等 DOM 工具
      language.js          # 语言与区域相关判断
```

### 拆分原则
1. **工具函数统一到 utils**  
   - 无状态、可复用的纯函数集中于 `utils/common.js`
   - DOM 相关的通用方法置于 `utils/dom.js`

2. **服务层负责外部依赖**  
   - API 请求、Storage、I18n 各自封装，提供 Promise API
   - 通过依赖注入传入业务模块，便于测试与替换

3. **业务模块围绕功能域拆分**  
   - 每个模块导出 `init(appContext)` / `destroy()` 等方法
   - 持有自身状态与 DOM 引用，不直接触达其他模块内部实现

4. **入口主类协调**  
   - `app.js` 中的 `BicQAPopup` 仅负责创建服务、实例化模块、转发全局事件
   - `main.js` 处理 DOMContentLoaded，并挂载到 `window`

5. **注释与类型提示**  
   - 在每个模块文件顶部写明职责、依赖、公共接口
   - 对外导出函数添加 JSDoc 注释，注明参数/返回值/可能抛出的异常

### 迁移步骤
1. 初始化目录结构与入口脚本（维持旧全局逻辑）
2. 抽离工具函数至 `utils`，替换原引用
3. 拆分服务层（I18n/Storage/Api/Translation）
4. 逐个迁出业务模块（对话 → 历史 → AWR → 巡检 → 其他）
5. 清理主类、删除遗留代码，确保 ESLint/格式化通过
6. 全量回归测试：语言切换、提问、知识库、AWR/巡检、全屏/导出

### 兼容性注意
- `pages/popup.html` 需改为 `<script type="module" src="../js/popup/main.js"></script>`
- 仍需兼容 `KnowledgeBaseManager` 等非模块脚本，全局通过 `window` 访问
- `chrome.runtime.getURL` 等扩展 API 需保留，必要时在服务层统一封装

### 验证清单
- 语言切换与多语言文案
- 知识库检索与翻译流程
- 各模型调用与返回显示
- AWR/巡检提交、导出、历史列表
- 历史记录分页、清除、导出
- 导出 HTML、复制内容、点赞/点踩
- 全屏开关、帮助/公告跳转

> 以上规划作为初始蓝图，具体实现过程中可根据模块之间耦合度进行微调。***


