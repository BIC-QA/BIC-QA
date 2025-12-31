/**
 * 问题处理器
 * 负责处理用户问题的核心逻辑
 */
export function createQuestionProcessor(popup) {
    return {
        /**
         * 处理用户问题
         */
        async processQuestion(question, pageContent, pageUrl, conversationContainer = null) {
            try {
                // 如果没有传入容器，使用当前容器
                if (!conversationContainer) {
                    conversationContainer = popup.getCurrentConversationContainer();
                }

                // 获取用户选择的模型
                const selectedModelValue = popup.modelSelect.value;
                if (!selectedModelValue) {
                    popup.showErrorResult(popup.t('popup.error.selectModel'), 'model', conversationContainer);
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
                const selectedModel = popup.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
                const provider = selectedModel ? popup.providers.find(p => p.name === selectedModel.provider) : null;

                if (!selectedModel || !provider) {
                    popup.showErrorResult(popup.t('popup.error.modelOrProviderMissing'), 'model', conversationContainer);
                    return;
                }

                // 获取选中的知识库
                const selectedKnowledgeBase = popup.knowledgeBaseSelect.value;

                // 获取选中的参数规则
                const selectedParameterRule = popup.parameterRuleSelect.value;
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
                if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)') {
                    return await this.processQuestionWithKnowledgeBase(
                        question,
                        selectedKnowledgeBase,
                        selectedModel,
                        provider,
                        parameterRule,
                        conversationContainer,
                        pageUrl
                    );
                } else {
                    return await this.processQuestionWithoutKnowledgeBase(
                        question,
                        pageContent,
                        pageUrl,
                        selectedModel,
                        provider,
                        parameterRule,
                        conversationContainer
                    );
                }
            } catch (error) {
                console.error('处理问题过程中发生错误:', error);
                popup.showErrorResult(popup.t('popup.error.processingDuring', { error: error.message }), 'model', conversationContainer);
                return;
            }
        },

        /**
         * 使用知识库处理问题
         */
        async processQuestionWithKnowledgeBase(question, selectedKnowledgeBase, selectedModel, provider, parameterRule, conversationContainer, pageUrl) {
            // 重新加载知识库服务配置，确保获取最新配置
            console.log('处理问题，重新加载知识库服务配置...');
            await popup.loadKnowledgeServiceConfig();

            // 添加详细的调试信息
            console.log('=== 知识库服务配置检查 ===');
            console.log('selectedKnowledgeBase:', selectedKnowledgeBase);
            console.log('knowledgeServiceConfig:', popup.knowledgeServiceConfig);
            if (popup.knowledgeServiceConfig) {
                console.log('default_url:', popup.knowledgeServiceConfig.default_url);
                console.log('api_key:', popup.knowledgeServiceConfig.api_key ? '已配置' : '未配置');
                console.log('enabled:', popup.knowledgeServiceConfig.enabled);
            }
            console.log('========================');

            // 检查知识库服务配置
            if (!popup.knowledgeServiceConfig) {
                popup.showErrorResult(popup.t('popup.error.configureKnowledgeConnection'), 'knowledge', conversationContainer);
                return;
            }

            // 检查知识库服务URL和API密钥
            if (!popup.knowledgeServiceConfig.default_url || !popup.knowledgeServiceConfig.api_key) {
                console.log('配置检查失败:');
                console.log('- default_url:', popup.knowledgeServiceConfig.default_url);
                console.log('- api_key:', popup.knowledgeServiceConfig.api_key ? '已配置' : '未配置');

                popup.showErrorResult(popup.t('popup.error.incompleteKnowledgeConfig'), 'knowledge', conversationContainer);
                return;
            }

            // 使用知识库服务
            try {
                // 先显示用户界面元素，与没有选择知识库时的模式保持一致
                popup.updateQuestionDisplay(question, conversationContainer);
                popup.updateAIDisplay(conversationContainer);

                // 使用提示容器设置提示语
                const resultText = conversationContainer.querySelector('.result-text');
                if (resultText) {
                    let tipsEl = resultText.querySelector('.result-text-tips');
                    if (!tipsEl) {
                        tipsEl = document.createElement('p');
                        tipsEl.className = 'result-text-tips';
                        resultText.appendChild(tipsEl);
                    }
                    tipsEl.textContent = popup.t('popup.progress.processing');
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
                    resultTitle.textContent = popup.t('popup.progress.generating');
                }

                popup.updateLayoutState();

                let knowledgeQuestion = question;
                if (popup.shouldAddInstructionForQuestion(question)) {
                    knowledgeQuestion = await popup.ensureChineseQuestion(question, provider, selectedModel);
                }

                const answer = await popup.streamChatWithConfig(
                    knowledgeQuestion,
                    selectedModel,
                    provider,
                    selectedKnowledgeBase,
                    parameterRule, // 传递参数规则
                    conversationContainer // 传递对话容器
                );

                // 保存对话历史
                popup.saveConversationHistory(question, answer, `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, selectedKnowledgeBase, pageUrl);

                return answer;
            } catch (streamError) {
                console.error('服务调用失败:', streamError);
                console.error('错误详情:', streamError.stack);

                const { errorMessage, errorType } = this.parseError(streamError);
                popup.showErrorResult(errorMessage, errorType, conversationContainer);
                return;
            }
        },

        /**
         * 不使用知识库处理问题
         */
        async processQuestionWithoutKnowledgeBase(question, pageContent, pageUrl, selectedModel, provider, parameterRule, conversationContainer) {
            try {
                // 如果问题不是中文，先翻译成中文用于提问
                let finalQuestion = question;
                if (popup.shouldAddInstructionForQuestion(question)) {
                    finalQuestion = await popup.ensureChineseQuestion(question, provider, selectedModel);
                }

                let answer;
                console.log("-----provider------", provider);
                // 检查是否为Ollama服务
                // 传入原始问题作为最后一个参数，用于显示
                if (popup.isOllamaService(provider)) {
                    answer = await popup.callOllamaAPI(finalQuestion, pageContent, pageUrl, provider, selectedModel, null, parameterRule, conversationContainer, question);
                } else {
                    answer = await popup.callAIAPI(finalQuestion, pageContent, pageUrl, provider, selectedModel, null, parameterRule, conversationContainer, question);
                }

                // 保存对话历史
                popup.saveConversationHistory(question, answer, `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, '', pageUrl);

                return answer;
            } catch (apiError) {
                console.error('AI API调用失败:', apiError);
                console.error('错误详情:', apiError.stack);

                const { errorMessage, errorType } = this.parseError(apiError);
                popup.showErrorResult(errorMessage, errorType, conversationContainer);
                return;
            }
        },

        /**
         * 解析错误信息
         */
        parseError(error) {
            let errorMessage = '';
            let errorType = 'model'; // 默认为大模型服务错误

            // 检查错误是否发生在知识库查询阶段
            if (error.message.includes('知识库查询') ||
                error.message.includes('知识库服务') ||
                error.message.includes('dataset_name') ||
                error.message.includes('知识库查询失败:') ||
                error.message.includes('知识库服务调用失败:') ||
                error.message.includes('知识库服务网络请求失败:')) {
                // 知识库服务错误
                errorType = 'knowledge';
                errorMessage = this.getKnowledgeBaseErrorMessage(error);
            } else if (error.message.includes('大模型服务调用失败:') ||
                error.message.includes('模型服务调用失败:') ||
                error.message.includes('API调用失败:')) {
                // 大模型服务错误
                errorType = 'model';
                errorMessage = this.getModelErrorMessage(error);
            } else {
                // 其他错误，根据消息内容判断
                if (error.message.includes("知识库")) {
                    errorType = 'knowledge';
                    errorMessage = this.getKnowledgeBaseErrorMessage(error);
                } else {
                    errorType = 'model';
                    errorMessage = this.getModelErrorMessage(error);
                }
            }

            return { errorMessage, errorType };
        },

        /**
         * 获取知识库错误消息
         */
        getKnowledgeBaseErrorMessage(error) {
            if (error.message.includes('网络') || error.message.includes('连接') || error.message.includes('Failed to fetch')) {
                return popup.t('popup.error.kbNetworkFailed', { details: error.message ? `: ${error.message}` : '' });
            } else if (error.message.includes('认证') || error.message.includes('401')) {
                return popup.t('popup.error.kbAuthFailed');
            } else if (error.message.includes('权限') || error.message.includes('403')) {
                return popup.t('popup.error.kbPermissionDenied');
            } else if (error.message.includes('未配置')) {
                return popup.t('popup.error.kbConfigIncomplete');
            } else if (error.message.includes('404')) {
                return popup.t('popup.error.kbNotFound');
            } else if (error.message.includes('500')) {
                return popup.t('popup.error.kbInternal');
            } else {
                // 提取原始错误信息，避免重复
                const originalError = error.message.replace(/知识库服务调用失败:|知识库查询失败:|知识库服务网络请求失败:/g, '').trim();
                return popup.t('popup.error.kbCallFailed', { error: originalError || popup.t('popup.common.unknownError') });
            }
        },

        /**
         * 获取模型错误消息
         */
        getModelErrorMessage(error) {
            if (error.message.includes('网络') || error.message.includes('连接') || error.message.includes('Failed to fetch')) {
                return popup.t('popup.error.modelNetworkFailed', { details: error.message ? `: ${error.message}` : '' });
            } else if (error.message.includes('认证') || error.message.includes('401')) {
                return popup.t('popup.error.modelAuthFailed');
            } else if (error.message.includes('权限') || error.message.includes('403')) {
                return popup.t('popup.error.modelPermissionDenied');
            } else if (error.message.includes('未配置')) {
                return popup.t('popup.error.modelConfigIncomplete');
            } else if (error.message.includes('404')) {
                return popup.t('popup.error.modelNotFound', { details: error.message ? `: ${error.message}` : '' });
            } else if (error.message.includes('400')) {
                return popup.t('popup.error.modelBadRequest', { details: error.message ? `: ${error.message}` : '' });
            } else if (error.message.includes('429')) {
                return popup.t('popup.error.modelRateLimited');
            } else if (error.message.includes('500')) {
                return popup.t('popup.error.modelInternal');
            } else {
                // 提取原始错误信息，避免重复
                const originalError = error.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                return popup.t('popup.error.modelCallFailed', { error: originalError || popup.t('popup.common.unknownError') });
            }
        }
    };
}

