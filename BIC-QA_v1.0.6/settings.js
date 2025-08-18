// BIC-QA 设置页面脚本
class BicQASettings {
    constructor() {
        this.providers = [];
        this.models = [];
        this.rules = [];
        this.currentSettings = {};
        this.editingProvider = null;
        this.editingModel = null;
        this.editingRule = null;
        
        // 预设服务商类型配置
        this.providerTypes = [
            {
                id: 'ollama',
                name: 'Ollama',
                displayName: 'Ollama',
                apiEndpoint: 'http://localhost:11434/v1',
                authType: 'Bearer',
                requestFormat: 'OpenAI',
                description: '本地部署的大语言模型服务'
            },
            {
                id: 'deepseek',
                name: 'DeepSeek',
                displayName: 'DeepSeek',
                apiEndpoint: 'https://api.deepseek.com/v1',
                authType: 'Bearer',
                requestFormat: 'OpenAI',
                description: 'DeepSeek官方API服务'
            },
            {
                id: 'openai',
                name: 'OpenAI',
                displayName: 'OpenAI',
                apiEndpoint: 'https://api.openai.com/v1',
                authType: 'Bearer',
                requestFormat: 'OpenAI',
                description: 'OpenAI官方API服务'
            }
        ];
        
        this.init();
    }

