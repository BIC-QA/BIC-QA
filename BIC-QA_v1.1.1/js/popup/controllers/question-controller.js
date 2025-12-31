function bindToPopup(fn, popup) {
    return fn.bind(null, popup);
}

export function createQuestionController(popup) {
    return {
        handleAskQuestion: bindToPopup(handleAskQuestion, popup),
        generateQuestionSuggestions: bindToPopup(generateQuestionSuggestions, popup),
        callAPIForSuggestions: bindToPopup(callAPIForSuggestions, popup),
        shouldCheckLetterLimit: bindToPopup(shouldCheckLetterLimit, popup),
        getLetterLimit: bindToPopup(getLetterLimit, popup),
        getExpertTypeFromKnowledgeBase: bindToPopup(getExpertTypeFromKnowledgeBase, popup),
        parseSuggestions: bindToPopup(parseSuggestions, popup)
    };
}

async function handleAskQuestion(popup) {
    if (popup.isProcessing) {
        console.log('正在处理中，忽略重复请求');
        return;
    }

    popup.isProcessing = true;
    popup.hasBeenStopped = false;
    const shouldSkipCheck = popup._skipLetterLimitCheck;
    popup.startTime = Date.now();

    const questionInput = popup.questionInput;
    const knowledgeBaseSelect = popup.knowledgeBaseSelect;
    if (!questionInput) {
        console.error('questionInput 未初始化');
        popup.isProcessing = false;
        return;
    }
    const question = questionInput.value.trim();
    if (!question) {
        popup.showMessage(popup.t('popup.message.enterQuestion'), 'error');
        popup.isProcessing = false;
        return;
    }

    const selectedKnowledgeBase = knowledgeBaseSelect ? knowledgeBaseSelect.value : '';
    if (selectedKnowledgeBase && popup.shouldCheckLetterLimit() && question.length <= popup.getLetterLimit() && !shouldSkipCheck) {
        const conversationContainer = popup.forceCreateNewConversationContainer();
        popup.updateLayoutState();
        popup.setLoading(true);
        await popup.generateQuestionSuggestions(question, selectedKnowledgeBase, conversationContainer);
        popup.isProcessing = false;
        return;
    } else {
        questionInput.value = '';
        popup.updateCharacterCount();
    }

    popup._skipLetterLimitCheck = false;
    const conversationContainer = popup.forceCreateNewConversationContainer();

    if (popup.providers.length === 0) {
        popup.showErrorResult(popup.t('popup.error.providersNotConfigured'), 'model', conversationContainer);
        popup.isProcessing = false;
        return;
    }

    if (popup.models.length === 0) {
        popup.showErrorResult(popup.t('popup.error.modelNotConfigured'), 'model', conversationContainer);
        popup.isProcessing = false;
        return;
    }

    console.log('开始问答，重新加载知识库服务配置...');
    await popup.loadKnowledgeServiceConfig();

    if (popup.resultContainer) {
        popup.resultContainer.style.display = 'block';
    }

    popup.updateLayoutState();
    popup.setLoading(true);

    try {
        const selectedModelSelect = popup.modelSelect;
        const selectedModelValue = selectedModelSelect ? selectedModelSelect.value : '';
        if (!selectedModelValue) {
            popup.showErrorResult(popup.t('popup.error.selectModel'), 'model', conversationContainer);
            popup.isProcessing = false;
            return;
        }

        let selectedKey;
        try {
            selectedKey = JSON.parse(selectedModelValue);
        } catch (_) {
            selectedKey = { name: selectedModelValue };
        }

        const selectedModel = popup.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
        const provider = selectedModel ? popup.providers.find(p => p.name === selectedModel.provider) : null;

        if (!selectedModel || !provider) {
            popup.showErrorResult(popup.t('popup.error.modelOrProviderMissing'), 'model', conversationContainer);
            popup.isProcessing = false;
            return;
        }

        const useStreamChatByKeyword = question.includes('[stream]') || question.includes('[流式]');
        const nameForCheck = (selectedModel.displayName || selectedModel.name).toLowerCase();
        const useStreamChatByModel = nameForCheck.includes('stream') ||
            nameForCheck.includes('流式') ||
            (selectedModel.streamEnabled === true);
        const useStreamChatByProvider = provider.name === '佰晟智算' ||
            provider.name.toLowerCase().includes('佰晟智算');

        const useStreamChat = useStreamChatByKeyword || useStreamChatByModel || useStreamChatByProvider;

        if (useStreamChat) {
            let cleanQuestion = question;
            if (useStreamChatByKeyword) {
                cleanQuestion = question.replace(/\[stream\]|\[流式\]/g, '').trim();
            }

            const selectedParameterRuleValue = popup.parameterRuleSelect ? popup.parameterRuleSelect.value : '';
            let parameterRule = null;

            if (selectedParameterRuleValue) {
                try {
                    parameterRule = JSON.parse(selectedParameterRuleValue);
                } catch (error) {
                    console.error('解析参数规则失败:', error);
                }
            }

            popup.updateQuestionDisplay(cleanQuestion || question, conversationContainer);
            popup.updateAIDisplay(conversationContainer);

            popup._useKnowledgeBaseThisTime = false;
            popup._kbMatchCount = 0;
            popup._kbItems = [];
            popup._kbImageList = [];

            const knowledgeBaseValue = knowledgeBaseSelect ? knowledgeBaseSelect.value : null;

            if (cleanQuestion) {
                await popup.streamChatWithConfig(cleanQuestion, selectedModel, provider, knowledgeBaseValue, parameterRule, conversationContainer);
            } else {
                await popup.streamChatWithConfig(question, selectedModel, provider, knowledgeBaseValue, parameterRule, conversationContainer);
            }
            return;
        }

        popup._useKnowledgeBaseThisTime = false;
        popup._kbMatchCount = 0;
        popup._kbItems = [];
        popup._kbImageList = [];

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
            await popup.processQuestion(question, '', tab.url || '', conversationContainer);
            return;
        }

        try {
            console.log('尝试与content script通信...');
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageContent',
                question: question
            });

            console.log('Content script响应:', response);

            if (response && response.success) {
                await popup.processQuestion(question, response.pageContent, tab.url, conversationContainer);
            } else {
                console.log('Content script未响应，使用备用方案');
                await popup.processQuestion(question, '', tab.url, conversationContainer);
            }
        } catch (contentScriptError) {
            console.log('Content script通信失败，使用备用方案:', contentScriptError);

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                console.log('Content script重新注入成功');
            } catch (injectionError) {
                console.log('Content script重新注入失败:', injectionError);
            }

            await popup.processQuestion(question, '', tab.url, conversationContainer);
        }
    } catch (error) {
        console.error('处理问题失败:', error);
        popup.showErrorResult(popup.t('popup.error.processingFailed', { error: error.message }), 'model', conversationContainer);
    } finally {
        popup.setLoading(false);
        popup.isProcessing = false;
    }
}

