/**
 * 用户信息管理器
 * 负责用户信息相关的功能
 */
export function createUserProfileManager(popup) {
    return {
        /**
         * 解析可用的apiKey（优先知识服务配置，其次服务商/模型）
         */
        resolveApiKey() {
            let apiKey = '';
            console.log('resolveApiKey - 检查各个来源:');
            console.log('knowledgeServiceConfig:', popup.knowledgeServiceConfig);
            console.log('providers:', popup.providers);
            console.log('models:', popup.models);

            if (popup.knowledgeServiceConfig && popup.knowledgeServiceConfig.api_key && popup.knowledgeServiceConfig.api_key.trim()) {
                apiKey = popup.knowledgeServiceConfig.api_key.trim();
                console.log('从knowledgeServiceConfig获取到API key');
            }
            if (!apiKey && Array.isArray(popup.providers)) {
                const providerWithKey = popup.providers.find(p => p && p.apiKey && String(p.apiKey).trim());
                if (providerWithKey) {
                    apiKey = String(providerWithKey.apiKey).trim();
                    console.log('从providers获取到API key');
                }
            }
            if (!apiKey && Array.isArray(popup.models)) {
                const modelWithKey = popup.models.find(m => m && m.apiKey && String(m.apiKey).trim());
                if (modelWithKey) {
                    apiKey = String(modelWithKey.apiKey).trim();
                    console.log('从models获取到API key');
                }
            }

            console.log('最终API key:', apiKey ? `长度${apiKey.length}` : '空');
            return apiKey;
        },

        /**
         * 调用用户信息接口并回显用户名、邮箱
         */
        async populateUserProfileFromApi({ userNameInput = popup.awrUserName, emailInput = popup.awrEmail } = {}) {
            const apiKey = this.resolveApiKey();
            if (!apiKey) {
                // 重置输入框为空
                if (userNameInput) {
                    userNameInput.value = '';
                }
                if (emailInput) {
                    emailInput.value = '';
                }
                popup.showMessage(popup.t('popup.message.apiKeyValidationFailed'), 'error');
                return;
            }

            const url = '/api/user/profile';
            try {
                // 使用请求工具
                const tempProvider = {
                    authType: 'Bearer',
                    apiKey: apiKey
                };
                try {
                    const data = await popup.requestUtil.post(url, null, {
                        provider: tempProvider
                    });

                    // 解析固定返回结构 { code, success, user: { userName, email, ... } }
                    if (!data || data.code !== 200 || data.success !== true || !data.user) {
                        // 用户信息返回格式异常或无用户数据，重置输入框并显示提示
                        if (userNameInput) {
                            userNameInput.value = '';
                        }
                        if (emailInput) {
                            emailInput.value = '';
                        }
                        popup.showMessage(popup.t('popup.message.apiKeyValidationFailed'), 'error');
                        return;
                    }

                    const user = data.user || {};
                    const username = user.userName || '';
                    const email = user.email || '';

                    if (userNameInput && username) {
                        userNameInput.value = username;
                    }
                    // 仅当邮箱为空时才用接口返回覆盖，避免覆盖注册邮箱
                    if (emailInput && !emailInput.value && email) {
                        emailInput.value = email;
                    }
                } catch (error) {
                    // 如果是401未授权或其他错误，重置输入框并显示提示
                    if (userNameInput) {
                        userNameInput.value = '';
                    }
                    if (emailInput) {
                        emailInput.value = '';
                    }
                    popup.showMessage(popup.t('popup.message.apiKeyValidationFailed'), 'error');
                    throw error;
                }
            } catch (error) {
                console.error('查询用户信息失败(Failed to query user information):', error);
                // 出错时重置输入框为空
                if (userNameInput) {
                    userNameInput.value = '';
                }
                if (emailInput) {
                    emailInput.value = '';
                }
                // 如果还没有显示错误提示，则显示
                if (!error.message || !error.message.includes('HTTP error')) {
                    popup.showMessage(popup.t('popup.message.apiKeyValidationFailed'), 'error');
                }
            }
        }
    };
}