    async init() {
        try {
            await this.loadSettings();
            await this.loadProviderTypes(); // 加载服务商类型配置
            this.renderProviders();
            this.renderModels();
            this.renderRules();
            this.loadGeneralSettings();
            this.bindEvents();
            this.populateProviderTypeOptions(); // 初始化服务商类型下拉框
            
            // 检查规则数据是否正确
            console.log('初始化时检查规则数据...');
            const needsFix = this.checkAndFixRules();
            
            // 如果发现问题，自动修复
            // if (!needsFix) { 
            //     console.log('发现规则数据问题，正在自动修复...');
            //     await this.forceFixRules();
            // }
            
            // 加载其他配置
            await this.loadRegistrationConfig();
            await this.loadKnowledgeServiceConfig();
            await this.loadKnowledgeBases();
            
            console.log('BIC-QA 设置页面初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showMessage('初始化失败: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // 服务商相关事件
        document.getElementById('addProviderBtn').addEventListener('click', () => this.showProviderForm());
        document.getElementById('closeProviderForm').addEventListener('click', () => this.hideProviderForm());
        document.getElementById('cancelProvider').addEventListener('click', () => this.hideProviderForm());
        document.getElementById('providerForm').addEventListener('submit', (e) => {
            console.log('服务商表单提交事件被触发');
            this.handleProviderSubmit(e);
        });

        // 模型相关事件
        document.getElementById('addModelBtn').addEventListener('click', () => this.showModelForm());
        document.getElementById('closeModelForm').addEventListener('click', () => this.hideModelForm());
        document.getElementById('cancelModel').addEventListener('click', () => this.hideModelForm());
        document.getElementById('modelForm').addEventListener('submit', (e) => {
            console.log('模型表单提交事件被触发');
            this.handleModelSubmit(e);
        });

        // 规则相关事件
        document.getElementById('addRuleBtn').addEventListener('click', () => this.showRuleForm());
        document.getElementById('closeRuleForm').addEventListener('click', () => this.hideRuleForm());
        document.getElementById('cancelRule').addEventListener('click', () => this.hideRuleForm());
        document.getElementById('ruleForm').addEventListener('submit', (e) => {
            console.log('规则表单提交事件被触发');
            this.handleRuleSubmit(e);
        });
        
        // 恢复初始设置按钮事件
        const resetDefaultRulesBtn = document.getElementById('resetDefaultRulesBtn');
        if (resetDefaultRulesBtn) {
            resetDefaultRulesBtn.addEventListener('click', () => this.resetDefaultRules());
        }

        // 注册相关事件
        document.getElementById('registerBtn').addEventListener('click', () => this.handleRegister());
        document.getElementById('checkRegisterStatusBtn').addEventListener('click', () => this.checkRegisterStatus());
        document.getElementById('resendBtn').addEventListener('click', () => this.handleResendKey());

        // 知识库服务配置事件
        document.getElementById('saveKnowledgeServiceBtn').addEventListener('click', () => this.saveKnowledgeService());
        document.getElementById('testKnowledgeServiceBtn').addEventListener('click', () => this.testKnowledgeService());

        // 通用设置事件
        document.getElementById('saveSettings').addEventListener('click', () => this.saveAllSettings());
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());
        document.getElementById('clearSettings').addEventListener('click', () => this.clearSettings());
        document.getElementById('exportSettings').addEventListener('click', () => this.exportSettings());
        document.getElementById('importSettings').addEventListener('click', () => this.importSettings());
        
        // 返回问答界面
        document.getElementById('backToQA').addEventListener('click', () => this.backToQA());
        
        // 知识库管理按钮
        document.getElementById('refreshKnowledgeBasesBtn').addEventListener('click', () => this.refreshKnowledgeBases());
        document.getElementById('exportKnowledgeBasesBtn').addEventListener('click', () => this.exportKnowledgeBases());
        
        // 反馈历史按钮
        document.getElementById('refreshFeedbackBtn').addEventListener('click', () => this.refreshFeedback());
        document.getElementById('exportFeedbackBtn').addEventListener('click', () => this.exportFeedback());
        document.getElementById('clearFeedbackBtn').addEventListener('click', () => this.clearFeedback());
        
        // 密码切换按钮事件绑定
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-password')) {
                const inputId = e.target.getAttribute('data-input-id');
                if (inputId) {
                    this.togglePassword(inputId);
                }
            }
        });
        
        // 规则列表事件委托
        document.getElementById('rulesList').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('action-btn')) {
                const action = target.getAttribute('data-action');
                const index = parseInt(target.getAttribute('data-index'));
                
                if (action === 'edit') {
                    this.editRule(index);
                } else if (action === 'delete') {
                    this.deleteRule(index);
                }
            }
        });
        
        // 服务商列表事件委托
        document.getElementById('providersList').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('action-btn')) {
                const action = target.getAttribute('data-action');
                const index = parseInt(target.getAttribute('data-index'));
                
                if (action === 'test') {
                    this.testProvider(index);
                } else if (action === 'edit') {
                    this.editProvider(index);
                } else if (action === 'delete') {
                    this.deleteProvider(index);
                }
            }
        });
        
        // 模型列表事件委托
        document.getElementById('modelsList').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('action-btn')) {
                const action = target.getAttribute('data-action');
                const index = parseInt(target.getAttribute('data-index'));
                
                if (action === 'test') {
                    this.testModel(index);
                } else if (action === 'edit') {
                    this.editModel(index);
                } else if (action === 'delete') {
                    this.deleteModel(index);
                }
            }
        });

        // 服务商类型选择事件
        const providerTypeSelect = document.getElementById('providerType');
        if (providerTypeSelect) {
            providerTypeSelect.addEventListener('change', (e) => this.handleProviderTypeChange(e));
        }
        
        // 服务商类型管理按钮事件
        const manageProviderTypesBtn = document.getElementById('manageProviderTypes');
        if (manageProviderTypesBtn) {
            manageProviderTypesBtn.addEventListener('click', () => this.showProviderTypeManager());
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['providers', 'models', 'rules', 'generalSettings', 'defaultRulesModified']);
            this.providers = result.providers || [];
            this.models = result.models || [];
            
            // 检查并修复默认模型问题
            this.ensureSingleDefaultModel();
            
            // 获取默认规则和保存的规则
            const defaultRules = this.getDefaultRules();
            const savedRules = result.rules || [];
            const defaultRulesModified = result.defaultRulesModified || false;
            
            if (defaultRulesModified) {
                // 如果内置规则被修改过，使用 mergeRules 方法合并
                this.rules = this.mergeRules(defaultRules, savedRules);
            } else {
                // 如果内置规则没有被修改过，直接使用默认规则并添加用户自定义规则
                this.rules = [...defaultRules];
                
                // 只添加非内置的用户自定义规则
                savedRules.forEach(savedRule => {
                    if (!this.isBuiltInRule(savedRule.id)) {
                        this.rules.push(savedRule);
                    }
                });
            }
            
            this.currentSettings = result.generalSettings || this.getDefaultSettings();
            
            // 移除自动检查规则数据，避免干扰正常的规则修改
            // this.checkAndFixRules();
        } catch (error) {
            console.error('加载设置失败:', error);
            this.providers = [];
            this.models = [];
            this.rules = this.getDefaultRules();
            this.currentSettings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            defaultLanguage: 'zh-CN',
            theme: 'light',
            enableNotifications: true,
            autoTranslate: false
        };
    }

    getDefaultRules() {
        return [
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
    }

    // 判断是否为内置规则
    isBuiltInRule(ruleId) {
        const builtInIds = ['default-fast-search', 'default-flexible-search'];
        return builtInIds.includes(ruleId);
    }

    // 合并内置规则和用户自定义规则
    mergeRules(defaultRules, savedRules) {
        const mergedRules = [...defaultRules]; // 复制内置规则
        
        // 清理用户规则中的重复项
        const cleanedSavedRules = this.cleanDuplicateRules(savedRules);
        
        // 处理保存的规则
        cleanedSavedRules.forEach(savedRule => {
            if (!this.isBuiltInRule(savedRule.id)) {
                // 用户自定义规则 - 直接添加
                mergedRules.push(savedRule);
            } else {
                // 内置规则 - 使用保存的版本，包括用户修改的默认状态
                const existingIndex = mergedRules.findIndex(rule => rule.id === savedRule.id);
                if (existingIndex !== -1) {
                    console.log(`使用保存的内置规则版本: ${savedRule.name}`);
                    // 使用保存的版本，包括用户可能修改的 isDefault 状态
                    mergedRules[existingIndex] = { 
                        ...savedRule
                        // 移除强制保持原有默认状态的逻辑，允许用户修改
                    };
                }
            }
        });
        
        return mergedRules;
    }

    // 清理重复规则的方法
    cleanDuplicateRules(savedRules) {
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
        
        // 如果清理了规则，更新存储
        if (cleanedRules.length !== savedRules.length) {
            chrome.storage.sync.set({ rules: cleanedRules }, () => {
                console.log('已清理重复规则并更新存储');
            });
        }
        
        return cleanedRules;
    }

    renderProviders() {
        const container = document.getElementById('providersList');
        container.innerHTML = '';

        if (this.providers.length === 0) {
            container.innerHTML = '<p class="empty-message">暂无服务商配置，请添加服务商</p>';
            return;
        }

        this.providers.forEach((provider, index) => {
            const providerElement = this.createProviderElement(provider, index);
            container.appendChild(providerElement);
        });
    }

    createProviderElement(provider, index) {
        const div = document.createElement('div');
        div.className = 'provider-item';
        div.setAttribute('data-provider-index', index);
        
        // 构建自定义端点信息
        const customEndpointInfo = provider.modelsEndpoint ? 
            `<div class="detail-item">
                <div class="detail-label">自定义模型端点</div>
                <div class="detail-value">${provider.modelsEndpoint}</div>
            </div>` : '';
        
        div.innerHTML = `
            <div class="provider-header">
                <div class="provider-name">
                    <span class="status-indicator status-active"></span>
                    ${provider.name}
                </div>
                <div class="provider-actions">
                    <button class="action-btn test-btn" data-action="test" data-index="${index}">模型发现</button>
                    <button class="action-btn edit-btn" data-action="edit" data-index="${index}">编辑</button>
                    <button class="action-btn delete-btn" data-action="delete" data-index="${index}">删除</button>
                </div>
            </div>
            <div class="provider-details">
                <div class="detail-item">
                    <div class="detail-label">API地址</div>
                    <div class="detail-value">${provider.apiEndpoint}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">认证类型</div>
                    <div class="detail-value">${provider.authType}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">请求格式</div>
                    <div class="detail-value">${provider.requestFormat}</div>
                </div>
                ${customEndpointInfo}
                <div class="detail-item">
                    <div class="detail-label">关联模型</div>
                    <div class="detail-value">${this.getProviderModels(provider.name).length} 个</div>
                </div>
            </div>
        `;
        
        return div;
    }

    renderModels() {
        const container = document.getElementById('modelsList');
        container.innerHTML = '';

        if (this.models.length === 0) {
            container.innerHTML = '<p class="empty-message">暂无模型配置，请添加模型</p>';
            return;
        }

        this.models.forEach((model, index) => {
            const modelElement = this.createModelElement(model, index);
            container.appendChild(modelElement);
        });

        // 更新模型表单中的服务商选项
        this.updateModelProviderOptions();
    }

    renderRules() {
        const rulesList = document.getElementById('rulesList');
        rulesList.innerHTML = '';
        
        if (this.rules.length === 0) {
            rulesList.innerHTML = `
                <div class="empty-state">
                    <p>暂无参数规则配置</p>
                    <p>点击"添加规则"按钮开始配置</p>
                </div>
            `;
            return;
        }
        
        this.rules.forEach((rule, index) => {
            const ruleElement = this.createRuleElement(rule, index);
            rulesList.appendChild(ruleElement);
        });
    }

    createModelElement(model, index) {
        const div = document.createElement('div');
        div.className = 'model-item';
        div.setAttribute('data-model-index', index);
        div.innerHTML = `
            <div class="model-header">
                <div class="model-name">
                    ${model.displayName || model.name}
                    ${model.isDefault ? '<span class="default-badge">默认</span>' : ''}
                </div>
                <div class="model-actions">
                    <button class="action-btn test-btn" data-action="test" data-index="${index}" title="测试模型聊天功能">聊天测试</button>
                    <button class="action-btn edit-btn" data-action="edit" data-index="${index}">编辑</button>
                    <button class="action-btn delete-btn" data-action="delete" data-index="${index}">删除</button>
                </div>
            </div>
            <div class="model-details">
                <div class="detail-item">
                    <div class="detail-label">模型名称</div>
                    <div class="detail-value">${model.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">所属服务商</div>
                    <div class="detail-value">${model.provider}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">最大Token</div>
                    <div class="detail-value">${model.maxTokens || '未设置'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">温度参数</div>
                    <div class="detail-value">${model.temperature || '未设置'}</div>
                </div>
            </div>
        `;
        
        return div;
    }

    createRuleElement(rule, index) {
        const ruleElement = document.createElement('div');
        ruleElement.className = 'rule-item';
        
        const defaultBadge = rule.isDefault ? '<span class="default-badge">默认</span>' : '';
        const builtInBadge = this.isBuiltInRule(rule.id) ? '<span class="built-in-badge">内置</span>' : '';
        
        // 判断是否为内置规则
        const isBuiltIn = this.isBuiltInRule(rule.id);
        
        ruleElement.innerHTML = `
            <div class="rule-header">
                <div class="rule-name">
                    ${rule.name} ${defaultBadge} ${builtInBadge}
                </div>
                <div class="rule-actions">
                    <button class="action-btn edit-btn" data-action="edit" data-index="${index}" title="编辑规则">
                        编辑
                    </button>
                    ${!isBuiltIn ? `<button class="action-btn delete-btn" data-action="delete" data-index="${index}" title="删除规则">
                        删除
                    </button>` : ''}
                </div>
            </div>
            <div class="rule-details">
                <div class="detail-item">
                    <span class="detail-label">相似度阈值</span>
                    <span class="detail-value">${rule.similarity}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">TOP N</span>
                    <span class="detail-value">${rule.topN}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">温度</span>
                    <span class="detail-value">${rule.temperature}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">提示词</span>
                    <span class="detail-value">${rule.prompt || '无提示词'}</span>
                </div>
            </div>
        `;
        
        return ruleElement;
    }

    getProviderModels(providerName) {
        return this.models.filter(model => model.provider === providerName);
    }

    updateModelProviderOptions() {
        const select = document.getElementById('modelProvider');
        select.innerHTML = '<option value="">请选择服务商</option>';
        
        this.providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.name;
            option.textContent = provider.name;
            select.appendChild(option);
        });
    }

    showProviderForm(provider = null) {
        this.editingProvider = provider;
        const form = document.getElementById('addProviderForm');
        const title = form.querySelector('.form-header h3');
        
        // 初始化服务商类型下拉框
        this.populateProviderTypeOptions();
        
        if (provider) {
            title.textContent = '编辑服务商';
            this.fillProviderForm(provider);
        } else {
            title.textContent = '添加服务商';
            document.getElementById('providerForm').reset();
            
            // 设置默认的服务商类型（如果有的话）
            const providerTypeSelect = document.getElementById('providerType');
            if (providerTypeSelect && this.providerTypes.length > 0) {
                // 默认选择第一个服务商类型
                providerTypeSelect.value = this.providerTypes[0].id;
                // 触发change事件以自动填充其他字段
                const event = new Event('change');
                providerTypeSelect.dispatchEvent(event);
            }
            
            // 清除描述信息
            const existingDesc = document.querySelector('.provider-type-description');
            if (existingDesc) {
                existingDesc.remove();
            }
        }
        
        form.style.display = 'flex';
    }

    hideProviderForm() {
        document.getElementById('addProviderForm').style.display = 'none';
        this.editingProvider = null;
        this.editingProviderIndex = undefined;
    }

    fillProviderForm(provider) {
        document.getElementById('providerName').value = provider.name;
        document.getElementById('apiEndpoint').value = provider.apiEndpoint;
        document.getElementById('apiKey').value = provider.apiKey;
        document.getElementById('authType').value = provider.authType;
        document.getElementById('requestFormat').value = provider.requestFormat;
        
        // 填充服务商类型（如果存在）
        const providerTypeSelect = document.getElementById('providerType');
        if (providerTypeSelect && provider.providerType) {
            providerTypeSelect.value = provider.providerType;
        }
        
        // 填充自定义模型列表端点（如果存在）
        const modelsEndpointInput = document.getElementById('modelsEndpoint');
        if (modelsEndpointInput) {
            modelsEndpointInput.value = provider.modelsEndpoint || '';
        }
    }

    async handleProviderSubmit(e) {
        e.preventDefault();
        
        console.log('处理服务商表单提交');
        console.log('编辑索引:', this.editingProviderIndex);
        
        const formData = new FormData(e.target);
        const provider = {
            name: formData.get('providerName'),
            apiEndpoint: formData.get('apiEndpoint'),
            apiKey: formData.get('apiKey'),
            authType: formData.get('authType'),
            requestFormat: formData.get('requestFormat'),
            providerType: formData.get('providerType') // 添加服务商类型
        };
        
        // 添加自定义模型列表端点（如果存在）
        const modelsEndpointInput = document.getElementById('modelsEndpoint');
        if (modelsEndpointInput && modelsEndpointInput.value.trim()) {
            provider.modelsEndpoint = modelsEndpointInput.value.trim();
        }
        
        console.log('表单数据:', provider);

        // 服务商名称唯一性校验
        const existingProviderIndex = this.providers.findIndex(p => p.name === provider.name);
        
        if (this.editingProviderIndex !== undefined) {
            // 编辑现有服务商
            const originalName = this.providers[this.editingProviderIndex].name;
            
            // 如果名称改变了，需要检查唯一性
            if (originalName !== provider.name && existingProviderIndex !== -1 && existingProviderIndex !== this.editingProviderIndex) {
                this.showMessage(`❌ 服务商名称 "${provider.name}" 已存在，请使用其他名称`, 'error');
                return;
            }
            
            this.providers[this.editingProviderIndex] = provider;
            
            // 如果服务商名称改变了，需要更新关联的模型
            if (originalName !== provider.name) {
                this.models.forEach(model => {
                    if (model.provider === originalName) {
                        model.provider = provider.name;
                    }
                });
                await this.saveModels();
            }
        } else {
            // 添加新服务商
            if (existingProviderIndex !== -1) {
                this.showMessage(`❌ 服务商名称 "${provider.name}" 已存在，请使用其他名称`, 'error');
                return;
            }
            this.providers.push(provider);
        }

        await this.saveProviders();
        console.log('服务商保存成功，当前服务商列表:', this.providers);
        this.renderProviders();
        this.renderModels(); // 重新渲染模型列表以更新关联信息
        this.hideProviderForm();
        this.showMessage('服务商配置已保存', 'success');
    }

    showModelForm(model = null) {
        this.editingModel = model;
        const form = document.getElementById('addModelForm');
        const title = form.querySelector('.form-header h3');
        
        // 确保服务商选项已更新
        this.updateModelProviderOptions();
        
        if (model) {
            title.textContent = '编辑模型';
            this.fillModelForm(model);
        } else {
            title.textContent = '添加模型';
            document.getElementById('modelForm').reset();
        }
        
        // 添加模型名称自动填充功能
        this.setupModelNameAutoFill();
        
        form.style.display = 'flex';
    }

    // 设置模型名称自动填充功能
    async setupModelNameAutoFill() {
        const providerSelect = document.getElementById('modelProvider');
        const modelNameInput = document.getElementById('modelName');
        
        if (!providerSelect || !modelNameInput) {
            return;
        }
        
        // 监听服务商选择变化
        providerSelect.addEventListener('change', async (e) => {
            const selectedProvider = e.target.value;
            if (!selectedProvider) {
                this.clearModelNameOptions();
                return;
            }
            
            try {
                // 获取该服务商的配置
                const provider = this.providers.find(p => p.name === selectedProvider);
                if (!provider) {
                    return;
                }
                
                // 尝试获取可用模型列表
                const availableModels = await this.getAvailableModels(provider);
                if (availableModels && availableModels.length > 0) {
                    this.populateModelNameOptions(availableModels);
                }
            } catch (error) {
                console.warn('获取可用模型失败:', error);
            }
        });
        
        // 如果当前已选择服务商，立即加载模型列表
        if (providerSelect.value) {
            providerSelect.dispatchEvent(new Event('change'));
        }
    }

    // 填充模型名称选项
    populateModelNameOptions(availableModels) {
        const modelNameInput = document.getElementById('modelName');
        if (!modelNameInput) {
            return;
        }
        
        // 创建数据列表
        let datalist = document.getElementById('modelNameOptions');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'modelNameOptions';
            document.body.appendChild(datalist);
        }
        
        // 清空现有选项
        datalist.innerHTML = '';
        
        // 添加模型选项
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id || model.name;
            option.textContent = model.displayName || model.name;
            datalist.appendChild(option);
        });
        
        // 设置输入框的list属性
        modelNameInput.setAttribute('list', 'modelNameOptions');
        modelNameInput.placeholder = `选择或输入模型名称 (${availableModels.length} 个可用模型)`;
        
        // 添加刷新按钮
        this.addRefreshModelsButton(availableModels.length);
    }

    // 添加刷新模型列表按钮
    addRefreshModelsButton(modelCount) {
        // 查找或创建刷新按钮容器
        let refreshContainer = document.getElementById('refreshModelsContainer');
        if (!refreshContainer) {
            refreshContainer = document.createElement('div');
            refreshContainer.id = 'refreshModelsContainer';
            refreshContainer.style.cssText = `
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: #666;
            `;
            
            // 插入到模型名称输入框后面
            const modelNameInput = document.getElementById('modelName');
            if (modelNameInput && modelNameInput.parentElement) {
                modelNameInput.parentElement.appendChild(refreshContainer);
            }
        }
        
        refreshContainer.innerHTML = `
            <span>�� 已加载 ${modelCount} 个可用模型</span>
            <button type="button" id="refreshModelsBtn" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
            ">🔄 刷新</button>
        `;
        
        // 绑定刷新按钮事件
        const refreshBtn = document.getElementById('refreshModelsBtn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshModelsList();
        }
    }

    // 刷新模型列表
    async refreshModelsList() {
        const providerSelect = document.getElementById('modelProvider');
        if (!providerSelect || !providerSelect.value) {
            this.showMessage('请先选择服务商', 'warning');
            return;
        }
        
        try {
            this.showMessage('正在刷新模型列表...', 'info');
            
            const provider = this.providers.find(p => p.name === providerSelect.value);
            if (!provider) {
                throw new Error('找不到选中的服务商');
            }
            
            const availableModels = await this.getAvailableModels(provider);
            if (availableModels && availableModels.length > 0) {
                this.populateModelNameOptions(availableModels);
                this.showMessage(`已刷新模型列表，共 ${availableModels.length} 个模型`, 'success');
            } else {
                throw new Error('无法获取模型列表');
            }
            
        } catch (error) {
            console.error('刷新模型列表失败:', error);
            this.showMessage('刷新模型列表失败: ' + error.message, 'error');
        }
    }

    // 清除模型名称选项
    clearModelNameOptions() {
        const modelNameInput = document.getElementById('modelName');
        if (modelNameInput) {
            modelNameInput.removeAttribute('list');
            modelNameInput.placeholder = '输入模型名称';
        }
    }

    showRuleForm(rule = null) {
        this.editingRule = rule;
        const form = document.getElementById('addRuleForm');
        const title = form.querySelector('.form-header h3');
        
        if (rule) {
            title.textContent = '编辑参数规则';
            this.fillRuleForm(rule);
        } else {
            title.textContent = '添加参数规则';
            document.getElementById('ruleForm').reset();
        }
        
        form.style.display = 'flex';
    }

    hideModelForm() {
        document.getElementById('addModelForm').style.display = 'none';
        this.editingModel = null;
        this.editingModelIndex = undefined;
    }

    hideRuleForm() {
        document.getElementById('addRuleForm').style.display = 'none';
        this.editingRule = null;
    }

    fillModelForm(model) {
        document.getElementById('modelProvider').value = model.provider;
        document.getElementById('modelName').value = model.name;
        document.getElementById('modelDisplayName').value = model.displayName || '';
        document.getElementById('maxTokens').value = model.maxTokens || '';
        document.getElementById('temperature').value = model.temperature || '';
        document.getElementById('isDefault').checked = model.isDefault || false;
    }

    fillRuleForm(rule) {
        console.log('fillRuleForm被调用，规则数据:', rule);
        console.log('规则temperature值:', rule.temperature, '类型:', typeof rule.temperature);
        
        // 获取输入框元素
        const ruleNameInput = document.getElementById('ruleName');
        const similarityInput = document.getElementById('similarity');
        const topNInput = document.getElementById('topN');
        const temperatureInput = document.getElementById('ruleTemperature');
        const promptInput = document.getElementById('rulePrompt');
        const isDefaultInput = document.getElementById('isDefaultRule');
        
        console.log('找到的输入框元素:', {
            ruleName: ruleNameInput,
            similarity: similarityInput,
            topN: topNInput,
            temperature: temperatureInput,
            prompt: promptInput,
            isDefault: isDefaultInput
        });
        
        // 填充表单数据
        if (ruleNameInput) ruleNameInput.value = rule.name;
        if (similarityInput) similarityInput.value = rule.similarity;
        if (topNInput) topNInput.value = rule.topN;
        if (temperatureInput) {
            temperatureInput.value = rule.temperature;
            console.log('设置temperature输入框值:', rule.temperature);
        }
        if (promptInput) promptInput.value = rule.prompt || '';
        if (isDefaultInput) isDefaultInput.checked = rule.isDefault || false;
        
        console.log('表单填充完成，各输入框值:', {
            ruleName: ruleNameInput?.value,
            similarity: similarityInput?.value,
            topN: topNInput?.value,
            temperature: temperatureInput?.value,
            prompt: promptInput?.value,
            isDefault: isDefaultInput?.checked
        });
    }

    async handleModelSubmit(e) {
        e.preventDefault();
        
        console.log('处理模型表单提交');
        console.log('编辑索引:', this.editingModelIndex);
        
        const formData = new FormData(e.target);
        const model = {
            provider: formData.get('modelProvider'),
            name: formData.get('modelName'),
            displayName: formData.get('modelDisplayName'),
            maxTokens: formData.get('maxTokens') ? parseInt(formData.get('maxTokens')) : null,
            temperature: formData.get('temperature') ? parseFloat(formData.get('temperature')) : null,
            isDefault: formData.get('isDefault') === 'on'
        };
        
        console.log('表单数据:', model);

        // 模型名称和服务商组合的唯一性校验
        const existingModelIndex = this.models.findIndex(m => 
            m.name === model.name && m.provider === model.provider
        );

        if (this.editingModelIndex !== undefined) {
            // 编辑现有模型
            const originalModel = this.models[this.editingModelIndex];
            
            // 如果模型名称或服务商改变了，需要检查唯一性
            if ((originalModel.name !== model.name || originalModel.provider !== model.provider) && 
                existingModelIndex !== -1 && existingModelIndex !== this.editingModelIndex) {
                this.showMessage(`❌ 模型 "${model.name}" 在服务商 "${model.provider}" 下已存在，请使用其他名称或选择其他服务商`, 'error');
                return;
            }
            
            // 更新模型
            this.models[this.editingModelIndex] = model;
        } else {
            // 添加新模型
            if (existingModelIndex !== -1) {
                this.showMessage(`❌ 模型 "${model.name}" 在服务商 "${model.provider}" 下已存在，请使用其他名称或选择其他服务商`, 'error');
                return;
            }
            this.models.push(model);
        }

        // 如果设为默认模型，取消其他模型的默认状态
        if (model.isDefault) {
            this.models.forEach((m, index) => {
                if (index !== this.editingModelIndex && this.editingModelIndex !== undefined) {
                    // 编辑模式：取消其他模型的默认状态
                    m.isDefault = false;
                } else if (this.editingModelIndex === undefined) {
                    // 新增模式：取消所有其他模型的默认状态
                    m.isDefault = false;
                }
            });
            
            // 确保当前模型为默认
            if (this.editingModelIndex !== undefined) {
                this.models[this.editingModelIndex].isDefault = true;
            } else {
                // 新增模式：确保新添加的模型为默认
                this.models[this.models.length - 1].isDefault = true;
            }
        }

        // 确保只有一个默认模型
        this.ensureSingleDefaultModel();
        
        await this.saveModels();
        console.log('模型保存成功，当前模型列表:', this.models);
        this.renderModels();
        this.hideModelForm();
        this.showMessage('模型配置已保存', 'success');
    }

    async handleRuleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // 添加详细的调试信息
        console.log('=== 表单提交调试信息 ==='+formData);
        console.log('表单数据内容:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value} (类型: ${typeof value})`);
        }
        
        // 修复字段名称，使其与表单填充时的字段ID保持一致
        const similarityValue = formData.get('similarity');
        const topNValue = formData.get('topN');
        const temperatureValue = formData.get('temperature'); // 修复：使用正确的字段名称
        
        console.log('获取到的字段值:');
        console.log('- similarityValue:', similarityValue, '(类型:', typeof similarityValue, ')');
        console.log('- topNValue:', topNValue, '(类型:', typeof topNValue, ')');
        console.log('- temperatureValue:', temperatureValue, '(类型:', typeof temperatureValue, ')');
        
        // 改进的数据类型转换
        const parsedSimilarity = similarityValue ? parseFloat(similarityValue) : null;
        const parsedTopN = topNValue ? parseInt(topNValue) : null;
        const parsedTemperature = temperatureValue ? parseFloat(temperatureValue) : null;
        
        console.log('解析后的数值:');
        console.log('- parsedSimilarity:', parsedSimilarity, '(类型:', typeof parsedSimilarity, ')');
        console.log('- parsedTopN:', parsedTopN, '(类型:', typeof parsedTopN, ')');
        console.log('- parsedTemperature:', parsedTemperature, '(类型:', typeof parsedTemperature, ')');
        
        const ruleData = {
            name: formData.get('ruleName'),
            similarity: parsedSimilarity !== null ? parsedSimilarity : 0.7,
            topN: parsedTopN !== null ? parsedTopN : 6,
            temperature: parsedTemperature !== null ? parsedTemperature : 0.7,
            prompt: formData.get('rulePrompt'),
            isDefault: formData.get('isDefaultRule') === 'on'
        };
        
        console.log('最终规则数据:', ruleData);
        
        // 验证数据
        if (!ruleData.name || ruleData.name.trim() === '') {
            this.showMessage('请输入规则名称', 'error');
            return;
        }
        
        if (isNaN(ruleData.similarity) || ruleData.similarity < 0 || ruleData.similarity > 1) {
            this.showMessage('相似度必须在0-1之间', 'error');
            return;
        }
        
        if (isNaN(ruleData.topN) || ruleData.topN < 1 || ruleData.topN > 10) {
            this.showMessage('TOP N必须在1-10之间', 'error');
            return;
        }
        
        if (isNaN(ruleData.temperature) || ruleData.temperature < 0 || ruleData.temperature > 2) {
            this.showMessage('温度必须在0-2之间', 'error');
            return;
        }
        
        console.log('提交的规则数据:', ruleData);
        
        try {
            let newRule = null;
            
            if (this.editingRule) {
                // 编辑模式
                const index = this.rules.findIndex(r => r.id === this.editingRule.id);
                if (index !== -1) {
                    // 保留原有的id和description属性，但允许修改isDefault状态
                    const originalRule = this.rules[index];
                    this.rules[index] = { 
                        ...originalRule, 
                        ...ruleData,
                        id: originalRule.id, // 保持原有ID
                        description: originalRule.description // 保持原有的description
                        // 移除强制保持原有isDefault状态的逻辑，允许用户修改
                    };
                    console.log('更新后的规则:', this.rules[index]);
                    this.showMessage('规则更新成功', 'success');
                }
            } else {
                // 添加模式
                newRule = {
                    id: 'rule_' + Date.now(),
                    description: '', // 为用户自定义规则添加空的description
                    ...ruleData
                };
                this.rules.push(newRule);
                this.showMessage('规则添加成功', 'success');
            }
            
            // 如果设置为默认规则，取消其他规则的默认状态
            if (ruleData.isDefault) {
                this.rules.forEach(rule => {
                    if (rule.id !== (this.editingRule?.id || newRule?.id)) {
                        rule.isDefault = false;
                    }
                });
            }
            
            await this.saveRules();
            this.renderRules();
            this.hideRuleForm();
            
        } catch (error) {
            console.error('保存规则失败:', error);
            this.showMessage('保存规则失败: ' + error.message, 'error');
        }
    }

    editProvider(index) {
        console.log('编辑服务商:', index, this.providers[index]);
        this.editingProviderIndex = index; // 存储索引而不是对象
        const provider = this.providers[index];
        this.showProviderForm(provider);
    }

    editModel(index) {
        console.log('编辑模型:', index, this.models[index]);
        this.editingModelIndex = index; // 存储索引而不是对象
        const model = this.models[index];
        this.showModelForm(model);
    }

    editRule(index) {
        console.log('editRule被调用，索引:', index);
        const rule = this.rules[index];
        console.log('要编辑的规则:', rule);
        console.log('规则temperature值:', rule.temperature, '类型:', typeof rule.temperature);
        console.log('当前所有规则:', this.rules);
        
        // 检查是否为内置规则
        if (this.isBuiltInRule(rule.id)) {
            const defaultRules = this.getDefaultRules();
            const defaultRule = defaultRules.find(r => r.id === rule.id);
            if (defaultRule) {
                console.log('对应的默认规则:', defaultRule);
                console.log('默认规则temperature值:', defaultRule.temperature);
                console.log('当前规则temperature值:', rule.temperature);
                console.log('温度值是否匹配:', rule.temperature === defaultRule.temperature);
            }
        }
        
        this.showRuleForm(rule);
    }

    async deleteProvider(index) {
        const provider = this.providers[index];
        const relatedModels = this.getProviderModels(provider.name);
        
        if (relatedModels.length > 0) {
            const confirm = window.confirm(
                `删除服务商"${provider.name}"将同时删除其关联的${relatedModels.length}个模型，确定继续吗？`
            );
            if (!confirm) return;
            
            // 删除关联的模型
            this.models = this.models.filter(model => model.provider !== provider.name);
            await this.saveModels();
        }
        
        this.providers.splice(index, 1);
        await this.saveProviders();
        this.renderProviders();
        this.renderModels();
        this.showMessage('服务商已删除', 'success');
    }

    async deleteModel(index) {
        const model = this.models[index];
        if (confirm(`确定要删除模型 "${model.name}" 吗？`)) {
            this.models.splice(index, 1);
            
            // 确保删除后仍然只有一个默认模型
            this.ensureSingleDefaultModel();
            
            await this.saveModels();
            this.renderModels();
            this.showMessage('模型删除成功', 'success');
        }
    }

    async deleteRule(index) {
        const rule = this.rules[index];
        
        // 检查是否为内置规则
        if (this.isBuiltInRule(rule.id)) {
            // 如果是内置规则，询问是否要恢复默认值
            const confirm = window.confirm(
                `"${rule.name}" 是内置规则，删除后将恢复为默认值。确定继续吗？`
            );
            if (!confirm) return;
            
            // 恢复默认规则
            const defaultRules = this.getDefaultRules();
            const defaultRule = defaultRules.find(r => r.id === rule.id);
            if (defaultRule) {
                this.rules[index] = { ...defaultRule };
                await this.saveRules();
                this.renderRules();
                this.showMessage('规则已恢复为默认值', 'success');
                return;
            }
        }
        
        // 删除用户自定义规则或恢复默认值失败的情况
        if (confirm(`确定要删除规则 "${rule.name}" 吗？`)) {
            this.rules.splice(index, 1);
            await this.saveRules();
            this.renderRules();
            this.showMessage('规则删除成功', 'success');
        }
    }

    async testProvider(index) {
        console.log('测试服务商:', index, this.providers[index]);
        const provider = this.providers[index];
        
        // 显示初始测试提示
        this.showMessage('正在测试服务商连接...', 'info');
        
        try {
            // 首先测试API Key的有效性
            this.showMessage('正在验证API Key...', 'info');
            await this.validateAPIKey(provider);
            
            // 显示获取模型列表的提示
            this.showMessage('API Key验证成功，正在获取可用模型列表...', 'info');
            
            // 然后进行完整的API测试
            const testResult = await this.performAPITest(provider);
            
            // 显示成功消息和可用模型信息
            const modelCount = testResult.availableModels.length;
            const modelNames = testResult.availableModels.slice(0, 3).map(m => m.displayName || m.name).join(', ');
            const moreModels = modelCount > 3 ? ` 等${modelCount}个模型` : '';
            
            // 显示最终成功消息，明确说明测试内容
            const testType = this.isOllamaService(provider) ? '' : '';
            this.showMessage(`✅ 服务商"${provider.name}"连接测试成功${testType}！发现 ${modelCount} 个模型: ${modelNames}${moreModels}`, 'success');
            
            // 如果模型数量较多，在控制台显示完整列表
            if (modelCount > 3) {
                console.log('完整可用模型列表:', testResult.availableModels.map(m => m.displayName || m.name));
            }
            
            // 延迟一下再显示弹窗，让用户看到成功消息
            setTimeout(() => {
                this.showModelSelectionDialog(provider, testResult.availableModels);
            }, 1000);
            
            // 更新测试状态
            this.updateProviderStatus(index, 'active');
            
        } catch (error) {
            console.error('API测试失败:', error);
            this.showMessage(`❌ 服务商"${provider.name}"连接测试失败: ${error.message}`, 'error');
            this.updateProviderStatus(index, 'inactive');
        }
    }

    // 显示模型选择弹窗
    showModelSelectionDialog(provider, availableModels) {
        // 创建弹窗容器
        const dialog = document.createElement('div');
        dialog.className = 'model-selection-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // 创建弹窗内容
        const content = document.createElement('div');
        content.className = 'model-selection-content';

        // 弹窗标题
        const title = document.createElement('h3');
        const testType = this.isOllamaService(provider) ? '' : '';
        title.innerHTML = `✅ 连接测试成功${testType} - 选择要纳管的模型 <span style="color:#666;font-size:14px;font-weight:normal;">(${provider.name} - 发现 ${availableModels.length} 个模型)</span>`;

        // 模型列表容器
        const modelList = document.createElement('div');
        modelList.className = 'model-list';

        // 全选/取消全选按钮
        const selectAllContainer = document.createElement('div');

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'selectAllModels';

        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = 'selectAllModels';
        selectAllLabel.textContent = '全选/取消全选';

        selectAllContainer.appendChild(selectAllCheckbox);
        selectAllContainer.appendChild(selectAllLabel);

        // 创建模型列表
        const modelCheckboxes = [];
        availableModels.forEach((model, index) => {
            const modelItem = document.createElement('div');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `model_${index}`;
            checkbox.dataset.modelIndex = index;

            const label = document.createElement('label');
            label.htmlFor = `model_${index}`;
            label.textContent = model.displayName || model.name;

            const modelId = document.createElement('span');
            modelId.textContent = `(${model.id || model.name})`;

            modelItem.appendChild(checkbox);
            modelItem.appendChild(label);
            modelItem.appendChild(modelId);
            modelList.appendChild(modelItem);

            modelCheckboxes.push(checkbox);
        });

        // 批量设置参数区域
        const batchSettings = document.createElement('div');

        const batchTitle = document.createElement('h4');
        batchTitle.textContent = '批量设置参数';

        const batchForm = document.createElement('div');

        // 最大Token输入框
        const maxTokensGroup = document.createElement('div');

        const maxTokensLabel = document.createElement('label');
        maxTokensLabel.textContent = '最大Token数:';

        const maxTokensInput = document.createElement('input');
        maxTokensInput.type = 'number';
        maxTokensInput.placeholder = '例如: 4096';

        maxTokensGroup.appendChild(maxTokensLabel);
        maxTokensGroup.appendChild(maxTokensInput);

        // 温度参数输入框
        const temperatureGroup = document.createElement('div');

        const temperatureLabel = document.createElement('label');
        temperatureLabel.textContent = '温度参数:';

        const temperatureInput = document.createElement('input');
        temperatureInput.type = 'number';
        temperatureInput.step = '0.1';
        temperatureInput.min = '0';
        temperatureInput.max = '2';
        temperatureInput.placeholder = '例如: 0.7';

        temperatureGroup.appendChild(temperatureLabel);
        temperatureGroup.appendChild(temperatureInput);

        batchForm.appendChild(maxTokensGroup);
        batchForm.appendChild(temperatureGroup);

        batchSettings.appendChild(batchTitle);
        batchSettings.appendChild(batchForm);

        // 按钮区域
        const buttonContainer = document.createElement('div');

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认纳管';

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);

        // 组装弹窗
        content.appendChild(title);
        content.appendChild(selectAllContainer);
        content.appendChild(modelList);
        content.appendChild(batchSettings);
        content.appendChild(buttonContainer);
        dialog.appendChild(content);
        document.body.appendChild(dialog);

        // 全选/取消全选功能
        selectAllCheckbox.addEventListener('change', (e) => {
            modelCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });

        // 取消按钮事件
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        // 确认按钮事件
        confirmBtn.addEventListener('click', async () => {
            const selectedModels = [];
            const maxTokens = maxTokensInput.value ? parseInt(maxTokensInput.value) : null;
            const temperature = temperatureInput.value ? parseFloat(temperatureInput.value) : null;

            modelCheckboxes.forEach((checkbox, index) => {
                if (checkbox.checked) {
                    const model = availableModels[index];
                    selectedModels.push({
                        provider: provider.name,
                        name: model.id || model.name,
                        displayName: model.displayName || model.name,
                        maxTokens: maxTokens,
                        temperature: temperature,
                        isDefault: false
                    });
                }
            });

            if (selectedModels.length === 0) {
                alert('请至少选择一个模型');
                return;
            }

            // 检查是否已有该服务商的默认模型
            const existingDefaultModel = this.models.find(model => 
                model.provider === provider.name && model.isDefault
            );

            // 获取该服务商下现有的模型名称列表，用于去重
            const existingModelNames = this.models
                .filter(model => model.provider === provider.name)
                .map(model => model.name);

            // 过滤出新增的模型（不包含已存在的）
            const newModels = selectedModels.filter(model => 
                !existingModelNames.includes(model.name)
            );

            // 如果没有新模型，提示用户
            if (newModels.length === 0) {
                alert('所有选中的模型都已存在，无需重复添加');
                document.body.removeChild(dialog);
                return;
            }

            // 智能设置默认模型
            if (newModels.length > 0) {
                if (existingDefaultModel) {
                    const sameModel = newModels.find(model => 
                        model.name === existingDefaultModel.name || 
                        model.displayName === existingDefaultModel.displayName
                    );
                    if (sameModel) {
                        sameModel.isDefault = true;
                    } else {
                        // 如果找不到相同名称的模型，且当前没有默认模型，设置第一个为默认
                        const hasAnyDefault = this.models.some(model => model.isDefault);
                        if (!hasAnyDefault) {
                            newModels[0].isDefault = true;
                        }
                    }
                } else {
                    const hasOtherDefault = this.models.some(model => model.isDefault);
                    if (!hasOtherDefault) {
                        newModels[0].isDefault = true;
                    }
                }
            }

            // 增量添加新模型
            this.models.push(...newModels);
            this.ensureSingleDefaultModel();
            await this.saveModels();
            this.renderModels();

            document.body.removeChild(dialog);
            this.showMessage(`已增量添加 ${newModels.length} 个新模型到模型列表`, 'success');
        });

        // 点击背景关闭弹窗
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.body.contains(dialog)) {
                    document.body.removeChild(dialog);
                }
            }
        });
    }

    // 同步服务商的模型列表
    async syncModelsFromProvider(provider, availableModels) {
        try {
            this.showMessage('正在同步模型列表...', 'info');
            
            // 检查是否已有该服务商的默认模型
            const existingDefaultModel = this.models.find(model => 
                model.provider === provider.name && model.isDefault
            );
            
            // 获取该服务商下现有的模型名称列表，用于去重
            // 只检查同一服务商下的模型名称重复，允许不同服务商有相同名称
            const existingModelNames = this.models
                .filter(model => model.provider === provider.name)
                .map(model => model.name);
            
            // 过滤出新增的模型（不包含同一服务商下已存在的）
            const newModels = availableModels
                .filter(model => {
                    const modelName = model.id || model.name;
                    return !existingModelNames.includes(modelName);
                })
                .map(model => ({
                    provider: provider.name,
                    name: model.id || model.name,
                    displayName: model.displayName || model.name,
                    maxTokens: null,
                    temperature: null,
                    isDefault: false
                }));
            
            // 如果没有新模型，提示用户
            if (newModels.length === 0) {
                this.showMessage('该服务商下的所有模型都已存在，无需重复添加', 'info');
                return;
            }
            
            // 智能设置默认模型
            if (newModels.length > 0) {
                // 如果之前有默认模型，尝试保持相同的模型名称作为默认
                if (existingDefaultModel) {
                    const sameModel = newModels.find(model => 
                        model.name === existingDefaultModel.name || 
                        model.displayName === existingDefaultModel.displayName
                    );
                    if (sameModel) {
                        sameModel.isDefault = true;
                    } else {
                        // 如果找不到相同名称的模型，且当前没有默认模型，设置第一个为默认
                        const hasAnyDefault = this.models.some(model => model.isDefault);
                        if (!hasAnyDefault) {
                            newModels[0].isDefault = true;
                        }
                    }
                } else {
                    // 如果之前没有默认模型，检查是否已有其他服务商的默认模型
                    const hasOtherDefault = this.models.some(model => model.isDefault);
                    if (!hasOtherDefault) {
                        // 如果没有其他默认模型，设置第一个为默认
                        newModels[0].isDefault = true;
                    }
                }
            }
            
            // 增量添加新模型
            this.models.push(...newModels);
            
            // 确保全局只有一个默认模型
            this.ensureSingleDefaultModel();
            
            // 保存模型配置
            await this.saveModels();
            
            // 重新渲染模型列表
            this.renderModels();
            
            this.showMessage(`已增量添加 ${newModels.length} 个新模型到模型列表`, 'success');
            
        } catch (error) {
            console.error('同步模型列表失败:', error);
            this.showMessage('同步模型列表失败: ' + error.message, 'error');
        }
    }

    // 确保只有一个默认模型的方法
    ensureSingleDefaultModel() {
        const defaultModels = this.models.filter(model => model.isDefault);
        
        if (defaultModels.length > 1) {
            console.warn('发现多个默认模型，保留第一个，取消其他的默认状态');
            // 保留第一个默认模型，取消其他的
            let firstDefaultFound = false;
            this.models.forEach(model => {
                if (model.isDefault) {
                    if (!firstDefaultFound) {
                        firstDefaultFound = true;
                    } else {
                        model.isDefault = false;
                    }
                }
            });
        } else if (defaultModels.length === 0 && this.models.length > 0) {
            console.log('没有默认模型，设置第一个模型为默认');
            this.models[0].isDefault = true;
        }
    }

    async validateAPIKey(provider) {
        // 根据服务商名称来判断如何验证API Key
        const providerName = provider.name.toLowerCase();
        
        if (providerName.includes('deepseek')) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                this.setAuthHeaders(headers, provider);
                
                // 尝试获取模型列表
                const response = await fetch('https://api.deepseek.com/v1/models', {
                    method: 'GET',
                    headers: headers
                });
                
                if (response.status === 401) {
                    throw new Error('API Key无效或已过期');
                } else if (response.status === 403) {
                    throw new Error('API Key权限不足');
                } else if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API Key验证失败: ${response.status} ${response.statusText}\n${errorText}`);
                }
                
                const data = await response.json();
                console.log('API Key验证成功，可用模型:', data);
                
            } catch (error) {
                if (error.message.includes('API Key')) {
                    throw error;
                }
                // 如果模型列表获取失败，继续使用原来的测试方法
                console.log('API Key验证跳过，使用完整测试');
            }
        }
    }

    async performAPITest(provider, specificModel = null) {
        console.log('开始API测试，服务商:', provider.name, '指定模型:', specificModel);
        console.log('API端点:', provider.apiEndpoint);
        
        // 构建正确的API端点URL
        let apiEndpoint = provider.apiEndpoint;
        if (!apiEndpoint.includes("/chat/completions")) {
            apiEndpoint = apiEndpoint + "/chat/completions";
        }
        console.log('处理后的API端点:', apiEndpoint);
        console.log('认证类型:', provider.authType);
        
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        console.log('检测到服务类型:', isOllama ? 'Ollama' : '其他服务商');
        
        try {
            // 对于Ollama服务，使用与ollama_test.js相同的测试流程
            if (isOllama) {
                return await this.performOllamaTest(provider, specificModel);
            }
            
            // 其他服务商使用原有逻辑
            // 首先尝试获取可用模型列表
            const availableModels = await this.getAvailableModels(provider);
            console.log('获取到的可用模型:', availableModels);
            
            if (!availableModels || availableModels.length === 0) {
                throw new Error('无法获取可用模型列表，请检查API配置');
            }
            
            // 选择测试模型
            let testModel;
            if (specificModel) {
                // 如果指定了具体模型，验证该模型是否可用
                const modelExists = availableModels.find(m => 
                    m.id === specificModel || m.name === specificModel
                );
                if (modelExists) {
                    testModel = modelExists.id || modelExists.name;
                } else {
                    throw new Error(`指定的模型 "${specificModel}" 不在可用模型列表中`);
                }
            } else {
                // 否则选择第一个可用模型
                testModel = availableModels[0].id || availableModels[0].name;
            }
            
            console.log('选择的测试模型:', testModel);
            
            // 根据不同的API服务商构建测试请求
            const testMessage = this.buildTestMessage(provider, testModel);
            const headers = {
                'Content-Type': 'application/json'
            };

            // 设置认证头
            this.setAuthHeaders(headers, provider);

            console.log('API测试请求头:', headers);
            console.log('API测试请求体:', testMessage);
            console.log('测试端点:', apiEndpoint);

            // 添加超时设置
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(testMessage),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                    console.error('API错误响应体:', errorText);
                } catch (e) {
                    errorText = '无法读取错误响应';
                }

                // 提供更详细的错误信息
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                let suggestions = '';
                
                if (response.status === 400) {
                    errorMessage += '\n请求格式错误，请检查：\n1. 模型名称是否正确\n2. 请求格式是否符合API要求\n3. 请求体格式是否正确';
                    suggestions = '\n\n解决建议：\n• 检查模型名称是否在可用模型列表中\n• 确认API请求格式是否正确\n• 查看API文档确认参数要求';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 401) {
                    errorMessage += '\n认证失败，请检查：\n1. API Key是否正确\n2. 认证类型是否选择正确\n3. API Key是否有效且未过期';
                    suggestions = '\n\n解决建议：\n• 重新检查API Key是否正确输入\n• 确认认证类型选择正确\n• 检查API Key是否已过期或被撤销';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 403) {
                    errorMessage += '\n权限不足，请检查：\n1. API Key是否有足够的权限\n2. 账户余额是否充足\n3. 是否在正确的区域/环境';
                    suggestions = '\n\n解决建议：\n• 检查账户余额是否充足\n• 确认API Key权限是否足够\n• 检查是否在正确的API区域';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 404) {
                    errorMessage += '\nAPI端点不存在，请检查：\n1. API地址是否正确\n2. 模型名称是否正确\n3. API版本是否正确';
                    suggestions = '\n\n解决建议：\n• 检查API端点URL是否正确\n• 确认模型名称是否存在\n• 检查API版本是否支持';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 429) {
                    errorMessage += '\n请求频率过高，请稍后重试';
                    suggestions = '\n\n解决建议：\n• 等待一段时间后重试\n• 检查是否达到API调用限制\n• 考虑升级API计划';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else {
                    errorMessage += `\n未知错误，请检查网络连接和API配置`;
                    suggestions = '\n\n解决建议：\n• 检查网络连接是否正常\n• 确认API服务是否可用\n• 查看服务商状态页面';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                }
                
                throw new Error(errorMessage + suggestions);
            }

            const data = await response.json();
            console.log('API测试成功，响应数据:', data);
            return {
                success: true,
                model: testModel,
                availableModels: availableModels,
                response: data
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查：\n1. 网络连接是否正常\n2. API服务是否响应\n3. 防火墙是否阻止连接');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查：\n1. 网络连接是否正常\n2. API地址是否可以访问\n3. 是否有防火墙阻止\n4. 服务是否正在运行');
            }
            throw error;
        }
    }

    // 专门处理Ollama服务的测试方法
    async performOllamaTest(provider, specificModel = null) {
        console.log('开始Ollama服务测试，原始端点:', provider.apiEndpoint);
        
        // 构建基础URL（与ollama_test.js保持一致）
        let baseUrl = provider.apiEndpoint;
        // this.buildOllamaBaseUrl(provider);
        console.log('Ollama基础URL:', baseUrl);
        
        const results = {
            serviceReachable: false,
            modelsRetrieved: false,
            modelValidated: false
            // 移除 chatWorking 步骤，避免因单个模型问题影响整体测试
        };
        
        try {
            // 步骤1: 检查服务是否可达
            results.serviceReachable = await this.testOllamaServiceReachability(baseUrl);
            if (!results.serviceReachable) {
                throw new Error('Ollama服务不可达');
            }
            
            // 步骤2: 获取可用模型列表
            const availableModels = await this.testOllamaGetModels(baseUrl, provider.apiKey);
            results.modelsRetrieved = availableModels !== null;
            
            // 步骤3: 验证指定模型
            const testModel = specificModel || (availableModels && availableModels.length > 0 ? availableModels[0].name : null);
            if (testModel) {
                results.modelValidated = await this.testOllamaSpecificModel(baseUrl, provider.apiKey, testModel, availableModels);
            }
            
            // 计算成功率（只计算前三步）
            const successCount = Object.values(results).filter(Boolean).length;
            const totalCount = Object.keys(results).length;
            
            console.log('Ollama测试结果:', results);
            console.log(`成功率: ${successCount}/${totalCount}`);
            
            // 调整成功判断标准：前三步都通过即可认为服务商可用
            if (successCount === totalCount) {
                return {
                    success: true,
                    model: testModel,
                    availableModels: availableModels || [],
                    response: { message: 'Ollama服务测试通过（服务可达，模型列表获取成功，模型验证通过）' }
                };
            } else {
                throw new Error(`Ollama服务测试失败\n\n${results.serviceReachable ? '✅ 1、Ollama服务可达，连接正常\n' : '❌ 1、Ollama服务不可达\n'}\n${results.modelsRetrieved ? '✅ 2、Ollama模型列表获取成功' : '❌ 2、Ollama模型列表获取失败'}\n${results.modelValidated ? `✅ 3、Ollama模型 "${testModel}" 在可用列表中` : `❌ 3、Ollama模型 "${testModel}" 不在可用列表中\n`}`);
            }
            
        } catch (error) {
            console.error('Ollama测试失败:', error);
            throw error;
        }
    }

    // 构建Ollama基础URL
    buildOllamaBaseUrl(provider) {
        try {
            const url = new URL(provider.apiEndpoint);
            // 确保使用正确的路径格式
            if (url.pathname.includes('/chat/completions')) {
                // 如果路径包含/chat/completions，提取基础路径
                const pathParts = url.pathname.split('/');
                const v1Index = pathParts.indexOf('v1');
                if (v1Index !== -1) {
                    return `${url.protocol}//${url.host}/v1`;
                }
            }
            // 默认返回/v1路径
            return `${url.protocol}//${url.host}/v1`;
        } catch (e) {
            console.warn('无法解析Ollama API端点，使用默认格式:', e.message);
            // 如果无法解析URL，尝试简单的字符串处理
            if (provider.apiEndpoint.includes('/chat/completions')) {
                return provider.apiEndpoint.replace('/chat/completions', '/v1');
            }
            return provider.apiEndpoint;
        }
    }

    // 测试Ollama服务可达性
    async testOllamaServiceReachability(baseUrl) {
        console.log('步骤 1: 检查Ollama服务是否可达...');
        
        try {
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log(`Ollama服务响应状态: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                console.log('✅ Ollama服务可达，连接正常');
                return true;
            } else {
                console.log(`❌ Ollama服务响应异常: ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Ollama服务不可达: ${error.message}`);
            return false;
        }
    }

    // 获取Ollama模型列表
    async testOllamaGetModels(baseUrl, apiKey) {
        console.log('步骤 2: 获取Ollama可用模型列表...');
        
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey && apiKey.trim() !== '') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            console.log(`请求Ollama模型列表: ${baseUrl}/models`);
            
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: headers
            });
            
            console.log(`Ollama模型列表响应状态: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`❌ 获取Ollama模型列表失败: ${errorText}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`✅ Ollama模型列表获取成功`);
            
            let models = [];
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id,
                    name: model.id,
                    displayName: model.id
                }));
            } else if (Array.isArray(data)) {
                models = data.map(model => ({
                    id: model.id || model.name || model,
                    name: model.id || model.name || model,
                    displayName: model.displayName || model.name || model.id || model
                }));
            }
            
            console.log(`解析后的Ollama模型列表: ${JSON.stringify(models, null, 2)}`);
            return models;
            
        } catch (error) {
            console.log(`❌ 获取Ollama模型列表异常: ${error.message}`);
            return null;
        }
    }

    // 验证Ollama指定模型
    async testOllamaSpecificModel(baseUrl, apiKey, modelName, availableModels) {
        console.log('步骤 3: 验证Ollama指定模型...');
        
        if (!availableModels || availableModels.length === 0) {
            console.log('⚠️ 无法获取Ollama模型列表，跳过模型验证');
            return true;
        }
        
        const modelExists = availableModels.find(m => 
            m.id === modelName || m.name === modelName
        );
        
        if (modelExists) {
            console.log(`✅ Ollama模型 "${modelName}" 在可用列表中`);
            return true;
        } else {
            console.log(`⚠️ Ollama模型 "${modelName}" 不在可用列表中`);
            console.log(`可用模型: ${availableModels.map(m => m.name).join(', ')}`);
            return false;
        }
    }

    async getAvailableModels(provider) {
        console.log('开始获取可用模型列表，服务商:', provider.name);
        
        const isOllama = this.isOllamaService(provider);
        console.log('检测到服务类型:', isOllama ? 'Ollama' : '其他服务商');
        
        // 优先使用用户自定义的模型列表端点
        if (provider.modelsEndpoint) {
            console.log('使用自定义模型列表端点:', provider.modelsEndpoint);
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                this.setAuthHeaders(headers, provider);
                
                const response = await fetch(provider.modelsEndpoint, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!response.ok) {
                    console.warn(`自定义端点获取模型列表失败 (${response.status}): ${response.statusText}`);
                    // 如果自定义端点失败，继续使用默认逻辑
                } else {
                    const data = await response.json();
                    console.log('自定义端点原始模型列表响应:', data);
                    return this.parseModelsResponse(data, provider);
                }
            } catch (error) {
                console.warn('自定义端点获取模型列表失败，使用默认逻辑:', error.message);
                // 如果自定义端点失败，继续使用默认逻辑
            }
        }
        
        // 使用新的URL构建方法
        const modelsEndpoint = this.buildModelsUrl(provider);
        console.log('构建的模型列表端点:', modelsEndpoint);
        
        if (!modelsEndpoint) {
            // 如果无法确定模型列表端点，返回默认模型列表
            console.log('无法确定模型列表端点，使用默认模型列表');
            return this.getDefaultModelsForProvider(provider);
        }
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            this.setAuthHeaders(headers, provider);
            
            console.log('尝试获取模型列表，端点:', modelsEndpoint);
            
            const response = await fetch(modelsEndpoint, {
                method: 'GET',
                headers: headers
            });
            
            console.log('模型列表响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                console.warn(`获取模型列表失败 (${response.status}): ${response.statusText}`);
                return this.getDefaultModelsForProvider(provider);
            }
            
            const data = await response.json();
            console.log('原始模型列表响应:', data);
            
            return this.parseModelsResponse(data, provider);
            
        } catch (error) {
            console.error('获取模型列表时发生错误:', error);
            return this.getDefaultModelsForProvider(provider);
        }
    }

    // 解析不同服务商的模型列表响应
    parseModelsResponse(data, provider) {
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        
        if (isOllama) {
            // Ollama API 格式（OpenAI 兼容）
            let models = [];
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id,
                    name: model.id,
                    displayName: model.id
                }));
            } else if (Array.isArray(data)) {
                models = data.map(model => ({
                    id: model.id || model.name || model,
                    name: model.id || model.name || model,
                    displayName: model.displayName || model.name || model.id || model
                }));
            }
            console.log('解析后的 Ollama 模型列表:', models);
            return models;
        }
        
        // 根据服务商名称而不是URL来判断
        const providerName = provider.name.toLowerCase();
        let models = [];
        
        if (providerName.includes('deepseek')) {
            // DeepSeek API格式
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id,
                    name: model.id,
                    displayName: model.id
                }));
            }
        } else if (providerName.includes('openai')) {
            // OpenAI API格式
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id,
                    name: model.id,
                    displayName: model.id
                }));
            }
        } else if (providerName.includes('anthropic') || providerName.includes('claude')) {
            // Anthropic API格式
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id,
                    name: model.id,
                    displayName: model.id
                }));
            }
        } else if (providerName.includes('google') || providerName.includes('gemini')) {
            // Google API格式
            if (data.models && Array.isArray(data.models)) {
                models = data.models.map(model => ({
                    id: model.name,
                    name: model.name,
                    displayName: model.displayName || model.name
                }));
            }
        } else {
            // 通用格式，尝试多种可能的字段名
            if (data.data && Array.isArray(data.data)) {
                models = data.data.map(model => ({
                    id: model.id || model.name,
                    name: model.id || model.name,
                    displayName: model.displayName || model.name || model.id
                }));
            } else if (data.models && Array.isArray(data.models)) {
                models = data.models.map(model => ({
                    id: model.id || model.name,
                    name: model.id || model.name,
                    displayName: model.displayName || model.name || model.id
                }));
            } else if (Array.isArray(data)) {
                // 直接是数组格式
                models = data.map(model => ({
                    id: model.id || model.name || model,
                    name: model.id || model.name || model,
                    displayName: model.displayName || model.name || model.id || model
                }));
            }
        }
        
        console.log('解析后的模型列表:', models);
        return models;
    }

    // 获取服务商的默认模型列表
    getDefaultModelsForProvider(provider) {
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        
        if (isOllama) {
            return [
                { id: 'deepseek-r1:8b', name: 'deepseek-r1:8b', displayName: 'DeepSeek R1 8B' },
                { id: 'llama2:7b', name: 'llama2:7b', displayName: 'Llama2 7B' },
                { id: 'mistral:7b', name: 'mistral:7b', displayName: 'Mistral 7B' },
                { id: 'qwen:7b', name: 'qwen:7b', displayName: 'Qwen 7B' },
                { id: 'codellama:7b', name: 'codellama:7b', displayName: 'Code Llama 7B' }
            ];
        }
        
        // 根据服务商名称而不是URL来判断
        const providerName = provider.name.toLowerCase();
        
        if (providerName.includes('deepseek')) {
            return [
                { id: 'deepseek-chat', name: 'deepseek-chat', displayName: 'DeepSeek Chat' },
                { id: 'deepseek-coder', name: 'deepseek-coder', displayName: 'DeepSeek Coder' }
            ];
        } else if (providerName.includes('openai')) {
            return [
                { id: 'gpt-4', name: 'gpt-4', displayName: 'GPT-4' },
                { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' }
            ];
        } else if (providerName.includes('anthropic') || providerName.includes('claude')) {
            return [
                { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus' },
                { id: 'claude-3-sonnet-20240229', name: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet' },
                { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku' }
            ];
        } else if (providerName.includes('google') || providerName.includes('gemini')) {
            return [
                { id: 'gemini-pro', name: 'gemini-pro', displayName: 'Gemini Pro' },
                { id: 'gemini-pro-vision', name: 'gemini-pro-vision', displayName: 'Gemini Pro Vision' }
            ];
        } else {
            // 通用默认模型（适用于自定义服务商）
            return [
                { id: 'deepseek-r1:8b', name: 'deepseek-r1:8b', displayName: 'DeepSeek R1 8B' },
                { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' },
                { id: 'llama2:7b', name: 'llama2:7b', displayName: 'Llama2 7B' }
            ];
        }
    }

    // 构建测试消息
    buildTestMessage(provider, modelName) {
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        
        if (isOllama) {
            return {
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: "你好"
                    }
                ],
                max_tokens: 20,
                temperature: 0.7
            };
        }
        
        // 根据服务商名称而不是URL来判断
        const providerName = provider.name.toLowerCase();
        
        if (providerName.includes('deepseek')) {
            return {
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: "你好"
                    }
                ],
                max_tokens: 20,
                temperature: 0.7
            };
        } else if (providerName.includes('openai')) {
            return {
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: "你好"
                    }
                ],
                max_tokens: 20
            };
        } else if (providerName.includes('anthropic') || providerName.includes('claude')) {
            return {
                model: modelName,
                max_tokens: 20,
                messages: [
                    {
                        role: "user",
                        content: "你好"
                    }
                ]
            };
        } else if (providerName.includes('google') || providerName.includes('gemini')) {
            return {
                model: modelName,
                contents: [
                    {
                        parts: [
                            {
                                text: "你好"
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 20,
                    temperature: 0.7
                }
            };
        } else {
            // 默认使用OpenAI格式（兼容大多数自定义服务商）
            return {
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: "你好"
                    }
                ],
                max_tokens: 20
            };
        }
    }

    async testModel(index) {
        console.log('测试模型:', index, this.models[index]);
        const model = this.models[index];
        this.showMessage('正在查找关联服务商...', 'info');
        
        try {
            // 获取关联的服务商
            const provider = this.providers.find(p => p.name === model.provider);
            if (!provider) {
                throw new Error('找不到关联的服务商');
            }
            
            this.showMessage(`找到服务商: ${provider.name}，正在测试模型聊天功能...`, 'info');
            
            // 直接调用聊天接口进行模型测试
            const testResult = await this.performModelChatTest(provider, model.name);
            
            // 显示详细的成功信息
            const modelDisplayName = model.displayName || model.name;
            
            this.showMessage(`模型"${modelDisplayName}"聊天测试成功！模型可以正常响应对话`, 'success');
            
            // 更新模型状态
            this.updateModelStatus(index, 'active');
            
        } catch (error) {
            console.error('模型聊天测试失败:', error);
            const modelDisplayName = model.displayName || model.name;
            this.showMessage(`模型"${modelDisplayName}"聊天测试失败: ${error.message}`, 'error');
            this.updateModelStatus(index, 'inactive');
        }
    }

    // 专门用于模型聊天测试的方法
    async performModelChatTest(provider, modelName) {
        console.log('开始模型聊天测试，服务商:', provider.name, '模型:', modelName);
        
        // 构建正确的聊天API端点URL
        let apiEndpoint = provider.apiEndpoint;
        if (!apiEndpoint.includes("/chat/completions")) {
            apiEndpoint = apiEndpoint + "/chat/completions";
        }
        console.log('聊天测试API端点:', apiEndpoint);
        
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        
        try {
            // 构建测试消息
            const testMessage = this.buildTestMessage(provider, modelName);
            const headers = {
                'Content-Type': 'application/json'
            };

            // 设置认证头
            this.setAuthHeaders(headers, provider);

            console.log('聊天测试请求头:', headers);
            console.log('聊天测试请求体:', testMessage);
            console.log('聊天测试端点:', apiEndpoint);

            // 添加超时设置
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(testMessage),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('聊天测试响应状态:', response.status, response.statusText);

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                    console.error('聊天测试错误响应体:', errorText);
                } catch (e) {
                    errorText = '无法读取错误响应';
                }

                // 提供更详细的错误信息
                let errorMessage = `聊天测试失败 - HTTP ${response.status}: ${response.statusText}`;
                let suggestions = '';
                
                if (response.status === 400) {
                    errorMessage += '\n请求格式错误，请检查：\n1. 模型名称是否正确\n2. 请求格式是否符合API要求\n3. 请求体格式是否正确';
                    suggestions = '\n\n解决建议：\n• 检查模型名称是否正确\n• 确认API请求格式是否正确\n• 查看API文档确认参数要求';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 401) {
                    errorMessage += '\n认证失败，请检查：\n1. API Key是否正确\n2. 认证类型是否选择正确\n3. API Key是否有效且未过期';
                    suggestions = '\n\n解决建议：\n• 重新检查API Key是否正确输入\n• 确认认证类型选择正确\n• 检查API Key是否已过期或被撤销';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 403) {
                    errorMessage += '\n权限不足，请检查：\n1. API Key是否有足够的权限\n2. 账户余额是否充足\n3. 是否在正确的区域/环境';
                    suggestions = '\n\n解决建议：\n• 检查账户余额是否充足\n• 确认API Key权限是否足够\n• 检查是否在正确的API区域';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 404) {
                    errorMessage += '\nAPI端点不存在，请检查：\n1. API地址是否正确\n2. 模型名称是否正确\n3. API版本是否正确';
                    suggestions = '\n\n解决建议：\n• 检查API端点URL是否正确\n• 确认模型名称是否存在\n• 检查API版本是否支持';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else if (response.status === 429) {
                    errorMessage += '\n请求频率过高，请稍后重试';
                    suggestions = '\n\n解决建议：\n• 等待一段时间后重试\n• 检查是否达到API调用限制\n• 考虑升级API计划';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                } else {
                    errorMessage += `\n未知错误，请检查网络连接和API配置`;
                    suggestions = '\n\n解决建议：\n• 检查网络连接是否正常\n• 确认API服务是否可用\n• 查看服务商状态页面';
                    if (errorText) {
                        errorMessage += `\n\n服务器错误详情：${errorText}`;
                    }
                }
                
                throw new Error(errorMessage + suggestions);
            }

            const data = await response.json();
            console.log('聊天测试成功，响应数据:', data);
            
            // 验证响应数据是否包含有效的回复
            let hasValidResponse = false;
            if (data.choices && data.choices.length > 0) {
                const choice = data.choices[0];
                if (choice.message && choice.message.content) {
                    hasValidResponse = true;
                    console.log('模型回复内容:', choice.message.content);
                }
            }
            
            if (!hasValidResponse) {
                throw new Error('模型响应格式异常，未收到有效的回复内容');
            }
            
            return {
                success: true,
                model: modelName,
                response: data,
                message: '模型聊天测试成功，模型可以正常响应对话'
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('聊天测试请求超时，请检查：\n1. 网络连接是否正常\n2. API服务是否响应\n3. 防火墙是否阻止连接');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('聊天测试网络连接失败，请检查：\n1. 网络连接是否正常\n2. API地址是否可以访问\n3. 是否有防火墙阻止\n4. 服务是否正在运行');
            }
            throw error;
        }
    }

    updateProviderStatus(index, status) {
        const providerElement = document.querySelector(`[data-provider-index="${index}"]`);
        if (providerElement) {
            const statusIndicator = providerElement.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator status-${status}`;
            }
        }
    }

    updateModelStatus(index, status) {
        const modelElement = document.querySelector(`[data-model-index="${index}"]`);
        if (modelElement) {
            const statusIndicator = modelElement.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator status-${status}`;
            }
        }
    }

    setAuthHeaders(headers, provider) {
        // 检测是否为 Ollama 服务
        const isOllama = this.isOllamaService(provider);
        
        if (provider.authType === 'Bearer') {
            headers['Authorization'] = `Bearer ${provider.apiKey}`;
        } else if (provider.authType === 'API-Key') {
            // 根据不同的API服务商设置不同的认证头
            const providerName = provider.name.toLowerCase();
            
            if (isOllama) {
                // Ollama 服务通常使用 "ollama" 作为 API Key，或者不需要认证
                if (provider.apiKey && provider.apiKey.trim() !== '') {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                }
                // 如果没有设置 API Key，则不添加认证头
            } else if (providerName.includes('deepseek')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (providerName.includes('openai')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (providerName.includes('anthropic') || providerName.includes('claude')) {
                headers['x-api-key'] = provider.apiKey;
            } else if (providerName.includes('google') || providerName.includes('gemini')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (providerName.includes('baidu') || providerName.includes('wenxin')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (providerName.includes('ali') || providerName.includes('tongyi')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (providerName.includes('zhipu') || providerName.includes('glm')) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else {
                // 默认尝试多种常见的头名称
                headers['X-API-Key'] = provider.apiKey;
                headers['x-api-key'] = provider.apiKey;
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            }
        } else if (provider.authType === 'None' || !provider.authType) {
            // 对于不需要认证的服务商（如本地 Ollama），不添加认证头
            console.log('服务商不需要认证，跳过认证头设置');
        }
        
        console.log('设置的认证头:', headers);
    }

    loadGeneralSettings() {
        document.getElementById('defaultLanguage').value = this.currentSettings.defaultLanguage || 'zh-CN';
        document.getElementById('theme').value = this.currentSettings.theme || 'light';
        document.getElementById('enableNotifications').checked = this.currentSettings.enableNotifications !== false;
        document.getElementById('autoTranslate').checked = this.currentSettings.autoTranslate === true;
    }

    async saveAllSettings() {
        // 保存通用设置
        this.currentSettings = {
            defaultLanguage: document.getElementById('defaultLanguage').value,
            theme: document.getElementById('theme').value,
            enableNotifications: document.getElementById('enableNotifications').checked,
            autoTranslate: document.getElementById('autoTranslate').checked
        };

        // 获取知识库服务配置
        const knowledgeServiceUrl = document.getElementById('knowledgeServiceUrl');
        const knowledgeServiceApiKey = document.getElementById('knowledgeServiceApiKey');
        const enableKnowledgeService = document.getElementById('enableKnowledgeService');
        
        const knowledgeServiceConfig = {
            default_url: knowledgeServiceUrl ? knowledgeServiceUrl.value.trim() : '',
            api_key: knowledgeServiceApiKey ? knowledgeServiceApiKey.value.trim() : '',
            enabled: enableKnowledgeService ? enableKnowledgeService.checked : false,
            updated_at: new Date().toISOString()
        };

        try {
            await chrome.storage.sync.set({
                providers: this.providers,
                models: this.models,
                rules: this.rules,
                generalSettings: this.currentSettings,
                knowledgeServiceConfig: knowledgeServiceConfig
            });
            this.showMessage('所有设置已保存', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showMessage('保存设置失败', 'error');
        }
    }

    async saveProviders() {
        try {
            console.log('正在保存服务商配置:', this.providers);
            await chrome.storage.sync.set({ providers: this.providers });
            console.log('服务商配置保存成功');
        } catch (error) {
            console.error('保存服务商配置失败:', error);
            throw error;
        }
    }

    async saveModels() {
        try {
            console.log('正在保存模型配置:', this.models);
            await chrome.storage.sync.set({ models: this.models });
            console.log('模型配置保存成功');
        } catch (error) {
            console.error('保存模型配置失败:', error);
            throw error;
        }
    }

    async saveRules() {
        try {
            // 检测内置规则是否被修改（包括默认状态）
            const hasModifiedBuiltInRules = this.rules.some(rule => {
                if (this.isBuiltInRule(rule.id)) {
                    // 获取原始默认规则
                    const defaultRules = this.getDefaultRules();
                    const defaultRule = defaultRules.find(r => r.id === rule.id);
                    if (defaultRule) {
                        // 比较所有字段，包括isDefault状态
                        return rule.temperature !== defaultRule.temperature ||
                               rule.similarity !== defaultRule.similarity ||
                               rule.topN !== defaultRule.topN ||
                               rule.prompt !== defaultRule.prompt ||
                               rule.name !== defaultRule.name ||
                               rule.description !== defaultRule.description ||
                               rule.isDefault !== defaultRule.isDefault; // 添加isDefault字段比较
                    }
                }
                return false;
            });

            // 保存所有规则
            console.log('正在保存所有规则配置:', this.rules);
            console.log('检测到内置规则修改:', hasModifiedBuiltInRules);
            await chrome.storage.sync.set({ 
                rules: this.rules,
                defaultRulesModified: hasModifiedBuiltInRules // 只在真正修改了内置规则时才标记
            });
            console.log('所有规则配置保存成功');
        } catch (error) {
            console.error('保存规则配置失败:', error);
            throw error;
        }
    }

    // 恢复默认规则设置
    async resetDefaultRules() {
        try {
            const confirm = window.confirm('确定要重置所有参数规则为默认值吗？这将删除所有自定义规则。');
            if (!confirm) return;
            
            // 获取默认规则
            const defaultRules = this.getDefaultRules();
            
            // 验证默认规则的温度值是否正确
            console.log('重置前的默认规则:', defaultRules);
            defaultRules.forEach(rule => {
                console.log(`规则 ${rule.name}: temperature=${rule.temperature}, similarity=${rule.similarity}, topN=${rule.topN}`);
            });
            
            // 重置规则列表
            this.rules = [...defaultRules];
            
            // 保存重置后的规则，并清除修改标记
            await chrome.storage.sync.set({ 
                rules: this.rules,
                defaultRulesModified: false // 重置为未修改状态
            });
            
            // 重新渲染规则列表
            this.renderRules();
            
            this.showMessage('参数规则已重置为默认值', 'success');
            
            console.log('重置后的规则:', this.rules);
        } catch (error) {
            console.error('重置默认规则失败:', error);
            this.showMessage('重置默认规则失败: ' + error.message, 'error');
        }
    }

    async resetSettings() {
        const confirm = window.confirm('确定要重置所有设置吗？此操作不可撤销。');
        if (!confirm) return;
        
        this.providers = [];
        this.models = [];
        this.rules = this.getDefaultRules();
        this.currentSettings = this.getDefaultSettings();
        
        try {
            await chrome.storage.sync.clear();
            this.renderProviders();
            this.renderModels();
            this.renderRules();
            this.loadGeneralSettings();
            this.loadKnowledgeServiceConfig(); // 重新加载知识库服务配置
            this.showMessage('设置已重置', 'success');
        } catch (error) {
            console.error('重置设置失败:', error);
            this.showMessage('重置设置失败', 'error');
        }
    }
    async clearSettings() {
        const confirm = window.confirm('确定要清除所有缓存吗？此操作不可撤销。');
        if (!confirm) return;
        
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

    exportSettings() {
        // 获取当前知识库服务配置
        const knowledgeServiceUrl = document.getElementById('knowledgeServiceUrl');
        const knowledgeServiceApiKey = document.getElementById('knowledgeServiceApiKey');
        const enableKnowledgeService = document.getElementById('enableKnowledgeService');
        
        const knowledgeServiceConfig = {
            default_url: knowledgeServiceUrl ? knowledgeServiceUrl.value.trim() : '',
            api_key: knowledgeServiceApiKey ? knowledgeServiceApiKey.value.trim() : '',
            enabled: enableKnowledgeService ? enableKnowledgeService.checked : false,
            updated_at: new Date().toISOString()
        };
        
        const exportData = {
            providers: this.providers,
            models: this.models,
            rules: this.rules, // 包含所有规则（内置+用户自定义）
            generalSettings: this.currentSettings,
            knowledgeServiceConfig: knowledgeServiceConfig,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bic-qa-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('配置已导出', 'success');
    }

    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                if (importData.providers && importData.models) {
                    this.providers = importData.providers;
                    this.models = importData.models;
                    this.rules = importData.rules || this.getDefaultRules();
                    this.currentSettings = importData.generalSettings || this.getDefaultSettings();
                    
                    // 导入知识库服务配置
                    if (importData.knowledgeServiceConfig) {
                        const knowledgeServiceUrl = document.getElementById('knowledgeServiceUrl');
                        const knowledgeServiceApiKey = document.getElementById('knowledgeServiceApiKey');
                        const enableKnowledgeService = document.getElementById('enableKnowledgeService');
                        
                        if (knowledgeServiceUrl) {
                            knowledgeServiceUrl.value = importData.knowledgeServiceConfig.default_url || '';
                        }
                        if (knowledgeServiceApiKey) {
                            knowledgeServiceApiKey.value = importData.knowledgeServiceConfig.api_key || '';
                        }
                        if (enableKnowledgeService) {
                            enableKnowledgeService.checked = importData.knowledgeServiceConfig.enabled || false;
                        }
                    }
                    
                    await this.saveAllSettings();
                    this.renderProviders();
                    this.renderModels();
                    this.renderRules();
                    this.loadGeneralSettings();
                    this.showMessage('配置已导入', 'success');
                } else {
                    throw new Error('无效的配置文件格式');
                }
            } catch (error) {
                console.error('导入配置失败:', error);
                this.showMessage('导入配置失败: ' + error.message, 'error');
            }
        };
        input.click();
    }

    backToQA() {
        try {
            // 查找是否已经存在popup.html的标签页
            chrome.tabs.query({}, (tabs) => {
                let popupTab = null;
                
                // 查找popup.html标签页
                for (let tab of tabs) {
                    if (tab.url && tab.url.includes('popup.html')) {
                        popupTab = tab;
                        break;
                    }
                }
                
                if (popupTab) {
                    // 如果找到popup标签页，激活它
                    chrome.tabs.update(popupTab.id, { active: true });
                    
                    // 关闭当前设置标签页
                    chrome.tabs.getCurrent((currentTab) => {
                        if (currentTab) {
                            chrome.tabs.remove(currentTab.id);
                        }
                    });
                } else {
                    // 如果没有找到popup标签页，创建新的
                    chrome.tabs.create({
                        url: chrome.runtime.getURL('popup.html'),
                        active: true
                    });
                    
                    // 关闭当前设置标签页
                    chrome.tabs.getCurrent((currentTab) => {
                        if (currentTab) {
                            chrome.tabs.remove(currentTab.id);
                        }
                    });
                }
            });
        } catch (error) {
            console.error('返回问答界面失败:', error);
            // 备用方案：直接关闭设置页面
            window.close();
        }
    }

    openKnowledgeBase() {
        try {
            // 在新标签页中打开知识库管理页面
            chrome.tabs.create({
                url: chrome.runtime.getURL('knowledge_base.html'),
                active: true
            });
        } catch (error) {
            console.error('打开知识库管理页面失败:', error);
            // 备用方案
            window.open(chrome.runtime.getURL('knowledge_base.html'), '_blank');
        }
    }

    showMessage(message, type = 'info') {
        console.log(`显示消息 [${type}]:`, message);
        
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = message; // 使用 innerHTML 支持表情符号
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            line-height: 1.4;
        `;
        
        document.body.appendChild(messageDiv);
        
        // 根据消息类型设置不同的显示时间
        let displayTime = 3000; // 默认3秒
        if (type === 'success') {
            displayTime = 5000; // 成功消息显示5秒
        } else if (type === 'error') {
            displayTime = 6000; // 错误消息显示6秒
        } else if (type === 'info') {
            displayTime = 4000; // 信息消息显示4秒
        }
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, displayTime);
    }

    // 加载注册配置
    async loadRegistrationConfig() {
        console.log('开始加载注册配置...');
        
        // 默认配置
        const defaultConfig = {
            registration_service: {
                default_url: "http://192.168.32.81:8180/api/user/register",
                timeout: 10000,
                retry_count: 3
            }
        };
        
        try {
            // 1. 首先尝试从保存的配置文件加载
            const savedConfigFile = await chrome.storage.local.get(['registrationConfigFile']);
            let config = null;
            
            if (savedConfigFile.registrationConfigFile) {
                try {
                    config = JSON.parse(savedConfigFile.registrationConfigFile);
                    console.log('从保存的配置文件加载注册配置:', config);
                } catch (parseError) {
                    console.warn('解析保存的配置文件失败:', parseError);
                }
            }
            
            // 2. 如果没有保存的配置文件，尝试加载默认配置文件
            if (!config) {
                console.log('尝试加载默认配置文件...');
                try {
                    const response = await fetch(chrome.runtime.getURL('config/registration.json'));
                    if (response.ok) {
                        config = await response.json();
                        console.log('默认配置加载成功:', config);
                    } else {
                        console.warn('配置文件不存在或无法访问，使用默认配置');
                        config = defaultConfig;
                    }
                } catch (configError) {
                    console.warn('加载配置文件失败，使用默认配置:', configError.message);
                    config = defaultConfig;
                }
            }
            
            // 设置默认服务URL
            const registerServiceUrl = document.getElementById('registerServiceUrl');
            if (registerServiceUrl) {
                registerServiceUrl.value = config.registration_service.default_url;
                console.log('设置默认服务URL:', config.registration_service.default_url);
            } else {
                console.warn('未找到registerServiceUrl元素');
            }
            
            // 3. 从本地存储加载已保存的注册信息并回显
            console.log('开始从本地存储加载注册信息...');
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                
                console.log('从本地存储加载的注册信息:', {
                    registration: !!registration,
                    registerServiceUrl: !!registerServiceUrl
                });
                
                if (registration && registration.status === 'registered') {
                    console.log('用户已注册，回显注册信息');
                    
                    // 回显注册信息到表单
                    if (registration.username) {
                        document.getElementById('registerUsername').value = registration.username;
                    }
                    if (registration.company) {
                        document.getElementById('registerCompany').value = registration.company;
                    }
                    if (registration.email) {
                        document.getElementById('registerEmail').value = registration.email;
                    }
                    if (registration.serviceUrl && registerServiceUrl) {
                        registerServiceUrl.value = registration.serviceUrl;
                    }
                    
                    // 更新表单显示状态
                    this.updateRegistrationFormDisplay(registration);
                    
                    // 添加注册状态指示器
                    this.addRegistrationStatusIndicator();
                    
                } else {
                    console.log('用户未注册或注册状态异常');
                    this.clearRegistrationStatusIndicator();
                }
            } catch (storageError) {
                console.error('从本地存储加载注册信息失败:', storageError);
                this.clearRegistrationStatusIndicator();
            }
            
        } catch (error) {
            console.error('加载注册配置失败:', error);
            // 设置默认值
            const registerServiceUrl = document.getElementById('registerServiceUrl');
            if (registerServiceUrl) {
                registerServiceUrl.value = defaultConfig.registration_service.default_url;
            }
        }
    }

    // 添加注册状态指示器
    addRegistrationStatusIndicator() {
        console.log('开始添加注册状态指示器...');
        
        try {
            // 查找注册表单区域
            const registrationSection = document.querySelector('.registration-form');
            console.log('注册表单区域:', registrationSection);
            
            if (!registrationSection) {
                console.warn('未找到.registration-form元素');
                return;
            }
            
            // 检查是否已经存在状态指示器
            const existingIndicator = registrationSection.querySelector('.registration-status-indicator');
            if (existingIndicator) {
                console.log('移除已存在的状态指示器');
                existingIndicator.remove();
            }
            
            // 创建状态指示器
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'registration-status-indicator';
            statusIndicator.style.cssText = `
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            statusIndicator.innerHTML = `
                <span style="font-size: 16px;">✅</span>
                <span>已注册用户 - 信息已自动填充</span>
            `;
            
            // 将状态指示器插入到表单顶部
            registrationSection.insertBefore(statusIndicator, registrationSection.firstChild);
            console.log('状态指示器已添加到表单顶部');
            
        } catch (error) {
            console.error('添加注册状态指示器失败:', error);
        }
    }

    // 清除注册状态指示器
    clearRegistrationStatusIndicator() {
        console.log('开始清除注册状态指示器...');
        
        try {
            const registrationSection = document.querySelector('.registration-form');
            if (!registrationSection) {
                console.warn('未找到.registration-form元素，无法清除状态指示器');
                return;
            }

            const existingIndicator = registrationSection.querySelector('.registration-status-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
                console.log('状态指示器已清除');
            } else {
                console.log('未找到需要清除的状态指示器');
            }
        } catch (error) {
            console.error('清除注册状态指示器失败:', error);
        }
    }

    // 加载知识库服务配置
    async loadKnowledgeServiceConfig() {
        try {
            // 首先尝试从保存的配置文件加载
            const savedConfigFile = await chrome.storage.local.get(['knowledgeServiceConfigFile']);
            let config = null;
            
            if (savedConfigFile.knowledgeServiceConfigFile) {
                try {
                    config = JSON.parse(savedConfigFile.knowledgeServiceConfigFile);
                    console.log('从保存的配置文件加载知识库服务配置:', config);
                } catch (parseError) {
                    console.warn('解析保存的配置文件失败:', parseError);
                }
            }
            
            // 如果没有保存的配置文件，尝试从默认配置文件加载
            if (!config) {
                try {
                    const response = await fetch(chrome.runtime.getURL('config/knowledge_service.json'));
                    if (response.ok) {
                        config = await response.json();
                        console.log('从默认配置文件加载知识库服务配置:', config);
                    }
                } catch (configError) {
                    console.warn('加载默认配置文件失败:', configError);
                }
            }
            
            // 然后尝试从Chrome存储中加载用户保存的配置
            const result = await chrome.storage.sync.get(['knowledgeServiceConfig']);
            const savedConfig = result.knowledgeServiceConfig;
            
            const knowledgeServiceUrl = document.getElementById('knowledgeServiceUrl');
            const knowledgeServiceApiKey = document.getElementById('knowledgeServiceApiKey');
            const enableKnowledgeService = document.getElementById('enableKnowledgeService');
            
            if (savedConfig) {
                // 使用用户保存的配置
                console.log('加载用户保存的知识库服务配置:', savedConfig);
                
                if (knowledgeServiceUrl) {
                    knowledgeServiceUrl.value = savedConfig.default_url || '';
                }
                if (knowledgeServiceApiKey) {
                    knowledgeServiceApiKey.value = savedConfig.api_key || '';
                }
                if (enableKnowledgeService) {
                    enableKnowledgeService.checked = savedConfig.enabled || false;
                }
            } else if (config && config.knowledge_service) {
                // 使用配置文件中的配置
                console.log('使用配置文件中的知识库服务配置:', config.knowledge_service);
                
                if (knowledgeServiceUrl) {
                    knowledgeServiceUrl.value = config.knowledge_service.default_url || '';
                }
                if (knowledgeServiceApiKey) {
                    knowledgeServiceApiKey.value = config.knowledge_service.api_key || '';
                }
                if (enableKnowledgeService) {
                    enableKnowledgeService.checked = config.knowledge_service.enabled || false;
                }
            } else {
                // 设置默认值
                this.setDefaultKnowledgeServiceValues();
            }
        } catch (error) {
            console.error('加载知识库服务配置失败:', error);
            this.setDefaultKnowledgeServiceValues();
        }
    }

    // 设置默认知识库服务配置值
    setDefaultKnowledgeServiceValues() {
        const knowledgeServiceUrl = document.getElementById('knowledgeServiceUrl');
        const knowledgeServiceApiKey = document.getElementById('knowledgeServiceApiKey');
        const enableKnowledgeService = document.getElementById('enableKnowledgeService');
        
        if (knowledgeServiceUrl) {
            knowledgeServiceUrl.value = 'http://192.168.32.81:8180/api/chat/stream';
        }
        if (knowledgeServiceApiKey) {
            knowledgeServiceApiKey.value = '';
        }
        if (enableKnowledgeService) {
            enableKnowledgeService.checked = false;
        }
    }

    // 处理用户注册
    async handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const company = document.getElementById('registerCompany').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const serviceUrl = document.getElementById('registerServiceUrl').value.trim();
        const agreeTerms = document.getElementById('agreeTerms').checked;

        if (!username || !company || !email) {
            this.showMessage('请填写所有必填字段', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showMessage('请输入有效的邮箱地址', 'error');
            return;
        }

        // 检查是否已注册
        const result = await chrome.storage.sync.get(['registration']);
        const existingRegistration = result.registration;
        
        if (!existingRegistration || existingRegistration.status !== 'registered') {
            // 未注册用户必须勾选协议
            if (!agreeTerms) {
                this.showMessage('请先勾选用户协议和隐私政策', 'error');
                return;
            }
        }

        try {
            this.showMessage('正在注册...', 'info');
            
            const response = await fetch(serviceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: username,
                    companyName: company,
                    email: email,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                // const errorData = await response.json().catch(() => ({}));
                this.showMessage(result.message, result.status);
                
                // 只有在注册成功后才保存注册信息到本地存储
                const registrationData = {
                    username: username,
                    company: company,
                    email: email,
                    serviceUrl: serviceUrl,
                    registeredAt: new Date().toISOString(),
                    status: 'registered'
                };
                
                try {
                    await chrome.storage.sync.set({
                        registration: registrationData
                    });
                    console.log('注册信息已保存到本地存储:', registrationData);
                    
                    // 同时更新注册配置文件内容到本地存储
                    await this.updateRegistrationConfigFile(registrationData);
                    
                    // 立即更新表单显示和状态指示器
                    this.updateRegistrationFormDisplay(registrationData);
                    
                } catch (storageError) {
                    console.error('保存注册信息到本地存储失败:', storageError);
                    this.showMessage('注册成功，但保存本地信息失败', 'warning');
                }
                
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || response.statusText;
                console.log(errorData.success+"--------------0----------");
                if(errorData.success == false){
                    this.showMessage(`重复注册: ${errorMessage}`, 'warning');
                    // 如果用户已存在也要保存注册信息到本地存储
                    const registrationData = {
                        username: username,
                        company: company,
                        email: email,
                        serviceUrl: serviceUrl,
                        registeredAt: new Date().toISOString(),
                        status: 'registered'
                    };
                    try {
                        await chrome.storage.sync.set({
                            registration: registrationData
                        });
                        console.log('注册信息已保存到本地存储:', registrationData);
                        
                        // 同时更新注册配置文件
                        await this.updateRegistrationConfigFile(registrationData);
                        
                        // 立即更新表单显示和状态指示器
                        this.updateRegistrationFormDisplay(registrationData);
                        
                    } catch (storageError) {
                        console.error('保存注册信息到本地存储失败:', storageError);
                        this.showMessage('注册成功，但保存本地信息失败', 'warning');
                    }
                }else{
                    this.showMessage(`注册失败: ${errorMessage}`, 'error');
                    console.error('注册失败，响应状态:', response.status, '错误信息:', errorMessage);
                }
                
                
                // 注册失败时不修改本地存储的数据，保持原有状态
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            this.showMessage('注册失败，请检查网络连接', 'error');
            
            // 网络错误时不修改本地存储的数据，保持原有状态
        }
    }

    // 检查注册状态
    async checkRegisterStatus() {
        try {
            const result = await chrome.storage.sync.get(['registration']);
            const registration = result.registration;
            
            if (registration && registration.status === 'registered') {
                this.showMessage(`已注册用户: ${registration.username} (${registration.company})`, 'success');
                
                // 更新表单显示
                this.updateRegistrationFormDisplay(registration);
                
            } else {
                this.showMessage('尚未注册，请先完成注册', 'info');
                
                // 清除状态指示器
                this.clearRegistrationStatusIndicator();
            }
        } catch (error) {
            console.error('检查注册状态失败:', error);
            this.showMessage('检查注册状态失败，请重试', 'error');
        }
    }

    // 保存知识库服务配置
    async saveKnowledgeService() {
        const serviceUrl = document.getElementById('knowledgeServiceUrl').value.trim();
        const apiKey = document.getElementById('knowledgeServiceApiKey').value.trim();
        const enabled = document.getElementById('enableKnowledgeService').checked;

        if (!serviceUrl) {
            this.showMessage('请输入知识库服务URL', 'error');
            return;
        }

        if (enabled && !apiKey) {
            this.showMessage('启用知识库服务时需要提供API密钥', 'error');
            return;
        }

        try {
            // 直接保存配置对象，不使用嵌套结构
            const knowledgeServiceConfig = {
                default_url: serviceUrl,
                api_key: apiKey,
                enabled: enabled,
                updated_at: new Date().toISOString()
            };

            // 保存到本地存储
            await chrome.storage.sync.set({
                knowledgeServiceConfig: knowledgeServiceConfig
            });

            // 同时更新配置文件内容到本地存储
            await this.updateKnowledgeServiceConfigFile(knowledgeServiceConfig);

            this.showMessage('知识库服务配置已保存', 'success');
        } catch (error) {
            console.error('保存知识库服务配置失败:', error);
            this.showMessage('保存配置失败', 'error');
        }
    }

    // 更新知识库服务配置文件
    async updateKnowledgeServiceConfigFile(config) {
        try {
            // 构建完整的配置对象，只更新default_url字段
            const fullConfig = {
                knowledge_service: {
                    default_url: config.default_url,
                    api_key: "",  // 保持为空，不保存敏感信息
                    enabled: false,  // 保持默认值
                    updated_at: config.updated_at
                }
            };

            // 使用chrome.storage.local保存配置文件内容
            await chrome.storage.local.set({
                knowledgeServiceConfigFile: JSON.stringify(fullConfig, null, 2)
            });

            console.log('知识库服务配置文件已更新，URL:', config.default_url);
        } catch (error) {
            console.error('更新知识库服务配置文件失败:', error);
            // 不抛出错误，因为主要功能（本地存储）已经成功
        }
    }

    // 更新注册配置文件
    async updateRegistrationConfigFile(registrationData) {
        try {
            // 构建完整的配置对象，只更新default_url字段
            const fullConfig = {
                registration_service: {
                    default_url: registrationData.serviceUrl,
                    timeout: 10000,  // 保持默认值
                    retry_count: 3,  // 保持默认值
                    updated_at: new Date().toISOString()
                }
            };

            // 使用chrome.storage.local保存配置文件内容
            await chrome.storage.local.set({
                registrationConfigFile: JSON.stringify(fullConfig, null, 2)
            });

            console.log('注册配置文件已更新，URL:', registrationData.serviceUrl);
        } catch (error) {
            console.error('更新注册配置文件失败:', error);
            // 不抛出错误，因为主要功能（本地存储）已经成功
        }
    }

    // 测试知识库服务连接
    async testKnowledgeService() {
        const serviceUrl = document.getElementById('knowledgeServiceUrl').value.trim();
        const apiKey = document.getElementById('knowledgeServiceApiKey').value.trim();

        if (!serviceUrl) {
            this.showMessage('请输入知识库服务URL', 'error');
            return;
        }

        try {
            this.showMessage('正在测试连接...', 'info');
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            var testUrl = serviceUrl.replace("/chat/message","/user/validate");
            const response = await fetch(`${testUrl}`, {
                method: 'POST',
                headers: headers
            });
            
            // 解析JSON响应
            const responseData = await response.json();
            console.log("API响应数据:", responseData);
            
            // 根据返回的valid字段判断连接状态
            if (responseData.valid === true) {
                this.showMessage(`知识库服务连接正常 - ${responseData.message}`, 'success');
            } else {
                this.showMessage(`连接失败: ${responseData.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('测试知识库服务连接失败:', error);
            this.showMessage('连接测试失败，请检查URL和网络连接', 'error');
        }
    }

    // 验证邮箱格式
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 加载知识库列表
    async loadKnowledgeBases() {
        try {
            console.log('开始加载知识库列表...');
            const configUrl = chrome.runtime.getURL('config/knowledge_bases.json');
            console.log('配置文件URL:', configUrl);
            
            const response = await fetch(configUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                }
            });
            console.log('响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const config = await response.json();
            console.log('加载的配置:', config);
            
            this.knowledgeBases = config.knowledge_bases || [];
            console.log('知识库列表:', this.knowledgeBases);
            
            this.renderKnowledgeBases();
        } catch (error) {
            console.error('加载知识库列表失败:', error);
            // 如果加载失败，使用硬编码的默认值
            this.knowledgeBases = this.getDefaultKnowledgeBases();
            this.renderKnowledgeBases();
        }
    }

    // 获取默认知识库列表（硬编码备用）
    getDefaultKnowledgeBases() {
        return [
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
    }

    // 渲染知识库列表
    renderKnowledgeBases() {
        const container = document.getElementById('knowledgeBasesList');
        console.log('渲染知识库列表，容器:', container);
        
        if (!container) {
            console.error('找不到知识库列表容器');
            return;
        }

        console.log('当前知识库列表:', this.knowledgeBases);
        console.log('知识库数量:', this.knowledgeBases.length);

        if (this.knowledgeBases.length === 0) {
            console.log('知识库列表为空，显示空状态');
            container.innerHTML = `
                <div class="empty-knowledge-bases">
                    <div class="empty-knowledge-bases-icon">📚</div>
                    <div class="empty-knowledge-bases-text">暂无知识库数据</div>
                    <div class="empty-knowledge-bases-subtext">请检查配置文件是否正确</div>
                </div>
            `;
            return;
        }

        console.log('开始渲染知识库列表...');
        container.innerHTML = '';
        this.knowledgeBases.forEach((kb, index) => {
            console.log(`渲染知识库 ${index + 1}:`, kb);
            const item = this.createKnowledgeBaseElement(kb);
            container.appendChild(item);
        });
        console.log('知识库列表渲染完成');
    }

    // 创建知识库元素
    createKnowledgeBaseElement(kb) {
        const div = document.createElement('div');
        div.className = 'knowledge-base-item';
        
        // 确定分类
        const category = this.getKnowledgeBaseCategory(kb.id);
        
        div.innerHTML = `
            <div class="knowledge-base-info">
                <div class="knowledge-base-id">${kb.id}</div>
                <div class="knowledge-base-name">${kb.name}</div>
                <div class="knowledge-base-category">${category}</div>
            </div>
        `;
        
        return div;
    }

    // 获取知识库分类
    getKnowledgeBaseCategory(id) {
        const numId = parseInt(id);
        if (numId >= 2101 && numId <= 2117) {
            return '关系型数据库';
        } else if (numId >= 2201 && numId <= 2206) {
            return '分布式数据库';
        } else if (numId === 1111) {
            return '操作系统';
        } else {
            return '其他';
        }
    }

    // 刷新知识库列表
    async refreshKnowledgeBases() {
        this.showMessage('正在刷新知识库列表...', 'info');
        await this.loadKnowledgeBases();
        this.showMessage('知识库列表已刷新', 'success');
    }

    // 导出知识库列表
    exportKnowledgeBases() {
        try {
            const data = {
                knowledge_bases: this.knowledgeBases,
                export_time: new Date().toISOString(),
                total_count: this.knowledgeBases.length
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `knowledge_bases_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('知识库列表已导出', 'success');
        } catch (error) {
            console.error('导出知识库列表失败:', error);
            this.showMessage('导出失败', 'error');
        }
    }

    // 更新注册表单显示和状态指示器
    updateRegistrationFormDisplay(registrationData) {
        try {
            // 更新表单字段值
            const registerUsername = document.getElementById('registerUsername');
            const registerCompany = document.getElementById('registerCompany');
            const registerEmail = document.getElementById('registerEmail');
            const registerServiceUrl = document.getElementById('registerServiceUrl');
            const agreeTerms = document.getElementById('agreeTerms');

            if (registerUsername) {
                registerUsername.value = registrationData.username || '';
            }
            if (registerCompany) {
                registerCompany.value = registrationData.company || '';
            }
            if (registerEmail) {
                registerEmail.value = registrationData.email || '';
            }
            if (registerServiceUrl && registrationData.serviceUrl) {
                registerServiceUrl.value = registrationData.serviceUrl;
            }
            
            // 已注册用户默认勾选协议
            if (agreeTerms && registrationData.status === 'registered') {
                agreeTerms.checked = true;
            }

            // 添加状态指示器
            this.addRegistrationStatusIndicator();
            
            console.log('注册表单显示已更新:', registrationData);
            
        } catch (error) {
            console.error('更新注册表单显示失败:', error);
        }
    }

    // 密码切换功能
    togglePassword(inputId) {
        console.log('togglePassword被调用，inputId:', inputId);
        
        const input = document.getElementById(inputId);
        console.log('找到输入框:', input);
        
        if (!input) {
            console.error('找不到输入框:', inputId);
            return;
        }
        
        // 直接切换输入框类型
        if (input.type === 'password') {
            input.type = 'text';
            console.log('切换到文本模式');
        } else {
            input.type = 'password';
            console.log('切换到密码模式');
        }
        
        // 更新按钮文本
        const button = input.parentElement.querySelector('.toggle-password');
        if (button) {
            if (input.type === 'text') {
                button.textContent = '🙈';
            } else {
                button.textContent = '👁';
            }
            console.log('按钮文本已更新:', button.textContent);
        } else {
            console.error('找不到按钮');
        }
    }

    // 检查并修复规则数据
    checkAndFixRules() {
        console.log('检查规则数据...');
        console.log('当前规则:', this.rules);
        
        const defaultRules = this.getDefaultRules();
        let hasIssues = false;
        
        // 检查每个默认规则
        defaultRules.forEach(defaultRule => {
            const existingRule = this.rules.find(r => r.id === defaultRule.id);
            if (existingRule) {
                console.log(`检查规则 ${defaultRule.name}:`, existingRule);
                console.log(`默认值: temperature=${defaultRule.temperature}, similarity=${defaultRule.similarity}, topN=${defaultRule.topN}`);
                console.log(`当前值: temperature=${existingRule.temperature}, similarity=${existingRule.similarity}, topN=${existingRule.topN}`);
                
                // 检查temperature值是否正确
                if (existingRule.temperature !== defaultRule.temperature) {
                    console.log(`发现temperature值错误: 期望 ${defaultRule.temperature}, 实际 ${existingRule.temperature}`);
                    hasIssues = true;
                }
                
                // 检查其他关键字段
                if (existingRule.similarity !== defaultRule.similarity || 
                    existingRule.topN !== defaultRule.topN) {
                    console.log(`发现其他字段错误:`, {
                        similarity: { expected: defaultRule.similarity, actual: existingRule.similarity },
                        topN: { expected: defaultRule.topN, actual: existingRule.topN }
                    });
                    hasIssues = true;
                }
            } else {
                console.log(`缺少默认规则: ${defaultRule.name}`);
                hasIssues = true;
            }
        });
        
        if (hasIssues) {
            console.log('发现规则数据问题，建议重置为默认规则');
            return false;
        } else {
            console.log('规则数据检查通过');
            return true;
        }
    }

    // 强制修复规则数据
    async forceFixRules() {
        console.log('开始强制修复规则数据...');
        const defaultRules = this.getDefaultRules();
        let hasFixed = false;
        
        // 检查并修复每个内置规则
        defaultRules.forEach(defaultRule => {
            const existingIndex = this.rules.findIndex(r => r.id === defaultRule.id);
            if (existingIndex !== -1) {
                const existingRule = this.rules[existingIndex];
                console.log(`检查规则 ${defaultRule.name}:`, {
                    expected: defaultRule.temperature,
                    actual: existingRule.temperature,
                    needsFix: existingRule.temperature !== defaultRule.temperature
                });
                
                // 如果温度值不正确，强制修复
                if (existingRule.temperature !== defaultRule.temperature) {
                    console.log(`修复规则 ${defaultRule.name} 的温度值: ${existingRule.temperature} -> ${defaultRule.temperature}`);
                    this.rules[existingIndex] = {
                        ...existingRule,
                        temperature: defaultRule.temperature,
                        similarity: defaultRule.similarity,
                        topN: defaultRule.topN
                    };
                    hasFixed = true;
                }
            }
        });
        
        if (hasFixed) {
            console.log('规则数据已修复，正在保存...');
            await this.saveRules();
            this.renderRules();
            this.showMessage('规则数据已修复', 'success');
        } else {
            console.log('规则数据无需修复');
            this.showMessage('规则数据正常，无需修复', 'info');
        }
        
        return hasFixed;
    }

    // 快速添加服务商下的模型
    quickAddModelForProvider(provider, availableModels) {
        // 显示模型添加表单
        this.showModelForm();
        
        // 预填充服务商信息
        const providerSelect = document.getElementById('modelProvider');
        if (providerSelect) {
            providerSelect.value = provider.name;
            // 触发change事件以加载模型列表
            providerSelect.dispatchEvent(new Event('change'));
        }
        
        // 显示提示信息
        this.showMessage(`已选择服务商: ${provider.name}，请选择要添加的模型`, 'info');
    }

    // 检测是否为 Ollama 服务
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
            let apiEndpoint = provider.apiEndpoint;
            // 如果端点包含 /chat/completions，先移除它以便检查基础URL
            if (apiEndpoint.includes('/chat/completions')) {
                apiEndpoint = apiEndpoint.replace('/chat/completions', '');
            }
            
            const url = new URL(apiEndpoint);
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
                if (path.includes('/v1') || 
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

    // 服务商类型管理方法
    getProviderTypeById(typeId) {
        return this.providerTypes.find(type => type.id === typeId);
    }

    addProviderType(typeConfig) {
        // 检查是否已存在相同ID的类型
        const existingIndex = this.providerTypes.findIndex(type => type.id === typeConfig.id);
        if (existingIndex !== -1) {
            this.providerTypes[existingIndex] = typeConfig;
        } else {
            this.providerTypes.push(typeConfig);
        }
        this.saveProviderTypes();
    }

    removeProviderType(typeId) {
        this.providerTypes = this.providerTypes.filter(type => type.id !== typeId);
        this.saveProviderTypes();
    }

    async saveProviderTypes() {
        try {
            await chrome.storage.sync.set({ providerTypes: this.providerTypes });
        } catch (error) {
            console.error('保存服务商类型失败:', error);
        }
    }

    async loadProviderTypes() {
        try {
            const result = await chrome.storage.sync.get(['providerTypes']);
            if (result.providerTypes) {
                this.providerTypes = result.providerTypes;
            }
        } catch (error) {
            console.error('加载服务商类型失败:', error);
        }
    }

    handleProviderTypeChange(event) {
        const selectedTypeId = event.target.value;
        if (!selectedTypeId) return;

        const selectedType = this.getProviderTypeById(selectedTypeId);
        if (selectedType) {
            // 获取表单字段
            const providerNameInput = document.getElementById('providerName');
            const apiEndpointInput = document.getElementById('apiEndpoint');
            const authTypeSelect = document.getElementById('authType');
            const requestFormatSelect = document.getElementById('requestFormat');
            
            // 总是填充服务商名称和API地址的默认值
            providerNameInput.value = selectedType.name;
            apiEndpointInput.value = selectedType.apiEndpoint;
            
            // 对于认证类型和请求格式，只有在字段为空时才自动填充
            if (!authTypeSelect.value || authTypeSelect.value === '') {
                authTypeSelect.value = selectedType.authType;
            }
            
            if (!requestFormatSelect.value || requestFormatSelect.value === '') {
                requestFormatSelect.value = selectedType.requestFormat;
            }
            
            // 显示描述信息
            this.showProviderTypeDescription(selectedType);
            
            console.log('服务商类型已切换，已填充默认值:', {
                name: selectedType.name,
                apiEndpoint: selectedType.apiEndpoint,
                authType: selectedType.authType,
                requestFormat: selectedType.requestFormat
            });
        }
    }

    showProviderTypeDescription(providerType) {
        // 移除现有的描述元素
        const existingDesc = document.querySelector('.provider-type-description');
        if (existingDesc) {
            existingDesc.remove();
        }

        // 创建新的描述元素
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'provider-type-description';
        descriptionDiv.innerHTML = `
            <div class="description-content">
                <span class="description-icon">ℹ️</span>
                <span class="description-text">${providerType.description}</span>
                <button type="button" class="btn-reset-defaults" id="resetToDefaults">重置为默认值</button>
            </div>
        `;

        // 插入到服务商名称字段后面
        const providerNameField = document.getElementById('providerName');
        providerNameField.parentNode.insertBefore(descriptionDiv, providerNameField.nextSibling);
        
        // 绑定重置按钮事件
        const resetBtn = descriptionDiv.querySelector('#resetToDefaults');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToProviderTypeDefaults(providerType);
            });
        }
    }

    resetToProviderTypeDefaults(providerType) {
        // 重置所有字段为默认值
        document.getElementById('providerName').value = providerType.name;
        document.getElementById('apiEndpoint').value = providerType.apiEndpoint;
        document.getElementById('authType').value = providerType.authType;
        document.getElementById('requestFormat').value = providerType.requestFormat;
        
        this.showMessage('已重置为默认配置', 'success');
    }

    populateProviderTypeOptions() {
        const select = document.getElementById('providerType');
        if (!select) return;

        // 清空现有选项
        select.innerHTML = '';

        // 添加预设类型
        this.providerTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.displayName;
            select.appendChild(option);
        });
    }

    // 服务商类型管理界面方法
    showProviderTypeManager() {
        const dialog = document.createElement('div');
        dialog.className = 'provider-type-manager-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>服务商类型管理</h3>
                    <button class="close-btn" id="closeProviderTypeManager">×</button>
                </div>
                <div class="dialog-body">
                    <div class="provider-types-list">
                        ${this.providerTypes.map(type => `
                            <div class="provider-type-item" data-type-id="${type.id}">
                                <div class="type-info">
                                    <div class="type-name">${type.displayName}</div>
                                    <div class="type-description">${type.description}</div>
                                    <div class="type-endpoint">${type.apiEndpoint}</div>
                                </div>
                                <div class="type-actions">
                                    <button class="btn-edit" data-type-id="${type.id}">编辑</button>
                                    <button class="btn-delete" data-type-id="${type.id}">删除</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="add-type-section">
                        <button class="btn-add-type" id="addNewProviderType">+ 添加新类型</button>
                        <button class="btn-cancel-manager" id="cancelProviderTypeManager">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定事件
        this.bindProviderTypeManagerEvents(dialog);
    }

    bindProviderTypeManagerEvents(dialog) {
        // 关闭按钮
        const closeBtn = dialog.querySelector('#closeProviderTypeManager');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                dialog.remove();
            });
        }
        
        // 添加新类型按钮
        const addBtn = dialog.querySelector('#addNewProviderType');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddProviderTypeForm();
            });
        }
        
        // 编辑按钮
        const editBtns = dialog.querySelectorAll('.btn-edit');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const typeId = e.target.getAttribute('data-type-id');
                this.showAddProviderTypeForm(typeId);
            });
        });
        
        // 删除按钮
        const deleteBtns = dialog.querySelectorAll('.btn-delete');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const typeId = e.target.getAttribute('data-type-id');
                if (confirm('确定要删除这个服务商类型吗？')) {
                    this.deleteProviderType(typeId);
                    this.refreshProviderTypeManagerContent(dialog);
                    this.showMessage('服务商类型删除成功', 'success');
                }
            });
        });
        
        // 取消按钮
        const cancelBtn = dialog.querySelector('#cancelProviderTypeManager');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                dialog.remove();
            });
        }
    }

    // 在管理器中显示表单
    showProviderTypeFormInManager(dialog, typeId = null) {
        const isEditing = typeId !== null;
        const type = isEditing ? this.getProviderTypeById(typeId) : null;
        
        // 更新表单标题
        const titleElement = dialog.querySelector('#formSectionTitle');
        if (titleElement) {
            titleElement.textContent = isEditing ? '编辑服务商类型' : '添加服务商类型';
        }
        
        // 填充表单数据
        const form = dialog.querySelector('#providerTypeForm');
        if (form) {
            form.reset();
            
            if (type) {
                // 编辑模式，填充现有数据
                form.querySelector('#typeId').value = type.id;
                form.querySelector('#typeId').readOnly = true; // 编辑时ID不可修改
                form.querySelector('#typeName').value = type.name;
                form.querySelector('#typeDisplayName').value = type.displayName;
                form.querySelector('#typeEndpoint').value = type.apiEndpoint;
                form.querySelector('#typeAuthType').value = type.authType;
                form.querySelector('#typeRequestFormat').value = type.requestFormat;
                form.querySelector('#typeDescription').value = type.description;
            } else {
                // 新增模式，清空表单
                form.querySelector('#typeId').readOnly = false;
            }
        }
        
        // 更新提交按钮文本
        const submitBtn = dialog.querySelector('#submitForm');
        if (submitBtn) {
            submitBtn.textContent = isEditing ? '更新' : '添加';
        }
        
        // 存储当前编辑的类型ID
        dialog.setAttribute('data-editing-type-id', typeId || '');
        
        // 显示表单区域
        const formSection = dialog.querySelector('#providerTypeFormSection');
        if (formSection) {
            formSection.style.display = 'block';
        }
        
        // 隐藏类型列表和按钮区域
        const typesList = dialog.querySelector('.provider-types-list');
        const addSection = dialog.querySelector('.add-type-section');
        if (typesList) typesList.style.display = 'none';
        if (addSection) addSection.style.display = 'none';
    }

    // 在管理器中隐藏表单
    hideProviderTypeFormInManager(dialog) {
        // 隐藏表单区域
        const formSection = dialog.querySelector('#providerTypeFormSection');
        if (formSection) {
            formSection.style.display = 'none';
        }
        
        // 显示类型列表和按钮区域
        const typesList = dialog.querySelector('.provider-types-list');
        const addSection = dialog.querySelector('.add-type-section');
        if (typesList) typesList.style.display = 'block';
        if (addSection) addSection.style.display = 'flex';
        
        // 清除编辑状态
        dialog.removeAttribute('data-editing-type-id');
    }

    // 处理表单提交（在管理器中）
    handleProviderTypeFormSubmitInManager(event, dialog) {
        const formData = new FormData(event.target);
        const typeConfig = {
            id: formData.get('typeId'),
            name: formData.get('typeName'),
            displayName: formData.get('typeDisplayName'),
            apiEndpoint: formData.get('typeEndpoint'),
            authType: formData.get('typeAuthType'),
            requestFormat: formData.get('typeRequestFormat'),
            description: formData.get('typeDescription')
        };
        
        this.addProviderType(typeConfig);
        
        // 隐藏表单
        this.hideProviderTypeFormInManager(dialog);
        
        // 刷新类型列表
        this.refreshProviderTypeManagerContent(dialog);
        
        // 显示成功消息
        const isEditing = dialog.getAttribute('data-editing-type-id') !== null;
        this.showMessage(`服务商类型${isEditing ? '更新' : '添加'}成功`, 'success');
    }

    // 刷新管理器的类型列表内容
    refreshProviderTypeManagerContent(dialog) {
        const typesList = dialog.querySelector('.provider-types-list');
        if (typesList) {
            typesList.innerHTML = this.providerTypes.map(type => `
                <div class="provider-type-item" data-type-id="${type.id}">
                    <div class="type-info">
                        <div class="type-name">${type.displayName}</div>
                        <div class="type-description">${type.description}</div>
                        <div class="type-endpoint">${type.apiEndpoint}</div>
                    </div>
                    <div class="type-actions">
                        <button class="btn-edit" data-type-id="${type.id}">编辑</button>
                        <button class="btn-delete" data-type-id="${type.id}">删除</button>
                    </div>
                </div>
            `).join('');
            
            // 重新绑定编辑和删除按钮事件
            this.bindEditDeleteButtons(dialog);
        }
    }

    // 绑定编辑和删除按钮事件
    bindEditDeleteButtons(dialog) {
        // 编辑按钮
        const editBtns = dialog.querySelectorAll('.btn-edit');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const typeId = e.target.getAttribute('data-type-id');
                this.showAddProviderTypeForm(typeId);
            });
        });
        
        // 删除按钮
        const deleteBtns = dialog.querySelectorAll('.btn-delete');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const typeId = e.target.getAttribute('data-type-id');
                if (confirm('确定要删除这个服务商类型吗？')) {
                    this.deleteProviderType(typeId);
                    this.refreshProviderTypeManagerContent(dialog);
                    this.showMessage('服务商类型删除成功', 'success');
                }
            });
        });
    }

    // 显示添加/编辑服务商类型表单（弹窗）
    showAddProviderTypeForm(typeId = null) {
        const isEditing = typeId !== null;
        const type = isEditing ? this.getProviderTypeById(typeId) : null;
        
        const dialog = document.createElement('div');
        dialog.className = 'provider-type-form-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>${isEditing ? '编辑' : '添加'}服务商类型</h3>
                    <button class="close-btn" id="closeProviderTypeForm">×</button>
                </div>
                <div class="dialog-body">
                    <form id="providerTypeForm">
                        <div class="form-group">
                            <label for="typeId">类型ID *</label>
                            <input type="text" id="typeId" name="typeId" required 
                                   value="${type ? type.id : ''}" 
                                   ${isEditing ? 'readonly' : ''}
                                   placeholder="例如：ollama、openai">
                        </div>
                        <div class="form-group">
                            <label for="typeName">类型名称 *</label>
                            <input type="text" id="typeName" name="typeName" required 
                                   value="${type ? type.name : ''}" 
                                   placeholder="例如：Ollama">
                        </div>
                        <div class="form-group">
                            <label for="typeDisplayName">显示名称 *</label>
                            <input type="text" id="typeDisplayName" name="typeDisplayName" required 
                                   value="${type ? type.displayName : ''}" 
                                   placeholder="例如：Ollama (本地部署)">
                        </div>
                        <div class="form-group">
                            <label for="typeEndpoint">API地址 *</label>
                            <input type="url" id="typeEndpoint" name="typeEndpoint" required 
                                   value="${type ? type.apiEndpoint : ''}" 
                                   placeholder="例如：http://localhost:11434/v1">
                        </div>
                        <div class="form-group">
                            <label for="typeAuthType">认证类型</label>
                            <select id="typeAuthType" name="typeAuthType">
                                <option value="Bearer" ${type && type.authType === 'Bearer' ? 'selected' : ''}>Bearer Token</option>
                                <option value="API-Key" ${type && type.authType === 'API-Key' ? 'selected' : ''}>API Key</option>
                                <option value="Custom" ${type && type.authType === 'Custom' ? 'selected' : ''}>自定义</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="typeRequestFormat">请求格式</label>
                            <select id="typeRequestFormat" name="typeRequestFormat">
                                <option value="OpenAI" ${type && type.requestFormat === 'OpenAI' ? 'selected' : ''}>OpenAI格式</option>
                                <option value="Claude" ${type && type.requestFormat === 'Claude' ? 'selected' : ''}>Claude格式</option>
                                <option value="Custom" ${type && type.requestFormat === 'Custom' ? 'selected' : ''}>自定义格式</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="typeDescription">描述</label>
                            <textarea id="typeDescription" name="typeDescription" 
                                      placeholder="例如：本地部署的大语言模型服务">${type ? type.description : ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelProviderTypeForm">取消</button>
                            <button type="submit" class="btn-primary">${isEditing ? '更新' : '添加'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定表单事件
        this.bindProviderTypeFormEvents(dialog, typeId);
    }

    // 绑定表单事件
    bindProviderTypeFormEvents(dialog, typeId) {
        // 关闭按钮
        const closeBtn = dialog.querySelector('#closeProviderTypeForm');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                dialog.remove();
            });
        }
        
        // 取消按钮
        const cancelBtn = dialog.querySelector('#cancelProviderTypeForm');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                dialog.remove();
            });
        }
        
        // 表单提交
        const form = dialog.querySelector('#providerTypeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProviderTypeFormSubmit(e, typeId);
                dialog.remove();
            });
        }
    }

    // 处理表单提交
    handleProviderTypeFormSubmit(event, typeId = null) {
        const formData = new FormData(event.target);
        const typeConfig = {
            id: formData.get('typeId'),
            name: formData.get('typeName'),
            displayName: formData.get('typeDisplayName'),
            apiEndpoint: formData.get('typeEndpoint'),
            authType: formData.get('typeAuthType'),
            requestFormat: formData.get('typeRequestFormat'),
            description: formData.get('typeDescription')
        };
        
        this.addProviderType(typeConfig);
        
        // 刷新服务商类型管理器（如果存在）
        const manager = document.querySelector('.provider-type-manager-dialog');
        if (manager) {
            this.refreshProviderTypeManagerContent(manager);
        }
        
        this.showMessage(`服务商类型${typeId ? '更新' : '添加'}成功`, 'success');
    }

    // URL处理工具方法
    buildServiceUrl(baseUrl, endpoint) {
        try {
            const url = new URL(baseUrl);
            // 确保路径以 / 结尾
            const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
            return `${url.protocol}//${url.host}${path}${endpoint}`;
        } catch (e) {
            console.warn('无法解析URL，使用字符串拼接:', e.message);
            // 简单的字符串处理
            const cleanUrl = baseUrl.replace(/\/+$/, ''); // 移除末尾的斜杠
            return `${cleanUrl}/${endpoint}`;
        }
    }

    // 为不同服务构建正确的URL
    buildModelsUrl(provider) {
        if (this.isOllamaService(provider)) {
            // Ollama: 使用 /v1/models
            const baseUrl = this.buildOllamaBaseUrl(provider);
            return this.buildServiceUrl(baseUrl, 'models');
        } else {
            // 其他服务: 使用 /models
            return this.buildServiceUrl(provider.apiEndpoint, 'models');
        }
    }

    buildChatCompletionsUrl(provider) {
        if (this.isOllamaService(provider)) {
            // Ollama: 使用 /v1/chat/completions
            const baseUrl = this.buildOllamaBaseUrl(provider);
            return this.buildServiceUrl(baseUrl, 'chat/completions');
        } else {
            // 其他服务: 使用 /chat/completions
            return this.buildServiceUrl(provider.apiEndpoint, 'chat/completions');
        }
    }

    // 检查规则是否被修改的方法
    isRuleModified(savedRule, defaultRule) {
        // 数值字段的比较（考虑数据类型转换）
        const temperatureModified = this.compareNumericValues(savedRule.temperature, defaultRule.temperature);
        const similarityModified = this.compareNumericValues(savedRule.similarity, defaultRule.similarity);
        const topNModified = this.compareNumericValues(savedRule.topN, defaultRule.topN);
        
        // 字符串字段的比较
        const promptModified = savedRule.prompt !== defaultRule.prompt;
        const nameModified = savedRule.name !== defaultRule.name;
        const descriptionModified = savedRule.description !== defaultRule.description;
        
        const isModified = temperatureModified || similarityModified || topNModified || 
                          promptModified || nameModified || descriptionModified;
        
        if (isModified) {
            console.log(`规则 ${savedRule.name} 修改详情:`, {
                temperature: { saved: savedRule.temperature, default: defaultRule.temperature, modified: temperatureModified },
                similarity: { saved: savedRule.similarity, default: defaultRule.similarity, modified: similarityModified },
                topN: { saved: savedRule.topN, default: defaultRule.topN, modified: topNModified },
                prompt: { modified: promptModified },
                name: { modified: nameModified },
                description: { modified: descriptionModified }
            });
        }
        
        return isModified;
    }
    
    // 比较数值的方法（处理数据类型转换）
    compareNumericValues(savedValue, defaultValue) {
        // 转换为数字进行比较
        const savedNum = parseFloat(savedValue);
        const defaultNum = parseFloat(defaultValue);
        
        // 检查是否为有效数字
        if (isNaN(savedNum) || isNaN(defaultNum)) {
            // 如果转换失败，进行字符串比较
            return String(savedValue) !== String(defaultValue);
        }
        
        // 使用小的误差范围进行比较（处理浮点数精度问题）
        const epsilon = 0.0001;
        return Math.abs(savedNum - defaultNum) > epsilon;
    }

    // 处理重新获取密钥
    async handleResendKey() {
        const email = document.getElementById('registerEmail').value.trim();
        const serviceUrl = document.getElementById('registerServiceUrl').value.trim();

        if (!email) {
            this.showMessage('请填写邮箱地址', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showMessage('请输入有效的邮箱地址', 'error');
            return;
        }

        if (!serviceUrl) {
            this.showMessage('请填写注册服务URL', 'error');
            return;
        }

        try {
            this.showMessage('正在重新获取密钥...', 'info');
            
            // 将注册服务URL中的/register替换为/resend
            const resendUrl = serviceUrl.replace('/register', '/resend');
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('email', email);
            
            const response = await fetch(resendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showMessage('密钥重新获取成功！请检查您的邮箱', 'success');
                console.log('重新获取密钥成功:', result);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || response.statusText;
                this.showMessage(`重新获取密钥失败: ${errorMessage}`, 'error');
                console.error('重新获取密钥失败:', errorData);
            }
            
        } catch (error) {
            console.error('重新获取密钥时发生错误:', error);
            this.showMessage(`重新获取密钥失败: ${error.message}`, 'error');
        }
    }
}