async function generateQuestionSuggestions(popup, shortQuestion, knowledgeBase, conversationContainer) {
    try {
        popup.updateQuestionDisplay(shortQuestion, conversationContainer);
        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = popup.t('popup.suggestion.generating');
        }

        const expertType = popup.getExpertTypeFromKnowledgeBase(knowledgeBase);
        const prompt = `你是一个${expertType}专家，你的任务是补全上述意图生成三条意思相近的用户查询，要求每条生成字数不能少于10字，返回的结果以数组形式放在固定字段。用户输入：${shortQuestion}`;
        const suggestions = await popup.callAPIForSuggestions(prompt, shortQuestion);
        popup.displaySuggestions(suggestions, conversationContainer);
    } catch (error) {
        console.error('生成建议问题失败:', error);
        popup.showErrorResult(popup.t('popup.error.suggestionFailed'), 'error', conversationContainer);
    }
    popup.addToCurrentSessionHistory(shortQuestion, "已生成建议问题");
}

function getExpertTypeFromKnowledgeBase(popup, knowledgeBase) {
    const kbLower = (knowledgeBase || '').toLowerCase();
    if (kbLower.includes('oracle')) {
        return 'Oracle数据库';
    } else if (kbLower.includes('mysql')) {
        return 'MySQL数据库';
    } else if (kbLower.includes('postgresql') || kbLower.includes('postgres')) {
        return 'PostgreSQL数据库';
    } else if (kbLower.includes('sqlserver') || kbLower.includes('sql server')) {
        return 'SQL Server数据库';
    } else if (kbLower.includes('mongodb') || kbLower.includes('mongo')) {
        return 'MongoDB数据库';
    }
    return '数据库';
}

async function callAPIForSuggestions(popup, prompt, originalQuestion = '') {
    console.log('callAPIForSuggestions=======');
    const selectedModelSelect = popup.modelSelect;
    if (!selectedModelSelect || !selectedModelSelect.value) {
        throw new Error(popup.t('popup.error.selectModel'));
    }

    let selectedKey;
    try {
        selectedKey = JSON.parse(selectedModelSelect.value);
    } catch (_) {
        selectedKey = { name: selectedModelSelect.value };
    }

    const selectedModel = popup.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
    const provider = selectedModel ? popup.providers.find(p => p.name === selectedModel.provider) : null;

    if (!selectedModel || !provider) {
        throw new Error(popup.t('popup.error.modelOrProviderMissing'));
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    popup.setAuthHeaders(headers, provider);

    const suggestionSystemPrompt = popup.applyLanguageInstructionToSystemContent(
        "你是一名资深数据库专家，需要根据用户意图补全并生成相似问题。",
        originalQuestion
    );

    const requestBody = {
        model: selectedModel.name,
        messages: [
            {
                role: "system",
                content: suggestionSystemPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 500,
        temperature: 0.7
    };

    let apiEndpoint = provider.apiEndpoint;
    if (apiEndpoint.indexOf("/chat/completions") === -1) {
        apiEndpoint = apiEndpoint + "/chat/completions";
    }

    try {
        const result = await popup.requestUtil.post(apiEndpoint, requestBody, {
            provider: provider
        });
        const content = result.choices[0].message.content;
        return popup.parseSuggestions(content);
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

function shouldCheckLetterLimit(popup) {
    return popup.knowledgeServiceConfig && popup.knowledgeServiceConfig.isOpenLetterLimit === true;
}

function getLetterLimit(popup) {
    return popup.knowledgeServiceConfig && popup.knowledgeServiceConfig.letter_limit ?
        popup.knowledgeServiceConfig.letter_limit : 5;
}

function parseSuggestions(popup, content) {
    try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.queries && Array.isArray(parsedContent.queries)) {
            return parsedContent.queries.slice(0, 3);
        }
    } catch (error) {
        console.log('JSON解析失败，使用原有解析逻辑:', error);
    }

    const suggestions = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') ||
            trimmed.startsWith('1、') || trimmed.startsWith('2、') || trimmed.startsWith('3、'))) {
            const suggestion = trimmed.replace(/^[123][\.、]\s*/, '').trim();
            if (suggestion.length >= 10) {
                suggestions.push(suggestion);
            }
        }
    }

    if (suggestions.length === 0) {
        suggestions.push(
            "请详细说明您遇到的具体问题",
            "请提供更多关于您需求的详细信息",
            "请描述您希望实现的具体功能"
        );
    }
    return suggestions.slice(0, 3);
}


