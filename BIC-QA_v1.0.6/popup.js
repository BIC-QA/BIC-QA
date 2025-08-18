// BIC-QA 弹出窗口脚本
class BicQAPopup {
    constructor() {
        this.providers = [];
        this.models = [];
        this.rules = [];
        this.generalSettings = {};
        this.knowledgeServiceConfig = {};
        this.conversationHistory = [];
        // 添加当前会话的对话历史
        this.currentSessionHistory = [];
        this.isLoading = false;
        this.hasBeenStopped = false;
        this.startTime = null;
        this._useKnowledgeBaseThisTime = false;
        this._kbMatchCount = 0;
        this._kbItems = [];
        this.progressMessageReplacementInterval = null;
        this.userInteractionTimeout = null;
        this.lastUserInteraction = Date.now();
        
        this.initElements();
        this.bindEvents();
        
        // 确保页面完全加载后再初始化
        this.initializeAfterLoad();
    }
    
    // 新增方法：确保页面完全加载后再初始化
    async initializeAfterLoad() {
        // 添加缓存清理逻辑
        await this.clearCacheOnStartup();
        
        // 检测浏览器兼容性
        this.detectBrowserCompatibility();
        
        // 等待DOM完全加载
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }
        
        // 额外等待一小段时间确保所有元素都已渲染
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 加载设置
        await this.loadSettings();
        
        // 根据浏览器兼容性调整延迟时间
        const delay = this.chromeCompatibilityDelay || 1000;
        console.log(`根据浏览器兼容性，配置检查延迟时间: ${delay}ms`);
        
