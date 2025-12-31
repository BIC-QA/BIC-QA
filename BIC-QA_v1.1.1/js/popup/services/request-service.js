export function createRequestService(popup, streamService) {
    async function callAIAPI(question, pageContent, pageUrl, provider, model, knowledgeBaseId = null, parameterRule = null, container = null, originalQuestion = null) {
        console.log('callAIAPI=======');

        popup._useKnowledgeBaseThisTime = false;
        popup._kbMatchCount = 0;

        const isFirstConversation = popup.currentSessionHistory.length === 0;
        let conversationContainer;

        if (container) {
            conversationContainer = container;
            console.log('使用传入的容器:', conversationContainer);
        } else if (isFirstConversation) {
            conversationContainer = popup.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                popup.resultContainer.style.display = 'block';
            }
        } else {
            conversationContainer = popup.createNewConversationContainer();
        }

        console.log("-----question", question);
        console.log("-----originalQuestion", originalQuestion);
        console.log("-----pageContent", pageContent);
        console.log("-----pageUrl", pageUrl);
        console.log("-----provider", provider);
        console.log("-----model", model);

        // 使用原始问题显示，如果没有提供原始问题则使用翻译后的问题
        const displayQuestion = originalQuestion || question;
        popup.updateQuestionDisplay(displayQuestion, conversationContainer);
        popup.updateAIDisplay(conversationContainer);

        const resultText = conversationContainer.querySelector('.result-text');
        if (resultText) {
            let tipsEl = resultText.querySelector('.result-text-tips');
            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }
            tipsEl.textContent = popup.t('popup.progress.processing');
            let contentEl = resultText.querySelector('.result-text-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }
        }

        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = popup.t('popup.progress.generating');
        }

        popup.updateLayoutState();

        var context = `${popup.t('popup.context.pageUrl')}: ${pageUrl}\n${popup.t('popup.context.pageContent')}: ${pageContent.substring(0, 2000)}...`;
        let systemContent = popup.t('popup.system.aiAssistantPrompt');

        console.log('=== 参数规则调试信息 ===');
        console.log('parameterRule:', parameterRule);
        if (parameterRule) {
            console.log('parameterRule.similarity:', parameterRule.similarity);
            console.log('parameterRule.topN:', parameterRule.topN);
            console.log('parameterRule.temperature:', parameterRule.temperature);
        }
        console.log('========================');
        if (parameterRule && parameterRule.prompt) {
            let rulePrompt = parameterRule.prompt;
            rulePrompt = popup.applyLanguageInstructionToSystemContent(rulePrompt, displayQuestion || question);
            systemContent = `${rulePrompt}\n\n${systemContent}`;
        }

        if (knowledgeBaseId) {
            try {
                const knowledgeBase = JSON.parse(knowledgeBaseId);
                if (knowledgeBase.name) {
                    systemContent += `\n\n${popup.t('popup.system.knowledgeBasePrompt', { name: knowledgeBase.name })}`;
                }
            } catch (parseError) {
                const knowledgeBase = window.knowledgeBaseManager?.getKnowledgeBaseById(knowledgeBaseId);
                if (knowledgeBase) {
                    systemContent += `\n\n${popup.t('popup.system.knowledgeBasePrompt', { name: knowledgeBase.name })}`;
                }
            }
            context = `${popup.t('popup.context.baseContent')}:\n\n${context}\n\n${popup.t('popup.context.question')}:${question}`
        } else {
            context = `${question}`;
        }

        console.log('知识库处理后的systemContent:', systemContent);
        systemContent = popup.applyLanguageInstructionToSystemContent(systemContent, displayQuestion || question);

        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];

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
        if (knowledgeBaseId) {
            requestBody.knowledge_base_id = knowledgeBaseId;
        } else {
            requestBody.temperature = 0.7;
        }

        if (provider.apiEndpoint.indexOf("/chat/completions") > -1) {
            provider.apiEndpoint = provider.apiEndpoint
        } else {
            provider.apiEndpoint = provider.apiEndpoint + "/chat/completions"
        }
        try {
            if (requestBody.stream) {
                popup.abortController = new AbortController();
                const fetchOptions = popup.requestUtil.buildFetchOptions(provider.apiEndpoint, {
                    method: 'POST',
                    body: requestBody,
                    provider: provider,
                    signal: popup.abortController.signal
                });
                const response = await fetch(provider.apiEndpoint, fetchOptions);

                if (!response.ok) {
                    let errorText;
                    try {
                        errorText = await response.text();
                        console.error('API错误响应体:', errorText);
                    } catch (e) {
                        errorText = popup.t('popup.error.cannotReadErrorResponse');
                    }

                    let errorMessage;
                    if (response.status === 400) {
                        errorMessage = popup.t('popup.error.modelBadRequest');
                    } else if (response.status === 401) {
                        errorMessage = popup.t('popup.error.modelAuthFailed');
                    } else if (response.status === 403) {
                        errorMessage = popup.t('popup.error.modelPermissionDenied');
                    } else if (response.status === 404) {
                        errorMessage = popup.t('popup.error.modelNotFound');
                    } else if (response.status === 429) {
                        errorMessage = popup.t('popup.error.modelRateLimited');
                    } else if (response.status === 500) {
                        errorMessage = popup.t('popup.error.modelInternal');
                    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
                        errorMessage = popup.t('popup.error.modelUnavailable');
                    } else {
                        errorMessage = popup.t('popup.error.modelRequestFailedStatus', { status: response.status, statusText: response.statusText });
                    }

                    if (errorText && errorText !== popup.t('popup.error.cannotReadErrorResponse')) {
                        errorMessage += '\n\n' + popup.t('popup.error.serverErrorDetails', { details: errorText });
                    }

                    throw new Error(errorMessage);
                }

                // 传递 provider 和 model 给流式处理函数，以便在流式过程中进行实时翻译
                const result = await streamService.handleStreamResponse(response, conversationContainer, displayQuestion || question, provider, model);
                
                // 使用原始问题保存到会话历史（流式处理函数已经处理了翻译后的内容）
                popup.addToCurrentSessionHistory(displayQuestion || question, result);
                return result;
            } else {
                const data = await popup.requestUtil.post(provider.apiEndpoint, requestBody, {
                    provider: provider
                });

                let result = '';
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    result = data.choices[0].message.content;
                } else if (data.response) {
                    result = data.response;
                } else if (data.content) {
                    result = data.content;
                } else {
                    result = JSON.stringify(data);
                }

                // 如果用户选择的语言不是中文，需要将回答翻译回用户选择的语言（非流式响应）
                const targetLanguageName = popup.getLanguageDisplayName(popup.currentLanguage);
                const needsTranslation = popup.currentLanguage && popup.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');
                
                if (needsTranslation && result && result.trim()) {
                    try {
                        console.log('开始翻译回答回用户选择的语言:', targetLanguageName);
                        const translatedAnswer = await popup.requestChatCompletionTranslation(
                            result,
                            provider,
                            model,
                            targetLanguageName
                        );
                        if (translatedAnswer && translatedAnswer.trim()) {
                            result = translatedAnswer.trim();
                            console.log('回答翻译完成');
                        }
                    } catch (translationError) {
                        console.error('翻译回答失败:', translationError);
                        // 翻译失败时继续使用原始结果
                    }
                }

                popup.showResult(result, conversationContainer);
                const resultActions = conversationContainer.querySelector('.result-actions');
                if (resultActions) {
                    resultActions.style.display = 'block';
                    setTimeout(() => {
                        resultActions.style.opacity = '1';
                    }, 100);
                }
                if (popup.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - popup.startTime) / 1000);
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = popup.t('popup.progress.answerCompleted', { seconds: duration });
                    }
                }

                // 使用原始问题保存到会话历史
                popup.addToCurrentSessionHistory(displayQuestion || question, result);

                return result;
            }

        } catch (error) {
            console.error('API调用失败:', error);

            throw error;
        }
    }

    async function callOllamaAPI(question, pageContent, pageUrl, provider, model, knowledgeBaseId = null, parameterRule, container = null, originalQuestion = null) {
        console.log('callOllamaAPI=======');
        popup.startTime = Date.now();
        popup.hasBeenStopped = false;

        const isFirstConversation = popup.currentSessionHistory.length === 0;
        let conversationContainer;

        if (container) {
            conversationContainer = container;
            console.log('使用传入的容器:', conversationContainer);
        } else if (isFirstConversation) {
            conversationContainer = popup.resultContainer.querySelector('#conversation-default');
            if (conversationContainer) {
                popup.resultContainer.style.display = 'block';
            }
        } else {
            conversationContainer = popup.createNewConversationContainer();
        }
        
        // 使用原始问题显示，如果没有提供原始问题则使用翻译后的问题
        const displayQuestion = originalQuestion || question;

        console.log("-----question", question);
        console.log("-----originalQuestion", originalQuestion);
        console.log("-----displayQuestion", displayQuestion);
        console.log("-----pageContent", pageContent);
        console.log("-----pageUrl", pageUrl);
        console.log("-----provider", provider);
        console.log("-----model", model);

        popup.updateQuestionDisplay(displayQuestion, conversationContainer);
        popup.updateAIDisplay(conversationContainer);

        const resultText = conversationContainer.querySelector('.result-text');
        if (resultText) {
            let tipsEl = resultText.querySelector('.result-text-tips');
            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }
            if (!tipsEl.textContent || tipsEl.textContent.trim() === '') {
                tipsEl.textContent = popup.t('popup.progress.processing');
            }
            let contentEl = resultText.querySelector('.result-text-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }
        }

        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = popup.t('popup.progress.generating');
        }

        popup.updateLayoutState();

        var context = '';

        if (pageContent.includes('相似度：') || pageContent.includes('版本：')) {
            context = `${popup.t('popup.context.kbQueryResult')}:\n${pageContent}`;
            console.log(popup.t('popup.log.usingKbQueryResult'));
        } else {
            context = `${popup.t('popup.context.pageUrl')}: ${pageUrl}\n${popup.t('popup.context.pageContent')}: ${pageContent.substring(0, 2000)}...`;
            console.log(popup.t('popup.log.usingPageContent'));
        }

        let systemContent = popup.t('popup.system.aiAssistantPromptGeneral');

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
        // 使用原始问题来应用语言指令（用于判断是否需要翻译）
        systemContent = popup.applyLanguageInstructionToSystemContent(systemContent, displayQuestion || question);

        if (parameterRule && parameterRule.prompt) {
            let rulePrompt = parameterRule.prompt;
            // 使用原始问题来应用语言指令
            rulePrompt = popup.applyLanguageInstructionToSystemContent(rulePrompt, displayQuestion || question);
            systemContent = `${rulePrompt}\n\n${systemContent}`;
        }
        if (knowledgeBaseId) {
            try {
                const knowledgeBase = JSON.parse(knowledgeBaseId);
                if (knowledgeBase.name) {
                    systemContent += `\n\n${popup.t('popup.system.knowledgeBasePrompt', { name: knowledgeBase.name })}`;
                }
            } catch (parseError) {
                const knowledgeBase = window.knowledgeBaseManager?.getKnowledgeBaseById(knowledgeBaseId);
                if (knowledgeBase) {
                    systemContent += `\n\n${popup.t('popup.system.knowledgeBasePrompt', { name: knowledgeBase.name })}`;
                }
            }
            context = `${popup.t('popup.context.baseContent')}:\n\n${context}\n\n${popup.t('popup.context.question')}:${question}`
        } else {
            systemContent = popup.t('popup.system.aiAssistantPrompt');
            context = `${question}`
        }

        console.log('知识库处理后的systemContent:', systemContent);

        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];

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
        if (knowledgeBaseId) {
            requestBody.knowledge_base_id = knowledgeBaseId;
        } else {
            requestBody.temperature = 0.7;
        }

        if (provider.apiEndpoint.indexOf("/chat/completions") > -1) {
            provider.apiEndpoint = provider.apiEndpoint
        } else {
            provider.apiEndpoint = provider.apiEndpoint + "/chat/completions"
        }
        try {
            if (requestBody.stream) {
                popup.abortController = new AbortController();
                const fetchOptions = popup.requestUtil.buildFetchOptions(provider.apiEndpoint, {
                    method: 'POST',
                    body: requestBody,
                    provider: provider,
                    signal: popup.abortController.signal
                });
                const response = await fetch(provider.apiEndpoint, fetchOptions);

                if (!response.ok) {
                    let errorText;
                    try {
                        errorText = await response.text();
                        console.error('API错误响应体:', errorText);
                    } catch (e) {
                        errorText = popup.t('popup.error.cannotReadErrorResponse');
                    }

                    let errorMessage = popup.t('popup.error.apiRequestFailedBase', { status: response.status, statusText: response.statusText });

                    if (response.status === 400) {
                        errorMessage += '\n' + popup.t('popup.error.apiRequestFormatError');
                    } else if (response.status === 401) {
                        errorMessage += '\n' + popup.t('popup.error.apiAuthFailed');
                    } else if (response.status === 403) {
                        errorMessage += '\n' + popup.t('popup.error.apiPermissionDenied');
                    } else if (response.status === 404) {
                        errorMessage += '\n' + popup.t('popup.error.apiEndpointNotFound');
                    } else if (response.status === 429) {
                        errorMessage += '\n' + popup.t('popup.error.apiRateLimited');
                    }

                    if (errorText) {
                        errorMessage += '\n\n' + popup.t('popup.error.serverErrorDetails', { details: errorText });
                    }

                    throw new Error(errorMessage);
                }

                // 传递 provider 和 model 给流式处理函数，以便在流式过程中进行实时翻译
                const result = await streamService.handleStreamResponse(response, conversationContainer, displayQuestion || question, provider, model);
                
                // 使用原始问题保存到会话历史（流式处理函数已经处理了翻译后的内容）
                popup.addToCurrentSessionHistory(displayQuestion || question, result);
                return result;
            } else {
                const data = await popup.requestUtil.post(provider.apiEndpoint, requestBody, {
                    provider: provider
                });

                let result = '';
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    result = data.choices[0].message.content;
                } else if (data.response) {
                    result = data.response;
                } else {
                    result = JSON.stringify(data);
                }

                // 如果用户选择的语言不是中文，需要将回答翻译回用户选择的语言（非流式响应）
                const targetLanguageName = popup.getLanguageDisplayName(popup.currentLanguage);
                const needsTranslation = popup.currentLanguage && popup.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');
                
                if (needsTranslation && result && result.trim()) {
                    try {
                        console.log('开始翻译回答回用户选择的语言:', targetLanguageName);
                        const translatedAnswer = await popup.requestChatCompletionTranslation(
                            result,
                            provider,
                            model,
                            targetLanguageName
                        );
                        if (translatedAnswer && translatedAnswer.trim()) {
                            result = translatedAnswer.trim();
                            console.log('回答翻译完成');
                        }
                    } catch (translationError) {
                        console.error('翻译回答失败:', translationError);
                        // 翻译失败时继续使用原始结果
                    }
                }

                popup.showResult(result, conversationContainer);
                const resultActions = conversationContainer.querySelector('.result-actions');
                if (resultActions) {
                    resultActions.style.display = 'block';
                    setTimeout(() => {
                        resultActions.style.opacity = '1';
                    }, 100);
                }
                if (popup.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - popup.startTime) / 1000);
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = popup.t('popup.progress.answerCompleted', { seconds: duration });
                    }
                }

                // 使用原始问题保存到会话历史
                popup.addToCurrentSessionHistory(displayQuestion || question, result);

                return result;
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('流式回答请求已中止');
                return '';
            }
            console.error('API调用失败:', error);

            let errorMessage = popup.t('popup.error.modelCallFailed');

            if (error.message.includes(popup.t('popup.error.apiRequestFailedBase', { status: '', statusText: '' }).replace('{{status}}', '').replace('{{statusText}}', '')) || error.message.includes('API请求失败:')) {
                const detail = error.message.replace(/API请求失败:?\s*/i, '').trim();
                errorMessage = popup.t('popup.error.modelRequestFailed') + ': ' + detail;
            } else if (error.message.includes('API调用失败:')) {
                const detail = error.message.replace('API调用失败:', '').trim();
                errorMessage = popup.t('popup.error.modelCallFailed') + ': ' + detail;
            } else if (error.message.includes('网络') || error.message.includes('连接')) {
                errorMessage = popup.t('popup.error.modelNetworkFailed');
            } else {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }

    async function streamChatWithConfig(message, model, provider, knowledgeBaseId = null, parameterRule = null, container = null) {
        try {
            console.log(popup.t('popup.log.startStreamChat'));
            await popup.loadKnowledgeServiceConfig();

            let streamUrl = '';
            let apiKey = '';
            let apiKeySource = popup.t('popup.config.notConfigured');

            console.log(popup.t('popup.log.startConfigStreamChat'));
            console.log(popup.t('popup.log.kbServiceConfig'), popup.knowledgeServiceConfig);

            if (popup.knowledgeServiceConfig) {
                console.log(popup.t('popup.log.checkKbServiceConfig'));
                console.log('enabled:', popup.knowledgeServiceConfig.enabled);
                console.log('api_key:', popup.knowledgeServiceConfig.api_key ? popup.t('popup.config.configured') : popup.t('popup.config.notConfigured'));

                const baseUrl = popup.knowledgeServiceConfig.default_url;
                console.log('原始baseUrl:', baseUrl);
                if (baseUrl) {
                    let processedUrl = baseUrl;

                    // 兼容处理：如果baseUrl是基础URL（不包含API路径），自动添加默认路径
                    if (baseUrl && typeof baseUrl === 'string') {
                        // 规范化URL格式（处理不完整的协议）
                        let normalizedUrl = baseUrl.trim();
                        console.log('规范化前的URL:', normalizedUrl);
                        if (normalizedUrl.startsWith('http:') && !normalizedUrl.startsWith('http://')) {
                            normalizedUrl = normalizedUrl.replace('http:', 'http://');
                        } else if (normalizedUrl.startsWith('https:') && !normalizedUrl.startsWith('https://')) {
                            normalizedUrl = normalizedUrl.replace('https:', 'https://');
                        } else if (!normalizedUrl.includes('://')) {
                            // 如果没有协议，添加默认的http协议
                            normalizedUrl = 'http://' + normalizedUrl;
                        }
                        console.log('规范化后的URL:', normalizedUrl);

                        try {
                            const urlObj = new URL(normalizedUrl);
                            console.log('URL对象pathname:', urlObj.pathname);
                            console.log('pathname检查:', !urlObj.pathname, urlObj.pathname === '/', urlObj.pathname.trim() === '');
                            // 如果pathname是/或空，说明是基础URL，需要添加默认路径
                            if (!urlObj.pathname || urlObj.pathname === '/' || urlObj.pathname.trim() === '') {
                                processedUrl = normalizedUrl.replace(/\/+$/, '') + '/api/chat/message';
                                console.log('运行时自动添加默认API路径:', baseUrl, '->', processedUrl);
                            } else {
                                processedUrl = normalizedUrl;
                                console.log('URL已经有路径，保持不变:', processedUrl);
                            }
                        } catch (e) {
                            // 如果URL解析失败，尝试简单处理
                            console.warn('运行时URL解析失败，尝试简单处理:', e);
                            if (!normalizedUrl.includes('/api/chat/message') && !normalizedUrl.includes('/knowledge')) {
                                const trimmedUrl = normalizedUrl.replace(/\/+$/, '');
                                processedUrl = trimmedUrl + '/api/chat/message';
                                console.log('运行时自动添加默认API路径（异常处理）:', baseUrl, '->', processedUrl);
                            } else {
                                processedUrl = normalizedUrl;
                                console.log('URL包含API路径，保持不变:', processedUrl);
                            }
                        }
                    }

                    console.log('processedUrl:', processedUrl);

                    // 如果URL包含/knowledge，替换为/chat/message
                    if (processedUrl.includes('/knowledge')) {
                        streamUrl = processedUrl.replace('/knowledge', '/chat/message');
                    } else {
                        streamUrl = processedUrl;
                    }
                    console.log('使用配置的完整URL:', streamUrl);
                }

                if (popup.knowledgeServiceConfig.api_key && popup.knowledgeServiceConfig.api_key.trim()) {
                    apiKey = popup.knowledgeServiceConfig.api_key.trim();
                    apiKeySource = popup.t('popup.config.kbServiceConfig');
                    console.log(popup.t('popup.log.usingKbServiceApiKey'));
                } else {
                    console.log(popup.t('popup.log.kbServiceApiKeyEmpty'));
                }
            } else {
                console.log(popup.t('popup.log.kbServiceConfigNotExists'));
            }

            if (!apiKey && model && model.apiKey) {
                apiKey = model.apiKey;
                apiKeySource = popup.t('popup.config.modelConfig');
                console.log(popup.t('popup.log.usingModelApiKey'));
            }

            if (!streamUrl && model && model.streamUrl) {
                streamUrl = model.streamUrl;
                console.log(popup.t('popup.log.usingModelStreamUrl'), streamUrl);
            }

            if (!apiKey && provider && provider.apiKey) {
                apiKey = provider.apiKey;
                apiKeySource = popup.t('popup.config.providerConfig');
                console.log(popup.t('popup.log.usingProviderApiKey'));
            }

            if (!streamUrl && provider && provider.streamUrl) {
                streamUrl = provider.streamUrl;
                console.log(popup.t('popup.log.usingProviderStreamUrl'), streamUrl);
            }

            if (!streamUrl) {
                popup.showMessage(popup.t('popup.message.configureStreamUrl'), 'error');
                throw new Error(popup.t('popup.message.configureStreamUrl'));
            }

            console.log(popup.t('popup.log.streamChatConfigSummary'));
            console.log('streamUrl:', streamUrl);
            console.log(popup.t('popup.log.apiKeySource'), apiKeySource);
            console.log('apiKey:', apiKey ? `${apiKey.substring(0, 10)}...` : popup.t('popup.config.notConfigured'));
            console.log('model:', model ? model.name : popup.t('popup.config.notConfigured'));
            console.log('provider:', provider ? provider.name : popup.t('popup.config.notConfigured'));
            console.log('message:', message);
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('parameterRule:', parameterRule);
            console.log(popup.t('popup.log.kbServiceConfig'), popup.knowledgeServiceConfig);
            console.log('========================');

            return await streamChat(message, streamUrl, apiKey, knowledgeBaseId, parameterRule, model, provider, container);

        } catch (error) {
            console.error(popup.t('popup.log.streamChatConfigFailed'), error);
            throw new Error(popup.t('popup.error.streamConfigFailed', { error: error.message }));
        }
    }

    async function streamChat(message, streamUrl = null, apiKey = null, knowledgeBaseId = null, parameterRule = null, model = null, provider = null, container = null, originalQuestion = null) {
        popup.startTime = Date.now();
        popup.hasBeenStopped = false;
        popup._useKnowledgeBaseThisTime = false;

        if (!streamUrl) {
            popup.showMessage(popup.t('popup.message.configureStreamUrl'), 'error');
            throw new Error(popup.t('popup.message.configureStreamUrl'));
        }

        try {
            const displayQuestion = originalQuestion || message;

            console.log(popup.t('popup.log.startKbQuery'), message);
            console.log(popup.t('popup.log.usingConfigStreamUrl'), streamUrl);
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('parameterRule:', parameterRule);
            console.log('model:', model);
            console.log('provider:', provider);
            console.log('displayQuestion:', displayQuestion);

            let userEmail = null;
            let userName = null;
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                if (registration && registration.status === 'registered') {
                    userEmail = registration.email;
                    userName = registration.username;
                    console.log(popup.t('popup.log.registrationInfoRetrieved'), { email: userEmail, name: userName });
                } else {
                    console.log(popup.t('popup.log.noValidRegistrationInfo'));
                }
            } catch (error) {
                console.error(popup.t('popup.log.registrationInfoFailed'), error);
            }

            const requestBody = {
                question: message,
                similarity: 0.8,
                topn: 4,
                dataset_name: null,
                temperature: 0.7,
                language: popup.getLanguageDisplayName(popup.currentLanguage),
                isSupportImg: "true"
            };

            if (knowledgeBaseId) {
                try {
                    const knowledgeBase = JSON.parse(knowledgeBaseId);
                    if (knowledgeBase.id) {
                        requestBody.dataset_name = knowledgeBase.id;
                        console.log(popup.t('popup.log.usingKbIdAsDataset'), knowledgeBase.id);
                    } else {
                        requestBody.dataset_name = knowledgeBase.dataset_name;
                        console.log(popup.t('popup.log.usingKbDatasetNameAsFallback'), knowledgeBase.dataset_name);
                    }
                } catch (parseError) {
                    requestBody.dataset_name = knowledgeBaseId;
                    console.log(popup.t('popup.log.usingOriginalKbIdAsDataset'), knowledgeBaseId);
                }
            }

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
                console.log(popup.t('popup.log.usingParameterRule'), parameterRule);
            }

            console.log(popup.t('popup.log.finalRequestBody'), requestBody);

            // 直接使用fetch进行请求，不依赖requestUtil的baseURL机制
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            console.log('发送知识库查询请求到:', streamUrl);
            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = '无法读取错误响应';
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log(popup.t('popup.log.kbQueryResponse'), responseData);

            if (responseData.status !== "200") {
                throw new Error(popup.t('popup.error.kbQueryFailedDetail', { detail: responseData.message || popup.t('popup.common.unknownError') }));
            }

            let contextContent = '';
            let matchCount = 0;
            let knowledgeItems = [];
            let imageList = [];

            // 根据请求参数判断响应格式
            // 如果请求包含isSupportImg="true"，则使用新格式（data.dataList和data.imageList）
            // 否则使用旧格式（data直接是数组）
            if (requestBody.isSupportImg === "true") {
                // 新版本格式：data包含dataList和imageList
                console.log('使用新版本响应格式解析');

                // 提取 imageList
                if (responseData.data && responseData.data.imageList && Array.isArray(responseData.data.imageList)) {
                    imageList = responseData.data.imageList;
                    console.log('提取到图片列表:', imageList);
                }

                // 从 data.dataList 获取知识库数据
                if (responseData.data && responseData.data.dataList && Array.isArray(responseData.data.dataList)) {
                    knowledgeItems = responseData.data.dataList.map(item => (typeof item === 'string' ? item : String(item)));
                } else {
                    console.warn(popup.t('popup.log.noDataListInResponse'));
                    knowledgeItems = [];
                }
            } else {
                // 旧版本格式：data直接是数组
                console.log('使用旧版本响应格式解析');

                if (responseData.data && Array.isArray(responseData.data)) {
                    knowledgeItems = responseData.data.map(item => (typeof item === 'string' ? item : String(item)));
                } else {
                    console.warn(popup.t('popup.log.noDataArrayInResponse'));
                    knowledgeItems = [];
                }
                imageList = []; // 旧版本没有图片列表
            }

            // 处理知识库数据（翻译等）
            if (knowledgeItems.length > 0) {
                const targetLanguageName = popup.getLanguageDisplayName(popup.currentLanguage);
                const needContextTranslation = popup.currentLanguage && popup.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');

                if (needContextTranslation) {
                    try {
                        knowledgeItems = await popup.translateKnowledgeItems(knowledgeItems, targetLanguageName, provider, model);
                    } catch (error) {
                        console.error(popup.t('popup.log.kbContentTranslationFailed'), error);
                    }
                }

                contextContent = knowledgeItems.join('\n\n');
                matchCount = knowledgeItems.length;
                popup._kbItems = knowledgeItems;
                popup._kbImageList = imageList; // 保存图片列表
                console.log(popup.t('popup.log.extractedKbContent'), contextContent);
            } else {
                popup._kbItems = [];
                popup._kbImageList = [];
            }

            popup._useKnowledgeBaseThisTime = !!knowledgeBaseId;
            popup._kbMatchCount = matchCount;

            console.log(popup.t('popup.log.streamChatKbStatus'));
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('_useKnowledgeBaseThisTime:', popup._useKnowledgeBaseThisTime);
            console.log('_kbMatchCount:', popup._kbMatchCount);
            console.log('_kbItems:', popup._kbItems);
            console.log('_kbItems.length:', popup._kbItems ? popup._kbItems.length : 'null');

            if (knowledgeBaseId) {
                const targetContainer = container || popup.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;
                const tipsEl = resultText?.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = popup.t('popup.progress.kbSearching', { count: matchCount });
                }
            }

            if (knowledgeBaseId && matchCount === 0) {
                const targetContainer = container || popup.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;
                const tipsEl = resultText?.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = popup.t('popup.progress.kbNoMatch', { count: matchCount });
                }
                const knowlistEl = resultText?.querySelector('.result-text-knowlist');
                if (knowlistEl) {
                    knowlistEl.innerHTML = '';
                }
                if (popup.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - popup.startTime) / 1000);
                    const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = popup.t('popup.progress.answerCompleted', { seconds: duration });
                    }
                }
                return '';
            }

            if (!contextContent.trim()) {
                console.log(popup.t('popup.log.noKbContent'));
                contextContent = pageContent || popup.t('popup.error.cannotGetPageContent');
            }

            console.log(popup.t('popup.log.startCallOllamaApi'));
            try {
                let finalAnswer = await callOllamaAPI(
                    displayQuestion,
                    contextContent,
                    window.location.href,
                    provider,
                    model,
                    knowledgeBaseId,
                    parameterRule,
                    container
                );

                const targetLanguageName = popup.getLanguageDisplayName(popup.currentLanguage);
                const needsTranslation = popup.currentLanguage && popup.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');

                if (needsTranslation) {
                    try {
                        const translatedAnswer = await popup.requestChatCompletionTranslation(
                            finalAnswer,
                            provider,
                            model,
                            targetLanguageName
                        );
                        if (translatedAnswer && translatedAnswer.trim()) {
                            finalAnswer = translatedAnswer.trim();
                        }
                    } catch (translationError) {
                        console.error(popup.t('popup.log.answerTranslationFailed'), translationError);
                    }
                }

                return finalAnswer;
            } catch (modelError) {
                console.error(popup.t('popup.log.modelServiceCallFailed'), modelError);
                throw new Error(popup.t('popup.error.modelServiceFailed', { error: modelError.message }));
            }

        } catch (error) {
            console.error(popup.t('popup.log.kbQueryFailed'), error);
            console.error(popup.t('popup.log.errorDetails'), error.stack);

            if (error.message.includes('大模型服务调用失败:') ||
                error.message.includes('模型服务调用失败:') ||
                error.message.includes('API调用失败:')) {
                throw error;
            }

            let errorMessage = popup.t('popup.error.kbQueryFailedBase');

            if (error.message.includes('请求失败:')) {
                const detail = error.message.replace('请求失败:', '').trim();
                errorMessage = popup.t('popup.error.kbNetworkRequestFailed', { detail });
            } else if (error.message.includes('知识库查询失败:')) {
                const detail = error.message.replace('知识库查询失败:', '').trim();
                errorMessage = popup.t('popup.error.kbQueryFailedDetail', { detail });
            } else if (error.message.includes('未配置')) {
                errorMessage = popup.t('popup.error.kbConfigIssue', { message: error.message });
            } else if (error.message.includes('网络') || error.message.includes('连接')) {
                errorMessage = popup.t('popup.error.kbNetworkConnectionFailed');
            } else {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }

    return {
        callAIAPI,
        callOllamaAPI,
        streamChatWithConfig,
        streamChat
    };
}