// 反馈历史相关方法
BicQASettings.prototype.loadFeedbackHistory = async function() {
    try {
        const result = await chrome.storage.sync.get(['feedbackHistory']);
        const feedbackHistory = result.feedbackHistory || [];
        
        this.updateFeedbackStats(feedbackHistory);
        this.renderFeedbackList(feedbackHistory);
    } catch (error) {
        console.error('加载反馈历史失败:', error);
        this.showMessage('加载反馈历史失败', 'error');
    }
};

BicQASettings.prototype.updateFeedbackStats = function(feedbackHistory) {
    const totalCount = feedbackHistory.length;
    const likeCount = feedbackHistory.filter(f => f.type === 'like').length;
    const dislikeCount = feedbackHistory.filter(f => f.type === 'dislike').length;
    
    document.getElementById('totalFeedbackCount').textContent = totalCount;
    document.getElementById('likeCount').textContent = likeCount;
    document.getElementById('dislikeCount').textContent = dislikeCount;
};

BicQASettings.prototype.renderFeedbackList = function(feedbackHistory) {
    const container = document.getElementById('feedbackList');
    const emptyFeedback = document.getElementById('emptyFeedback');
    
    if (feedbackHistory.length === 0) {
        container.style.display = 'none';
        emptyFeedback.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyFeedback.style.display = 'none';
    
    // 按时间倒序排列
    const sortedFeedback = feedbackHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = '';
    sortedFeedback.forEach((feedback, index) => {
        const element = this.createFeedbackElement(feedback, index);
        container.appendChild(element);
    });
};

BicQASettings.prototype.createFeedbackElement = function(feedback, index) {
    const div = document.createElement('div');
    div.className = 'feedback-item';
    
    const time = new Date(feedback.timestamp).toLocaleString('zh-CN');
    const typeText = feedback.type === 'like' ? '👍 有帮助' : '👎 没帮助';
    const typeClass = feedback.type === 'like' ? 'like' : 'dislike';
    
    div.innerHTML = `
        <div class="feedback-header-row">
            <div class="feedback-type ${typeClass}">
                <span>${typeText}</span>
            </div>
            <div class="feedback-time">${time}</div>
        </div>
        <div class="feedback-content">
            <div class="feedback-question">${this.escapeHtml(feedback.question)}</div>
            <div class="feedback-answer">${this.escapeHtml(feedback.answer)}</div>
        </div>
        <div class="feedback-meta">
            ${feedback.model ? `<div class="feedback-model">📊 模型: ${feedback.model}</div>` : ''}
            ${feedback.knowledgeBase ? `<div class="feedback-knowledge-base">📚 知识库: ${feedback.knowledgeBase}</div>` : ''}
            ${feedback.pageUrl ? `<div class="feedback-url">🌐 页面: ${this.truncateUrl(feedback.pageUrl)}</div>` : ''}
        </div>
    `;
    
    return div;
};

BicQASettings.prototype.refreshFeedback = async function() {
    await this.loadFeedbackHistory();
    this.showMessage('反馈历史已刷新', 'success');
};

BicQASettings.prototype.exportFeedback = async function() {
    try {
        const result = await chrome.storage.sync.get(['feedbackHistory']);
        const feedbackHistory = result.feedbackHistory || [];
        
        if (feedbackHistory.length === 0) {
            this.showMessage('暂无反馈数据可导出', 'info');
            return;
        }
        
        const dataStr = JSON.stringify(feedbackHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bic-qa-feedback-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showMessage('反馈数据已导出', 'success');
    } catch (error) {
        console.error('导出反馈失败:', error);
        this.showMessage('导出反馈失败', 'error');
    }
};

BicQASettings.prototype.clearFeedback = async function() {
    if (!confirm('确定要清空所有反馈记录吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        await chrome.storage.sync.remove(['feedbackHistory']);
        this.updateFeedbackStats([]);
        this.renderFeedbackList([]);
        this.showMessage('反馈记录已清空', 'success');
    } catch (error) {
        console.error('清空反馈失败:', error);
        this.showMessage('清空反馈失败', 'error');
    }
};

BicQASettings.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

BicQASettings.prototype.truncateUrl = function(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname + urlObj.pathname.substring(0, 30) + (urlObj.pathname.length > 30 ? '...' : '');
    } catch {
        return url.substring(0, 50) + (url.length > 50 ? '...' : '');
    }
};

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .empty-message {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }
    
    .default-badge {
        background: #27ae60;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        margin-left: 8px;
    }
`;
document.head.appendChild(style);

// 初始化设置页面
let settings;
document.addEventListener('DOMContentLoaded', () => {
    settings = new BicQASettings();
    // 将settings对象暴露到全局作用域
    window.settings = settings;
    // 将修复方法也暴露到全局，方便调试
    // window.forceFixRules = () => settings.forceFixRules();
    // 添加测试方法
    window.testRuleForm = () => {
        console.log('测试规则表单...');
        const testRule = {
            name: '测试规则',
            similarity: 0.8,
            topN: 4,
            temperature: 0.3,
            prompt: '测试提示词',
            isDefault: false
        };
        settings.showRuleForm(testRule);
    };
    // 添加服务商类型管理方法到全局
    window.showProviderTypeManager = () => settings.showProviderTypeManager();
    window.addProviderType = (config) => settings.addProviderType(config);
    window.removeProviderType = (id) => settings.removeProviderType(id);
    
    // 添加测试方法
    window.testProviderTypes = () => {
        console.log('测试服务商类型功能...');
        console.log('当前服务商类型:', settings.providerTypes);
        
        // 测试添加新类型
        const testType = {
            id: 'test-provider',
            name: 'TestProvider',
            displayName: 'Test Provider (测试)',
            apiEndpoint: 'https://api.test.com/v1',
            authType: 'Bearer',
            requestFormat: 'OpenAI',
            description: '这是一个测试服务商类型'
        };
        
        settings.addProviderType(testType);
        console.log('添加测试类型后:', settings.providerTypes);
        
        // 测试删除
        settings.removeProviderType('test-provider');
        console.log('删除测试类型后:', settings.providerTypes);
    };
    
    // 添加服务商类型管理测试方法
    window.testProviderTypeManager = () => {
        console.log('测试服务商类型管理器...');
        settings.showProviderTypeManager();
    };
    
    // 添加服务商类型表单测试方法
    window.testProviderTypeForm = () => {
        console.log('测试服务商类型表单...');
        settings.showAddProviderTypeForm();
    };
    
    // 添加 Ollama URL 构建测试方法
    window.testOllamaUrls = () => {
        console.log('测试 Ollama URL 构建...');
        
        const testProvider = {
            name: 'Ollama',
            apiEndpoint: 'http://localhost:11434/v1',
            providerType: 'ollama'
        };
        
        console.log('测试服务商:', testProvider);
        console.log('基础URL:', settings.buildOllamaBaseUrl(testProvider));
        console.log('模型列表URL:', settings.buildModelsUrl(testProvider));
        console.log('聊天完成URL:', settings.buildChatCompletionsUrl(testProvider));
        console.log('是否为Ollama服务:', settings.isOllamaService(testProvider));
    };
    
    // 添加服务商类型管理器关闭逻辑测试方法
    window.testProviderTypeManagerClose = () => {
        console.log('测试服务商类型管理器关闭逻辑...');
        console.log('现在只能通过以下方式关闭：');
        console.log('1. 右上角的 × 按钮');
        console.log('2. 底部的"取消"按钮');
        console.log('3. 点击"添加新类型"按钮（会跳转到表单）');
        console.log('4. 点击"编辑"或"删除"按钮（会执行相应操作）');
        settings.showProviderTypeManager();
    };
    
    // 添加内嵌表单功能测试方法
    window.testInlineForm = () => {
        console.log('测试内嵌表单功能...');
        console.log('新功能特点：');
        console.log('1. 新增/编辑表单直接在管理页面内显示');
        console.log('2. 不会关闭原有的管理页面');
        console.log('3. 表单提交后自动刷新类型列表');
        console.log('4. 可以通过表单右上角的 × 按钮或取消按钮返回列表');
        settings.showProviderTypeManager();
    };
    
    console.log('Settings对象和调试方法已暴露到全局作用域');
}); 