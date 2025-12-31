/**
 * 配置加载管理器
 * 负责加载和管理各种配置信息
 */
export function createConfigLoader(popup) {
    return {
        /**
         * 加载设置
         */
        async loadSettings() {
            try {
                const result = await chrome.storage.sync.get(['providers', 'models', 'conversationHistory']);
                popup.providers = result.providers || [];
                popup.models = result.models || [];
                popup.conversationHistory = result.conversationHistory || [];

                // 检查历史记录大小，如果过大则清理
                if (popup.conversationHistory.length > 50) {
                    console.log('历史记录过多，自动清理...');
                    popup.conversationHistory = popup.conversationHistory.slice(0, 50);
                    await chrome.storage.sync.set({
                        conversationHistory: popup.conversationHistory
                    });
                }

                popup.loadModelOptions();

                // 使用 setTimeout(0) 异步加载知识库选项，不阻塞初始化
                setTimeout(() => {
                    popup.loadKnowledgeBaseOptions();
                }, 0);

                // 加载参数规则选项
                popup.loadParameterRuleOptions();

                // 加载知识库服务配置 - 修复：等待异步方法完成
                await popup.loadKnowledgeServiceConfig();
            } catch (error) {
                console.error('加载设置失败:', error);
                // 如果是存储配额问题，尝试清理
                if (error.message && error.message.includes('quota')) {
                    console.log('检测到存储配额问题，尝试清理...');
                    await popup.cleanupHistoryRecords();
                }
                popup.providers = [];
                popup.models = [];
                popup.conversationHistory = [];
            }

            // 初始化按钮状态
            popup.updateButtonState();

            // 设置初始布局状态
            popup.updateLayoutState();
            await popup.applyLanguage(popup.currentLanguage, { persist: false, updateSwitcher: popup.hasStoredLanguagePreference });
        },

        /**
         * 加载模型选项
         */
        loadModelOptions() {
            const select = popup.modelSelect;
            select.innerHTML = '';

            if (popup.models.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = popup.t('popup.main.option.noModelConfigured');
                option.disabled = true;
                select.appendChild(option);
                return;
            }

            popup.models.forEach(model => {
                const option = document.createElement('option');
                option.value = JSON.stringify({ name: model.name, provider: model.provider });
                option.textContent = `${model.displayName || model.name} (${model.provider})`;
                if (model.isDefault) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        },

        /**
         * 加载知识库服务配置
         */
        async loadKnowledgeServiceConfig() {
            try {
                console.log('开始加载知识库服务配置...');

                // 从Chrome存储中加载知识库服务配置
                const result = await chrome.storage.sync.get(['knowledgeServiceConfig']);

                console.log('从chrome.storage.sync获取的结果:', result);

                popup.knowledgeServiceConfig = result.knowledgeServiceConfig || null;

                if (popup.knowledgeServiceConfig) {
                    console.log('成功加载知识库服务配置:', {
                        default_url: popup.knowledgeServiceConfig.default_url,
                        api_key: popup.knowledgeServiceConfig.api_key ? '已配置' : '未配置',
                        enabled: popup.knowledgeServiceConfig.enabled,
                        letter_limit: popup.knowledgeServiceConfig.letter_limit,
                        isOpenLetterLimit: popup.knowledgeServiceConfig.isOpenLetterLimit,
                        updated_at: popup.knowledgeServiceConfig.updated_at
                    });
                } else {
                    console.log('没有找到知识库服务配置，使用默认值');
                    // 设置默认配置
                    popup.knowledgeServiceConfig = {
                        default_url: 'https://api.bic-qa.com/api/chat/message',
                        api_key: '',
                        enabled: false,
                        updated_at: new Date().toISOString()
                    };
                }
            } catch (error) {
                console.error('加载知识库服务配置失败:', error);
                // 设置默认配置
                popup.knowledgeServiceConfig = {
                    default_url: 'https://api.bic-qa.com/api/chat/message',
                    api_key: '',
                    enabled: false,
                    updated_at: new Date().toISOString()
                };
            }
            // 在方法最后添加同步调用
            await popup.syncConfigFromFile();
        },

        /**
         * 检查两个配置对象是否有变化
         * @param {Object} oldConfig - 旧配置对象
         * @param {Object} newConfig - 新配置对象
         * @returns {boolean} - 如果有变化返回 true，否则返回 false
         */
        hasConfigChanges(oldConfig, newConfig) {
            if (!oldConfig && !newConfig) return false;
            if (!oldConfig || !newConfig) return true;

            // 获取所有键的并集
            const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

            for (const key of allKeys) {
                const oldValue = oldConfig[key];
                const newValue = newConfig[key];

                // 如果值不同，说明有变化
                if (oldValue !== newValue) {
                    // 对于对象类型，进行深度比较
                    if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
                        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                            return true;
                        }
                    } else {
                        return true;
                    }
                }
            }

            return false;
        },

        /**
         * 从文件同步配置
         */
        async syncConfigFromFile() {
            try {
                // 读取配置文件
                const timestamp = new Date().getTime();
                const response = await fetch(chrome.runtime.getURL(`config/knowledge_service.json?t=${timestamp}`));
                if (!response.ok) {
                    throw new Error(popup.t('popup.error.configLoadFailed'));
                }

                const configFile = await response.json();
                const fileConfig = configFile.knowledge_service;

                // 读取当前存储的配置
                const result = await chrome.storage.sync.get(['knowledgeServiceConfig']);
                const currentConfig = result.knowledgeServiceConfig || {};

                // 定义字段类型
                const userConfigFields = ['api_key', 'default_url', 'enabled']; // 用户可配置字段
                const systemConfigFields = ['letter_limit', 'isOpenLetterLimit', 'updated_at']; // 系统配置字段

                // 合并配置
                const mergedConfig = {
                    // 1. 先使用文件配置作为基础
                    ...fileConfig,
                    // 2. 保留用户的个人配置字段
                    ...Object.fromEntries(
                        userConfigFields.map(field => [field, currentConfig[field] !== undefined ? currentConfig[field] : fileConfig[field]])
                    ),
                    // 3. 系统配置字段始终使用文件配置（如果文件中有的话）
                    ...Object.fromEntries(
                        systemConfigFields.map(field => [field, fileConfig[field] !== undefined ? fileConfig[field] : currentConfig[field]])
                    )
                };

                // 检查是否有变化
                const hasChanges = popup.hasConfigChanges(currentConfig, mergedConfig);

                if (hasChanges) {
                    // 更新存储
                    await chrome.storage.sync.set({ knowledgeServiceConfig: mergedConfig });

                    // 更新当前配置
                    popup.knowledgeServiceConfig = mergedConfig;

                    console.log('配置已从文件同步到存储:', mergedConfig);
                } else {
                    console.log('配置无变化，跳过同步');
                }

                return true;

            } catch (error) {
                console.error('配置同步失败:', error);
                return false;
            }
        },

        /**
         * 获取环境类型（内网/外网）
         */
        async getEnvType() {
            try {
                // 从 config/registration.json 读取环境类型
                const response = await fetch(chrome.runtime.getURL('config/registration.json'));
                if (response.ok) {
                    const config = await response.json();
                    const envType = config?.registration_service?.env_type || 'out_env';
                    console.log('从配置文件读取环境类型:', envType);
                    return envType;
                } else {
                    console.warn('配置文件不存在或无法访问，使用默认值 out_env');
                    return 'out_env';
                }
            } catch (error) {
                console.warn('加载环境类型配置失败:', error.message, '使用默认值 out_env');
                return 'out_env';
            }
        }
    };
}