        // 延迟检查配置状态，给用户时间看到页面
        setTimeout(() => {
            this.checkConfigurationStatus();
        }, delay);
    }

    // 新增方法：启动时清理缓存
    async clearCacheOnStartup() {
        try {
            console.log('开始清理缓存数据...');
            
            // 清理本地存储（配置文件等）
            await chrome.storage.local.clear();
            
            // 选择性清理同步存储（保留重要配置，清理历史数据）
            await chrome.storage.sync.remove([
                'currentSessionHistory'
            ]);
            
            // 清理localStorage和sessionStorage
            localStorage.clear();
            sessionStorage.clear();
            
            console.log('启动时缓存清理完成');
        } catch (error) {
            console.error('缓存清理失败:', error);
        }
    }

    initElements() {
        this.questionInput = document.getElementById('questionInput');
        this.askButton = document.getElementById('askButton');
        this.modelSelect = document.getElementById('modelSelect');
        this.knowledgeBaseSelect = document.getElementById('knowledgeBaseSelect');
        this.parameterRuleSelect = document.getElementById('parameterRuleSelect');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultText = document.getElementById('resultText');
        this.questionDisplay = document.getElementById('questionDisplay');
        this.questionText = document.getElementById('questionText');
        this.questionTime = document.getElementById('questionTime');
        this.aiDisplay = document.getElementById('aiDisplay');
        this.aiTime = document.getElementById('aiTime');
        this.exportButton = document.getElementById('exportButton');
        this.copyButton = document.getElementById('copyButton');
        this.clearButton = document.getElementById('clearButton');
        this.likeButton = document.getElementById('likeButton');
        this.dislikeButton = document.getElementById('dislikeButton');
        this.pageSummaryBtn = document.getElementById('pageSummaryBtn');
        this.translateBtn = document.getElementById('translateBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        // 移除 streamChatBtn，因为元素不存在
        // this.streamChatBtn = document.getElementById('streamChatBtn');
        // 修复：HTML中没有.button-text元素，只有.send-icon和.loading-spinner
        this.sendIcon = this.askButton ? this.askButton.querySelector('.send-icon') : null;
        this.stopIcon = this.askButton ? this.askButton.querySelector('.stop-icon') : null;
        this.abortController = null;
        this.hasBeenStopped = false;
        
        // 历史记录对话框元素
        this.historyDialog = document.getElementById('historyDialog');
        this.closeHistoryDialog = document.getElementById('closeHistoryDialog');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.exportHistoryBtn = document.getElementById('exportHistoryBtn');
        this.historyList = document.getElementById('historyList');
        
        // 回到顶部按钮
        this.backToTopBtn = document.getElementById('backToTopBtn');
        
        // 布局控制元素
        this.contentArea = document.querySelector('.content-area');
        
        // 计时相关
        this.startTime = null;
        
        // 检测是否为弹出窗口模式
        this.isPopupMode = window.innerWidth <= 400 || window.innerHeight <= 600;
        this.initFullscreenMode();
    }

    bindEvents() {
        // 添加用户交互监听
        this.addUserInteractionListeners();
        
        // 提问按钮事件
        if (this.askButton) {
            this.askButton.addEventListener('click', () => {
                if (this.isProcessing) {
                    // 当前为停止动作
                    this.stopProcessing();
                } else {
                    // 发起提问
                    this.handleAskQuestion();
                }
            });
        }
        
        // 输入框内容变化监听
        if (this.questionInput) {
            this.questionInput.addEventListener('input', () => this.updateButtonState());
            this.questionInput.addEventListener('keydown', (e) => {
                // 处理回车键事件
                if (e.key === 'Enter') {
                    // 如果按下了Shift键，允许换行
                    if (e.shiftKey) {
                        // 不阻止默认行为，允许换行
                        return;
                    }
                    
                    // 如果按下了Ctrl键，执行提问操作
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.handleAskQuestion();
                        return;
                    }
                    
                    // 普通回车键，执行提问操作
                    e.preventDefault();
                    this.handleAskQuestion();
                }
            });
        }

        // 使用事件委托处理所有对话容器的按钮事件
        if (this.resultContainer) {
            this.resultContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                
                // 获取按钮所在的容器
                const conversationContainer = target.closest('.conversation-container');
                if (!conversationContainer) return;
                
                // 跳过第一个容器（conversation-default），因为它已经有直接绑定的事件
                if (conversationContainer.id === 'conversation-default') {
                    return;
                }
                
                // 根据按钮的class和ID判断操作类型
                if (target.classList.contains('export-btn') || target.id.startsWith('export-')) {
                    e.preventDefault();
                    this.exportResultAsHtml(conversationContainer);
                } else if (target.classList.contains('copy-btn') || target.id.startsWith('copy-')) {
                    e.preventDefault();
                    this.copyResult(conversationContainer);
                } else if (target.classList.contains('clear-btn') || target.id.startsWith('clear-')) {
                    e.preventDefault();
                    this.clearResult(conversationContainer);
                } else if (target.classList.contains('like-btn') || target.id.startsWith('like-')) {
                    e.preventDefault();
                    this.handleFeedback('like', conversationContainer);
                } else if (target.classList.contains('dislike-btn') || target.id.startsWith('dislike-')) {
                    e.preventDefault();
                    this.handleFeedback('dislike', conversationContainer);
                }
            });
        }
        
        // 保留原有的固定ID按钮事件绑定（用于第一个容器）
        // 复制按钮
        if (this.copyButton) {
            this.copyButton.addEventListener('click', () => this.copyResult());
        }
        
        // 导出按钮
        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.exportResultAsHtml());
        }
        
        // 清空按钮
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearResult());
        }
        
        // 反馈按钮
        if (this.likeButton) {
            this.likeButton.addEventListener('click', () => this.handleFeedback('like'));
        }
        if (this.dislikeButton) {
            this.dislikeButton.addEventListener('click', () => this.handleFeedback('dislike'));
        }
        
        // 快捷操作按钮
        if (this.pageSummaryBtn) {
            this.pageSummaryBtn.addEventListener('click', () => this.getPageSummary());
        }
        if (this.translateBtn) {
            this.translateBtn.addEventListener('click', () => this.translateSelection());
        }
        // this.streamChatBtn.addEventListener('click', () => this.testStreamChat());
        if (this.historyBtn) {
            this.historyBtn.addEventListener('click', () => this.showHistoryDialog());
        }
        
        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => this.startNewSession());
        }
        
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        // 移除全屏按钮事件绑定，因为元素已删除
        // this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // 知识库下拉框事件
        if (this.knowledgeBaseSelect) {
            this.knowledgeBaseSelect.addEventListener('change', () => this.handleKnowledgeBaseChange());
        }
        
        // 历史记录对话框事件
        if (this.closeHistoryDialog) {
            this.closeHistoryDialog.addEventListener('click', () => this.hideHistoryDialog());
        }
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
        if (this.exportHistoryBtn) {
            this.exportHistoryBtn.addEventListener('click', () => this.exportHistory());
        }
        
        // 回到顶部按钮事件
        if (this.backToTopBtn) {
            this.backToTopBtn.addEventListener('click', () => this.scrollToTop());
        }
        
        // 监听滚动事件，控制回到顶部按钮的显示
        window.addEventListener('scroll', () => this.handleScroll());
        
        // 监听存储变化，当设置发生变化时重新检查配置状态
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && (changes.providers || changes.models)) {
                console.log('检测到配置变化，重新加载设置...');
                // 延迟重新加载，确保设置已保存
                setTimeout(() => {
                    this.loadSettings();
                }, 500);
            }
        });
        
        // 打开完整页面按钮
        const openFullPageBtn = document.getElementById('openFullPageBtn');
        if (openFullPageBtn) {
            openFullPageBtn.addEventListener('click', () => this.openFullPage());
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['providers', 'models', 'conversationHistory']);
            this.providers = result.providers || [];
            this.models = result.models || [];
            this.conversationHistory = result.conversationHistory || [];
            
            // 检查历史记录大小，如果过大则清理
            if (this.conversationHistory.length > 50) {
                console.log('历史记录过多，自动清理...');
                this.conversationHistory = this.conversationHistory.slice(0, 50);
                await chrome.storage.sync.set({
                    conversationHistory: this.conversationHistory
                });
            }
            
            this.loadModelOptions();
            
            // 延迟加载知识库选项，确保知识库管理器有足够时间初始化
            setTimeout(() => {
                this.loadKnowledgeBaseOptions();
            }, 100);
            
            // 加载参数规则选项
            this.loadParameterRuleOptions();
            
            // 加载知识库服务配置 - 修复：等待异步方法完成
            await this.loadKnowledgeServiceConfig();
            
            // 移除自动调用checkConfigurationStatus，改为在initializeAfterLoad中统一处理
            // this.checkConfigurationStatus();
        } catch (error) {
            console.error('加载设置失败:', error);
            // 如果是存储配额问题，尝试清理
            if (error.message && error.message.includes('quota')) {
                console.log('检测到存储配额问题，尝试清理...');
                await this.cleanupHistoryRecords();
            }
            this.providers = [];
            this.models = [];
            this.conversationHistory = [];
            
            // 移除自动调用checkConfigurationStatus，改为在initializeAfterLoad中统一处理
            // this.checkConfigurationStatus();
        }
        
        // 初始化按钮状态
        this.updateButtonState();
        
        // 设置初始布局状态
        this.updateLayoutState();
    }

    loadModelOptions() {
        const select = this.modelSelect;
        select.innerHTML = '';
        
        if (this.models.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '请先在设置页面配置模型';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        this.models.forEach(model => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ name: model.name, provider: model.provider });
            option.textContent = `${model.displayName || model.name} (${model.provider})`;
            if (model.isDefault) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    loadKnowledgeBaseOptions() {
        const select = this.knowledgeBaseSelect;
        select.innerHTML = '<option value="">不使用知识库</option>';
        
        console.log('开始加载知识库选项...');
        console.log('window.knowledgeBaseManager:', window.knowledgeBaseManager);
        
        // 等待知识库管理器初始化完成
        if (window.knowledgeBaseManager && window.knowledgeBaseManager.getKnowledgeBases) {
            // 检查是否已初始化
            if (window.knowledgeBaseManager.isInitialized && window.knowledgeBaseManager.isInitialized()) {
                this.loadKnowledgeBasesFromManager();
            } else {
                // 如果未初始化，等待一段时间后重试
                console.log('知识库管理器未初始化，等待初始化完成...');
                setTimeout(() => {
                    this.loadKnowledgeBaseOptions();
                }, 500);
            }
        } else {
            console.error('知识库管理器未初始化或不可用');
            // 如果知识库管理器不可用，尝试直接加载配置文件
            this.loadKnowledgeBasesDirectly();
        }
    }

    // 从知识库管理器加载知识库
    loadKnowledgeBasesFromManager() {
        try {
            const knowledgeBases = window.knowledgeBaseManager.getKnowledgeBases();
            console.log('获取到的知识库列表:', knowledgeBases);
            
            if (knowledgeBases && knowledgeBases.length > 0) {
                const select = this.knowledgeBaseSelect;
                knowledgeBases.forEach(kb => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify(kb); // 存储完整的知识库对象
                    option.textContent = kb.name;
                    select.appendChild(option);
                });
                console.log(`成功加载 ${knowledgeBases.length} 个知识库选项`);
            } else {
                console.log('知识库列表为空');
                this.loadDefaultKnowledgeBases();
            }
        } catch (error) {
            console.error('从知识库管理器加载失败:', error);
            this.loadKnowledgeBasesDirectly();
        }
    }

    // 直接加载知识库配置（备用方案）
    async loadKnowledgeBasesDirectly() {
        try {
            console.log('尝试直接加载知识库配置...');
            const response = await fetch(chrome.runtime.getURL('config/knowledge_bases.json'));
            const config = await response.json();
            const knowledgeBases = config.knowledge_bases || [];
            
            console.log('直接加载的知识库列表:', knowledgeBases);
            
            const select = this.knowledgeBaseSelect;
            knowledgeBases.forEach(kb => {
                const option = document.createElement('option');
                option.value = JSON.stringify(kb); // 存储完整的知识库对象
                option.textContent = kb.name;
                select.appendChild(option);
            });
            
            console.log(`直接加载成功，添加了 ${knowledgeBases.length} 个知识库选项`);
        } catch (error) {
            console.error('直接加载知识库配置失败:', error);
            // 如果直接加载也失败，使用硬编码的默认值
            this.loadDefaultKnowledgeBases();
        }
    }

    // 加载硬编码的默认知识库（最终备用方案）
    loadDefaultKnowledgeBases() {
        console.log('使用硬编码的默认知识库列表');
        
        const defaultKnowledgeBases = [
            { id: "2101", name: "Oracle", dataset_name: "Oracle 知识库" },
            { id: "2102", name: "MySQL兼容", dataset_name: "MySQL兼容 知识库" },
            { id: "2103", name: "达梦", dataset_name: "达梦 知识库" },
            { id: "2104", name: "PG兼容生态", dataset_name: "PG兼容生态 知识库" },
            { id: "2105", name: "SQL Server", dataset_name: "SQL Server 知识库" },
            { id: "2106", name: "神通-OSCAR", dataset_name: "神通-OSCAR 知识库" },
            { id: "2107", name: "YashanDB", dataset_name: "YashanDB 知识库" },
            { id: "2108", name: "Redis", dataset_name: "Redis 知识库" },
            { id: "2109", name: "MongoDB", dataset_name: "MongoDB 知识库" },
            { id: "2110", name: "Redis Cluster", dataset_name: "Redis Cluster 知识库" },
            { id: "2111", name: "DB2", dataset_name: "DB2 知识库" },
            { id: "2114", name: "KingBase", dataset_name: "KingBase 知识库" },
            { id: "2115", name: "Gbase", dataset_name: "Gbase 知识库" },
            { id: "2116", name: "磐维", dataset_name: "磐维 知识库" },
            { id: "2117", name: "OpenGauss", dataset_name: "OpenGauss 知识库" },
            { id: "2201", name: "TDSQL", dataset_name: "TDSQL 知识库" },
            { id: "2202", name: "GaussDB", dataset_name: "GaussDB 知识库" },
            { id: "2203", name: "OceanBase", dataset_name: "OceanBase 知识库" },
            { id: "2204", name: "TiDB", dataset_name: "TiDB 知识库" },
            { id: "2205", name: "GoldenDB", dataset_name: "GoldenDB 知识库" },
            { id: "2206", name: "Gbase 分布式", dataset_name: "Gbase 分布式 知识库" },
            { id: "1111", name: "操作系统", dataset_name: "操作系统 知识库" }
        ];
        
        const select = this.knowledgeBaseSelect;
        defaultKnowledgeBases.forEach(kb => {
            const option = document.createElement('option');
            option.value = JSON.stringify(kb); // 存储完整的知识库对象
            option.textContent = kb.name;
            select.appendChild(option);
        });
        
        console.log(`使用默认值，添加了 ${defaultKnowledgeBases.length} 个知识库选项`);
    }

    loadParameterRuleOptions() {
        try {
            const select = this.parameterRuleSelect;
            
            // 从Chrome存储中获取所有规则
            chrome.storage.sync.get(['rules', 'defaultRulesModified'], (result) => {
                const savedRules = result.rules || [];
                const defaultRulesModified = result.defaultRulesModified || false;
                
                // 获取默认规则
                const defaultRules = [
                    {
                        "description": "适用于快速检索场景，返回更多相关结果",
                        "id": "default-fast-search",
                        "isDefault": true,
                        "name": "精准检索",
                        "similarity": 0.7,
                        "topN": 6,
                        "temperature": 0.7,
                        "prompt": "你是一个专业的数据库专家，你的任务是基于提供的知识库内容为用户提供准确、实用的解答。\n\n## 回答要求\n1. 内容准确性：\n   - 严格基于提供的知识库内容回答\n   - 优先使用高相关性内容\n   - 确保信息的准确性和完整性\n   - 可以适度补充相关知识背景\n\n2. 实用性强：\n   - 提供可操作的建议和步骤\n   - 结合实际应用场景\n   - 包含必要的注意事项和最佳实践\n   - 适当添加示例和说明\n\n3. 版本信息处理：\n   - 开头注明：> 适用版本：{{version_info}}\n   - 如果不同版本有差异，需要明确指出\n   - 结尾再次确认：> 适用版本：{{version_info}}\n\n4. 回答结构：\n   - 先总结核心要点\n   - 分点详细展开\n   - 如有必要，提供具体示例\n   - 适当补充相关背景知识\n\n5. 特殊情况处理：\n   - 如果信息不完整，明确指出信息的局限性\n   - 如果存在版本差异，清晰说明各版本的区别\n   - 可以适度提供相关建议\n\n## 重要：流式输出要求\n- 请直接开始回答，不要使用<think>标签进行思考\n- 立即开始输出内容，实现真正的实时流式体验\n- 边思考边输出，让用户能够实时看到回答过程\n\n请确保回答专业、准确、实用，并始终注意版本兼容性。如果分析Oracle的错误号ORA-XXXXX，则不能随意匹配其他类似错误号，必须严格匹配号码，只允许去除左侧的0或者在左侧填充0使之达到5位数字。"
                    },
                    {
                        "description": "适用于创新思维场景，提供多角度分析和创新解决方案",
                        "id": "default-flexible-search",
                        "isDefault": false,
                        "name": "灵活检索",
                        "similarity": 0.6,
                        "topN": 8,
                        "temperature": 1.0,
                        "prompt": "你是一个专业的数据库专家，你的任务是基于提供的知识库内容为用户提供创新、全面的解答。\n\n## 回答要求\n1. 创新思维：\n   - 基于知识库内容进行多角度分析\n   - 提供创新的解决方案和思路\n   - 结合行业趋势和最佳实践\n   - 鼓励探索性思维\n\n2. 全面性：\n   - 不仅回答直接问题，还要考虑相关因素\n   - 提供多种可能的解决方案\n   - 分析不同场景下的适用性\n   - 包含风险评估和优化建议\n\n3. 版本信息处理：\n   - 开头注明：> 适用版本：{{version_info}}\n   - 如果不同版本有差异，需要明确指出\n   - 结尾再次确认：> 适用版本：{{version_info}}\n\n4. 回答结构：\n   - 先总结核心要点\n   - 分点详细展开\n   - 提供多种思路和方案\n   - 包含创新性建议和未来趋势\n\n5. 特殊情况处理：\n   - 如果信息不完整，提供多种可能的解决方案\n   - 如果存在版本差异，分析各版本的优劣势\n   - 可以适度提供创新性建议和未来发展方向\n\n## 重要：流式输出要求\n- 请直接开始回答，不要使用<think>标签进行思考\n- 立即开始输出内容，实现真正的实时流式体验\n- 边思考边输出，让用户能够实时看到回答过程\n\n请确保回答专业、创新、全面，并始终注意版本兼容性。如果分析Oracle的错误号ORA-XXXXX，则不能随意匹配其他类似错误号，必须严格匹配号码，只允许去除左侧的0或者在左侧填充0使之达到5位数字。"
                    }
                ];
                
                // 使用与settings.js相同的逻辑来合并规则
                let allRules;
                if (defaultRulesModified) {
                    // 如果内置规则被修改过，需要特殊处理
                    // 先合并默认规则和保存的规则
                    allRules = this.mergeRulesWithBuiltInSupport(defaultRules, savedRules);
                    
                    // 然后检查是否有内置规则被修改，如果有，使用保存的版本
                    savedRules.forEach(savedRule => {
                        if (this.isBuiltInRule(savedRule.id)) {
                            const existingIndex = allRules.findIndex(rule => rule.id === savedRule.id);
                            if (existingIndex !== -1) {
                                // 检查保存的规则是否与默认规则不同
                                const defaultRule = defaultRules.find(r => r.id === savedRule.id);
                                if (defaultRule) {
                                    const isModified = savedRule.temperature !== defaultRule.temperature ||
                                                     savedRule.similarity !== defaultRule.similarity ||
                                                     savedRule.topN !== defaultRule.topN ||
                                                     savedRule.prompt !== defaultRule.prompt ||
                                                     savedRule.name !== defaultRule.name ||
                                                     savedRule.description !== defaultRule.description ||
                                                     savedRule.isDefault !== defaultRule.isDefault; // 添加isDefault字段比较
                                    
                                    if (isModified) {
                                        // 使用修改后的版本
                                        allRules[existingIndex] = { ...savedRule };
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // 首次加载，使用默认规则并合并用户自定义规则
                    allRules = this.mergeRulesWithBuiltInSupport(defaultRules, savedRules);
                }
                
                // 移除"使用默认参数"选项，直接开始添加规则选项
                select.innerHTML = '';
                
                if (allRules.length === 0) {
                    // 如果没有配置规则，显示引导提示
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '请先在设置页面配置参数规则';
                    option.disabled = true;
                    select.appendChild(option);
                } else {
                    // 使用所有规则（内置+用户自定义）
                    allRules.forEach((rule, index) => {
                        const option = document.createElement('option');
                        option.value = JSON.stringify(rule);
                        option.textContent = `${rule.name} `;
                        if (rule.isDefault) {
                            option.textContent += ' [默认]';
                            option.selected = true; // 默认选中默认规则
                        }
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('加载参数规则选项失败:', error);
            // 加载默认选项时也不添加"使用默认参数"选项
            const select = this.parameterRuleSelect;
            select.innerHTML = '';
            
            // 显示错误提示
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '加载规则失败，请检查配置';
            option.disabled = true;
            select.appendChild(option);
        }
    }

    // 合并规则并支持内置规则修改的方法
    mergeRulesWithBuiltInSupport(defaultRules, savedRules) {
        const mergedRules = [...defaultRules]; // 复制内置规则
        
        // 清理用户规则中的重复项
        const cleanedSavedRules = this.cleanDuplicateRulesWithBuiltInSupport(savedRules);
        
        // 处理所有保存的规则
        cleanedSavedRules.forEach(savedRule => {
            if (!this.isBuiltInRule(savedRule.id)) {
                // 用户自定义规则
                const existingIndex = mergedRules.findIndex(rule => rule.id === savedRule.id);
                if (existingIndex !== -1) {
                    mergedRules[existingIndex] = savedRule;
                } else {
                    mergedRules.push(savedRule);
                }
            } else {
                // 内置规则 - 检查是否有修改
                const existingIndex = mergedRules.findIndex(rule => rule.id === savedRule.id);
                if (existingIndex !== -1) {
                    // 获取对应的默认规则
                    const defaultRule = defaultRules.find(r => r.id === savedRule.id);
                    if (defaultRule) {
                        // 检查保存的规则是否与默认规则不同
                        const isModified = savedRule.temperature !== defaultRule.temperature ||
                                         savedRule.similarity !== defaultRule.similarity ||
                                         savedRule.topN !== defaultRule.topN ||
                                         savedRule.prompt !== defaultRule.prompt ||
                                         savedRule.name !== defaultRule.name ||
                                         savedRule.description !== defaultRule.description ||
                                         savedRule.isDefault !== defaultRule.isDefault; // 添加isDefault字段比较
                        
                        if (isModified) {
                            // 使用修改后的版本
                            mergedRules[existingIndex] = { ...savedRule };
                        }
                        // 如果没有修改，保持默认值
                    } else {
                        // 如果找不到对应的默认规则，使用保存的版本
                        mergedRules[existingIndex] = savedRule;
                    }
                }
            }
        });
        
        return mergedRules;
    }

    // 合并规则并去重的方法（保留原有方法以兼容）
    mergeRulesWithoutDuplicates(defaultRules, userRules) {
        const mergedRules = [...defaultRules]; // 复制内置规则
        
        // 清理用户规则中的重复项
        const cleanedUserRules = this.cleanDuplicateRules(userRules);
        
        // 添加用户自定义规则（非内置规则）
        cleanedUserRules.forEach(userRule => {
            // 检查是否为内置规则
            const isBuiltIn = this.isBuiltInRule(userRule.id);
            
            if (!isBuiltIn) {
                // 检查是否已存在相同的规则ID
                const existingIndex = mergedRules.findIndex(rule => rule.id === userRule.id);
                if (existingIndex !== -1) {
                    // 更新现有规则
                    mergedRules[existingIndex] = userRule;
                } else {
                    // 添加新规则
                    mergedRules.push(userRule);
                }
            }
        });
        
        return mergedRules;
    }

    // 清理重复规则的方法（支持内置规则）
    cleanDuplicateRulesWithBuiltInSupport(savedRules) {
        const cleanedRules = [];
        const seenIds = new Set();
        const seenNames = new Set();
        
        savedRules.forEach(rule => {
            // 对于内置规则，直接添加（因为可能被修改过）
            if (this.isBuiltInRule(rule.id)) {
                cleanedRules.push(rule);
                return;
            }
            
            // 对于用户自定义规则，检查ID和名称是否重复
            if (!seenIds.has(rule.id) && !seenNames.has(rule.name)) {
                cleanedRules.push(rule);
                seenIds.add(rule.id);
                seenNames.add(rule.name);
            } else {
                console.log(`清理重复规则: ${rule.name} (ID: ${rule.id})`);
            }
        });
        
        return cleanedRules;
    }

    // 清理重复规则的方法（保留原有方法以兼容）
    cleanDuplicateRules(userRules) {
        const cleanedRules = [];
        const seenIds = new Set();
        const seenNames = new Set();
        
        userRules.forEach(rule => {
            // 跳过内置规则ID
            if (this.isBuiltInRule(rule.id)) {
                return;
            }
            
            // 检查ID和名称是否重复
            if (!seenIds.has(rule.id) && !seenNames.has(rule.name)) {
                cleanedRules.push(rule);
                seenIds.add(rule.id);
                seenNames.add(rule.name);
            } else {
                console.log(`清理重复规则: ${rule.name} (ID: ${rule.id})`);
            }
        });
        
        // 如果清理了规则，更新存储
        if (cleanedRules.length !== userRules.length) {
            chrome.storage.sync.set({ rules: cleanedRules }, () => {
                console.log('已清理重复规则并更新存储');
            });
        }
        
        return cleanedRules;
    }

    // 判断是否为内置规则
    isBuiltInRule(ruleId) {
        const builtInIds = ['default-fast-search', 'default-flexible-search'];
        return builtInIds.includes(ruleId);
    }

    async loadKnowledgeServiceConfig() {
        try {
            console.log('开始加载知识库服务配置...');
            
            // 从Chrome存储中加载知识库服务配置
            const result = await chrome.storage.sync.get(['knowledgeServiceConfig']);
            console.log('从chrome.storage.sync获取的结果:', result);
            
            this.knowledgeServiceConfig = result.knowledgeServiceConfig || null;
            
            if (this.knowledgeServiceConfig) {
                console.log('成功加载知识库服务配置:', {
                    default_url: this.knowledgeServiceConfig.default_url,
                    api_key: this.knowledgeServiceConfig.api_key ? '已配置' : '未配置',
                    enabled: this.knowledgeServiceConfig.enabled,
                    updated_at: this.knowledgeServiceConfig.updated_at
                });
            } else {
                console.log('没有找到知识库服务配置，使用默认值');
                // 设置默认配置
                this.knowledgeServiceConfig = {
                    default_url: 'http://www.dbaiops.cn:37225/api/chat/message',
                    api_key: '',
                    enabled: false,
                    updated_at: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('加载知识库服务配置失败:', error);
            // 设置默认配置
            this.knowledgeServiceConfig = {
                default_url: 'http://www.dbaiops.cn:37225/api/chat/message',
                api_key: '',
                enabled: false,
                updated_at: new Date().toISOString()
            };
        }
    }

    async handleAskQuestion() {
        // 防止重复调用
        if (this.isProcessing) {
            console.log('正在处理中，忽略重复请求');
            return;
        }
        
        this.isProcessing = true;
        this.hasBeenStopped = false;
        
        // 记录开始时间
        this.startTime = Date.now();
        
        // 获取问题内容
        const question = this.questionInput.value.trim();
        if (!question) {
            this.showMessage('请输入问题', 'error');
            this.isProcessing = false;
            
            return;
        }else{
            //清空操作
            this.questionInput.value = '';
        }
        
        // 强制创建新的对话容器，确保每次对话都独立
        const conversationContainer = this.forceCreateNewConversationContainer();
        
        // 检查是否有配置的服务商和模型
        if (this.providers.length === 0) {
            this.showErrorResult('请先在设置页面配置服务商和模型', 'model', conversationContainer);
            this.isProcessing = false;
            return;
        }

        if (this.models.length === 0) {
            this.showErrorResult('请先在设置页面配置模型', 'model', conversationContainer);
            this.isProcessing = false;
            return;
        }

        // 重新加载知识库服务配置，确保获取最新配置
        console.log('开始问答，重新加载知识库服务配置...');
        await this.loadKnowledgeServiceConfig();

        // 立即显示结果容器
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        
        // 先清空内容容器（保持提示与内容独立）
        // 注意：这里不再直接操作this.resultText，让具体的API调用方法处理
        // 因为现在有多轮对话，需要让每个对话在自己的容器中处理
        
        // 更新标题为生成中状态
        // 注意：这里不再直接操作全局的result-title，让具体的API调用方法处理
        
        this.updateLayoutState();

        this.setLoading(true);
        
        try {
            // 获取用户选择的模型
            const selectedModelValue = this.modelSelect.value;
            if (!selectedModelValue) {
                this.showErrorResult('请先选择一个模型。', 'model', conversationContainer);
                this.isProcessing = false;
                return;
            }
            
            // 解析选中的模型（模型名 + 服务商）
            let selectedKey;
            try {
                selectedKey = JSON.parse(selectedModelValue);
            } catch (_) {
                selectedKey = { name: selectedModelValue };
            }
            
            // 获取选中的模型和服务商
            const selectedModel = this.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
            const provider = selectedModel ? this.providers.find(p => p.name === selectedModel.provider) : null;
            
            if (!selectedModel || !provider) {
                this.showErrorResult('配置的模型或服务商不存在，请检查设置。', 'model', conversationContainer);
                this.isProcessing = false;
                return;
            }

            // 检查是否使用流式聊天
            // 1. 通过关键词触发
            const useStreamChatByKeyword = question.includes('[stream]') || question.includes('[流式]');
            // 2. 通过模型配置判断（使用模型名称/展示名）
            const nameForCheck = (selectedModel.displayName || selectedModel.name).toLowerCase();
            const useStreamChatByModel = nameForCheck.includes('stream') || 
                                       nameForCheck.includes('流式') ||
                                       (selectedModel.streamEnabled === true);
            // 3. 通过服务商判断（如果服务商是佰晟智算）
            const useStreamChatByProvider = provider.name === '佰晟智算' || 
                                          provider.name.toLowerCase().includes('佰晟智算');
            
            const useStreamChat = useStreamChatByKeyword || useStreamChatByModel || useStreamChatByProvider;
            
            if (useStreamChat) {
                // 使用流式聊天 - 不在这里设置初始内容，让streamChat方法处理
                let cleanQuestion = question;
                if (useStreamChatByKeyword) {
                    cleanQuestion = question.replace(/\[stream\]|\[流式\]/g, '').trim();
                }
                
                // 获取选中的知识库和参数规则
                const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
                const selectedParameterRule = this.parameterRuleSelect.value;
                let parameterRule = null;
                
                if (selectedParameterRule) {
                    try {
                        parameterRule = JSON.parse(selectedParameterRule);
                    } catch (error) {
                        console.error('解析参数规则失败:', error);
                    }
                }
                
                // 显示问题和AI助手
                this.updateQuestionDisplay(cleanQuestion || question, conversationContainer);
                this.updateAIDisplay(conversationContainer);
                
                // 重置知识库相关状态变量（在流式聊天开始前）
                this._useKnowledgeBaseThisTime = false;
                this._kbMatchCount = 0;
                this._kbItems = [];
                
                if (cleanQuestion) {
                    await this.streamChatWithConfig(cleanQuestion, selectedModel, provider, selectedKnowledgeBase, parameterRule, conversationContainer);
                } else {
                    await this.streamChatWithConfig(question, selectedModel, provider, selectedKnowledgeBase, parameterRule, conversationContainer);
                }
                return;
            }
            
            // 非流式聊天 - 重置知识库相关状态变量
            this._useKnowledgeBaseThisTime = false;
            this._kbMatchCount = 0;
            this._kbItems = [];
            
            // 非流式聊天 - 设置初始内容
            // 注意：这里不再直接操作this.resultText，让具体的API调用方法处理
            // 因为现在有多轮对话，需要让每个对话在自己的容器中处理
            
            // 获取当前标签页信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 检查标签页是否支持content script
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                // 对于不支持的页面，直接处理问题而不获取页面内容
                const answer = await this.processQuestion(question, '', tab.url || '', conversationContainer);
                // 注意：这里不再直接调用showResult，让processQuestion内部处理
                return;
            }
            
            try {
                // 尝试发送消息到content script获取页面内容
                console.log('尝试与content script通信...');
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getPageContent',
                    question: question
                });

                console.log('Content script响应:', response);

                if (response && response.success) {
                    const answer = await this.processQuestion(question, response.pageContent, tab.url, conversationContainer);
                    // 注意：这里不再直接调用showResult，让processQuestion内部处理
                } else {
                    // 如果content script没有响应，使用备用方案
                    console.log('Content script未响应，使用备用方案');
                    const answer = await this.processQuestion(question, '', tab.url, conversationContainer);
                    // 注意：这里不再直接调用showResult，让processQuestion内部处理
                }
            } catch (contentScriptError) {
                console.log('Content script通信失败，使用备用方案:', contentScriptError);
                
                // 尝试重新注入content script
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    console.log('Content script重新注入成功');
                } catch (injectionError) {
                    console.log('Content script重新注入失败:', injectionError);
                }
                
                // 如果content script通信失败，直接处理问题
                const answer = await this.processQuestion(question, '', tab.url, conversationContainer);
                // 注意：这里不再直接调用showResult，让processQuestion内部处理
            }
        } catch (error) {
            console.error('处理问题失败:', error);
            
            this.showErrorResult(`处理问题时发生错误: ${error.message}`, 'model', conversationContainer);
        } finally {
            this.setLoading(false);
            this.isProcessing = false; // 重置处理状态
        }
    }

    // 获取或创建对话容器的辅助方法（用于新的对话）
    getOrCreateConversationContainer() {
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (isFirstConversation) {
            // 第一次对话，使用默认容器
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                this.resultContainer.style.display = 'block';
            }
        } else {
            // 后续对话，创建新容器
            conversationContainer = this.createNewConversationContainer();
        }
        
        return conversationContainer;
    }

    // 强制创建新对话容器的方法（用于确保每次对话都独立）
    forceCreateNewConversationContainer() {
        // 总是创建新的对话容器，除非是第一次对话且默认容器存在
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (isFirstConversation) {
            // 第一次对话，检查默认容器是否存在
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                // 如果默认容器存在，清空其内容并重新使用
                this.clearConversationContainer(conversationContainer);
                this.resultContainer.style.display = 'block';
                return conversationContainer;
            } else {
                // 如果默认容器不存在，创建新容器
                conversationContainer = this.createNewConversationContainer();
                return conversationContainer;
            }
        } else {
            // 后续对话，总是创建新容器
            conversationContainer = this.createNewConversationContainer();
            return conversationContainer;
        }
    }

    // 清空对话容器的辅助方法
    clearConversationContainer(container) {
        if (!container) return;
        
        // 清空问题显示
        const questionDisplay = container.querySelector('.question-display');
        if (questionDisplay) {
            questionDisplay.style.display = 'none';
        }
        
        // 清空AI显示
        const aiDisplay = container.querySelector('.ai-display');
        if (aiDisplay) {
            aiDisplay.style.display = 'none';
        }
        
        // 重置标题
        const resultTitle = container.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = '回答：';
        }
        
        // 清空结果文本
        const resultText = container.querySelector('.result-text');
        if (resultText) {
            resultText.innerHTML = `
                <p class="result-text-tips"></p>
                <div class="result-text-content"></div>
                <div class="result-text-knowlist"></div>
            `;
        }
    }

    // 显示错误结果的方法
    showErrorResult(errorMessage, errorType = 'model', container = null) {
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        const targetResultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
        
        if (targetContainer && targetResultText) {
            targetContainer.style.display = 'block';
            
            // 更新标题为错误状态
            const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
            if (resultTitle) {
                resultTitle.textContent = '❌ 处理失败';
            }
            
            // 清空其他区域的内容
            const tipsEl = targetResultText.querySelector('.result-text-tips');
            if (tipsEl) {
                tipsEl.innerHTML = '';
            }
            
            const contentEl = targetResultText.querySelector('.result-text-content');
            if (contentEl) {
                contentEl.innerHTML = '';
            }
            
            const knowlistEl = targetResultText.querySelector('.result-text-knowlist');
            if (knowlistEl) {
                knowlistEl.innerHTML = '';
            }
            
            // 根据错误类型确定解决方案
            let solutions = [];
            if (errorType === 'knowledge') {
                // 知识库服务错误
                solutions = [
                    '检查知识库服务测试连接是否正常',
                    '检查知识库服务的API密钥是否存在问题',
                    '尝试重新配置知识库服务信息'
                ];
            } else {
                // 大模型服务错误
                solutions = [
                    '检查模型连接是否正常',
                    '验证服务商和模型设置',
                    '确认API密钥配置是否正确',
                    '尝试重新配置服务商信息'
                ];
            }
            
            // 创建解决方案HTML
            const solutionsHtml = solutions.map(solution => `<li>${solution}</li>`).join('');
            
            // 创建错误显示内容
            const errorHtml = `
                <div class="errormsgDiv" style="
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px 0;
                    color: #dc2626;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 15px;
                        font-weight: 600;
                        font-size: 16px;
                    ">
                        <span style="font-size: 20px;">❌</span>
                        错误信息
                    </div>
                    <div style="
                        color: #7f1d1d;
                        line-height: 1.6;
                        font-size: 14px;
                    ">
                        ${this.escapeHtml(errorMessage)}
                    </div>
                    <div style="
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #fecaca;
                        font-size: 12px;
                        color: #991b1b;
                    ">
                        <strong>可能的解决方案：</strong>
                        <ul style="margin: 8px 0 0 20px; padding: 0;">
                            ${solutionsHtml}
                        </ul>
                    </div>
                </div>
            `;
            
            // 将错误信息添加到targetResultText中，而不是替换整个innerHTML
            // 这样可以保持原有的DOM结构
            targetResultText.innerHTML = errorHtml;
            
            // 更新布局状态
            this.updateLayoutState();
            
            // 滚动到结果区域
            setTimeout(() => {
                targetContainer.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
            
            // 重置反馈按钮状态
            this.resetFeedbackButtons();
            
            // 同时显示消息提示
            this.showMessage(errorMessage, 'error');
        }
    }

    async processQuestion(question, pageContent, pageUrl, conversationContainer = null) {
        try {
            // 如果没有传入容器，使用当前容器
            if (!conversationContainer) {
                conversationContainer = this.getCurrentConversationContainer();
            }
            
            // 获取用户选择的模型
            const selectedModelValue = this.modelSelect.value;
            if (!selectedModelValue) {
                this.showErrorResult('请先选择一个模型。', 'model', conversationContainer);
                return;
            }
            
            // 解析选中的模型（模型名 + 服务商）
            let selectedKey;
            try {
                selectedKey = JSON.parse(selectedModelValue);
            } catch (_) {
                selectedKey = { name: selectedModelValue };
            }
            
            // 获取选中的模型和服务商
            const selectedModel = this.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
            const provider = selectedModel ? this.providers.find(p => p.name === selectedModel.provider) : null;
            
            if (!selectedModel || !provider) {
                this.showErrorResult('配置的模型或服务商不存在，请检查设置。', 'model', conversationContainer);
                return;
            }
            
            // 获取选中的知识库
            const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
            
            // 获取选中的参数规则
            const selectedParameterRule = this.parameterRuleSelect.value;
            let parameterRule = null;
            
            if (selectedParameterRule) {
                try {
                    parameterRule = JSON.parse(selectedParameterRule);
                    console.log('获取到参数规则:', parameterRule);
                } catch (error) {
                    console.error('解析参数规则失败:', error);
                }
            }
            
            // 如果选择了知识库，检查知识库服务配置
            if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库') {
                // 重新加载知识库服务配置，确保获取最新配置
                console.log('处理问题，重新加载知识库服务配置...');
                await this.loadKnowledgeServiceConfig();
                
                // 添加详细的调试信息
                console.log('=== 知识库服务配置检查 ===');
                console.log('selectedKnowledgeBase:', selectedKnowledgeBase);
                console.log('knowledgeServiceConfig:', this.knowledgeServiceConfig);
                if (this.knowledgeServiceConfig) {
                    console.log('default_url:', this.knowledgeServiceConfig.default_url);
                    console.log('api_key:', this.knowledgeServiceConfig.api_key ? '已配置' : '未配置');
                    console.log('enabled:', this.knowledgeServiceConfig.enabled);
                }
                console.log('========================');
                
                // 检查知识库服务配置
                if (!this.knowledgeServiceConfig) {
                    this.showErrorResult('请先配置知识库服务连接信息。', 'knowledge', conversationContainer);
                    return;
                }
                
                // 检查知识库服务URL和API密钥
                if (!this.knowledgeServiceConfig.default_url || !this.knowledgeServiceConfig.api_key) {
                    console.log('配置检查失败:');
                    console.log('- default_url:', this.knowledgeServiceConfig.default_url);
                    console.log('- api_key:', this.knowledgeServiceConfig.api_key ? '已配置' : '未配置');
                    
                    this.showErrorResult('知识库服务配置不完整，请检查URL和API密钥配置。', 'knowledge', conversationContainer);
                    return;
                }
                
                // 使用知识库服务
                try {
                    // 先显示用户界面元素，与没有选择知识库时的模式保持一致
                    this.updateQuestionDisplay(question, conversationContainer);
                    this.updateAIDisplay(conversationContainer);
                    
                    // 使用提示容器设置提示语
                    const resultText = conversationContainer.querySelector('.result-text');
                    if (resultText) {
                        let tipsEl = resultText.querySelector('.result-text-tips');
                        if (!tipsEl) {
                            tipsEl = document.createElement('p');
                            tipsEl.className = 'result-text-tips';
                            resultText.appendChild(tipsEl);
                        }
                        tipsEl.textContent = '正在处理您的问题，请稍候...';
                        // 确保内容容器存在
                        let contentEl = resultText.querySelector('.result-text-content');
                        if (!contentEl) {
                            contentEl = document.createElement('div');
                            contentEl.className = 'result-text-content';
                            resultText.appendChild(contentEl);
                        }
                        // 不清空tips；仅在渲染时写入contentEl
                    }
                    
                    // 更新标题为生成中状态
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = '生成回答中...';
                    }
                    
                    this.updateLayoutState();
                    
                    const answer = await this.streamChat(
                        question,
                        this.knowledgeServiceConfig.default_url,
                        this.knowledgeServiceConfig.api_key,
                        selectedKnowledgeBase,
                        parameterRule, // 传递参数规则
                        selectedModel,
                        provider,
                        conversationContainer // 传递对话容器
                    );
                    
                    // 保存对话历史
                    this.saveConversationHistory(question, answer, `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, selectedKnowledgeBase, pageUrl);
                    
                    return answer;
                } catch (streamError) {
                    console.error('服务调用失败:', streamError);
                    console.error('错误详情:', streamError.stack);
                    
                    // 根据错误发生的阶段来判断错误来源
                    let errorMessage = '';
                    let errorType = 'model'; // 默认为大模型服务错误
                    
                    // 检查错误是否发生在知识库查询阶段
                    if (streamError.message.includes('知识库查询') || 
                        streamError.message.includes('知识库服务') ||
                        streamError.message.includes('dataset_name') ||
                        streamError.message.includes('知识库查询失败:') ||
                        streamError.message.includes('知识库服务调用失败:') ||
                        streamError.message.includes('知识库服务网络请求失败:')) {
                        // 知识库服务错误
                        errorType = 'knowledge';
                        if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                            errorMessage = '知识库服务网络连接失败'+streamError.message;
                        } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                            errorMessage = '知识库服务认证失败，请检查API密钥配置';
                        } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                            errorMessage = '知识库服务权限不足';
                        } else if (streamError.message.includes('未配置')) {
                            errorMessage = '知识库服务配置不完整';
                        } else if (streamError.message.includes('404')) {
                            errorMessage = '知识库服务地址不存在';
                        } else if (streamError.message.includes('500')) {
                            errorMessage = '知识库服务内部错误';
                        } else {
                            // 提取原始错误信息，避免重复
                            const originalError = streamError.message.replace(/知识库服务调用失败:|知识库查询失败:|知识库服务网络请求失败:/g, '').trim();
                            errorMessage = `知识库服务调用失败: ${originalError || '未知错误'}`;
                        }
                    } else if (streamError.message.includes('大模型服务调用失败:') || 
                               streamError.message.includes('模型服务调用失败:') ||
                               streamError.message.includes('API调用失败:')) {
                        // 大模型服务错误
                        errorType = 'model';
                        if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                            errorMessage = '大模型服务连接失败'+streamError.message;
                        } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                            errorMessage = '大模型服务认证失败';
                        } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                            errorMessage = '大模型服务权限不足';
                        } else if (streamError.message.includes('未配置')) {
                            errorMessage = '大模型服务配置不完整';
                        } else if (streamError.message.includes('404')) {
                            errorMessage = '大模型服务不存在'+streamError.message;
                        } else if (streamError.message.includes('400')) {
                            errorMessage = '大模型服务请求格式错误';
                        } else if (streamError.message.includes('429')) {
                            errorMessage = '大模型服务请求频率过高';
                        } else if (streamError.message.includes('500')) {
                            errorMessage = '大模型服务内部错误';
                        } else {
                            // 提取原始错误信息，避免重复
                            const originalError = streamError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                            errorMessage = `大模型服务调用失败: ${originalError || '未知错误'}`;
                        }
                    } else {
                        // 其他错误，默认为大模型服务错误
                        if(streamError.message.includes("知识库")){
                            errorType = 'knowledge';
                            if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                                errorMessage = '知识库服务网络连接失败'+streamError.message;
                            } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                                errorMessage = '知识库服务认证失败，请检查API密钥配置';
                            } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                                errorMessage = '知识库服务权限不足';
                            } else if (streamError.message.includes('未配置')) {
                                errorMessage = '知识库服务配置不完整';
                            } else if (streamError.message.includes('404')) {
                                errorMessage = '知识库服务地址不存在';
                            } else if (streamError.message.includes('500')) {
                                errorMessage = '知识库服务内部错误';
                            } else {
                                // 提取原始错误信息，避免重复
                                const originalError = streamError.message.replace(/知识库服务调用失败:|知识库查询失败:|知识库服务网络请求失败:/g, '').trim();
                                errorMessage = `知识库服务调用失败: ${originalError || '未知错误'}`;
                            }
                        }else{
                            errorType = 'model';
                            if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                                errorMessage = '大模型服务连接失败'+streamError.message;
                            } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                                errorMessage = '大模型服务认证失败';
                            } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                                errorMessage = '大模型服务权限不足';
                            } else if (streamError.message.includes('未配置')) {
                                errorMessage = '大模型服务配置不完整';
                            } else if (streamError.message.includes('404')) {
                                errorMessage = '大模型服务不存在'+streamError.message;
                            } else if (streamError.message.includes('400')) {
                                errorMessage = '大模型服务请求格式错误'+streamError.message;
                            } else if (streamError.message.includes('429')) {
                                errorMessage = '大模型服务请求频率过高';
                            } else if (streamError.message.includes('500')) {
                                errorMessage = '大模型服务内部错误';
                            } else {
                                // 提取原始错误信息，避免重复
                                const originalError = streamError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                                errorMessage = `大模型服务调用失败: ${originalError || '未知错误'}`;
                            }
                        }
                        
                    }
                    
                    this.showErrorResult(errorMessage, errorType, conversationContainer);
                    return;
                }
            } else {
                // 不使用知识库，直接调用AI API
                try {
                    let answer;
                    console.log("-----provider------",provider);
                    // 检查是否为Ollama服务
                    if (this.isOllamaService(provider)) {
                        answer = await this.callOllamaAPI(question, pageContent, pageUrl, provider, selectedModel, null, parameterRule, conversationContainer);
                    } else {
                        answer = await this.callAIAPI(question, pageContent, pageUrl, provider, selectedModel, null, parameterRule, conversationContainer);
                    }
                    
                    // 保存对话历史
                    this.saveConversationHistory(question, answer, `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, '', pageUrl);
                    
                    return answer;
                } catch (apiError) {
                    console.error('AI API调用失败:', apiError);
                    console.error('错误详情:', apiError.stack);
                    
                    // 统一大模型服务错误信息
                    let errorMessage = '大模型服务调用失败';
                    
                    // 根据具体错误类型提供更精准的信息
                    if (apiError.message.includes('网络') || apiError.message.includes('连接') || apiError.message.includes('Failed to fetch')) {
                        errorMessage = '大模型服务连接失败'+apiError.message;
                    } else if (apiError.message.includes('认证') || apiError.message.includes('401')) {
                        errorMessage = '大模型服务认证失败';
                    } else if (apiError.message.includes('权限') || apiError.message.includes('403')) {
                        errorMessage = '大模型服务权限不足';
                    } else if (apiError.message.includes('未配置')) {
                        errorMessage = '大模型服务配置不完整';
                    } else if (apiError.message.includes('404')) {
                        errorMessage = '大模型服务不存在'+apiError.message;
                    } else if (apiError.message.includes('400')) {
                        errorMessage = '大模型服务请求格式错误'+apiError.message;
                    } else if (apiError.message.includes('429')) {
                        errorMessage = '大模型服务请求频率过高';
                    } else if (apiError.message.includes('500')) {
                        errorMessage = '大模型服务内部错误';
                    } else {
                        // 提取原始错误信息，避免重复
                        const originalError = apiError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                        errorMessage = `大模型服务调用失败: ${originalError || '未知错误'}`;
                    }
                    
                    this.showErrorResult(errorMessage, 'model', conversationContainer);
                    return;
                }
            }
        } catch (error) {
            console.error('处理问题过程中发生错误:', error);
            this.showErrorResult(`处理问题过程中发生错误: ${error.message}`, 'model', conversationContainer);
            return;
        }
    }

    async callAIAPI(question, pageContent, pageUrl, provider, model, knowledgeBaseId = null, parameterRule = null, container = null) {
        // 重置提示相关状态（非知识库流程）
        this._useKnowledgeBaseThisTime = false;
        this._kbMatchCount = 0;
        
        // 检查是否是第一次对话
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (container) {
            // 如果传入了容器，直接使用
            conversationContainer = container;
            console.log('使用传入的容器:', conversationContainer);
        } else if (isFirstConversation) {
            // 第一次对话，使用默认容器
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                this.resultContainer.style.display = 'block';
            }
        } else {
            // 后续对话，创建新容器
            conversationContainer = this.createNewConversationContainer();
        }
        
        console.log("-----question",question);
        console.log("-----pageContent",pageContent);
        console.log("-----pageUrl",pageUrl);
        console.log("-----provider",provider);
        console.log("-----model",model);
        
        // 显示问题
        this.updateQuestionDisplay(question, conversationContainer);
        
        // 显示AI助手
        this.updateAIDisplay(conversationContainer);
        
        // 使用提示容器设置提示语
        const resultText = conversationContainer.querySelector('.result-text');
        if (resultText) {
            let tipsEl = resultText.querySelector('.result-text-tips');
            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }
            tipsEl.textContent = '正在处理您的问题，请稍候...';
            // 确保内容容器存在
            let contentEl = resultText.querySelector('.result-text-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }
            // 不清空tips；仅在渲染时写入contentEl
        }
        
        // 更新标题为生成中状态
        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = '生成回答中...';
        }
        
        this.updateLayoutState();
        
        var context = `页面URL: ${pageUrl}\n页面内容: ${pageContent.substring(0, 2000)}...`;
        
        // 构建系统提示词
        let systemContent = "你是一个智能问答助手，基于用户提供的页面内容来回答问题。请提供准确、有用的回答。";
        
        // 添加参数规则调试信息
        console.log('=== 参数规则调试信息 ===');
        console.log('parameterRule:', parameterRule);
        if (parameterRule) {
            console.log('parameterRule.prompt:', parameterRule.prompt);
            console.log('parameterRule.similarity:', parameterRule.similarity);
            console.log('parameterRule.topN:', parameterRule.topN);
            console.log('parameterRule.temperature:', parameterRule.temperature);
        }
        console.log('========================');
        // 如果选择了参数规则，使用规则中的提示词
        if (parameterRule && parameterRule.prompt) {
            systemContent = parameterRule.prompt;
            console.log('使用参数规则提示词，更新后的systemContent:', systemContent);
        }
        
        // 如果选择了知识库，添加知识库信息
        if (knowledgeBaseId) {
            try {
                // 尝试解析知识库对象
                const knowledgeBase = JSON.parse(knowledgeBaseId);
                if (knowledgeBase.name) {
                    systemContent += `\n\n请结合${knowledgeBase.name}的专业知识来回答问题。`;
                }
            } catch (parseError) {
                // 如果解析失败，尝试使用知识库管理器获取
                const knowledgeBase = window.knowledgeBaseManager?.getKnowledgeBaseById(knowledgeBaseId);
                if (knowledgeBase) {
                    systemContent += `\n\n请结合${knowledgeBase.name}的专业知识来回答问题。`;
                }
            }
            context = `基于以下内容回答问题：\n\n${context}\n\n问题：${question}`
        }else{
            systemContent = "你是一个智能问答助手，基于用户提供的页面内容来回答问题。请提供准确、有用的回答。";
            context = `${question}`
        }
        
        console.log('知识库处理后的systemContent:', systemContent);
        
        // 构建对话历史消息
        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];
        
        // 添加当前会话的历史对话（最多3轮）
        // const recentHistory = this.currentSessionHistory.slice(-6); // 取最近6条消息（3轮对话）
        // messages.push(...recentHistory);
        
        // 添加当前用户问题
        // 注意：历史记录中存储的是原始问题，而这里需要的是处理后的context
        // 所以每次都需要添加当前问题，避免重复的逻辑在这里不适用
        messages.push({
            role: "user",
            content: context
        });
        
        const requestBody = {
            model: model.name,
            messages: messages,
            max_tokens: model.maxTokens || 2048,
            temperature: model.temperature || 0.7,
            stream: true
        };
        // 如果选择了参数规则，在请求体中添加参数
        if (parameterRule) {
            if (parameterRule.similarity !== undefined) {
                requestBody.similarity = parameterRule.similarity;
            }
            if (parameterRule.topN !== undefined) {
                requestBody.top_n = parameterRule.topN;
            }
            if (parameterRule.temperature !== undefined) {
                requestBody.temperature = parameterRule.temperature;
            }
            console.log('使用参数规则:', parameterRule);
        }
        // 如果选择了知识库，在请求体中添加知识库ID
        if (knowledgeBaseId) {
            requestBody.knowledge_base_id = knowledgeBaseId;
        }else{
            requestBody.temperature  = 0.7;
        }
        
        

        const headers = {
            'Content-Type': 'application/json'
        };

        // 设置认证头
        this.setAuthHeaders(headers, provider);
        if(provider.apiEndpoint.indexOf("/chat/completions")>-1){
            provider.apiEndpoint=provider.apiEndpoint
        }else{
            provider.apiEndpoint=provider.apiEndpoint+"/chat/completions"
        }
        try {
            const response = await fetch(provider.apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                    console.error('API错误响应体:', errorText);
                } catch (e) {
                    errorText = '无法读取错误响应';
                }

                // 根据HTTP状态码提供更精准的错误信息
                let errorMessage = '模型服务请求失败';
                
                if (response.status === 400) {
                    errorMessage = '模型服务请求格式错误，请检查模型配置和请求参数';
                } else if (response.status === 401) {
                    errorMessage = '模型服务认证失败，请检查API密钥配置';
                } else if (response.status === 403) {
                    errorMessage = '模型服务权限不足，请检查API密钥权限';
                } else if (response.status === 404) {
                    errorMessage = '模型服务地址不存在，请检查API地址配置';
                } else if (response.status === 429) {
                    errorMessage = '模型服务请求频率过高，请稍后重试';
                } else if (response.status === 500) {
                    errorMessage = '模型服务内部错误，请稍后重试';
                } else if (response.status === 502 || response.status === 503 || response.status === 504) {
                    errorMessage = '模型服务暂时不可用，请稍后重试';
                } else {
                    errorMessage = `模型服务请求失败: ${response.status} ${response.statusText}`;
                }
                
                if (errorText && errorText !== '无法读取错误响应') {
                    errorMessage += `\n\n服务器错误详情：${errorText}`;
                }
                
                throw new Error(errorMessage);
            }

            // 处理流式响应
            if (requestBody.stream) {
                const result = await this.handleStreamResponse(response, conversationContainer, question);
                
                // 将当前对话添加到会话历史中
                this.addToCurrentSessionHistory(question, result);
                
                return result;
            } else {
                // 处理非流式响应
                const data = await response.json();
                
                let result = '';
                // 根据不同的API格式解析响应
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    result = data.choices[0].message.content;
                } else if (data.response) {
                    result = data.response;
                } else if (data.content) {
                    result = data.content;
                } else {
                    result = JSON.stringify(data);
                }
                
                // 更新标题显示完成状态和用时
                if (this.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - this.startTime) / 1000);
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = `完成回答，用时 ${duration} 秒`;
                    }
                }
                
                return result;
            }
            
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 直接抛出原始错误，由上层统一处理
            throw error;
        }
    }
    async callOllamaAPI(question, pageContent, pageUrl, provider, model, knowledgeBaseId = null, parameterRule, container = null) {
        // 重新设置开始时间，确保每次对话都有正确的计时
        this.startTime = Date.now();
        
        // 重置停止状态，确保每次对话都有正确的状态
        this.hasBeenStopped = false;
        
        // 注意：不要重置知识库使用状态，保持streamChat中设置的状态
        // this._useKnowledgeBaseThisTime = false; // 注释掉这行，保持streamChat中设置的状态
        
        // 检查是否是第一次对话
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (container) {
            // 如果传入了容器，直接使用
            conversationContainer = container;
            console.log('使用传入的容器:', conversationContainer);
        } else if (isFirstConversation) {
            // 第一次对话，使用默认容器
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                this.resultContainer.style.display = 'block';
            }
        } else {
            // 后续对话，创建新容器
            conversationContainer = this.createNewConversationContainer();
        }
        
        console.log("-----question",question);
        console.log("-----pageContent",pageContent);
        console.log("-----pageUrl",pageUrl);
        console.log("-----provider",provider);
        console.log("-----model",model);
        
        // 显示问题
        this.updateQuestionDisplay(question, conversationContainer);
        
        // 显示AI助手
        this.updateAIDisplay(conversationContainer);
        
        // 使用提示容器设置提示语
        const resultText = conversationContainer.querySelector('.result-text');
        if (resultText) {
            let tipsEl = resultText.querySelector('.result-text-tips');
            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }
            // 如果之前streamChat已设置过知识库提示，这里不覆盖；否则设置通用提示
            if (!tipsEl.textContent || tipsEl.textContent.trim() === '') {
                tipsEl.textContent = '正在处理您的问题，请稍候...';
            }
            // 确保内容容器存在
            let contentEl = resultText.querySelector('.result-text-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }
        }
        
        // 更新标题为生成中状态
        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = '生成回答中...';
        }
        
        this.updateLayoutState();
        
        // 构建上下文内容
        var context = '';
        
        // 检查 pageContent 是否包含知识库查询结果（通常包含相似度信息）
        if (pageContent.includes('相似度：') || pageContent.includes('版本：')) {
            // 这是知识库查询结果，直接使用
            context = `知识库查询结果：\n${pageContent}`;
            console.log('使用知识库查询结果作为上下文');
        } else {
            // 这是普通页面内容，按原方式处理
            context = `页面URL: ${pageUrl}\n页面内容: ${pageContent.substring(0, 2000)}...`;
            console.log('使用页面内容作为上下文');
        }
        
        // 构建系统提示词
        let systemContent = "你是一个智能问答助手，基于用户提供的内容来回答问题。请提供准确、有用的回答。";
        
        // 添加参数规则调试信息
        console.log('=== 参数规则调试信息 ===');
        console.log('parameterRule:', parameterRule);
        if (parameterRule) {
            console.log('parameterRule.prompt:', parameterRule.prompt);
            console.log('parameterRule.similarity:', parameterRule.similarity);
            console.log('parameterRule.topN:', parameterRule.topN);
            console.log('parameterRule.temperature:', parameterRule.temperature);
        }
        console.log('========================');
        console.log('知识库处理后的systemContent:', systemContent);
        
        // 如果选择了参数规则，使用规则中的提示词
        if (parameterRule && parameterRule.prompt) {
            systemContent = parameterRule.prompt;
            console.log('使用参数规则提示词，更新后的systemContent:', systemContent);
        }
        // 如果选择了知识库，添加知识库信息
        if (knowledgeBaseId) {
            try {
                // 尝试解析知识库对象
                const knowledgeBase = JSON.parse(knowledgeBaseId);
                if (knowledgeBase.name) {
                    systemContent += `\n\n请结合${knowledgeBase.name}的专业知识来回答问题。`;
                }
            } catch (parseError) {
                // 如果解析失败，尝试使用知识库管理器获取
                const knowledgeBase = window.knowledgeBaseManager?.getKnowledgeBaseById(knowledgeBaseId);
                if (knowledgeBase) {
                    systemContent += `\n\n请结合${knowledgeBase.name}的专业知识来回答问题。`;
                }
            }
            context = `基于以下内容回答问题：\n\n${context}\n\n问题：${question}`
        }else{
            systemContent = "你是一个智能问答助手，基于用户提供的页面内容来回答问题。请提供准确、有用的回答。";
            context = `${question}`
        }
        
        console.log('知识库处理后的systemContent:', systemContent);
        
        // 构建对话历史消息
        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];
        
        // 添加当前会话的历史对话（最多3轮）
        // const recentHistory = this.currentSessionHistory.slice(-6); // 取最近6条消息（3轮对话）
        // messages.push(...recentHistory);
        
        // // 添加当前用户问题（避免重复添加）
        // // 检查历史记录中是否已经包含了当前问题，避免重复
        // const currentQuestionExists = recentHistory.some(msg => 
        //     msg.role === "user" && msg.content === question
        // );
        
        messages.push({
            role: "user",
            content: context
        });
        
        const requestBody = {
            model: model.name,
            messages: messages,
            max_tokens: model.maxTokens || 2048,
            temperature: model.temperature || 0.7,
            stream: true
        };
        
        // 如果选择了参数规则，在请求体中添加参数
        if (parameterRule) {
            if (parameterRule.similarity !== undefined) {
                requestBody.similarity = parameterRule.similarity;
            }
            if (parameterRule.topN !== undefined) {
                requestBody.top_n = parameterRule.topN;
            }
            if (parameterRule.temperature !== undefined) {
                requestBody.temperature = parameterRule.temperature;
            }
            console.log('使用参数规则:', parameterRule);
        }
        // 如果选择了知识库，在请求体中添加知识库ID
        if (knowledgeBaseId) {
            requestBody.knowledge_base_id = knowledgeBaseId;
        }else{
            requestBody.temperature  = 0.7;
        }
        

        const headers = {
            'Content-Type': 'application/json'
        };

        // 设置认证头
        this.setAuthHeaders(headers, provider);
        if(provider.apiEndpoint.indexOf("/chat/completions")>-1){
            provider.apiEndpoint=provider.apiEndpoint
        }else{
            provider.apiEndpoint=provider.apiEndpoint+"/chat/completions"
        }
        try {
            // 初始化中止控制器（覆盖上一阶段，专用于LLM流式）
            this.abortController = new AbortController();
            const response = await fetch(provider.apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal
            });
            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                    console.error('API错误响应体:', errorText);
                } catch (e) {
                    errorText = '无法读取错误响应';
                }

                // 提供更详细的错误信息
                let errorMessage = `API请求失败: ${response.status} ${response.statusText}`;
                
                if (response.status === 400) {
                    errorMessage += '\n请求格式错误，请检查模型配置';
                } else if (response.status === 401) {
                    errorMessage += '\n认证失败，请检查API Key配置';
                } else if (response.status === 403) {
                    errorMessage += '\n权限不足，请检查API Key权限';
                } else if (response.status === 404) {
                    errorMessage += '\nAPI端点不存在，请检查API地址';
                } else if (response.status === 429) {
                    errorMessage += '\n请求频率过高，请稍后重试';
                }
                
                if (errorText) {
                    errorMessage += `\n\n服务器错误详情：${errorText}`;
                }
                
                throw new Error(errorMessage);
            }

            // 处理流式响应
            if (requestBody.stream) {
                const result = await this.handleStreamResponse(response, conversationContainer, question);
                
                // 将当前对话添加到会话历史中
                this.addToCurrentSessionHistory(question, result);
                
                return result;
            } else {
                // 处理非流式响应
                const data = await response.json();
                
                let result = '';
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    result = data.choices[0].message.content;
                } else if (data.response) {
                    result = data.response;
                } else {
                    result = JSON.stringify(data);
                }
                
                // 显示结果
                this.showResult(result, conversationContainer);
                
                // 计算用时并更新标题
                if (this.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - this.startTime) / 1000);
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = `完成回答，用时 ${duration} 秒`;
                    }
                }
                
                // 将当前对话添加到会话历史中
                // this.addToCurrentSessionHistory(question, result);
                
                return result;
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('流式回答请求已中止');
                return '';
            }
            console.error('API调用失败:', error);
            
            // 根据错误类型提供更精准的错误信息
            let errorMessage = '模型服务调用失败';
            
            if (error.message.includes('API请求失败:')) {
                // HTTP请求失败
                const detail = error.message.replace('API请求失败:', '').trim();
                errorMessage = `模型服务请求失败: ${detail}`;
            } else if (error.message.includes('API调用失败:')) {
                // 通用API调用失败
                const detail = error.message.replace('API调用失败:', '').trim();
                errorMessage = `模型服务调用失败: ${detail}`;
            } else if (error.message.includes('网络') || error.message.includes('连接')) {
                // 网络连接问题
                errorMessage = '模型服务网络连接失败，请检查网络连接和API地址';
            } else {
                // 其他错误 - 直接使用原始错误信息，避免重复添加前缀
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    }
    // 处理流式响应的方法
    async handleStreamResponse(response, container = null, question = '') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let fullContent = '';
        let lastUpdateTime = 0;
        let updateQueue = [];
        let isUpdating = false;

        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;

        // 初始化结果区域的结构：tips 和 content 容器
        let tipsEl = null;
        let contentEl = null;
        if (resultText) {
            // 尝试获取已存在的元素
            tipsEl = resultText.querySelector('.result-text-tips');
            contentEl = resultText.querySelector('.result-text-content');

            // 如果不存在则创建，避免被外部清空的情况
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

            // 保留已存在的内容，不在此处清空，避免"停止"后内容被清除
        }
        
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
        
        // 清理格式缓存和表格状态
        this.clearFormatCache();
        this.resetTableState();
        
        // 确保resultText可见
        if (resultText) {
            resultText.style.display = 'block';
            resultText.style.minHeight = '100px';
            resultText.style.padding = '10px';
            resultText.style.backgroundColor = '#fff';
        }

        // 防抖更新函数
        const debouncedUpdate = async (content) => {
            if (this.hasBeenStopped) {
                return;
            }
            if (!content || content.length === 0) {
                return;
            }
            const now = Date.now();
            if (now - lastUpdateTime < 100) { // 100ms防抖
                return;
            }
            lastUpdateTime = now;
            
            if (isUpdating) {
                updateQueue.push(content);
                return;
            }
            
            isUpdating = true;
            try {
                // 在格式化之前检查是否需要更新提示信息
                this.updateProgressMessagesBeforeFormat(content);
                
                const formattedContent = this.formatContent(content);
                if (contentEl) {
                    contentEl.innerHTML = formattedContent;
                } else {
                    // 兜底：如果未能获取到contentEl，避免抛错
                    this.resultText.innerHTML = formattedContent;
                }
                
                // 平滑滚动到底部
                if (this.resultContainer) {
                    this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
                }
            } finally {
                isUpdating = false;
                
                // 处理队列中的更新
                if (updateQueue.length > 0) {
                    const nextContent = updateQueue.pop();
                    updateQueue = []; // 清空队列，只处理最新的
                    setTimeout(() => debouncedUpdate(nextContent), 50);
                }
            }
        };

        console.log('开始读取流式数据...');

        while (true) {
            if (this.hasBeenStopped) {
                console.log('检测到停止标志，结束流式处理');
                break;
            }
            const { done, value } = await reader.read();
            if (done) {
                console.log('流式读取完成');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            console.log('接收到数据块，长度:', chunk.length, 'buffer总长度:', buffer.length);
            
            // 处理每一行（SSE每行以data: 开头）
            let lines = buffer.split('\n');
            buffer = lines.pop(); // 可能最后一行不完整，留到下次

            for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6); // 移除 'data: ' 前缀
                    
                    // 检查是否是结束标记
                    if (dataStr.trim() === '[DONE]') {
                        console.log('流式响应结束');
                        // 最终更新，确保所有内容都显示（若未被手动停止）
                        const finalFormattedContent = this.formatContent(fullContent);
                        if (contentEl) {
                            contentEl.innerHTML = finalFormattedContent;
                        } else {
                            this.resultText.innerHTML = finalFormattedContent;
                        }
                        
                        // 设置最终提示
                        if (tipsEl) {
                            if (this._useKnowledgeBaseThisTime) {
                                const count = typeof this._kbMatchCount === 'number' ? this._kbMatchCount : 0;
                                if (count === 0) {
                                    tipsEl.innerHTML = `搜索知识库完成<br>匹配到0条知识库<br>暂无相关知识库，我们也会很快补充完善！<br><strong>温馨提示：</strong>
                                    1.您可以尝试降低相似度，切换成灵活检索；<br>2.您可以尝试将问题描述更加具体精细化`;
                                } else {
                                    tipsEl.innerHTML = `搜索知识库完成<br>匹配到${count}条知识库<br>已完成思考，结果如下：`;
                                }
                            } else {
                                tipsEl.textContent = '处理完成，结果如下：';
                            }
                        }
                        
                        // 在流式输出结束后，如果使用了知识库且有条目，展示"参考知识库"列表
                        if (!this.hasBeenStopped && this._useKnowledgeBaseThisTime && Array.isArray(this._kbItems) && this._kbItems.length > 0) {
                            console.log('=== 准备渲染知识库列表 ===');
                            console.log('hasBeenStopped:', this.hasBeenStopped);
                            console.log('_useKnowledgeBaseThisTime:', this._useKnowledgeBaseThisTime);
                            console.log('_kbItems:', this._kbItems);
                            console.log('_kbItems.length:', this._kbItems.length);
                            console.log('targetContainer:', targetContainer);
                            console.log('流式处理完成，渲染知识库列表，条目数量:', this._kbItems.length);
                            this.renderKnowledgeList(this._kbItems, targetContainer);
                        } else {
                            console.log('=== 不渲染知识库列表的原因 ===');
                            console.log('hasBeenStopped:', this.hasBeenStopped);
                            console.log('_useKnowledgeBaseThisTime:', this._useKnowledgeBaseThisTime);
                            console.log('_kbItems:', this._kbItems);
                            console.log('_kbItems type:', typeof this._kbItems);
                            console.log('Array.isArray(_kbItems):', Array.isArray(this._kbItems));
                            console.log('_kbItemsLength:', Array.isArray(this._kbItems) ? this._kbItems.length : 'not array');
                            console.log('流式处理完成，不渲染知识库列表');
                        }
                        
                        // 延迟执行提示信息替换，确保DOM更新完成
                        setTimeout(() => {
                            this.replaceProgressMessagesAfterStream();
                        }, 100);
                        
                        // 重置反馈按钮状态
                        this.resetFeedbackButtons();
                        
                        // 更新标题显示完成状态和用时
                        if (this.startTime) {
                            const endTime = Date.now();
                            const duration = Math.round((endTime - this.startTime) / 1000);
                            const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                            if (resultTitle) {
                                resultTitle.textContent = `完成回答，用时 ${duration} 秒`;
                            }
                        }
                        
                        // 将当前对话添加到会话历史中
                        this.addToCurrentSessionHistory(question, fullContent);
                        
                        return fullContent;
                    }
                    
                    try {
                        const data = JSON.parse(dataStr);
                        
                        // 处理OpenAI格式的流式响应
                        if (data.choices && data.choices[0] && data.choices[0].delta) {
                            const delta = data.choices[0].delta;
                            if (delta.content) {
                                console.log('接收到内容:', delta.content);
                                fullContent += delta.content;
                                
                                // 使用防抖更新显示内容
                                await debouncedUpdate(fullContent);
                            }
                        }
                        // 处理其他可能的格式
                        else if (data.content) {
                            console.log('接收到内容:', data.content);
                            fullContent += data.content;
                            
                            // 使用防抖更新显示内容
                            await debouncedUpdate(fullContent);
                        }
                        
                    } catch (parseError) {
                        console.error('解析流式数据失败:', parseError, '原始数据:', line);
                    }
                }
            }
        }
        
        console.log('流式读取循环结束');
        if (this.hasBeenStopped) {
            // 停止时不继续后续完成逻辑
            return fullContent;
        }
        console.log('最终累积内容长度:', fullContent.length);
        
        // 延迟执行提示信息替换，确保DOM更新完成
        setTimeout(() => {
            this.replaceProgressMessagesAfterStream();
        }, 100);
        
        // 返回完整的累积内容
        return fullContent;
    }

    // 流式聊天方法（使用配置的URL和API Key）
    async streamChatWithConfig(message, model, provider, knowledgeBaseId = null, parameterRule = null, container = null) {
        try {
            // 重新加载知识库服务配置，确保获取最新配置
            console.log('开始流式聊天，重新加载知识库服务配置...');
            await this.loadKnowledgeServiceConfig();
            
            // 从知识库服务配置中获取streamUrl和apiKey
            let streamUrl = '';
            let apiKey = '';
            let apiKeySource = '未配置'; // 记录API Key的来源
            
            console.log('开始配置流式聊天参数...');
            console.log('知识库服务配置:', this.knowledgeServiceConfig);
            
            // 1. 优先从知识库服务配置中获取
            if (this.knowledgeServiceConfig) {
                console.log('检查知识库服务配置...');
                console.log('enabled:', this.knowledgeServiceConfig.enabled);
                console.log('api_key:', this.knowledgeServiceConfig.api_key ? '已配置' : '未配置');
                
                // 使用知识库服务URL作为streamUrl的基础
                const baseUrl = this.knowledgeServiceConfig.default_url;
                if (baseUrl) {
                    // 将知识库服务URL转换为流式聊天URL
                    streamUrl = baseUrl.replace('/knowledge', '/chat/stream');
                    console.log('从知识库服务配置生成streamUrl:', streamUrl);
                }
                
                // 优先使用知识库服务的API密钥（无论是否启用）
                if (this.knowledgeServiceConfig.api_key && this.knowledgeServiceConfig.api_key.trim()) {
                    apiKey = this.knowledgeServiceConfig.api_key.trim();
                    apiKeySource = '知识库服务配置';
                    console.log('使用知识库服务配置的API密钥');
                } else {
                    console.log('知识库服务配置中API密钥为空或未配置');
                }
            } else {
                console.log('知识库服务配置不存在');
            }
            
            // 2. 如果知识库服务配置中没有API Key，从模型配置中获取
            if (!apiKey && model && model.apiKey) {
                apiKey = model.apiKey;
                apiKeySource = '模型配置';
                console.log('使用模型配置的apiKey');
            }
            
            if (!streamUrl && model && model.streamUrl) {
                streamUrl = model.streamUrl;
                console.log('使用模型配置的streamUrl:', streamUrl);
            }
            
            // 3. 如果模型配置中没有，从服务商配置中获取
            if (!apiKey && provider && provider.apiKey) {
                apiKey = provider.apiKey;
                apiKeySource = '服务商配置';
                console.log('使用服务商配置的apiKey');
            }
            
            if (!streamUrl && provider && provider.streamUrl) {
                streamUrl = provider.streamUrl;
                console.log('使用服务商配置的streamUrl:', streamUrl);
            }
            
            // 4. 如果都没有配置，提示用户配置
            if (!streamUrl) {
                this.showMessage('请先在设置页面配置流式聊天URL', 'error');
                // this.openSettings();
                throw new Error('未配置流式聊天URL，请先在设置页面配置');
            }
            
            // if (!apiKey) {
            //     this.showMessage('请先在设置页面配置API密钥', 'error');
            //     // 移除自动跳转，让用户自己决定是否去设置
            //     throw new Error('未配置API密钥，请先在设置页面配置');
            // }
            
            console.log('=== 流式聊天配置总结 ===');
            console.log('streamUrl:', streamUrl);
            console.log('apiKey来源:', apiKeySource);
            console.log('apiKey:', apiKey ? `${apiKey.substring(0, 10)}...` : '未配置');
            console.log('model:', model ? model.name : '未配置');
            console.log('provider:', provider ? provider.name : '未配置');
            console.log('message:', message);
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('parameterRule:', parameterRule);
            console.log('知识库服务配置:', this.knowledgeServiceConfig);
            console.log('========================');
            
            // 调用更新后的streamChat方法，传入配置的参数和模型信息
            return await this.streamChat(message, streamUrl, apiKey, knowledgeBaseId, parameterRule, model, provider, container);
            
        } catch (error) {
            console.error('流式聊天配置失败:', error);
            throw new Error(`流式聊天配置失败: ${error.message}`);
        }
    }

    // 流式聊天方法
    async streamChat(message, streamUrl = null, apiKey = null, knowledgeBaseId = null, parameterRule = null, model = null, provider = null, container = null) {
        // 重新设置开始时间，确保每次对话都有正确的计时
        this.startTime = Date.now();
        
        // 重置停止状态，确保每次对话都有正确的状态
        this.hasBeenStopped = false;
        
        // 重置知识库使用状态，确保每次对话都有正确的状态
        this._useKnowledgeBaseThisTime = false;
        
        // 检查必要参数
        if (!streamUrl) {
            this.showMessage('请先在设置页面配置流式聊天URL', 'error');
            // 移除自动跳转，让用户自己决定是否去设置
            throw new Error('未配置流式聊天URL，请先在设置页面配置');
        }
        // if (!apiKey) {
        //     this.showMessage('请先在设置页面配置API密钥', 'error');
        //     // 移除自动跳转，让用户自己决定是否去设置
        //     throw new Error('未配置API密钥，请先在设置页面配置');
        // }
        
        // 界面显示逻辑已移至processQuestion方法中处理，这里不再重复
        
        try {
            console.log('开始知识库查询请求:', message);
            console.log('使用配置 - streamUrl:', streamUrl);
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('parameterRule:', parameterRule);
            console.log('model:', model);
            console.log('provider:', provider);
            
            // 动态获取注册信息
            let userEmail = null;
            let userName = null;
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                if (registration && registration.status === 'registered') {
                    userEmail = registration.email;
                    userName = registration.username;
                    console.log('获取到注册信息:', { email: userEmail, name: userName });
                } else {
                    console.log('未找到有效的注册信息');
                }
            } catch (error) {
                console.error('获取注册信息失败:', error);
            }
            
            // 构建新的请求体格式
            const requestBody = {
                question: message,
                similarity: 0.8,
                topn: 4,
                dataset_name: null,
                // api_url: provider ? provider.apiEndpoint : null,
                // api_key: provider ? provider.apiKey : null,
                // model_name: model ? model.name : "deepseek-r1:32b",
                // api_mode: "openai",
                // email: userEmail,
                // name: userName,
                temperature: 0.7,
                language: "简体中文",
                // prompt: null
            };
            
            // 如果选择了知识库，设置dataset_name
            if (knowledgeBaseId) {
                try {
                    // 尝试解析知识库对象
                    const knowledgeBase = JSON.parse(knowledgeBaseId);
                    if (knowledgeBase.id) {
                        requestBody.dataset_name = knowledgeBase.id;
                        console.log('使用知识库ID作为dataset_name:', knowledgeBase.id);
                    } else {
                        // 如果没有id，使用dataset_name作为备用
                        requestBody.dataset_name = knowledgeBase.dataset_name;
                        console.log('使用知识库dataset_name作为备用:', knowledgeBase.dataset_name);
                    }
                } catch (parseError) {
                    // 如果解析失败，说明可能是旧格式的ID
                    requestBody.dataset_name = knowledgeBaseId;
                    console.log('使用原始knowledgeBaseId作为dataset_name:', knowledgeBaseId);
                }
            }
            
            // 如果选择了参数规则，更新相关参数
            if (parameterRule) {
                if (parameterRule.temperature !== undefined) {
                    requestBody.temperature = parameterRule.temperature;
                }
                if (parameterRule.similarity !== undefined) {
                    requestBody.similarity = parameterRule.similarity;
                }
                if (parameterRule.topN !== undefined) {
                    requestBody.topn = parameterRule.topN;
                }
                // if (parameterRule.prompt) {
                //     requestBody.prompt = parameterRule.prompt;
                // }
                console.log('使用参数规则:', parameterRule);
            }
            
            console.log('最终请求体:', requestBody);
            
            // 发送请求
            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('知识库查询请求失败:', response.status, errorText);
                
                // 根据HTTP状态码提供更精准的错误信息
                let errorMessage = '知识库查询请求失败';
                
                if (response.status === 400) {
                    errorMessage = '知识库查询请求格式错误，请检查请求参数';
                } else if (response.status === 401) {
                    errorMessage = '知识库服务认证失败，请检查API密钥配置';
                } else if (response.status === 403) {
                    errorMessage = '知识库服务权限不足，请检查API密钥权限';
                } else if (response.status === 404) {
                    errorMessage = '知识库服务地址不存在，请检查服务地址配置';
                } else if (response.status === 429) {
                    errorMessage = '知识库服务请求频率过高，请稍后重试';
                } else if (response.status === 500) {
                    errorMessage = '知识库服务内部错误，请稍后重试';
                } else if (response.status === 502 || response.status === 503 || response.status === 504) {
                    errorMessage = '知识库服务暂时不可用，请稍后重试';
                } else {
                    errorMessage = `知识库查询请求失败: ${response.status} - ${errorText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            // 处理非流式响应
            const responseData = await response.json();
            console.log('知识库查询响应:', responseData);
            
            // 检查响应格式
            if (responseData.status !== "200") {
                throw new Error(`知识库查询失败: ${responseData.message || '未知错误'}`);
            }
            
            // 提取data数组中的内容，并更新提示
            let contextContent = '';
            let matchCount = 0;
            if (responseData.data && Array.isArray(responseData.data)) {
                contextContent = responseData.data.join('\n\n');
                matchCount = responseData.data.length;
                // 存储完整知识库条目，供结束后展示
                this._kbItems = responseData.data.map(item => (typeof item === 'string' ? item : String(item)));
                console.log('提取的知识库内容:', contextContent);
            } else {
                console.warn('响应中没有找到data数组或data不是数组格式');
                this._kbItems = [];
            }
            
            // 设置用于最终提示的状态
            this._useKnowledgeBaseThisTime = !!knowledgeBaseId;
            this._kbMatchCount = matchCount;
            
            console.log('=== streamChat 知识库状态设置 ===');
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('_useKnowledgeBaseThisTime:', this._useKnowledgeBaseThisTime);
            console.log('_kbMatchCount:', this._kbMatchCount);
            console.log('_kbItems:', this._kbItems);
            console.log('_kbItems.length:', this._kbItems ? this._kbItems.length : 'null');
            
            // 如果选择了知识库且接口返回了数据，更新提示为3行（思考中）
            if (knowledgeBaseId) {
                // 使用传入的container参数而不是this.resultText
                const targetContainer = container || this.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
                const tipsEl = resultText?.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = `正在搜索知识库...<br>匹配到${matchCount}条知识库<br>正在思考，请稍等...`;
                }
            }
            
            // 如果知识库返回0条，直接提示并终止，不调用大模型
            if (knowledgeBaseId && matchCount === 0) {
                // 使用传入的container参数而不是this.resultText
                const targetContainer = container || this.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
                const tipsEl = resultText?.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = `搜索知识库完成<br>匹配到${matchCount}条知识库<br>暂无相关知识库，我们也会很快补充完善！<br><strong>温馨提示：</strong>
                                    1.您可以尝试降低相似度，切换成灵活检索；<br>2.您可以尝试将问题描述更加具体精细化；`;
                }
                // 清空知识库列表
                const knowlistEl = resultText?.querySelector('.result-text-knowlist');
                if (knowlistEl) {
                    knowlistEl.innerHTML = '';
                }
                // 可选：更新标题为完成状态
                if (this.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - this.startTime) / 1000);
                    const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = `完成回答，用时 ${duration} 秒`;
                    }
                }
                // 内容区保持为空，不报错
                return '';
            }
            
            // 如果没有获取到知识库内容，使用原始页面内容
            if (!contextContent.trim()) {
                console.log('未获取到知识库内容，使用原始页面内容');
                // 这里可以获取当前页面的内容作为备用
                // const pageContent = await this.getPageSummary();
                contextContent = pageContent || '无法获取页面内容';
            }
            
            // 调用 callOllamaAPI 处理最终的回答生成
            console.log('开始调用 callOllamaAPI 生成最终回答');
            try {
                const finalAnswer = await this.callOllamaAPI(
                    message, 
                    contextContent, // 使用知识库查询结果作为context
                    window.location.href, // 页面URL
                    provider,
                    model,
                    knowledgeBaseId,
                    parameterRule,
                    container // 传递当前对话容器
                );
                
                return finalAnswer;
            } catch (modelError) {
                console.error('大模型服务调用失败:', modelError);
                // 直接抛出大模型服务错误，不包装成知识库服务错误
                throw new Error(`大模型服务调用失败: ${modelError.message}`);
            }
            
        } catch (error) {
            console.error('知识库查询失败:', error);
            console.error('错误详情:', error.stack);
            
            // 检查是否是大模型服务错误，如果是则直接抛出，不重新包装
            if (error.message.includes('大模型服务调用失败:') || 
                error.message.includes('模型服务调用失败:') ||
                error.message.includes('API调用失败:')) {
                // 直接抛出大模型服务错误，不重新包装
                throw error;
            }
            
            // 根据错误类型提供更精准的错误信息
            let errorMessage = '知识库查询失败';
            
            if (error.message.includes('请求失败:')) {
                // 网络请求失败
                const detail = error.message.replace('请求失败:', '').trim();
                errorMessage = `知识库服务网络请求失败: ${detail}`;
            } else if (error.message.includes('知识库查询失败:')) {
                // 知识库查询失败
                const detail = error.message.replace('知识库查询失败:', '').trim();
                errorMessage = `知识库查询失败: ${detail}`;
            } else if (error.message.includes('未配置')) {
                // 配置问题
                errorMessage = `知识库服务配置问题: ${error.message}`;
            } else if (error.message.includes('网络') || error.message.includes('连接')) {
                // 网络连接问题
                errorMessage = '知识库服务网络连接失败，请检查网络连接和知识库服务地址';
            } else {
                // 其他错误 - 直接使用原始错误信息，避免重复添加前缀
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    }

    // 格式化内容显示 - 优化版本
    formatContent(content) {
        if (!content) return '';
        
        // 简单的缓存机制，避免重复处理相同内容
        if (this._lastContent === content && this._lastFormattedContent) {
            return this._lastFormattedContent;
        }
        
        // 检查文本是否包含Markdown格式
        const hasMarkdown = /\*\*.*?\*\*|`.*?`|```.*?```|###|####|---/.test(content);
        
        // 如果是纯文本，直接返回pre标签包装的内容
        if (!hasMarkdown) {
            const plainTextContent = `<pre class="plain-text-pre" style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; padding: 0; background: transparent; border: none;">${this.escapeHtml(content)}</pre>`;
            
            // 缓存结果
            this._lastContent = content;
            this._lastFormattedContent = plainTextContent;
            
            return plainTextContent;
        }
        
        let formattedContent = content;
        
        // 先处理表格格式 - 在换行符转换之前
        formattedContent = this.formatTableWithNewlines(formattedContent);
        
        // 处理换行符 - 恢复这行代码
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        // 处理Markdown样式的标题 - 改进处理逻辑
        // 先处理带粗体的标题
        formattedContent = formattedContent.replace(/### \*\*(.*?)\*\*/g, '<h3><strong>$1</strong></h3>');
        formattedContent = formattedContent.replace(/#### \*\*(.*?)\*\*/g, '<h4><strong>$1</strong></h4>');
        
        // 处理普通标题 - 使用更精确的方法
        // 先按<br>分割，然后处理每一行
        const lines = formattedContent.split('<br>');
        const processedLines = lines.map(line => {
            const trimmedLine = line.trim();
            // 检查是否是标题行 - 使用更精确的匹配
            if (trimmedLine.match(/^####\s+/)) {
                const titleText = trimmedLine.substring(5); // 移除 '#### '
                return `<h4>${titleText}</h4>`;
            } else if (trimmedLine.match(/^###\s+/)) {
                const titleText = trimmedLine.substring(4); // 移除 '### '
                return `<h3>${titleText}</h3>`;
            } else if (trimmedLine.match(/^##\s+/)) {
                const titleText = trimmedLine.substring(3); // 移除 '## '
                return `<h2>${titleText}</h2>`;
            } else if (trimmedLine.match(/^#\s+/)) {
                const titleText = trimmedLine.substring(2); // 移除 '# '
                return `<h1>${titleText}</h1>`;
            }
            return line;
        });
        formattedContent = processedLines.join('<br>');
        
        // 处理代码块（多行）
        formattedContent = formattedContent.replace(/```(\w+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        formattedContent = formattedContent.replace(/```\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // 处理行内代码
        formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 处理粗体 - 改进正则表达式，避免贪婪匹配
        formattedContent = formattedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 处理斜体
        formattedContent = formattedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // 处理分割线
        formattedContent = formattedContent.replace(/---/g, '<hr>');
        
        // 处理列表项
        formattedContent = formattedContent.replace(/^\d+\. \*\*(.*?)\*\*：/gm, '<li><strong>$1</strong>：');
        formattedContent = formattedContent.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
        formattedContent = formattedContent.replace(/^- \*\*(.*?)\*\*：/gm, '<li><strong>$1</strong>：');
        formattedContent = formattedContent.replace(/^- (.*?)$/gm, '<li>$1</li>');
        
        // 改进blockquote处理 - 修复正则表达式
        // 处理以>开头的行，支持多行blockquote
        // 先按<br>分割，然后处理连续的blockquote行
        const blockquoteLines = formattedContent.split('<br>');
        const processedBlockquoteLines = [];
        let currentBlockquote = [];
        
        for (let i = 0; i < blockquoteLines.length; i++) {
            const line = blockquoteLines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('> ')) {
                // 这是一个blockquote行
                const content = trimmedLine.substring(2); // 移除 '> '
                currentBlockquote.push(content);
            } else {
                // 不是blockquote行，结束表格收集
                if (currentBlockquote.length > 0) {
                    const blockquoteHtml = `<blockquote>${currentBlockquote.join('<br>')}</blockquote>`;
                    processedBlockquoteLines.push(blockquoteHtml);
                    currentBlockquote = [];
                }
                // 添加当前行
                processedBlockquoteLines.push(line);
            }
        }
        
        // 处理最后的blockquote
        if (currentBlockquote.length > 0) {
            const blockquoteHtml = `<blockquote>${currentBlockquote.join('<br>')}</blockquote>`;
            processedBlockquoteLines.push(blockquoteHtml);
        }
        
        formattedContent = processedBlockquoteLines.join('<br>');
        
        // 处理链接
        formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // 改进段落处理 - 避免在已有HTML标签外包装p标签
        // 先分割内容，分别处理表格和非表格部分
        const parts = formattedContent.split(/(<div class="table-container">.*?<\/div>|<h[1-6]>.*?<\/h[1-6]>|<pre>.*?<\/pre>|<blockquote>.*?<\/blockquote>)/g);
        const processedParts = parts.map((part, index) => {
            // 如果是表格部分、标题部分、代码块或blockquote部分，直接返回
            if (part.includes('<div class="table-container">') || 
                part.match(/<h[1-6]>.*?<\/h[1-6]>/) ||
                part.includes('<pre>') ||
                part.includes('<blockquote>')) {
                return part;
            }
            
            // 如果是非特殊部分，进行段落处理
            let processedPart = part;
            
            // 处理连续的<br>标签，但保留单个<br>
            processedPart = processedPart.replace(/(<br>){3,}/g, '</p><p>');
            processedPart = processedPart.replace(/(<br>){2}/g, '</p><p>');
            
            // 包装在段落中，但避免在已有HTML标签外包装
            if (processedPart.trim() && !processedPart.match(/^<[^>]+>.*<\/[^>]+>$/)) {
                processedPart = '<p>' + processedPart + '</p>';
            }
            
            // 清理空的段落，但保留包含<br>的段落
            processedPart = processedPart.replace(/<p><\/p>/g, '');
            
            return processedPart;
        });
        
        formattedContent = processedParts.join('');
        
        // 缓存结果
        this._lastContent = content;
        this._lastFormattedContent = formattedContent;
        
        return formattedContent;
    }

    // 处理表格格式的辅助方法 - 基于\n换行符
    formatTableWithNewlines(content) {
        // 按\n换行符分割内容
        const lines = content.split('\n');
        const processedLines = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // 检查是否开始表格
            if (this.isTableRow(line) && !this.tableState.isInTable) {
                this.tableState.isInTable = true;
                this.tableState.tableStartIndex = i;
                this.tableState.tableLines = [line];
                i++;
                
                // 收集表格的所有行
                while (i < lines.length) {
                    const nextLine = lines[i];
                    
                    // 如果是表格行，继续收集
                    if (this.isTableRow(nextLine)) {
                        this.tableState.tableLines.push(nextLine);
                        i++;
                    } else {
                        // 不是表格行，结束表格收集
                        break;
                    }
                }
                
                // 处理收集到的表格
                const tableHtml = this.processTableLinesWithNewlines(this.tableState.tableLines);
                processedLines.push(tableHtml);
                
                // 重置表格状态
                this.resetTableState();
            } else {
                // 非表格行，直接添加
                processedLines.push(line);
                i++;
            }
        }
        
        const result = processedLines.join('\n');
        return result;
    }

    // 处理表格行集合 - 基于\n换行符
    processTableLinesWithNewlines(tableLines) {
        if (tableLines.length < 2) {
            // 如果表格行数不足，返回原始内容
            return tableLines.join('\n');
        }
        
        // 解析所有行
        const rows = tableLines.map(line => this.parseTableRow(line));
        
        // 过滤掉空行
        const validRows = rows.filter(row => row && row.length > 0);
        
        if (validRows.length === 0) {
            return tableLines.join('\n');
        }
        
        // 检查是否有分隔行
        let hasSeparator = false;
        let headerRow = validRows[0];
        let dataRows = validRows.slice(1);
        
        // 检查第二行是否是分隔行
        if (validRows.length > 1 && this.isTableSeparator(tableLines[1])) {
            hasSeparator = true;
            headerRow = validRows[0];
            dataRows = validRows.slice(2); // 跳过分隔行
        }
        
        // 生成HTML表格
        let tableHtml = '<div class="table-container"><table class="result-table">';
        
        // 添加表头
        if (headerRow && headerRow.length > 0) {
            tableHtml += '<thead><tr>';
            headerRow.forEach(header => {
                tableHtml += `<th>${header}</th>`;
            });
            tableHtml += '</tr></thead>';
        }
        
        // 添加数据行
        if (dataRows.length > 0) {
            tableHtml += '<tbody>';
            dataRows.forEach(row => {
                if (row && row.length > 0) {
                    tableHtml += '<tr>';
                    row.forEach(cell => {
                        // 处理单元格中的<br>标签（来自原始数据）
                        const processedCell = cell.replace(/<br>/g, '<br>');
                        tableHtml += `<td>${processedCell}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody>';
        }
        
        tableHtml += '</table></div>';
        return tableHtml;
    }

    // 渲染消息列表的方法
    renderMessageList(messageList) {
        console.log('开始渲染消息列表，消息数量:', messageList.length);
        
        const resultText = this.resultText;
        if (!resultText) {
            console.error('resultText元素不存在!');
            return;
        }
        
        // 只在第一次调用时清空内容
        if (messageList.length === 1) {
            console.log('首次渲染，清空resultText内容...');
            resultText.innerHTML = '';
        }
        
        // 只渲染最新的消息（最后一条）
        const latestMessage = messageList[messageList.length - 1];
        if (latestMessage && latestMessage.content) {
            console.log(`渲染最新消息:`, latestMessage.content);
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'stream-message';
            messageDiv.style.cssText = `
                margin-bottom: 8px;
                padding: 8px 12px;
                background-color: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #007bff;
                animation: fadeIn 0.3s ease-in;
                display: block;
                word-wrap: break-word;
                white-space: pre-wrap;
            `;
            
            // 添加时间戳（可选）
            const timestamp = latestMessage.timestamp ? new Date(latestMessage.timestamp).toLocaleTimeString() : '';
            const timeText = timestamp ? `<small style="color: #6c757d; font-size: 0.8em;">${timestamp}</small><br>` : '';
            
            messageDiv.innerHTML = `${timeText}${this.escapeHtml(latestMessage.content)}`;
            resultText.appendChild(messageDiv);
            
            console.log(`最新消息已添加到DOM，当前总消息数: ${messageList.length}`);
        }
        
        console.log('消息渲染完成，当前resultText内容长度:', resultText.innerHTML.length);
        
        // 添加CSS动画
        if (!document.getElementById('stream-animation-style')) {
            const style = document.createElement('style');
            style.id = 'stream-animation-style';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 测试流式聊天的方法
    async testStreamChat() {
        const testMessage = this.questionInput.value.trim() || '怎么创建表';
        
        this.setLoading(true);
        
        try {
            console.log('开始测试流式聊天...');
            console.log('测试消息:', testMessage);
            console.log('resultText元素:', this.resultText);
            console.log('resultContainer元素:', this.resultContainer);
            
            // 检查DOM元素是否正确初始化
            if (!this.resultText) {
                throw new Error('resultText元素未找到，请检查DOM初始化');
            }
            
            if (!this.resultContainer) {
                throw new Error('resultContainer元素未找到，请检查DOM初始化');
            }
            
            // 获取当前选择的模型和服务商
            const selectedModelValue = this.modelSelect.value;
            if (!selectedModelValue) {
                throw new Error('请先选择一个模型');
            }
            
            let selectedKey;
            try {
                selectedKey = JSON.parse(selectedModelValue);
            } catch (_) {
                selectedKey = { name: selectedModelValue };
            }
            
            const selectedModel = this.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
            const provider = selectedModel ? this.providers.find(p => p.name === selectedModel.provider) : null;
            
            if (!selectedModel || !provider) {
                throw new Error('配置的模型或服务商不存在，请检查设置');
            }
            
            // 清空并准备显示区域
            this.resultText.innerHTML = '';
            this.resultContainer.style.display = 'block';
            this.resultText.style.display = 'block';
            
            // 添加一个测试消息来验证显示
            const testDiv = document.createElement('div');
            testDiv.style.cssText = `
                padding: 10px;
                background-color: #e7f3ff;
                border: 1px solid #007bff;
                border-radius: 5px;
                margin-bottom: 10px;
                color: #007bff;
            `;
            testDiv.textContent = `正在连接流式API (${provider.name})...`;
            this.resultText.appendChild(testDiv);
            
            console.log('测试消息已添加到DOM');
            console.log('使用模型:', selectedModel.name);
            console.log('使用服务商:', provider.name);
            
            // 尝试调用流式聊天
            const result = await this.streamChatWithConfig(testMessage, selectedModel, provider, null, null, this.resultContainer);
            console.log('流式聊天完成，返回结果:', result);
            console.log('返回结果长度:', result ? result.length : 0);
            
            // 检查返回的结果
            if (result && result.length > 0) {
                console.log('流式聊天成功，结果已显示');
                // 结果已经在streamChat方法中显示，这里不需要额外处理
            } else {
                console.log('流式聊天返回空结果');
                // 如果没有结果，显示提示信息
                const noResultDiv = document.createElement('div');
                noResultDiv.style.cssText = `
                    padding: 10px;
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 5px;
                    margin-bottom: 10px;
                    color: #856404;
                `;
                noResultDiv.textContent = '流式聊天完成，但没有返回内容';
                this.resultText.appendChild(noResultDiv);
            }
            
            // 保存对话历史记录
            this.saveConversationHistory(testMessage, result || '无返回内容', `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, null, '');
            
        } catch (error) {
            console.error('测试流式聊天失败:', error);
            
            // 显示错误信息到结果区域
            if (this.resultText) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    padding: 10px;
                    background-color: #f8d7da;
                    border: 1px solid #dc3545;
                    border-radius: 5px;
                    margin-bottom: 10px;
                    color: #721c24;
                `;
                errorDiv.innerHTML = `<strong>流式聊天测试失败:</strong><br>${error.message}`;
                this.resultText.appendChild(errorDiv);
            }
            
            this.showMessage('流式聊天测试失败: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setAuthHeaders(headers, provider) {
        if (provider.authType === 'Bearer') {
            headers['Authorization'] = `Bearer ${provider.apiKey}`;
        } else if (provider.authType === 'API-Key') {
            // 根据不同的API服务商设置不同的认证头
            const endpoint = provider.apiEndpoint.toLowerCase();
            
            if (endpoint.includes('deepseek')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (endpoint.includes('openai')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (endpoint.includes('anthropic') || endpoint.includes('claude')) {
                headers['x-api-key'] = provider.apiKey;
            } else if (endpoint.includes('google') || endpoint.includes('gemini')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (endpoint.includes('baidu') || endpoint.includes('wenxin')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (endpoint.includes('ali') || endpoint.includes('tongyi')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (endpoint.includes('zhipu') || endpoint.includes('glm')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else {
                // 默认尝试多种常见的头名称
                headers['X-API-Key'] = provider.apiKey;
                headers['x-api-key'] = provider.apiKey;
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            }
        }
    }

    async getPageSummary() {
        // 检查resultText区域是否有内容
        const resultContent = this.resultText.textContent.trim();
        
        if (!resultContent) {
            this.showMessage('请先生成一些内容，然后点击页面摘要按钮', 'info');
            return;
        }
        
        this.setLoading(true);
        
        try {
            // 直接对resultText区域的内容生成摘要
            const summary = await this.generateSummaryFromText(resultContent);
            this.showSummaryDialog(summary);
        } catch (error) {
            console.error('生成摘要失败:', error);
            this.showMessage('生成摘要时发生错误', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // 显示摘要弹窗
    showSummaryDialog(summary) {
        // 创建摘要弹窗
        const summaryDialog = document.createElement('div');
        summaryDialog.id = 'summaryDialog';
        summaryDialog.className = 'dialog-overlay';
        summaryDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        summaryDialog.innerHTML = `
            <div class="dialog-content" style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                max-height: 80vh;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease;
            ">
                <div class="dialog-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                ">
                    <h3 style="
                        margin: 0;
                        color: #333;
                        font-size: 18px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <span style="font-size: 20px;">📄</span>
                        内容摘要
                    </h3>
                    <button id="closeSummaryDialog" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    " title="关闭">×</button>
                </div>
                
                <div class="dialog-body" style="
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                    margin-right: -10px;
                ">
                    <div id="summaryContent" style="
                        white-space: pre-wrap;
                        line-height: 1.6;
                        color: #333;
                        font-size: 14px;
                    ">${this.formatContent(summary)}</div>
                </div>
                
                <div class="dialog-footer" style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #f0f0f0;
                ">
                    <button id="copySummaryBtn" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">复制摘要</button>
                    <button id="closeSummaryBtn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">关闭</button>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(summaryDialog);
        
        // 绑定事件
        const closeSummaryDialog = document.getElementById('closeSummaryDialog');
        const closeSummaryBtn = document.getElementById('closeSummaryBtn');
        const copySummaryBtn = document.getElementById('copySummaryBtn');
        
        // 关闭弹窗事件
        const closeDialog = () => {
            summaryDialog.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (summaryDialog.parentNode) {
                    summaryDialog.parentNode.removeChild(summaryDialog);
                }
            }, 300);
        };
        
        closeSummaryDialog.addEventListener('click', closeDialog);
        closeSummaryBtn.addEventListener('click', closeDialog);
        
        // 点击背景关闭弹窗
        summaryDialog.addEventListener('click', (e) => {
            if (e.target === summaryDialog) {
                closeDialog();
            }
        });
        
        // 复制摘要事件
        copySummaryBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(summary);
                this.showMessage('摘要已复制到剪贴板', 'success');
            } catch (error) {
                console.error('复制失败:', error);
                this.showMessage('复制失败', 'error');
            }
        });
        
        // 添加CSS动画
        if (!document.getElementById('summary-dialog-animation-style')) {
            const style = document.createElement('style');
            style.id = 'summary-dialog-animation-style';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                #closeSummaryDialog:hover {
                    background-color: #f0f0f0;
                }
                
                #copySummaryBtn:hover {
                    background-color: #0056b3;
                }
                
                #closeSummaryBtn:hover {
                    background-color: #545b62;
                }
                
                .dialog-body::-webkit-scrollbar {
                    width: 6px;
                }
                
                .dialog-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `;
            document.head.appendChild(style);
        }
        
        // 聚焦到关闭按钮
        setTimeout(() => {
            closeSummaryDialog.focus();
        }, 100);
    }

    async translateSelection() {
        console.log('翻译按钮被点击');
        
        // 检查resultText区域是否有内容
        const resultContent = this.resultText.textContent.trim();
        console.log('结果区域内容:', resultContent);
        console.log('结果区域长度:', resultContent.length);
        
        if (!resultContent) {
            console.log('没有内容，显示提示消息');
            this.showMessage('请先生成一些内容，然后点击翻译按钮', 'info');
            return;
        }
        
        console.log('开始翻译，显示翻译弹窗');
        // 先显示翻译弹窗，在弹窗中显示翻译进度
        this.showTranslationDialog(resultContent, null, true); // 第三个参数表示正在翻译
        
        try {
            console.log('调用translateText方法');
            // 直接翻译resultText区域的内容
            const translation = await this.translateText(resultContent);
            console.log('翻译完成，结果:', translation);
            console.log('更新翻译弹窗内容');
            // 更新弹窗内容，显示翻译结果
            this.updateTranslationDialog(resultContent, translation);
        } catch (error) {
            console.error('翻译失败:', error);
            // 更新弹窗显示错误信息
            this.updateTranslationDialog(resultContent, `翻译失败: ${error.message}`, false, true);
        }
    }

    // 显示翻译弹窗
    showTranslationDialog(originalText, translatedText, isTranslating = false) {
        console.log('showTranslationDialog被调用');
        console.log('原文:', originalText);
        console.log('译文:', translatedText);
        console.log('是否正在翻译:', isTranslating);
        
        // 检测语言
        const hasChinese = /[\u4e00-\u9fff]/.test(originalText);
        const hasEnglish = /[a-zA-Z]/.test(originalText);
        
        // 确定语言信息
        let sourceLanguage, targetLanguage;
        if (hasChinese && !hasEnglish) {
            sourceLanguage = '中文';
            targetLanguage = '英文';
        } else if (hasEnglish && !hasChinese) {
            sourceLanguage = '英文';
            targetLanguage = '中文';
        } else if (hasChinese && hasEnglish) {
            sourceLanguage = '中英文混合';
            targetLanguage = '英文';
        } else {
            sourceLanguage = '未知语言';
            targetLanguage = '中文';
        }
        
        console.log('语言检测结果:', { sourceLanguage, targetLanguage });
        
        // 创建翻译弹窗
        const translationDialog = document.createElement('div');
        translationDialog.id = 'translationDialog';
        translationDialog.className = 'dialog-overlay';
        translationDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        console.log('创建弹窗元素完成');
        
        // 根据翻译状态生成不同的内容
        let translationContent;
        if (isTranslating) {
            // 翻译中的状态
            translationContent = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #007bff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    "></div>
                    <div style="
                        color: #007bff;
                        font-size: 16px;
                        font-weight: 500;
                        margin-bottom: 8px;
                    ">正在翻译中...</div>
                    <div style="
                        color: #6c757d;
                        font-size: 14px;
                    ">请稍候，AI正在为您翻译</div>
                </div>
            `;
        } else if (translatedText) {
            // 翻译完成的状态
            translationContent = `
                <div style="
                    white-space: pre-wrap;
                    line-height: 1.6;
                    color: #333;
                    font-size: 14px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #b3d9ff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">${this.escapeHtml(translatedText)}</div>
            `;
        } else {
            // 默认状态
            translationContent = `
                <div style="
                    color: #6c757d;
                    font-size: 14px;
                    text-align: center;
                    padding: 20px;
                ">准备翻译...</div>
            `;
        }
        
        translationDialog.innerHTML = `
            <div class="dialog-content" style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 700px;
                max-height: 85vh;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease;
            ">
                <div class="dialog-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h3 style="
                            margin: 0;
                            color: #333;
                            font-size: 18px;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span style="font-size: 20px;">🌐</span>
                            翻译结果
                        </h3>
                        <div style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 500;
                        ">
                            ${sourceLanguage} → ${targetLanguage}
                        </div>
                    </div>
                    <button id="closeTranslationDialog" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    " title="关闭">×</button>
                </div>
                
                <div class="dialog-body" style="
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                    margin-right: -10px;
                ">
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    ">
                        <div style="
                            background: #f8f9fa;
                            border: 1px solid #e9ecef;
                            border-radius: 8px;
                            padding: 16px;
                        ">
                            <h4 style="
                                margin: 0 0 12px 0;
                                color: #495057;
                                font-size: 14px;
                                font-weight: 600;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <span>📝</span>
                                原文 (${sourceLanguage})
                            </h4>
                            <div style="
                                white-space: pre-wrap;
                                line-height: 1.6;
                                color: #333;
                                font-size: 14px;
                                max-height: 200px;
                                overflow-y: auto;
                                padding: 12px;
                                background: white;
                                border-radius: 6px;
                                border: 1px solid #dee2e6;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            ">${this.escapeHtml(originalText)}</div>
                        </div>
                        
                        <div style="
                            background: linear-gradient(135deg, #e7f3ff 0%, #f0f8ff 100%);
                            border: 1px solid #b3d9ff;
                            border-radius: 8px;
                            padding: 16px;
                        ">
                            <h4 style="
                                margin: 0 0 12px 0;
                                color: #0056b3;
                                font-size: 14px;
                                font-weight: 600;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <span>🔄</span>
                                译文 (${targetLanguage})
                            </h4>
                            <div id="translationContent">
                                ${translationContent}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="dialog-footer" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #f0f0f0;
                ">
                    <div style="
                        color: #6c757d;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span>⚡</span>
                        由AI智能翻译
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button id="copyTranslationBtn" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            ${isTranslating ? 'display: none;' : ''}
                        ">
                            <span>📋</span>
                            复制译文
                        </button>
                        <button id="closeTranslationBtn" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.2s;
                        ">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加CSS动画
        if (!document.getElementById('translation-dialog-animation-style')) {
            const style = document.createElement('style');
            style.id = 'translation-dialog-animation-style';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                #closeTranslationDialog:hover {
                    background-color: #f0f0f0;
                }
                
                #copyTranslationBtn:hover {
                    background-color: #0056b3;
                }
                
                #closeTranslationBtn:hover {
                    background-color: #545b62;
                }
                
                .dialog-body::-webkit-scrollbar {
                    width: 6px;
                }
                
                .dialog-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('弹窗HTML设置完成');
        
        // 添加到页面
        document.body.appendChild(translationDialog);
        console.log('弹窗已添加到页面');
        
        // 绑定事件
        const closeTranslationDialog = document.getElementById('closeTranslationDialog');
        const closeTranslationBtn = document.getElementById('closeTranslationBtn');
        const copyTranslationBtn = document.getElementById('copyTranslationBtn');
        
        console.log('获取按钮元素:', { closeTranslationDialog, closeTranslationBtn, copyTranslationBtn });
        
        // 关闭弹窗事件
        const closeDialog = () => {
            console.log('关闭弹窗');
            translationDialog.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (translationDialog.parentNode) {
                    translationDialog.parentNode.removeChild(translationDialog);
                }
            }, 300);
        };
        
        closeTranslationDialog.addEventListener('click', closeDialog);
        closeTranslationBtn.addEventListener('click', closeDialog);
        
        // 点击背景关闭
        translationDialog.addEventListener('click', (e) => {
            if (e.target === translationDialog) {
                closeDialog();
            }
        });
        
        // ESC键关闭
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
        
        // 复制译文（只在翻译完成后显示）
        if (copyTranslationBtn) {
            copyTranslationBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(translatedText);
                    
                    // 显示复制成功提示
                    const originalText = copyTranslationBtn.innerHTML;
                    copyTranslationBtn.innerHTML = '<span>✅</span> 已复制';
                    copyTranslationBtn.style.background = '#28a745';
                    
                    setTimeout(() => {
                        copyTranslationBtn.innerHTML = originalText;
                        copyTranslationBtn.style.background = '#007bff';
                    }, 2000);
                    
                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage('复制失败，请手动复制', 'error');
                }
            });
        }
        
        // 按钮悬停效果
        [closeTranslationDialog, closeTranslationBtn, copyTranslationBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.05)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                });
            }
        });
        
        // 自动聚焦到关闭按钮
        setTimeout(() => {
            closeTranslationBtn.focus();
        }, 100);
        
        console.log('弹窗事件绑定完成');
    }
    
    // 更新翻译弹窗内容
    updateTranslationDialog(originalText, translatedText, showCopyButton = true, isError = false) {
        const translationContent = document.getElementById('translationContent');
        const copyTranslationBtn = document.getElementById('copyTranslationBtn');
        
        if (!translationContent) {
            console.error('找不到translationContent元素');
            return;
        }
        
        if (isError) {
            // 显示错误信息
            translationContent.innerHTML = `
                <div style="
                    color: #dc3545;
                    font-size: 14px;
                    text-align: center;
                    padding: 20px;
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 6px;
                ">
                    <div style="margin-bottom: 8px;">❌ 翻译失败</div>
                    <div style="font-size: 12px; color: #721c24;">${translatedText}</div>
                </div>
            `;
        } else {
            // 显示翻译结果
            translationContent.innerHTML = `
                <div style="
                    white-space: pre-wrap;
                    line-height: 1.6;
                    color: #333;
                    font-size: 14px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #b3d9ff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">${this.escapeHtml(translatedText)}</div>
            `;
        }
        
        // 显示复制按钮
        if (copyTranslationBtn && showCopyButton && !isError) {
            copyTranslationBtn.style.display = 'flex';
            
            // 重新绑定复制事件
            copyTranslationBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(translatedText);
                    
                    // 显示复制成功提示
                    const originalText = copyTranslationBtn.innerHTML;
                    copyTranslationBtn.innerHTML = '<span>✅</span> 已复制';
                    copyTranslationBtn.style.background = '#28a745';
                    
                    setTimeout(() => {
                        copyTranslationBtn.innerHTML = originalText;
                        copyTranslationBtn.style.background = '#007bff';
                    }, 2000);
                    
                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage('复制失败，请手动复制', 'error');
                }
            };
        }
        
        console.log('翻译弹窗内容已更新');
    }

    async translateText(text) {
        try {
            // 检测语言
            const hasChinese = /[\u4e00-\u9fff]/.test(text);
            const hasEnglish = /[a-zA-Z]/.test(text);
            
            // 确定翻译方向
            let targetLanguage, sourceLanguage;
            if (hasChinese && !hasEnglish) {
                // 纯中文翻译为英文
                sourceLanguage = '中文';
                targetLanguage = '英文';
            } else if (hasEnglish && !hasChinese) {
                // 纯英文翻译为中文
                sourceLanguage = '英文';
                targetLanguage = '中文';
            } else if (hasChinese && hasEnglish) {
                // 中英混合，翻译为英文
                sourceLanguage = '中英文混合';
                targetLanguage = '英文';
            } else {
                // 其他语言，尝试翻译为中文
                sourceLanguage = '未知语言';
                targetLanguage = '中文';
            }
            
            // 获取用户选择的模型和服务商
            const selectedModelValue = this.modelSelect.value;
            if (!selectedModelValue) {
                throw new Error('请先选择一个模型');
            }
            
            let selectedKey;
            try {
                selectedKey = JSON.parse(selectedModelValue);
            } catch (_) {
                selectedKey = { name: selectedModelValue };
            }
            
            const selectedModel = this.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
            const provider = selectedModel ? this.providers.find(p => p.name === selectedModel.provider) : null;
            
            if (!selectedModel || !provider) {
                throw new Error('配置的模型或服务商不存在，请检查设置');
            }
            
            // 构建翻译提示词
            const translationPrompt = `请将以下${sourceLanguage}文本翻译成${targetLanguage}，要求：
1. 保持原文的意思和语气
2. 翻译要准确、自然、流畅
3. 如果是技术术语，请使用标准的翻译
4. 只返回翻译结果，不要添加任何解释或标记

原文：
${text}

翻译结果：`;
            
            // 使用AI API进行翻译
            const translatedText = await this.callAIAPI(
                translationPrompt,
                '', // 不需要页面内容
                '', // 不需要页面URL
                provider,
                selectedModel
            );
            
            // 清理翻译结果，移除可能的AI前缀
            let cleanTranslation = translatedText.trim();
            
            // 移除常见的AI前缀
            const prefixes = [
                '翻译结果：', 'Translation:', '翻译：', 'Translated text:',
                'AI翻译：', 'AI Translation:', '结果：', 'Result:'
            ];
            
            for (const prefix of prefixes) {
                if (cleanTranslation.startsWith(prefix)) {
                    cleanTranslation = cleanTranslation.substring(prefix.length).trim();
                    break;
                }
            }
            
            return cleanTranslation || translatedText;
            
        } catch (error) {
            console.error('翻译处理失败:', error);
            
            // 如果AI翻译失败，提供备用方案
            const hasChinese = /[\u4e00-\u9fff]/.test(text);
            const hasEnglish = /[a-zA-Z]/.test(text);
            
            if (hasChinese && !hasEnglish) {
                return `[翻译失败] ${error.message || '请检查网络连接或AI服务配置'}。原文：${text}`;
            } else if (hasEnglish && !hasChinese) {
                return `[Translation failed] ${error.message || 'Please check network connection or AI service configuration'}. Original text: ${text}`;
            } else {
                return `[翻译失败] ${error.message || 'Please check network connection or AI service configuration'}. Original text: ${text}`;
            }
        }
    }

    openSettings(scrollToSection = null) {
        const settingsUrl = chrome.runtime.getURL('settings.html');
        if (scrollToSection) {
            chrome.tabs.create({ url: `${settingsUrl}#${scrollToSection}` });
        } else {
            chrome.tabs.create({ url: settingsUrl });
        }
    }

    openFullPage() {
        // 发送消息给background script来打开完整页面
        chrome.runtime.sendMessage({action: 'openFullPage'}, (response) => {
            if (response && response.success) {
                console.log('成功打开完整页面');
            } else {
                console.error('打开完整页面失败:', response ? response.error : '未知错误');
                // 如果消息发送失败，直接使用URL打开
                const fullPageUrl = chrome.runtime.getURL('bic_qa_page.html');
                chrome.tabs.create({ url: fullPageUrl });
            }
        });
    }

    // 处理知识库选择变化
    async handleKnowledgeBaseChange() {
        const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
        
        // 如果选择了"不使用知识库"，清空知识库列表
        if (!selectedKnowledgeBase || selectedKnowledgeBase === '不使用知识库') {
            console.log('handleKnowledgeBaseChange: 选择不使用知识库，清空知识库列表');
            const knowlistEl = this.resultText?.querySelector('.result-text-knowlist');
            if (knowlistEl) {
                knowlistEl.innerHTML = '';
                console.log('知识库列表已清空');
            }
            // 重置状态变量
            this._useKnowledgeBaseThisTime = false;
            this._kbMatchCount = 0;
            this._kbItems = [];
            return;
        }
        
        // 如果选择了知识库（不是"不使用知识库"），检查知识库服务配置
        if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库') {
            // 重新加载知识库服务配置，确保获取最新配置
            console.log('选择知识库，重新加载配置...');
            await this.loadKnowledgeServiceConfig();
            
            // 检查知识库服务配置
            if (!this.knowledgeServiceConfig) {
                this.showMessage('请先在设置页面配置知识库服务连接信息', 'error');
                return;
            }
            
            // 检查知识库服务URL是否配置
            if (!this.knowledgeServiceConfig.default_url || this.knowledgeServiceConfig.default_url.trim() === '') {
                this.showMessage('请先在设置页面配置知识库服务URL', 'error');
                // 提供跳转选项
                setTimeout(() => {
                    if (confirm('是否跳转到设置页面配置知识库服务URL？')) {
                        this.openSettings('knowledge-service-config');
                    }
                }, 1000);
                return;
            }
            
            // 检查知识库服务API密钥是否配置
            if (!this.knowledgeServiceConfig.api_key || this.knowledgeServiceConfig.api_key.trim() === '') {
                this.showMessage('请先在设置页面配置知识库服务API密钥', 'error');
                // 提供跳转选项
                // setTimeout(() => {
                //     if (confirm('是否跳转到设置页面配置知识库服务API密钥？')) {
                //         this.openSettings('knowledge-service-config');
                //     }
                // }, 1000);
                return;
            }
            
            // 配置完整，不显示任何提示
            console.log('知识库服务配置检查完成，配置有效');
        }
    }

    setLoading(loading) {
        if (!this.askButton) return;
        if (loading) {
            // 切换为停止图标
            if (this.sendIcon) this.sendIcon.style.display = 'none';
            if (this.stopIcon) this.stopIcon.style.display = 'inline';
        } else {
            // 切换为发送图标
            if (this.stopIcon) this.stopIcon.style.display = 'none';
            if (this.sendIcon) this.sendIcon.style.display = 'inline';
            this.updateButtonState();
        }
    }

    updateButtonState() {
        if (!this.questionInput || !this.askButton) return;
        
        const hasInput = this.questionInput.value.trim().length > 0;
        if (hasInput) {
            this.askButton.classList.add('active');
            this.askButton.disabled = false;
        } else {
            this.askButton.classList.remove('active');
            this.askButton.disabled = true;
        }
    }

    // 更新布局状态
    updateLayoutState() {
        if (!this.contentArea || !this.resultContainer) return;
        
        const hasResult = this.resultContainer.style.display !== 'none';
        
        if (hasResult) {
            this.contentArea.classList.remove('no-result');
            this.contentArea.classList.add('has-result');
        } else {
            this.contentArea.classList.remove('has-result');
            this.contentArea.classList.add('no-result');
        }
    }

    showResult(text, container = null) {
        if (this.hasBeenStopped) {
            // 用户主动停止后，不覆盖/清空已渲染的内容
            return;
        }
        
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        if (targetContainer) {
            const errorMsgDiv = targetContainer.querySelector('.errormsgDiv');
            if (errorMsgDiv && errorMsgDiv.innerHTML.trim() !== '') {
                console.log('检测到错误信息已显示，跳过showResult');
                return;
            }
        }
        
        // 获取结果文本容器
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
        if (!resultText) {
            console.error('未找到结果文本容器');
            return;
        }
        
        // 确保提示与内容容器存在
        let tipsEl = resultText.querySelector('.result-text-tips');
        if (!tipsEl) {
            tipsEl = document.createElement('p');
            tipsEl.className = 'result-text-tips';
            resultText.appendChild(tipsEl);
        }
        
        let contentEl = resultText.querySelector('.result-text-content');
        if (!contentEl) {
            contentEl = document.createElement('div');
            contentEl.className = 'result-text-content';
            resultText.appendChild(contentEl);
        }
        
        let knowlistEl = resultText.querySelector('.result-text-knowlist');
        if (!knowlistEl) {
            knowlistEl = document.createElement('div');
            knowlistEl.className = 'result-text-knowlist';
            resultText.appendChild(knowlistEl);
        }

        // 渲染结果到内容容器
        contentEl.innerHTML = this.formatContent(text);
        
        // 结束提示
        if (this._useKnowledgeBaseThisTime) {
            const count = typeof this._kbMatchCount === 'number' ? this._kbMatchCount : 0;
            if (count === 0) {
                tipsEl.innerHTML = `搜索知识库完成<br>匹配到${count}条知识库<br>暂无相关知识库，我们也会很快补充完善！<br><strong>温馨提示：</strong>
                                1.您可以尝试降低相似度，切换成灵活检索；<br>2.您可以尝试将问题描述更加具体精细化；`;
            } else {
                tipsEl.innerHTML = `搜索知识库完成<br>匹配到${count}条知识库<br>已完成思考，结果如下：`;
            }
            // 非流式路径完成时，如有知识库结果也展示参考列表
            if (Array.isArray(this._kbItems) && this._kbItems.length > 0) {
                console.log('非流式处理完成，渲染知识库列表，条目数量:', this._kbItems.length);
                this.renderKnowledgeList(this._kbItems, targetContainer);
            } else {
                console.log('非流式处理完成，不渲染知识库列表:', {
                    kbItems: this._kbItems,
                    kbItemsLength: Array.isArray(this._kbItems) ? this._kbItems.length : 'not array'
                });
            }
        } else {
            tipsEl.textContent = '处理完成，结果如下：';
            // 非知识库，强制清空参考列表
            console.log('非知识库模式，清空知识库列表');
            knowlistEl.innerHTML = '';
            console.log('知识库列表已清空');
        }
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 计算用时并更新标题
        if (this.startTime) {
            const endTime = Date.now();
            const duration = Math.round((endTime - this.startTime) / 1000);
            const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
            if (resultTitle) {
                resultTitle.textContent = `完成回答，用时 ${duration} 秒`;
            }
        }
    }

    showMessage(message, type = 'info') {
        // 创建临时消息显示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            z-index: 1000;
            background: ${type === 'error' ? '#e74c3c' : '#3498db'};
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    async copyResult(container = null) {
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
        
        if (!resultText) {
            this.showMessage('没有找到要复制的内容', 'error');
            return;
        }
        
        const text = resultText.textContent;
        try {
            await navigator.clipboard.writeText(text);
            this.showMessage('已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showMessage('复制失败', 'error');
        }
    }

   async exportResultAsHtml(container = null) {
        try {
            // 获取目标容器
            const targetContainer = container || this.resultContainer;
            const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
            
            if (!resultText) {
                this.showMessage('没有找到要导出的内容', 'error');
                return;
            }
            
            // 获取当前时间作为文件名的一部分
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            
            // 获取问题内容作为文件名的一部分
            const questionDisplay = targetContainer ? targetContainer.querySelector('.question-text') : this.questionText;
            const question = questionDisplay ? questionDisplay.textContent.trim() : '未知问题';
            const questionPart = question.length > 20 ? question.substring(0, 20) + '...' : question;
            const safeQuestionPart = questionPart.replace(/[<>:"/\\|?*]/g, '_');
            
            // 生成文件名
            const fileName = `BIC-QA-结果-${safeQuestionPart}-${timestamp}.html`;
            
            // 获取结果内容的HTML
            const resultHtml = resultText.innerHTML;
            
            // 创建完整的HTML文档
            const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIC-QA 结果导出</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            color: #666;
        }
        .question-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        .question-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .question-text {
            color: #555;
            line-height: 1.6;
        }
        .result-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        .result-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .result-content {
            color: #555;
            line-height: 1.6;
        }
        .meta-info {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
            font-size: 12px;
            color: #888;
            text-align: center;
        }
        
        /* 知识库展开/收缩样式 */
        .kb-item {
            margin: 8px 0;
            line-height: 1.6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            transition: all 0.3s ease;
        }
        .kb-item:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .kb-item.expanded {
            background: #fef3c7;
            border-color: #f59e0b;
        }
        .kb-toggle {
            color: #2563eb;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: inline-block;
            margin-left: 8px;
            background: transparent;
        }
        .kb-toggle:hover {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        .kb-toggle.expanded {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .kb-full {
            display: none;
            margin-top: 12px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
            white-space: pre-wrap;
            font-size: 13px;
            line-height: 1.6;
            color: #4b5563;
            max-height: 0;
            overflow: hidden;
            transition: all 0.3s ease;
            opacity: 0;
        }
        .kb-full.expanded {
            display: block;
            max-height: 4000px;
            opacity: 1;
        }
        
        /* Markdown样式 */
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #e1e5e9;
        }
        h4 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 15px 0 8px 0;
        }
        strong {
            font-weight: 600;
            color: #333;
        }
        em {
            font-style: italic;
            color: #666;
        }
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #e83e8c;
            border: 1px solid #e9ecef;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
        }
        pre code {
            background: none;
            padding: 0;
            border: none;
            color: #333;
            font-size: 13px;
            line-height: 1.5;
        }
        blockquote {
            padding: 15px;
            margin: 15px 0;
            color: #666;
            background: #f8f9fa;
            border-radius: 6px;
        }
        hr {
            border: none;
            border-top: 2px solid #e1e5e9;
            margin: 20px 0;
        }
        li {
            margin: 5px 0;
            padding-left: 5px;
        }
        a {
            color: #667eea;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.3s ease;
        }
        a:hover {
            border-bottom-color: #667eea;
        }
        p {
            margin: 10px 0;
        }
        /* 表格样式 */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        th {
            background: #f8f9fa;
            color: #495057;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            border-right: 1px solid #dee2e6;
        }
        th:last-child {
            border-right: none;
        }
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #dee2e6;
            border-right: 1px solid #dee2e6;
            vertical-align: top;
            word-wrap: break-word;
            max-width: 200px;
            white-space: pre-line;
            line-height: 1.4;
        }
        td:last-child {
            border-right: none;
        }
        tr:last-child td {
            border-bottom: none;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        tbody tr:nth-child(even) {
            background-color: #fafbfc;
        }
        tbody tr:nth-child(even):hover {
            background-color: #f1f3f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">BIC-QA 智能问答结果</div>
            <div class="subtitle">导出时间：${now.toLocaleString('zh-CN')}</div>
        </div>
        
        <div class="question-section">
            <div class="question-label">问题：</div>
            <div class="question-text">${this.escapeHtml(question)}</div>
        </div>
        
        <div class="result-section">
            <div class="result-label">回答：</div>
            <div class="result-content">${resultHtml}</div>
        </div>
        
        <div class="meta-info">
            <p>由 BIC-QA 扩展生成 | 导出时间：${now.toLocaleString('zh-CN')}</p>
        </div>
    </div>
    
    <script>
        // 知识库展开/收缩功能
        document.addEventListener('DOMContentLoaded', function() {
            // 为所有kb-item下的a标签添加点击事件
            const kbItems = document.querySelectorAll('.kb-item');
            
            kbItems.forEach(function(item) {
                const toggleLink = item.querySelector('a');
                const fullContent = item.querySelector('.kb-full');
                
                if (toggleLink && fullContent) {
                    // 初始化状态
                    toggleLink.textContent = '展开详情';
                    toggleLink.classList.add('kb-toggle');
                    fullContent.classList.add('kb-full');
                    
                    // 添加点击事件
                    toggleLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        const isExpanded = fullContent.classList.contains('expanded');
                        
                        if (isExpanded) {
                            // 收起
                            fullContent.classList.remove('expanded');
                            toggleLink.classList.remove('expanded');
                            item.classList.remove('expanded');
                            toggleLink.textContent = '展开详情';
                            
                            // 延迟隐藏元素
                            setTimeout(() => {
                                if (!fullContent.classList.contains('expanded')) {
                                    fullContent.style.display = 'none';
                                }
                            }, 300);
                        } else {
                            // 展开
                            fullContent.style.display = 'block';
                            // 强制重绘
                            fullContent.offsetHeight;
                            fullContent.classList.add('expanded');
                            toggleLink.classList.add('expanded');
                            item.classList.add('expanded');
                            toggleLink.textContent = '收起详情';
                        }
                    });
                    
                    // 添加悬停效果
                    toggleLink.addEventListener('mouseenter', function() {
                        if (!this.classList.contains('expanded')) {
                            this.style.backgroundColor = '#dbeafe';
                            this.style.color = '#1d4ed8';
                        }
                    });
                    
                    toggleLink.addEventListener('mouseleave', function() {
                        if (!this.classList.contains('expanded')) {
                            this.style.backgroundColor = 'transparent';
                            this.style.color = '#2563eb';
                        }
                    });
                }
            });
            
            // 为现有的知识库内容添加展开/收缩功能
            const existingKbItems = document.querySelectorAll('.kb-item');
            existingKbItems.forEach(function(item) {
                const toggleLink = item.querySelector('a');
                const fullContent = item.querySelector('.kb-full');
                
                if (toggleLink && fullContent) {
                    // 确保元素有正确的类名
                    toggleLink.classList.add('kb-toggle');
                    fullContent.classList.add('kb-full');
                    
                    // 初始化状态
                    toggleLink.textContent = '展开详情';
                    fullContent.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;
            
            // 创建Blob对象
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showMessage('HTML文件已导出', 'success');
            
        } catch (error) {
            console.error('导出失败:', error);
            this.showMessage('导出失败', 'error');
        }
    }

    clearResult(container = null) {
        // 如果指定了容器，只清空该容器
        if (container) {
            const resultText = container.querySelector('.result-text');
            if (resultText) {
                resultText.innerHTML = '';
            }
            
            const questionDisplay = container.querySelector('.question-display');
            if (questionDisplay) {
                questionDisplay.style.display = 'none';
            }
            
            const questionText = container.querySelector('.question-text');
            if (questionText) {
                questionText.textContent = '';
            }
            
            const resultTitle = container.querySelector('.result-title');
            if (resultTitle) {
                resultTitle.textContent = '回答：';
            }
            
            this.showMessage('已清空当前对话', 'success');
            return;
        }
        
        // 如果没有指定容器，清空所有内容（原有逻辑）
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
            // 清空结果容器中的所有内容，但保留默认容器
            const defaultContainer = this.resultContainer.querySelector('#conversation-default');
            this.resultContainer.innerHTML = '';
            if (defaultContainer) {
                this.resultContainer.appendChild(defaultContainer);
            }
        }
        if (this.resultText) {
            this.resultText.innerHTML = '';
        }
        if (this.questionDisplay) {
            this.questionDisplay.style.display = 'none';
        }
        if (this.questionText) {
            this.questionText.textContent = '';
        }
        
        // 清空当前会话历史
        this.currentSessionHistory = [];
        console.log('当前会话历史已清空');
        
        // 重置知识库相关状态变量
        this._useKnowledgeBaseThisTime = false;
        this._kbMatchCount = 0;
        this._kbItems = [];
        console.log('clearResult: 知识库状态变量已重置');
        
        // 重置计时
        this.startTime = null;
        
        // 重置标题
        const resultTitle = document.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = '回答：';
        }
        
        // 清空输入框并聚焦
        this.questionInput.value = '';
        this.questionInput.focus();
        
        // 更新布局状态
        this.updateLayoutState();
        
        // 重置反馈按钮状态
        this.resetFeedbackButtons();
    }

    // 处理用户反馈
    handleFeedback(type, container = null) {
        // 如果指定了容器，针对该容器的按钮进行操作
        if (container) {
            const likeBtn = container.querySelector('.like-btn');
            const dislikeBtn = container.querySelector('.dislike-btn');
            
            if (likeBtn && dislikeBtn) {
                // 移除之前的活跃状态
                likeBtn.classList.remove('active');
                dislikeBtn.classList.remove('active');
                
                // 设置当前按钮为活跃状态
                if (type === 'like') {
                    likeBtn.classList.add('active');
                    this.saveFeedback('like');
                    this.showMessage('感谢您的反馈！👍', 'success');
                } else if (type === 'dislike') {
                    dislikeBtn.classList.add('active');
                    this.saveFeedback('dislike');
                    this.showMessage('感谢您的反馈！我们会继续改进。👎', 'info');
                }
                
                // 3秒后重置按钮状态
                setTimeout(() => {
                    likeBtn.classList.remove('active');
                    dislikeBtn.classList.remove('active');
                }, 3000);
            }
            return;
        }
        
        // 如果没有指定容器，使用原有的固定按钮（用于第一个容器）
        const likeBtn = this.likeButton;
        const dislikeBtn = this.dislikeButton;
        
        if (!likeBtn || !dislikeBtn) return;
        
        // 移除之前的活跃状态
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');
        
        // 设置当前按钮为活跃状态
        if (type === 'like') {
            likeBtn.classList.add('active');
            this.saveFeedback('like');
            this.showMessage('感谢您的反馈！👍', 'success');
        } else if (type === 'dislike') {
            dislikeBtn.classList.add('active');
            this.saveFeedback('dislike');
            this.showMessage('感谢您的反馈！我们会继续改进。👎', 'info');
        }
        
        // 3秒后重置按钮状态
        setTimeout(() => {
            this.resetFeedbackButtons();
        }, 3000);
    }

    // 重置反馈按钮状态
    resetFeedbackButtons(container = null) {
        // 如果指定了容器，重置该容器的按钮状态
        if (container) {
            const likeBtn = container.querySelector('.like-btn');
            const dislikeBtn = container.querySelector('.dislike-btn');
            
            if (likeBtn) likeBtn.classList.remove('active');
            if (dislikeBtn) dislikeBtn.classList.remove('active');
            return;
        }
        
        // 如果没有指定容器，重置固定按钮状态（用于第一个容器）
        if (this.likeButton) this.likeButton.classList.remove('active');
        if (this.dislikeButton) this.dislikeButton.classList.remove('active');
    }

    // 保存反馈到存储
    async saveFeedback(type) {
        try {
            const currentQuestion = this.questionInput.value;
            const currentAnswer = this.resultText.textContent;
            const selectedModelValue = this.modelSelect.value;
            let currentModel = '';
            try {
                const key = JSON.parse(selectedModelValue);
                const selectedModel = this.models.find(m => m.name === key.name && (!key.provider || m.provider === key.provider));
                currentModel = selectedModel ? `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）` : (key.name || '');
            } catch (_) {
                const selectedModel = this.models.find(m => m.name === selectedModelValue);
                currentModel = selectedModel ? `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）` : selectedModelValue;
            }
            const currentKnowledgeBase = this.knowledgeBaseSelect.value;
            
            // 获取当前页面信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const pageUrl = tab ? tab.url : '';
            
            // 限制数据长度，避免存储配额超限
            const maxLength = 500; // 限制反馈数据长度
            const truncatedQuestion = currentQuestion.length > maxLength ? currentQuestion.substring(0, maxLength) + '...' : currentQuestion;
            const truncatedAnswer = currentAnswer.length > maxLength ? currentAnswer.substring(0, maxLength) + '...' : currentAnswer;
            
            const feedback = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                type: type, // 'like' 或 'dislike'
                question: truncatedQuestion,
                answer: truncatedAnswer,
                model: currentModel,
                knowledgeBase: currentKnowledgeBase,
                pageUrl: pageUrl ? pageUrl.substring(0, 200) : '' // 限制URL长度
            };
            
            // 获取现有反馈数据
            const result = await chrome.storage.sync.get(['feedbackHistory']);
            const feedbackHistory = result.feedbackHistory || [];
            
            // 添加新反馈
            feedbackHistory.push(feedback);
            
            // 限制反馈历史记录数量，避免存储配额超限
            if (feedbackHistory.length > 30) {
                feedbackHistory.splice(0, feedbackHistory.length - 30); // 只保留最新的30条
            }
            
            // 保存到存储
            await chrome.storage.sync.set({ feedbackHistory: feedbackHistory });
            
            console.log('反馈已保存:', feedback);
            
            // 发送反馈到服务器（如果有API）
            this.sendFeedbackToServer(feedback);
            
        } catch (error) {
            console.error('保存反馈失败:', error);
            // 如果是存储配额超限错误，尝试清理旧数据
            if (error.message && error.message.includes('quota')) {
                console.log('检测到存储配额超限，尝试清理旧数据...');
                await this.cleanupHistoryRecords();
            }
        }
    }

    // 发送反馈到服务器
    async sendFeedbackToServer(feedback) {
        try {
            // 这里可以添加发送反馈到服务器的逻辑
            // 例如发送到分析API或反馈收集服务
            console.log('发送反馈到服务器:', feedback);
            
            // 示例：发送到反馈API
            // const response = await fetch('https://your-feedback-api.com/feedback', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(feedback)
            // });
            
        } catch (error) {
            console.error('发送反馈到服务器失败:', error);
        }
    }

    // 处理滚动事件
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const showBackToTop = scrollTop > 300; // 滚动超过300px时显示按钮
        
        if (showBackToTop) {
            this.backToTopBtn.style.display = 'flex';
        } else {
            this.backToTopBtn.style.display = 'none';
        }
    }

    // 滚动到顶部
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 在弹出窗口模式下，滚动到提问区域
        if (this.isPopupMode) {
            setTimeout(() => {
                this.questionInput.focus();
            }, 500);
        }
    }

    initFullscreenMode() {
        // 检查是否支持全屏API
        this.supportsFullscreen = document.fullscreenEnabled || 
                                 document.webkitFullscreenEnabled || 
                                 document.mozFullScreenEnabled || 
                                 document.msFullscreenEnabled;
        
        // 检查是否已经是全屏模式
        if (window.location.search.includes('fullscreen=true')) {
            this.isFullscreenMode = true;
            document.body.classList.add('fullscreen-mode');
            // 移除对 fullscreenBtn 的引用，因为元素已删除
            // this.fullscreenBtn.title = '退出全屏';
            // this.fullscreenBtn.innerHTML = '<span class="fullscreen-icon">⛶</span>';
        }
        
        // 在新窗口模式下，全屏按钮应该可用
        // 移除对 fullscreenBtn 的引用，因为元素已删除
        // if (!this.supportsFullscreen) {
        //     this.fullscreenBtn.style.display = 'none';
        // }
    }

    async toggleFullscreen() {
        try {
            // 检查是否已经在全屏模式
            if (this.isFullscreenMode) {
                // 退出全屏模式
                this.isFullscreenMode = false;
                document.body.classList.remove('fullscreen-mode');
                // 移除对 fullscreenBtn 的引用，因为元素已删除
                // this.fullscreenBtn.title = '切换全屏';
                // this.fullscreenBtn.innerHTML = '<span class="fullscreen-icon">⛶</span>';
                return;
            }
            
            // 进入全屏模式
            this.isFullscreenMode = true;
            document.body.classList.add('fullscreen-mode');
            // 移除对 fullscreenBtn 的引用，因为元素已删除
            // this.fullscreenBtn.title = '退出全屏';
            // this.fullscreenBtn.innerHTML = '<span class="fullscreen-icon">⛶</span>';
            
            // 如果是popup模式，尝试打开新窗口
            if (this.isPopupMode) {
                try {
                    // 获取当前popup的URL
                    const currentUrl = window.location.href;
                    const fullscreenUrl = currentUrl.replace('popup.html', 'popup.html?fullscreen=true');
                    
                    // 打开新窗口
                    const newWindow = window.open(fullscreenUrl, 'bic-qa-fullscreen', 
                        'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes');
                    
                    if (newWindow) {
                        // 关闭当前popup
                        window.close();
                    } else {
                        // 如果无法打开新窗口，使用CSS全屏
                        this.showMessage('无法打开新窗口，使用CSS全屏模式', 'info');
                    }
                } catch (error) {
                    console.error('打开全屏窗口失败:', error);
                    this.showMessage('打开全屏窗口失败', 'error');
                }
            } else {
                // 非popup模式，使用浏览器全屏API
                if (this.supportsFullscreen) {
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        await document.documentElement.webkitRequestFullscreen();
                    } else if (document.documentElement.mozRequestFullScreen) {
                        await document.documentElement.mozRequestFullScreen();
                    } else if (document.documentElement.msRequestFullscreen) {
                        await document.documentElement.msRequestFullscreen();
                    }
                }
            }
        } catch (error) {
            console.error('切换全屏模式失败:', error);
            this.showMessage('切换全屏模式失败', 'error');
        }
    }

    // 监听全屏状态变化
    handleFullscreenChange() {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            document.body.classList.remove('fullscreen-mode');
            // 移除对 fullscreenBtn 的引用，因为元素已删除
            // this.fullscreenBtn.title = '切换全屏';
        }
    }

    // 测试content script连接
    async testContentScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                this.showMessage('当前页面不支持content script', 'error');
                return;
            }
            
            console.log('测试content script连接...');
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'test'
            });
            
            if (response && response.success) {
                this.showMessage('Content script连接正常', 'success');
            } else {
                this.showMessage('Content script响应异常', 'error');
            }
        } catch (error) {
            console.error('Content script测试失败:', error);
            this.showMessage('Content script连接失败: ' + error.message, 'error');
        }
    }

    // 保存对话历史记录
    saveConversationHistory(question, answer, modelName, knowledgeBaseId, pageUrl) {
        try {
            // 限制问题和回答的长度，避免存储过大
            const maxLength = 1000; // 限制每个字段的最大长度
            const truncatedQuestion = question.length > maxLength ? question.substring(0, maxLength) + '...' : question;
            const truncatedAnswer = answer.length > maxLength ? answer.substring(0, maxLength) + '...' : answer;
            
            // 解析知识库信息
            let knowledgeBaseName = null;
            let knowledgeBaseIdForHistory = knowledgeBaseId;
            
            if (knowledgeBaseId) {
                try {
                    // 尝试解析知识库对象
                    const knowledgeBase = JSON.parse(knowledgeBaseId);
                    if (knowledgeBase.name) {
                        knowledgeBaseName = knowledgeBase.name;
                        knowledgeBaseIdForHistory = knowledgeBase.id; // 保存ID用于历史记录
                    }
                } catch (parseError) {
                    // 如果解析失败，尝试使用知识库管理器获取
                    const knowledgeBase = window.knowledgeBaseManager?.getKnowledgeBaseById(knowledgeBaseId);
                    if (knowledgeBase) {
                        knowledgeBaseName = knowledgeBase.name;
                    }
                }
            }
            
            const historyItem = {
                id: Date.now().toString(),
                question: truncatedQuestion,
                answer: truncatedAnswer,
                modelName: modelName,
                knowledgeBaseId: knowledgeBaseIdForHistory,
                knowledgeBaseName: knowledgeBaseName,
                pageUrl: pageUrl ? pageUrl.substring(0, 200) : '', // 限制URL长度
                timestamp: new Date().toISOString()
            };

            // 添加到历史记录开头
            this.conversationHistory.unshift(historyItem);

            // 保持最多50条记录（减少数量避免配额超限）
            if (this.conversationHistory.length > 50) {
                this.conversationHistory = this.conversationHistory.slice(0, 50);
            }

            // 保存到存储
            chrome.storage.sync.set({
                conversationHistory: this.conversationHistory
            }).catch(error => {
                console.error('保存对话历史记录失败:', error);
                // 如果保存失败，尝试清理旧记录
                this.cleanupHistoryRecords();
            });

            console.log('对话历史记录已保存，当前记录数:', this.conversationHistory.length);
        } catch (error) {
            console.error('保存对话历史记录失败:', error);
        }
    }

    // 清理历史记录，避免存储配额超限
    async cleanupHistoryRecords() {
        try {
            console.log('开始清理历史记录...');
            
            // 减少对话历史记录数量
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(0, 20);
            }
            
            // 清理反馈历史记录
            const result = await chrome.storage.sync.get(['feedbackHistory']);
            const feedbackHistory = result.feedbackHistory || [];
            
            if (feedbackHistory.length > 20) {
                const cleanedFeedbackHistory = feedbackHistory.slice(0, 20);
                await chrome.storage.sync.set({ feedbackHistory: cleanedFeedbackHistory });
                console.log('反馈历史记录已清理，保留20条');
            }
            
            // 重新保存对话历史记录
            await chrome.storage.sync.set({
                conversationHistory: this.conversationHistory
            });
            
            console.log('历史记录清理完成');
        } catch (error) {
            console.error('清理历史记录失败:', error);
        }
    }

    // 显示历史记录对话框
    showHistoryDialog() {
        this.historyDialog.style.display = 'flex';
        this.loadHistoryList();
    }

    // 隐藏历史记录对话框
    hideHistoryDialog() {
        this.historyDialog.style.display = 'none';
    }

    // 加载历史记录列表
    loadHistoryList() {
        const historyList = this.historyList;
        historyList.innerHTML = '';

        if (this.conversationHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history-icon">📝</div>
                    <div class="empty-history-text">暂无对话历史记录</div>
                    <div class="empty-history-subtext">开始提问后，您的对话记录将显示在这里</div>
                </div>
            `;
            return;
        }

        this.conversationHistory.forEach((item, index) => {
            const historyItem = this.createHistoryItemElement(item, index);
            historyList.appendChild(historyItem);
        });
    }

    // 创建历史记录项元素
    createHistoryItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const questionPreview = item.question.length > 50 ? item.question.substring(0, 50) + '...' : item.question;
        const answerPreview = item.answer.length > 100 ? item.answer.substring(0, 100) + '...' : item.answer;
        const time = new Date(item.timestamp).toLocaleString('zh-CN');
        
        div.innerHTML = `
            <div class="history-header">
                <div class="history-time">${time}</div>
                <div class="history-actions">
                    
                </div>
            </div>
            <div class="history-meta">
                <span class="history-model">模型: ${item.modelName}</span>
                ${item.knowledgeBaseName ? `<span class="history-knowledge-base">知识库: ${item.knowledgeBaseName}</span>` : ''}
                ${item.pageUrl ? `<span class="history-url">页面: ${new URL(item.pageUrl).hostname}</span>` : ''}
            </div>
            <div class="history-question">
                <strong>问题:</strong> ${this.escapeHtml(questionPreview)}
            </div>
            <div class="history-answer">
                <strong>回答:</strong> ${this.escapeHtml(answerPreview)}
            </div>
            <div class="history-full-content" id="history-full-${item.id}" style="display: none;">
                <div class="history-full-question">
                    <strong>完整问题:</strong><br>
                    ${this.escapeHtml(item.question)}
                </div>
                <div class="history-full-answer">
                    <strong>完整回答:</strong><br>
                    ${this.escapeHtml(item.answer)}
                </div>
            </div>
        `;
        
        return div;
    }

    // 复制历史记录项
    async copyHistoryItem(id) {
        try {
            const item = this.conversationHistory.find(h => h.id === id);
            if (item) {
                const textToCopy = `问题: ${item.question}\n\n回答: ${item.answer}`;
                await navigator.clipboard.writeText(textToCopy);
                this.showMessage('已复制到剪贴板', 'success');
            }
        } catch (error) {
            console.error('复制历史记录失败:', error);
            this.showMessage('复制失败', 'error');
        }
    }

    // 删除历史记录项
    deleteHistoryItem(id) {
        try {
            this.conversationHistory = this.conversationHistory.filter(h => h.id !== id);
            chrome.storage.sync.set({
                conversationHistory: this.conversationHistory
            });
            this.loadHistoryList();
            this.showMessage('历史记录已删除', 'success');
        } catch (error) {
            console.error('删除历史记录失败:', error);
            this.showMessage('删除失败', 'error');
        }
    }

    // 切换历史记录展开/收起
    toggleHistoryExpansion(id) {
        const fullContent = document.getElementById(`history-full-${id}`);
        if (fullContent) {
            fullContent.style.display = fullContent.style.display === 'none' ? 'block' : 'none';
        }
    }

    // 清空历史记录
    async clearHistory() {
        try {
            if (confirm('确定要清空所有对话历史记录吗？此操作不可恢复。')) {
                this.conversationHistory = [];
                await chrome.storage.sync.set({
                    conversationHistory: []
                });
                this.loadHistoryList();
                this.showMessage('历史记录已清空', 'success');
            }
        } catch (error) {
            console.error('清空历史记录失败:', error);
            // 如果是存储配额问题，尝试清理而不是完全清空
            if (error.message && error.message.includes('quota')) {
                console.log('检测到存储配额问题，尝试清理旧记录...');
                await this.cleanupHistoryRecords();
                this.loadHistoryList();
                this.showMessage('已清理旧记录以释放存储空间', 'info');
            } else {
                this.showMessage('清空失败', 'error');
            }
        }
    }

    // 导出历史记录
    async exportHistory() {
        try {
            const exportData = {
                conversationHistory: this.conversationHistory,
                exportTime: new Date().toISOString(),
                totalCount: this.conversationHistory.length,
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bic-qa-history-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showMessage('历史记录已导出', 'success');
        } catch (error) {
            console.error('导出历史记录失败:', error);
            this.showMessage('导出失败', 'error');
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async generateSummaryFromText(text) {
        try {
            // 分析文本内容
            const lines = text.split('\n').filter(line => line.trim());
            const words = text.split(/\s+/).filter(word => word.length > 0);
            const sentences = text.split(/[.!?。！？]/).filter(sentence => sentence.trim());
            
            // 计算基本统计信息
            const charCount = text.length;
            const wordCount = words.length;
            const lineCount = lines.length;
            const sentenceCount = sentences.length;
            
            // 提取可能的标题（第一行或包含关键词的行）
            let title = '';
            if (lines.length > 0) {
                title = lines[0].trim();
                if (title.length > 50) {
                    title = title.substring(0, 50) + '...';
                }
            }
            
            // 提取主要内容预览
            let contentPreview = '';
            if (text.length > 200) {
                contentPreview = text.substring(0, 200) + '...';
            } else {
                contentPreview = text;
            }
            
            // 检测内容类型
            let contentType = '文本内容';
            if (text.includes('http') || text.includes('www')) {
                contentType = '包含链接的文本';
            }
            if (text.includes('代码') || text.includes('function') || text.includes('class')) {
                contentType = '代码或技术文档';
            }
            if (text.includes('错误') || text.includes('Error') || text.includes('失败')) {
                contentType = '错误信息或日志';
            }
            
            // 构建摘要
            let summary = `📄 内容摘要\n\n`;
            summary += `📝 内容类型：${contentType}\n\n`;
            
            if (title) {
                summary += `📋 标题：${title}\n\n`;
            }
            
            summary += `📊 内容统计：\n`;
            summary += `• 字符数：${charCount}\n`;
            summary += `• 单词数：${wordCount}\n`;
            summary += `• 行数：${lineCount}\n`;
            summary += `• 句子数：${sentenceCount}\n\n`;
            
            summary += `📝 内容预览：\n${contentPreview}\n\n`;
            
            // 如果内容很长，提供分段分析
            if (lines.length > 10) {
                summary += `📋 内容结构：\n`;
                const sections = this.analyzeContentStructure(lines);
                sections.forEach((section, index) => {
                    summary += `${index + 1}. ${section.title} (${section.lines}行)\n`;
                });
                summary += '\n';
            }
            
            // 添加关键词分析
            const keywords = this.extractKeywords(text);
            if (keywords.length > 0) {
                summary += `🔑 关键词：${keywords.slice(0, 10).join(', ')}\n\n`;
            }
            
            summary += `⏰ 生成时间：${new Date().toLocaleString('zh-CN')}`;
            
            return summary;
            
        } catch (error) {
            console.error('生成文本摘要失败:', error);
            return `内容摘要生成失败：${error.message}`;
        }
    }

    analyzeContentStructure(lines) {
        const sections = [];
        let currentSection = { title: '开头部分', lines: 0 };
        
        lines.forEach((line, index) => {
            currentSection.lines++;
            
            // 检测新的段落或标题
            if (line.trim().length === 0 || 
                line.startsWith('#') || 
                line.startsWith('##') || 
                line.startsWith('###') ||
                line.length < 50 && line.endsWith(':') ||
                /^[A-Z][A-Z\s]+$/.test(line.trim())) {
                
                if (currentSection.lines > 1) {
                    sections.push({ ...currentSection });
                }
                
                currentSection = { 
                    title: line.trim() || `段落${sections.length + 2}`, 
                    lines: 0 
                };
            }
        });
        
        // 添加最后一个部分
        if (currentSection.lines > 0) {
            sections.push(currentSection);
        }
        
        return sections.slice(0, 5); // 只返回前5个部分
    }

    extractKeywords(text) {
        // 简单的关键词提取
        const words = text.toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    // 检查配置状态并显示提示信息
    checkConfigurationStatus() {
        // 防止重复检查
        if (this.configChecked) {
            return;
        }
        
        const hasProviders = this.providers && this.providers.length > 0;
        const hasModels = this.models && this.models.length > 0;
        const hasValidApiKey = hasProviders && this.providers.some(provider => 
            provider.apiKey && provider.apiKey.trim() !== ''
        );
        
        // 清除之前的配置提示
        this.clearConfigurationNotice();
        
        // 标记已检查
        this.configChecked = true;
        
        // 如果配置完整，不需要显示提示
        if (hasProviders && hasModels && hasValidApiKey) {
            console.log('配置检查完成：配置完整');
            return;
        }
        
        // 根据配置状态显示不同的提示
        if (!hasProviders || !hasModels) {
            console.log('配置检查：缺少服务商或模型配置');
            this.showConfigurationNotice('请先在设置页面配置服务商和模型', 'warning');
        } 
        
        // else if (!hasValidApiKey) {
        //     console.log('配置检查：缺少API密钥配置');
        //     this.showConfigurationNotice('请先在设置页面配置API密钥', 'warning');
        // }
    }

    // 显示配置提示信息
    showConfigurationNotice(message, type = 'info') {
        // 防止重复显示
        if (document.getElementById('configuration-notice')) {
            return;
        }
        
        // 查找或创建提示容器
        let noticeContainer = document.getElementById('configuration-notice');
        if (!noticeContainer) {
            noticeContainer = document.createElement('div');
            noticeContainer.id = 'configuration-notice';
            noticeContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'warning' ? '#fff3cd' : '#d1ecf1'};
                color: ${type === 'warning' ? '#856404' : '#0c5460'};
                border: 1px solid ${type === 'warning' ? '#ffeaa7' : '#bee5eb'};
                border-radius: 8px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 90%;
                text-align: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // 添加设置按钮
            const settingsBtn = document.createElement('button');
            settingsBtn.textContent = '去设置';
            settingsBtn.style.cssText = `
                background: ${type === 'warning' ? '#ffc107' : '#17a2b8'};
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                white-space: nowrap;
                transition: background-color 0.2s ease;
            `;
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
            
            // 添加关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: ${type === 'warning' ? '#856404' : '#0c5460'};
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: 8px;
                line-height: 1;
            `;
            closeBtn.addEventListener('click', () => {
                this.clearConfigurationNotice();
            });
            
            noticeContainer.appendChild(document.createTextNode(message));
            noticeContainer.appendChild(settingsBtn);
            noticeContainer.appendChild(closeBtn);
            
            document.body.appendChild(noticeContainer);
            
            // 延迟显示，确保动画效果
            setTimeout(() => {
                noticeContainer.style.opacity = '1';
            }, 10);
        } else {
            // 更新现有提示内容
            noticeContainer.innerHTML = '';
            noticeContainer.style.background = type === 'warning' ? '#fff3cd' : '#d1ecf1';
            noticeContainer.style.color = type === 'warning' ? '#856404' : '#0c5460';
            noticeContainer.style.borderColor = type === 'warning' ? '#ffeaa7' : '#bee5eb';
            
            const settingsBtn = document.createElement('button');
            settingsBtn.textContent = '去设置';
            settingsBtn.style.cssText = `
                background: ${type === 'warning' ? '#ffc107' : '#17a2b8'};
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                white-space: nowrap;
                transition: background-color 0.2s ease;
            `;
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: ${type === 'warning' ? '#856404' : '#0c5460'};
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: 8px;
                line-height: 1;
            `;
            closeBtn.addEventListener('click', () => {
                this.clearConfigurationNotice();
            });
            
            noticeContainer.appendChild(document.createTextNode(message));
            noticeContainer.appendChild(settingsBtn);
            noticeContainer.appendChild(closeBtn);
        }
        
        // 延长显示时间，给用户更多时间阅读
        setTimeout(() => {
            this.clearConfigurationNotice();
        }, 8000); // 8秒后自动隐藏
    }

    // 清除配置提示信息
    clearConfigurationNotice() {
        const noticeContainer = document.getElementById('configuration-notice');
        if (noticeContainer) {
            // 添加淡出动画
            noticeContainer.style.opacity = '0';
            noticeContainer.style.transition = 'opacity 0.3s ease';
            
            // 等待动画完成后移除元素
            setTimeout(() => {
                if (noticeContainer.parentNode) {
                    noticeContainer.parentNode.removeChild(noticeContainer);
                }
            }, 300);
        }
    }

    // 开启新会话
    startNewSession() {
        console.log('开启新会话');
        
        // 停止定期检查提示信息
        this.stopProgressMessageReplacement();
        
        // 清空当前结果
        this.clearResult();
        
        // 清空当前会话历史
        this.currentSessionHistory = [];
        console.log('startNewSession: 当前会话历史已清空');
        
        // 重置知识库相关状态变量
        this._useKnowledgeBaseThisTime = false;
        this._kbMatchCount = 0;
        this._kbItems = [];
        console.log('startNewSession: 知识库状态变量已重置');
        
        // 显示提示消息
        this.showMessage('已开启新会话，可以开始新的问答', 'success');
        
        // 重置一些会话相关的状态
        // 重置计时
        this.startTime = null;
        
        // 重置加载状态
        this.setLoading(false);
        
        // 重置按钮状态
        this.updateButtonState();
        
        // 确保输入框获得焦点
        if (this.questionInput) {
            this.questionInput.focus();
            console.log('输入框已获得焦点');
        } else {
            console.warn('未找到输入框元素');
        }
        
        // 重新开始定期检查提示信息
        setTimeout(() => {
            this.startProgressMessageReplacement();
        }, 1000);
        
        // 可选：重置其他会话相关的状态
        // 例如清除任何缓存的上下文信息等
        
        console.log('新会话已开启，所有状态已重置');
    }

    // 清理格式缓存
    clearFormatCache() {
        this._lastContent = null;
        this._lastFormattedContent = null;
    }

    // 表格状态管理
    tableState = {
        isInTable: false,
        currentTable: null,
        tableLines: [],
        tableStartIndex: -1
    };

    // 重置表格状态
    resetTableState() {
        this.tableState = {
            isInTable: false,
            currentTable: null,
            tableLines: [],
            tableStartIndex: -1
        };
    }

    // 检查是否是表格行
    isTableRow(line) {
        const trimmed = line.trim();
        return trimmed.startsWith('|') && trimmed.endsWith('|');
    }

    // 检查是否是表格分隔行
    isTableSeparator(line) {
        const trimmed = line.trim();
        return trimmed.startsWith('|') && trimmed.endsWith('|') && 
               /^[\s|:-]+$/.test(trimmed.replace(/[|]/g, ''));
    }

    // 新增：安全解析表格行的方法
    parseTableRow(row) {
        // 移除首尾的 | 符号
        let cleanRow = row.trim();
        if (cleanRow.startsWith('|')) {
            cleanRow = cleanRow.substring(1);
        }
        if (cleanRow.endsWith('|')) {
            cleanRow = cleanRow.substring(0, cleanRow.length - 1);
        }
        
        // 使用正则表达式分割，但保护<br>标签
        // 匹配 | 但不匹配 | 在 <br> 标签内的情况
        const cells = [];
        let currentCell = '';
        let inBrTag = false;
        let i = 0;
        
        while (i < cleanRow.length) {
            const char = cleanRow[i];
            
            if (char === '<' && cleanRow.substring(i, i + 4) === '<br>') {
                inBrTag = true;
                currentCell += '<br>';
                i += 4;
                inBrTag = false;
            } else if (char === '|' && !inBrTag) {
                // 遇到分隔符，保存当前单元格
                cells.push(currentCell.trim());
                currentCell = '';
                i++;
            } else {
                currentCell += char;
                i++;
            }
        }
        
        // 添加最后一个单元格
        if (currentCell.trim()) {
            cells.push(currentCell.trim());
        }
        
        return cells.filter(cell => cell !== '');
    }

    // 在格式化之前更新进度提示信息
    updateProgressMessagesBeforeFormat(content) {
        try {
            console.log('在格式化之前检查提示信息...');
            console.log('原始内容包含blockquote相关文本:', content.includes('>'));
            
            // 检查是否包含blockquote相关的内容（以>开头的行）
            if (content.includes('>')) {
                console.log('检测到可能的blockquote内容，开始处理提示信息...');
                
                // 检查当前resultText中是否有第一个p标签
                const firstP = this.resultText.querySelector('p');
                if (firstP) {
                    console.log('找到现有的第一个p标签:', firstP);
                    let pContent = firstP.innerHTML;
                    console.log('当前p标签内容:', pContent);
                    
                    let hasChanged = false;
                    
                    // 更灵活的匹配和替换
                    const searchPatterns = [
                        { 
                            search: /正在搜索知识库\.\.\./g, 
                            replace: '搜索知识库完成',
                            name: '搜索知识库'
                        },
                        { 
                            search: /正在思考中，请稍候\.\.\./g, 
                            replace: '已思考完成',
                            name: '思考中'
                        },
                        // 添加更多可能的变体
                        { 
                            search: /正在搜索知识库\.\.\./g, 
                            replace: '搜索知识库完成',
                            name: '搜索知识库(无转义)'
                        },
                        { 
                            search: /正在思考中，请稍候\.\.\./g, 
                            replace: '已思考完成',
                            name: '思考中(无转义)'
                        }
                    ];
                    
                    for (const pattern of searchPatterns) {
                        if (pattern.search.test(pContent)) {
                            console.log(`匹配到模式: ${pattern.name}`);
                            pContent = pContent.replace(pattern.search, pattern.replace);
                            hasChanged = true;
                        }
                    }
                    
                    // 如果有变化，更新内容
                    if (hasChanged) {
                        console.log('更新p标签内容:', pContent);
                        firstP.innerHTML = pContent;
                    } else {
                        console.log('没有找到需要替换的文本');
                    }
                } else {
                    console.log('未找到现有的第一个p标签');
                }
            } else {
                console.log('未检测到blockquote相关文本');
            }
        } catch (error) {
            console.error('更新进度提示信息失败:', error);
        }
    }

    // 更新进度提示信息（保留原方法以防其他地方调用）
    updateProgressMessages(formattedContent) {
        try {
            console.log('检查是否需要更新提示信息...');
            console.log('formattedContent包含blockquote:', formattedContent.includes('<blockquote>'));
            
            // 检查是否包含blockquote内容
            if (formattedContent.includes('<blockquote>')) {
                console.log('检测到blockquote，开始查找第一个p标签...');
                
                // 获取第一个p标签
                const firstP = this.resultText.querySelector('p');
                if (firstP) {
                    console.log('找到第一个p标签:', firstP);
                    let pContent = firstP.innerHTML;
                    console.log('p标签内容:', pContent);
                    
                    let hasChanged = false;
                    
                    // 更灵活的匹配和替换
                    const searchPatterns = [
                        { 
                            search: /正在搜索知识库\.\.\./g, 
                            replace: '搜索知识库完成',
                            name: '搜索知识库'
                        },
                        { 
                            search: /正在思考中，请稍候\.\.\./g, 
                            replace: '已思考完成',
                            name: '思考中'
                        },
                        // 添加更多可能的变体
                        { 
                            search: /正在搜索知识库\.\.\./g, 
                            replace: '搜索知识库完成',
                            name: '搜索知识库(无转义)'
                        },
                        { 
                            search: /正在思考中，请稍候\.\.\./g, 
                            replace: '已思考完成',
                            name: '思考中(无转义)'
                        }
                    ];
                    
                    for (const pattern of searchPatterns) {
                        if (pattern.search.test(pContent)) {
                            console.log(`匹配到模式: ${pattern.name}`);
                            pContent = pContent.replace(pattern.search, pattern.replace);
                            hasChanged = true;
                        }
                    }
                    
                    // 如果有变化，更新内容
                    if (hasChanged) {
                        console.log('更新p标签内容:', pContent);
                        firstP.innerHTML = pContent;
                    } else {
                        console.log('没有找到需要替换的文本');
                    }
                } else {
                    console.log('未找到第一个p标签');
                }
            } else {
                console.log('未检测到blockquote内容');
            }
        } catch (error) {
            console.error('更新进度提示信息失败:', error);
        }
    }

    // 开始定期检查和替换提示信息
    startProgressMessageReplacement() {
        console.log('开始定期检查提示信息替换...');
        
        // 每500ms检查一次
        const checkInterval = setInterval(() => {
            this.checkAndReplaceProgressMessages();
        }, 500);
        
        // 保存interval ID，以便后续可以停止
        this.progressMessageInterval = checkInterval;
    }
    
    // 停止定期检查
    stopProgressMessageReplacement() {
        if (this.progressMessageInterval) {
            clearInterval(this.progressMessageInterval);
            this.progressMessageInterval = null;
            console.log('停止定期检查提示信息替换');
        }
    }
    
    // 检查并替换提示信息
    checkAndReplaceProgressMessages() {
        try {
            // 检查resultText是否存在
            if (!this.resultText) {
                return;
            }
            
            // 获取第一个p标签
            const firstP = this.resultText.querySelector('p');
            if (!firstP) {
                return;
            }
            
            let pContent = firstP.innerHTML;
            let hasChanged = false;
            
            // 替换提示信息
            if (pContent.includes('正在搜索知识库...')) {
                pContent = pContent.replace(/正在搜索知识库\.\.\./g, '搜索知识库完成');
                hasChanged = true;
                console.log('替换: 正在搜索知识库... → 搜索知识库完成');
            }
            
            if (pContent.includes('正在思考中，请稍候...')) {
                pContent = pContent.replace(/正在思考中，请稍候\.\.\./g, '已思考完成');
                hasChanged = true;
                console.log('替换: 正在思考中，请稍候... → 已思考完成');
            }
            
            // 如果有变化，更新内容
            if (hasChanged) {
                firstP.innerHTML = pContent;
                console.log('提示信息已更新');
            }
            
        } catch (error) {
            console.error('检查并替换提示信息失败:', error);
        }
    }

    // 流式数据加载完成后替换提示信息
    replaceProgressMessagesAfterStream() {
        try {
            console.log('=== 开始替换提示信息 ===');
            console.log('resultText元素:', this.resultText);
            
            // 检查resultText是否存在
            if (!this.resultText) {
                console.log('❌ resultText不存在');
                return;
            }
            
            // 获取所有p标签
            const allP = this.resultText.querySelectorAll('p');
            console.log('找到的p标签数量:', allP.length);
            
            if (allP.length === 0) {
                console.log('❌ 未找到任何p标签');
                return;
            }
            
            // 遍历所有p标签，查找包含提示信息的标签
            let hasReplaced = false;
            
            for (let i = 0; i < allP.length; i++) {
                const p = allP[i];
                let pContent = p.innerHTML;
                let hasChanged = false;
                
                console.log(`检查第${i + 1}个p标签:`, pContent);
                
                // 更灵活的匹配和替换
                const searchPatterns = [
                    { 
                        search: /正在搜索知识库\.\.\./g, 
                        replace: '搜索知识库完成',
                        name: '搜索知识库'
                    },
                    { 
                        search: /正在思考中，请稍候\.\.\./g, 
                        replace: '已思考完成',
                        name: '思考中'
                    },
                    // 添加更多可能的变体
                    { 
                        search: /正在搜索知识库\.\.\./g, 
                        replace: '搜索知识库完成',
                        name: '搜索知识库(无转义)'
                    },
                    { 
                        search: /正在思考中，请稍候\.\.\./g, 
                        replace: '已思考完成',
                        name: '思考中(无转义)'
                    },
                    // 添加可能的HTML实体变体
                    { 
                        search: /正在搜索知识库&hellip;/g, 
                        replace: '搜索知识库完成',
                        name: '搜索知识库(HTML实体)'
                    },
                    { 
                        search: /正在思考中，请稍候&hellip;/g, 
                        replace: '已思考完成',
                        name: '思考中(HTML实体)'
                    }
                ];
                
                for (const pattern of searchPatterns) {
                    if (pattern.search.test(pContent)) {
                        console.log(`✅ 匹配到模式: ${pattern.name}`);
                        pContent = pContent.replace(pattern.search, pattern.replace);
                        hasChanged = true;
                        hasReplaced = true;
                    }
                }
                
                // 如果有变化，更新内容
                if (hasChanged) {
                    console.log(`更新第${i + 1}个p标签内容:`, pContent);
                    p.innerHTML = pContent;
                }
            }
            
            if (hasReplaced) {
                console.log('✅ 提示信息替换完成');
            } else {
                console.log('❌ 没有找到需要替换的文本');
            }
            
        } catch (error) {
            console.error('❌ 替换提示信息失败:', error);
        }
    }

    // 新增方法：添加用户交互监听
    addUserInteractionListeners() {
        // 监听用户的各种交互行为
        const interactionEvents = ['click', 'input', 'focus', 'keydown', 'mousedown', 'touchstart'];
        
        const markUserInteraction = () => {
            if (!this.userHasInteracted) {
                this.userHasInteracted = true;
                console.log('用户开始交互');
                
                // 用户开始交互后，延迟检查配置状态
                setTimeout(() => {
                    if (!this.configChecked) {
                        this.checkConfigurationStatus();
                        this.configChecked = true;
                    }
                }, 1000); // 给用户1秒时间熟悉界面
            }
        };
        
        // 为整个文档添加交互监听
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, markUserInteraction, { 
                passive: true, 
                once: false 
            });
        });
        
        // 为特定元素添加交互监听
        if (this.questionInput) {
            this.questionInput.addEventListener('focus', markUserInteraction, { passive: true });
        }
        
        if (this.askButton) {
            this.askButton.addEventListener('click', markUserInteraction, { passive: true });
        }
    }
    
    // 新增方法：检测浏览器兼容性
    detectBrowserCompatibility() {
        const userAgent = navigator.userAgent;
        const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isEdge = /Edge/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        
        console.log('浏览器检测结果:', {
            userAgent: userAgent,
            isChrome,
            isFirefox,
            isEdge,
            isSafari
        });
        
        // 根据浏览器类型调整配置检查时机
        if (isChrome || isEdge) {
            // Chrome和Edge浏览器，延迟检查时间
            this.chromeCompatibilityDelay = 1000;
        } else if (isFirefox) {
            // Firefox浏览器，增加延迟时间
            this.chromeCompatibilityDelay = 1500;
        } else {
            // 其他浏览器，使用默认延迟
            this.chromeCompatibilityDelay = 1200;
        }
        
        return {
            isChrome,
            isFirefox,
            isEdge,
            isSafari
        };
    }

    isOllamaService(provider) {
        // 首先检查服务商类型
        if (provider.providerType === 'ollama') {
            return true;
        }
        
        // 检查服务商名称
        const providerName = provider.name.toLowerCase();
        if (providerName.includes('ollama')) {
            return true;
        }
        
        // 检查 API 端点
        try {
            const url = new URL(provider.apiEndpoint);
            const hostname = url.hostname.toLowerCase();
            
            // 检查是否为本地地址或自定义 IP
            if (hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
                
                // 检查端口和路径是否匹配 Ollama 格式
                const path = url.pathname.toLowerCase();
                const port = url.port;
                
                // 支持多种路径格式
                if (path.includes('/v1/chat/completions') || 
                    path.includes('/v1') || 
                    path === '/' || 
                    path === '') {
                    
                    // 检查端口是否为 11434（Ollama 默认端口）
                    if (port === '11434' || port === '') {
                        console.log('检测到 Ollama 服务，路径:', path, '端口:', port);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.warn('无法解析 API 端点 URL:', e.message);
        }
        
        return false;
    }

    renderKnowledgeList(items, container = null) {
        try {
            console.log('=== renderKnowledgeList 开始 ===');
            console.log('items:', items);
            console.log('container:', container);
            console.log('items.length:', items ? items.length : 'items is null/undefined');
            console.log('items type:', typeof items);
            console.log('Array.isArray(items):', Array.isArray(items));
            
            // 确定目标容器
            let targetContainer = container;
            let resultText = null;
            
            if (targetContainer) {
                // 如果传入的是conversationContainer，直接查找其中的.result-text
                resultText = targetContainer.querySelector('.result-text');
                console.log('从传入的container中查找.result-text:', resultText);
                console.log('targetContainer.innerHTML:', targetContainer.innerHTML);
            }
            
            // 如果没找到，使用默认的resultText
            if (!resultText) {
                resultText = this.resultText;
                console.log('使用默认的resultText:', resultText);
            }
            
            if (!resultText) {
                console.error('无法找到result-text容器');
                return;
            }
            
            console.log('最终使用的resultText:', resultText);
            console.log('resultText.innerHTML:', resultText.innerHTML);
            
            let knowlistEl = resultText.querySelector('.result-text-knowlist');
            console.log('找到的knowlistEl:', knowlistEl);
            
            if (!knowlistEl) {
                knowlistEl = document.createElement('div');
                knowlistEl.className = 'result-text-knowlist';
                resultText.appendChild(knowlistEl);
                console.log('创建了新的.result-text-knowlist元素');
            }
            
            // 清空并渲染
            knowlistEl.innerHTML = '';
            console.log('清空知识库列表，准备渲染', items.length, '条知识库');

            // 标题
            const titleEl = document.createElement('div');
            titleEl.textContent = '参考知识库：';
            titleEl.className = 'cankao-list';
            titleEl.style.cssText = 'margin-top: 12px; font-weight: 600; color: #111827;';
            knowlistEl.appendChild(titleEl);

            // 列表容器
            const listEl = document.createElement('div');
            listEl.className = 'kb-list';
            knowlistEl.appendChild(listEl);

            items.forEach((raw, index) => {
                const full = String(raw || '');
                const plain = full.replace(/\s+/g, ' ').trim();
                const truncated = plain.length > 50 ? (plain.slice(0, 50) + '...') : plain;

                const itemEl = document.createElement('div');
                itemEl.className = 'kb-item';
                itemEl.style.cssText = 'margin: 6px 0; line-height: 1.6;';

                const summaryEl = document.createElement('span');
                summaryEl.innerHTML = `${this.escapeHtml(truncated)} `;
                itemEl.appendChild(summaryEl);

                const toggleEl = document.createElement('a');
                toggleEl.href = '#';
                toggleEl.textContent = '查看全部';
                toggleEl.style.cssText = 'color: #2563eb; text-decoration: none;';
                toggleEl.dataset.index = String(index);
                itemEl.appendChild(toggleEl);

                const fullEl = document.createElement('div');
                fullEl.className = 'kb-full';
                fullEl.style.cssText = 'display: none; margin-top: 6px; padding: 8px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #93c5fd; white-space: pre-wrap;';
                fullEl.textContent = full; // 保留原始换行
                itemEl.appendChild(fullEl);

                toggleEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = fullEl.style.display === 'none';
                    fullEl.style.display = isHidden ? 'block' : 'none';
                    toggleEl.textContent = isHidden ? '收起' : '查看全部';
                });

                listEl.appendChild(itemEl);
            });
            
            console.log('知识库列表渲染完成，共渲染', items.length, '条知识库');
            console.log('最终knowlistEl.innerHTML:', knowlistEl.innerHTML);
            console.log('=== renderKnowledgeList 结束 ===');
        } catch (error) {
            console.error('渲染参考知识库列表失败:', error);
            console.error('错误堆栈:', error.stack);
        }
        // 滚动到底部
        this.scrollToBottom();
    }

    stopProcessing() {
        try {
            this.hasBeenStopped = true;
            if (this.abortController) {
                this.abortController.abort();
            }
            
            // 获取最新的对话容器中的result-title
            const currentContainer = this.getCurrentConversationContainer();
            const resultTitle = currentContainer ? currentContainer.querySelector('.result-title') : null;
            
            if (resultTitle) {
                resultTitle.textContent = '已停止回答';
            }
            
            // 获取最新的对话容器中的result-text-tips
            const resultTextTips = currentContainer ? currentContainer.querySelector('.result-text-tips') : null;
            
            if (resultTextTips) {
                resultTextTips.textContent = '已停止作答，请重新提问';
            }
        } catch (e) {
            console.error('停止处理失败:', e);
        } finally {
            this.isProcessing = false;
            this.setLoading(false);
        }
    }

    // 格式化时间显示
    formatTime(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }

    // 更新问题显示
    updateQuestionDisplay(question, container = null) {
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        let questionDisplay = null;
        
        if (targetContainer) {
            // 查找指定容器内的question-display容器
            questionDisplay = targetContainer.querySelector('.question-display');
            if (!questionDisplay) {
                // 如果没有找到，创建一个新的
                questionDisplay = document.createElement('div');
                questionDisplay.className = 'question-display';
                const resultListShow = targetContainer.querySelector('.resultListShow');
                if (resultListShow) {
                    resultListShow.insertBefore(questionDisplay, resultListShow.firstChild);
                }
            }
        }
        
        if (questionDisplay) {
            questionDisplay.style.display = 'block';
            
            const currentTime = new Date();
            const timeStr = this.formatTime(currentTime);
            
            questionDisplay.innerHTML = `
                <div class="question-header">
                    <div class="user-avatar">
                        <img src="icons/bic-user.png" alt="用户" class="avatar-img">
                    </div>
                    <div class="question-info">
                        <div class="question-name">用户</div>
                        <div class="question-time">${timeStr}</div>
                    </div>
                </div>
                <div class="question-content">
                    <div class="question-text">${question}</div>
                </div>
            `;
        }
        
        // 滚动到底部
        this.scrollToBottom();
    }

    // 更新AI助手显示
    updateAIDisplay(container = null) {
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        let aiDisplay = null;
        
        if (targetContainer) {
            // 查找指定容器内的ai-display容器
            aiDisplay = targetContainer.querySelector('.ai-display');
            if (!aiDisplay) {
                // 如果没有找到，创建一个新的
                aiDisplay = document.createElement('div');
                aiDisplay.className = 'ai-display';
                const resultListShow = targetContainer.querySelector('.resultListShow');
                if (resultListShow) {
                    // 插入到question-display之后，result-title之前
                    const questionDisplay = resultListShow.querySelector('.question-display');
                    const resultTitle = resultListShow.querySelector('.result-title');
                    if (questionDisplay && resultTitle) {
                        resultListShow.insertBefore(aiDisplay, resultTitle);
                    } else {
                        resultListShow.insertBefore(aiDisplay, resultListShow.firstChild);
                    }
                }
            }
        }
        
        if (aiDisplay) {
            aiDisplay.style.display = 'block';
            
            const currentTime = new Date();
            const timeStr = this.formatTime(currentTime);
            
            aiDisplay.innerHTML = `
                <div class="ai-header">
                    <div class="ai-avatar">
                        <img src="icons/bic-an.png" alt="BIC-QA" class="avatar-img">
                    </div>
                    <div class="ai-info">
                        <div class="ai-name">BIC-QA</div>
                        <div class="ai-time">${timeStr}</div>
                    </div>
                </div>
            `;
        }
        
        // 滚动到底部
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        if (this.resultContainer) {
            setTimeout(() => {
                // 正确计算滚动到底部的位置：总内容高度 - 可视区域高度
                this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
            }, 100);
        }
    }
    
    createNewConversationContainer() {
        // 创建新的对话容器
        const conversationContainer = document.createElement('div');
        conversationContainer.className = 'conversation-container';
        const containerId = `conversation-${Date.now()}`;
        conversationContainer.id = containerId;
        
        // 创建结果容器结构，与原有样式保持一致
        conversationContainer.innerHTML = `
            <div class="resultListShow">
                <div class="question-display" style="display: none;">
                    <div class="question-header">
                        <div class="user-avatar">
                            <img src="icons/bic-user.png" alt="用户" class="avatar-img">
                        </div>
                        <div class="question-info">
                            <div class="question-name">用户</div>
                            <div class="question-time"></div>
                        </div>
                    </div>
                    <div class="question-content">
                        <div class="question-text"></div>
                    </div>
                </div>
                <div class="ai-display" style="display: none;">
                    <div class="ai-header">
                        <div class="ai-avatar">
                            <img src="icons/bic-an.png" alt="BIC-QA" class="avatar-img">
                        </div>
                        <div class="ai-info">
                            <div class="ai-name">BIC-QA</div>
                            <div class="ai-time"></div>
                        </div>
                    </div>
                </div>
                <h3 class="result-title">回答：</h3>
                <div class="result-text">
                    <p class="result-text-tips"></p>
                    <div class="result-text-content"></div>
                    <div class="result-text-knowlist"></div>
                </div>
                <div class="result-actions">
                    <div class="action-icons-row">
                        <button id="export-${containerId}" class="action-icon-btn export-btn" title="导出HTML">
                            <img src="icons/download.svg" alt="导出" class="action-icon-svg">
                        </button>
                        <button id="copy-${containerId}" class="action-icon-btn copy-btn" title="复制">
                            <img src="icons/copy.svg" alt="复制" class="action-icon-svg">
                        </button>
                        <button id="clear-${containerId}" class="action-icon-btn clear-btn" title="清空">
                            <img src="icons/clear.svg" alt="清空" class="action-icon-svg">
                        </button>
                        <button id="like-${containerId}" class="action-icon-btn like-btn" title="点赞 - 回答有帮助">
                            <img src="icons/good.svg" alt="点赞" class="action-icon-svg">
                        </button>
                        <button id="dislike-${containerId}" class="action-icon-btn dislike-btn" title="否定 - 回答没有帮助">
                            <img src="icons/bad.svg" alt="否定" class="action-icon-svg">
                        </button>
                    </div> 
                </div>
            </div>
        `;
        
        // 将新容器添加到主结果容器中
        if (this.resultContainer) {
            this.resultContainer.appendChild(conversationContainer);
        }
        
        // 滚动到底部
        this.scrollToBottom();
        
        return conversationContainer;
    }

    addToCurrentSessionHistory(userQuestion, aiAnswer) {
        // 检查是否已经存在相同的对话，避免重复添加
        const lastUserMessage = this.currentSessionHistory[this.currentSessionHistory.length - 2];
        const lastAssistantMessage = this.currentSessionHistory[this.currentSessionHistory.length - 1];
        
        // 如果最后一条用户消息和AI回答与当前要添加的相同，则不添加
        if (lastUserMessage && lastAssistantMessage && 
            lastUserMessage.role === "user" && lastAssistantMessage.role === "assistant" &&
            lastUserMessage.content === userQuestion && lastAssistantMessage.content === aiAnswer) {
            console.log('检测到重复对话，跳过添加:', { userQuestion, aiAnswer });
            return;
        }
        
        // 添加用户问题
        this.currentSessionHistory.push({
            role: "user",
            content: userQuestion
        });
        
        // 添加AI回答
        this.currentSessionHistory.push({
            role: "assistant", 
            content: aiAnswer
        });
        
        // 保持最多6条消息（3轮对话）
        if (this.currentSessionHistory.length > 6) {
            this.currentSessionHistory = this.currentSessionHistory.slice(-6);
        }
        
        console.log('当前会话历史:', this.currentSessionHistory);
    }

    // 获取当前对话容器的辅助方法（用于错误处理）
    getCurrentConversationContainer() {
        // 检查是否已经有正在进行的对话容器
        const existingContainers = this.resultContainer.querySelectorAll('.conversation-container');
        
        if (existingContainers.length === 0) {
            // 没有任何容器，创建第一个
            return this.getOrCreateConversationContainer();
        }
        
        // 获取最后一个容器（最新的对话）
        const lastContainer = existingContainers[existingContainers.length - 1];
        
        // 如果最后一个容器是默认容器且是第一次对话，使用它
        if (lastContainer.id === 'conversation-default' && this.currentSessionHistory.length === 0) {
            return lastContainer;
        }
        
        // 否则返回最后一个容器（最新的对话）
        return lastContainer;
    }

    // 获取或创建对话容器的辅助方法（用于新的对话）
    getOrCreateConversationContainer() {
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (isFirstConversation) {
            // 第一次对话，使用默认容器
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                this.resultContainer.style.display = 'block';
            }
        } else {
            // 后续对话，创建新容器
            conversationContainer = this.createNewConversationContainer();
        }
        
        return conversationContainer;
    }

    // 强制创建新对话容器的方法（用于确保每次对话都独立）
    forceCreateNewConversationContainer() {
        // 总是创建新的对话容器，除非是第一次对话且默认容器存在
        const isFirstConversation = this.currentSessionHistory.length === 0;
        let conversationContainer;
        
        if (isFirstConversation) {
            // 第一次对话，检查默认容器是否存在
            conversationContainer = this.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                // 如果默认容器存在，清空其内容并重新使用
                this.clearConversationContainer(conversationContainer);
                this.resultContainer.style.display = 'block';
                return conversationContainer;
            } else {
                // 如果默认容器不存在，创建新容器
                conversationContainer = this.createNewConversationContainer();
                return conversationContainer;
            }
        } else {
            // 后续对话，总是创建新容器
            conversationContainer = this.createNewConversationContainer();
            return conversationContainer;
        }
    }

    // 清空对话容器的辅助方法
    clearConversationContainer(container) {
        if (!container) return;
        
        // 清空问题显示
        const questionDisplay = container.querySelector('.question-display');
        if (questionDisplay) {
            questionDisplay.style.display = 'none';
        }
        
        // 清空AI显示
        const aiDisplay = container.querySelector('.ai-display');
        if (aiDisplay) {
            aiDisplay.style.display = 'none';
        }
        
        // 重置标题
        const resultTitle = container.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = '回答：';
        }
        
        // 清空结果文本
        const resultText = container.querySelector('.result-text');
        if (resultText) {
            resultText.innerHTML = `
                <p class="result-text-tips"></p>
                <div class="result-text-content"></div>
                <div class="result-text-knowlist"></div>
            `;
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BicQAPopup();
    
    // 将app实例暴露到全局作用域，供历史记录按钮使用
    window.app = app;
    window.bicQAPopup = app; // 确保bicQAPopup也指向同一个实例
    
    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', () => app.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => app.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => app.handleFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => app.handleFullscreenChange());
});

// 删除重复的初始化代码