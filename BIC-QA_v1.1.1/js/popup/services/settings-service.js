function bindToPopup(fn, popup) {
    return fn.bind(null, popup);
}

export function createSettingsService(popup) {
    return {
        initLanguagePreference: bindToPopup(initLanguagePreference, popup),
        getStoredLanguagePreference: bindToPopup(getStoredLanguagePreference, popup),
        handleLanguageChange: bindToPopup(handleLanguageChange, popup),
        resetLanguageSwitcherSelection: bindToPopup(resetLanguageSwitcherSelection, popup),
        updateLanguageSwitcherDisplay: bindToPopup(updateLanguageSwitcherDisplay, popup),
        getLanguageDisplayName: bindToPopup(getLanguageDisplayName, popup),
        applyLanguageInstructionToSystemContent: bindToPopup(applyLanguageInstructionToSystemContent, popup),
        shouldAddInstructionForQuestion: bindToPopup(shouldAddInstructionForQuestion, popup),
        isLikelyChinese: bindToPopup(isLikelyChinese, popup),
        ensureChineseQuestion: bindToPopup(ensureChineseQuestion, popup),
        translateQuestionToChinese: bindToPopup(translateQuestionToChinese, popup),
        translateKnowledgeItems: bindToPopup(translateKnowledgeItems, popup),
        getChatCompletionsEndpoint: bindToPopup(getChatCompletionsEndpoint, popup),
        requestChatCompletionTranslation: bindToPopup(requestChatCompletionTranslation, popup),
        setupDateTimeFilters: bindToPopup(setupDateTimeFilters, popup),
        createDateTimePickerElements: bindToPopup(createDateTimePickerElements, popup),
        openDateTimePicker: bindToPopup(openDateTimePicker, popup),
        closeDateTimePicker: bindToPopup(closeDateTimePicker, popup),
        renderDateTimePicker: bindToPopup(renderDateTimePicker, popup),
        renderDateTimePickerHeader: bindToPopup(renderDateTimePickerHeader, popup),
        renderDateTimePickerWeekdays: bindToPopup(renderDateTimePickerWeekdays, popup),
        renderDateTimePickerDays: bindToPopup(renderDateTimePickerDays, popup),
        updateDateTimePickerButtonsText: bindToPopup(updateDateTimePickerButtonsText, popup),
        changeDateTimePickerMonth: bindToPopup(changeDateTimePickerMonth, popup),
        selectDateTimePickerDate: bindToPopup(selectDateTimePickerDate, popup),
        confirmDateTimePickerSelection: bindToPopup(confirmDateTimePickerSelection, popup),
        cancelDateTimePickerSelection: bindToPopup(cancelDateTimePickerSelection, popup),
        handleDateTimePickerOutsideClick: bindToPopup(handleDateTimePickerOutsideClick, popup),
        handleDateTimePickerKeydown: bindToPopup(handleDateTimePickerKeydown, popup),
        updateDateTimePickerLocale: bindToPopup(updateDateTimePickerLocale, popup),
        cleanupDateTimeFilters: bindToPopup(cleanupDateTimeFilters, popup),
        addUserInteractionListeners: bindToPopup(addUserInteractionListeners, popup),
        detectBrowserCompatibility: bindToPopup(detectBrowserCompatibility, popup),
        checkConfigurationStatus: bindToPopup(checkConfigurationStatus, popup),
        clearConfigurationNotice: bindToPopup(clearConfigurationNotice, popup),
        showConfigurationNotice: bindToPopup(showConfigurationNotice, popup)
    };
}

async function initLanguagePreference(popup) {
    try {
        const preference = await getStoredLanguagePreference(popup);
        popup.hasStoredLanguagePreference = preference.stored === true;
        const language = preference.uiLanguage || popup.i18n.defaultLanguage;
        
        console.log('初始化语言偏好:', {
            stored: preference.stored,
            languageFromStorage: preference.uiLanguage,
            languageToUse: language,
            i18nCurrentLanguage: popup.i18n?.currentLanguage,
            popupCurrentLanguage: popup.currentLanguage
        });
        
        // 规范化并设置语言
        const normalized = await popup.i18n.setLanguage(language);
        
        // 确保 popup.currentLanguage 和 i18n.currentLanguage 同步
        popup.currentLanguage = normalized;
        
        // 验证同步状态
        if (popup.i18n?.currentLanguage !== normalized) {
            console.warn('语言同步不一致，强制同步:', {
                popupCurrentLanguage: popup.currentLanguage,
                i18nCurrentLanguage: popup.i18n?.currentLanguage,
                normalized
            });
            // 强制同步
            if (popup.i18n) {
                popup.i18n.currentLanguage = normalized;
            }
        }
        
        await popup.applyLanguage(normalized, { persist: false, updateSwitcher: popup.hasStoredLanguagePreference });
        
        // 最终验证
        console.log('语言初始化完成:', {
            popupCurrentLanguage: popup.currentLanguage,
            i18nCurrentLanguage: popup.i18n?.currentLanguage,
            hasStoredLanguagePreference: popup.hasStoredLanguagePreference
        });
    } catch (error) {
        console.error('加载语言设置失败:', error);
        const fallback = await popup.i18n.setLanguage(popup.i18n.fallbackLanguage);
        popup.currentLanguage = fallback;
        popup.hasStoredLanguagePreference = false;
        
        // 确保同步
        if (popup.i18n) {
            popup.i18n.currentLanguage = fallback;
        }
        
        await popup.applyLanguage(fallback, { persist: false, updateSwitcher: false });
    }
}

function getStoredLanguagePreference(popup) {
    const defaultLanguage = popup.i18n?.defaultLanguage || 'zhcn';
    return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.sync?.get) {
            resolve({ uiLanguage: defaultLanguage, stored: false });
            return;
        }
        try {
            chrome.storage.sync.get(['uiLanguage', 'uiLanguageSet'], (items) => {
                if (chrome.runtime?.lastError) {
                    console.error('读取语言偏好失败:', chrome.runtime.lastError);
                    resolve({ uiLanguage: defaultLanguage, stored: false });
                    return;
                }
                
                // 检查是否有显式设置的语言
                const hasExplicitLanguage = Object.prototype.hasOwnProperty.call(items, 'uiLanguage') && typeof items.uiLanguage === 'string' && items.uiLanguage;
                const stored = items.uiLanguageSet === true || hasExplicitLanguage;
                
                let languageToUse = defaultLanguage;
                if (stored && items.uiLanguage) {
                    // 规范化语言代码，确保格式一致
                    try {
                        // 先尝试规范化，如果失败则使用默认值
                        const normalized = popup.i18n?.normalizeLanguage(items.uiLanguage);
                        if (normalized && popup.i18n?.supportedLanguages?.has(normalized)) {
                            languageToUse = normalized;
                        } else {
                            console.warn(`存储的语言代码 "${items.uiLanguage}" 无法规范化或不受支持，使用默认语言`);
                            languageToUse = defaultLanguage;
                            // 如果规范化失败，清除无效的存储值
                            stored = false;
                        }
                    } catch (error) {
                        console.error('规范化语言代码失败:', error);
                        languageToUse = defaultLanguage;
                        stored = false;
                    }
                }
                
                console.log('读取语言偏好:', {
                    stored,
                    rawValue: items.uiLanguage,
                    normalizedValue: languageToUse,
                    uiLanguageSet: items.uiLanguageSet,
                    hasExplicitLanguage
                });
                
                resolve({
                    uiLanguage: languageToUse,
                    stored
                });
            });
        } catch (error) {
            console.error('读取语言偏好异常:', error);
            resolve({ uiLanguage: defaultLanguage, stored: false });
        }
    });
}

async function handleLanguageChange(popup, event) {
    const selectedLanguage = event?.target?.value || popup.i18n.defaultLanguage;
    popup.hasStoredLanguagePreference = true;
    
    console.log('用户切换语言:', {
        selectedLanguage,
        currentPopupLanguage: popup.currentLanguage,
        currentI18nLanguage: popup.i18n?.currentLanguage
    });
    
    await popup.applyLanguage(selectedLanguage);
    
    // 确保同步
    if (popup.i18n && popup.currentLanguage) {
        popup.i18n.currentLanguage = popup.currentLanguage;
    }
    
    console.log('语言切换完成:', {
        newPopupLanguage: popup.currentLanguage,
        newI18nLanguage: popup.i18n?.currentLanguage
    });
    
    popup.loadParameterRuleOptions();
}

function resetLanguageSwitcherSelection(popup) {
    updateLanguageSwitcherDisplay(popup, popup.currentLanguage || '');
}

function updateLanguageSwitcherDisplay(popup, language) {
    if (!popup.languageSwitcher) return;

    if (language) {
        popup.languageSwitcher.dataset.selectedLanguage = language;
    } else {
        delete popup.languageSwitcher.dataset.selectedLanguage;
    }

    popup.languageSwitcher.value = '';
    popup.languageSwitcher.selectedIndex = 0;

    const placeholderOption = popup.languageSwitcher.querySelector('option[value=\"\"]');
    if (placeholderOption) {
        placeholderOption.selected = true;
    }
}

function getLanguageDisplayName(popup, languageCode) {
    const displayNameMap = {
        'zhcn': '中文',
        'zh-CN': '中文',
        'en': 'English',
        'en-US': 'English',
        'zh-tw': '中文(繁體)',
        'zh-TW': '中文(繁體)',
        'jap': '日本語',
        'ja-JP': '日本語'
    };
    return displayNameMap[languageCode] || languageCode;
}

function applyLanguageInstructionToSystemContent(popup, content, originalQuestion = '') {
    if (!content) return content;

    const needsByLocale = popup.currentLanguage && popup.currentLanguage !== 'zhcn';
    const needsByQuestion = shouldAddInstructionForQuestion(popup, originalQuestion);

    if (needsByLocale || needsByQuestion) {
        const targetLanguageName = getLanguageDisplayName(popup, popup.currentLanguage);
        const instruction = `如果用户的问题不是中文，请先将其翻译成中文仅用于检索和理解，但务必继续使用用户原始语言进行思考与推理，最终将思考和回答等一切文字请翻译成${targetLanguageName}输出。`;

        if (content.includes(instruction)) {
            return content;
        }

        return `${instruction}\n\n${content}`;
    }

    return content;
}

function shouldAddInstructionForQuestion(popup, question) {
    if (!question || typeof question !== 'string') return false;
    const normalized = question.replace(/\s+/g, '');
    if (!normalized) return false;
    return !isLikelyChinese(popup, normalized);
}

function isLikelyChinese(_, text) {
    if (!text) return false;
    const chineseCharRegex = /[\u4e00-\u9fff]/;
    const japaneseRegex = /[\u3040-\u30ff]/;

    const hasChinese = chineseCharRegex.test(text);
    if (hasChinese) {
        return true;
    }

    if (japaneseRegex.test(text)) {
        return false;
    }

    return false;
}

async function ensureChineseQuestion(popup, question, provider, model) {
    if (!shouldAddInstructionForQuestion(popup, question)) {
        return question;
    }

    if (!provider || !model) {
        return question;
    }

    try {
        const translated = await translateQuestionToChinese(popup, question, provider, model);
        if (translated && isLikelyChinese(popup, translated)) {
            console.log('翻译后的提问:', translated);
            return translated.trim();
        }
    } catch (error) {
        console.error('翻译问题为中文失败:', error);
    }

    return question;
}

async function translateQuestionToChinese(popup, question, provider, model) {
    return await requestChatCompletionTranslation(popup, question, provider, model, '简体中文');
}

async function translateKnowledgeItems(popup, items = [], targetLanguageName, provider, model) {
    if (!Array.isArray(items) || items.length === 0) {
        return items;
    }

    if (!targetLanguageName || targetLanguageName.includes('中文')) {
        return items;
    }

    // 过滤出有效的字符串条目
    const validItems = items.filter(item => item && typeof item === 'string');
    if (validItems.length === 0) {
        return items;
    }

    console.log(`开始批量翻译知识库内容，共 ${validItems.length} 条`);

    // 方案1：尝试一次性批量翻译所有内容
    try {
        // 使用特殊分隔符合并所有内容，便于后续分割
        // 使用一个不太可能在内容中出现的分隔符
        const separator = '\n\n---ITEM_SEPARATOR_BIC_QA---\n\n';
        const combinedText = validItems.join(separator);
        
        console.log(`合并后的内容长度: ${combinedText.length} 字符，共 ${validItems.length} 条`);
        
        // 一次性翻译所有内容（使用批量翻译函数）
        const translatedCombined = await requestChatCompletionBatchTranslation(
            popup, 
            combinedText, 
            separator,
            validItems.length,
            provider, 
            model, 
            targetLanguageName
        );
        
        if (translatedCombined && translatedCombined.trim()) {
            // 尝试按照分隔符分割翻译后的内容
            const translatedParts = translatedCombined.split(separator);
            
            // 检查分割后的数量是否匹配
            if (translatedParts.length === validItems.length) {
                console.log('批量翻译成功，所有条目已翻译');
                // 创建结果数组，保持原始数组的结构（包括非字符串项）
                const result = [];
                let validIndex = 0;
                
                for (const originalItem of items) {
                    if (originalItem && typeof originalItem === 'string') {
                        result.push(translatedParts[validIndex].trim());
                        validIndex++;
                    } else {
                        result.push(originalItem);
                    }
                }
                
                return result;
            } else {
                console.warn(`批量翻译后分割数量不匹配: 期望 ${validItems.length}，实际 ${translatedParts.length}，回退到逐条翻译`);
                // 如果分割不匹配，回退到逐条翻译
                throw new Error('批量翻译后分割数量不匹配');
            }
        } else {
            throw new Error('批量翻译结果为空');
        }
    } catch (batchError) {
        console.warn('批量翻译失败，回退到逐条翻译:', batchError.message);
        
        // 方案2：批量翻译失败，回退到逐条翻译（带重试）
    const translatedItems = [];
        const maxRetries = 2;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
        if (!item || typeof item !== 'string') {
            translatedItems.push(item);
            continue;
        }

            let translated = null;
            
            // 重试机制
            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    if (retry > 0) {
                        console.log(`翻译知识库条目重试 ${retry}/${maxRetries}:`, item.substring(0, 50) + '...');
                        // 重试前等待一小段时间
                        await new Promise(resolve => setTimeout(resolve, 500 * retry));
                    }
                    
                    translated = await requestChatCompletionTranslation(popup, item, provider, model, targetLanguageName);
                    
                    if (translated && translated.trim()) {
                        translatedItems.push(translated.trim());
                        break; // 成功，跳出重试循环
                    } else {
                        throw new Error('翻译结果为空');
                    }
        } catch (error) {
                    console.error(`翻译知识库条目失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, error.message);
                    
                    // 如果是最后一次重试，使用原始内容
                    if (retry === maxRetries) {
                        console.warn(`翻译失败，使用原始内容 (条目 ${i + 1}/${items.length}):`, item.substring(0, 50) + '...');
            translatedItems.push(item);
        }
                }
            }
        }

        // 检查翻译成功率
        const successCount = translatedItems.filter((item, index) => {
            const original = items[index];
            return item !== original;
        }).length;
        
        if (successCount < items.length) {
            console.warn(`知识库翻译完成: ${successCount}/${items.length} 条成功翻译`);
    }

    return translatedItems;
    }
}

function getChatCompletionsEndpoint(_, provider) {
    if (!provider || !provider.apiEndpoint) return '';
    let endpoint = provider.apiEndpoint.trim();
    if (!endpoint) return endpoint;
    if (endpoint.toLowerCase().includes('/chat/completions')) {
        return endpoint;
    }
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    return `${endpoint}/chat/completions`;
}

// 批量翻译函数，用于一次性翻译多条内容
async function requestChatCompletionBatchTranslation(popup, text, separator, itemCount, provider, model, targetLanguageName = '简体中文') {
    const endpoint = getChatCompletionsEndpoint(popup, provider);
    if (!endpoint) {
        throw new Error('未找到可用的翻译端点');
    }

    // 根据内容长度动态调整max_tokens，至少是原文本长度的1.5倍
    const estimatedTokens = Math.ceil(text.length / 3); // 粗略估算token数（中文约1.5字符/token，英文约4字符/token）
    const maxTokens = Math.max(estimatedTokens * 2, 2000); // 至少2000，最多不超过模型限制

    const requestBody = {
        model: model?.name || model,
        messages: [
            {
                role: "system",
                content: `你是一名专业的翻译助手。用户将提供 ${itemCount} 段文本，每段文本之间用分隔符 "${separator}" 分隔。

请将每段文本翻译成${targetLanguageName}，并保持分隔符不变。仅输出翻译后的内容，不要添加任何额外说明。

重要：必须保留所有分隔符 "${separator}"，确保翻译后的文本仍然包含 ${itemCount - 1} 个分隔符，这样可以将翻译后的内容正确分割回 ${itemCount} 段。`
            },
            {
                role: "user",
                content: String(text ?? '')
            }
        ],
        temperature: 0,
        stream: false,
        max_tokens: Math.min(maxTokens, 16000) // 大多数模型的最大限制
    };

    try {
        const data = await popup.requestUtil.post(endpoint, requestBody, {
            provider: provider
        });
        
        // 检查响应数据是否有效
        if (!data) {
            throw new Error('翻译API返回空响应');
        }
        
        let translated = '';
        
        // 优先从 choices[0].message.content 获取
        if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                translated = choice.message.content;
            } else if (choice.delta && choice.delta.content) {
                translated = choice.delta.content;
            }
        }
        
        // 如果没有从choices获取到，尝试从response字段获取
        if (!translated && data.response) {
            translated = data.response;
        }
        
        // 如果还是没有，尝试从content字段获取
        if (!translated && data.content) {
            translated = data.content;
        }

        translated = typeof translated === 'string' ? translated.trim() : '';
        
        // 如果翻译结果为空，检查是否有错误信息
        if (!translated) {
            // 检查是否有错误信息
            if (data.error) {
                throw new Error(`翻译API返回错误: ${data.error.message || JSON.stringify(data.error)}`);
            }
            // 检查是否有think标签（某些模型会在think标签中返回内容）
            const thinkMatch = data.choices?.[0]?.message?.content?.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch && thinkMatch[1]) {
                translated = thinkMatch[1].trim();
            }
            
            // 如果还是没有内容，抛出错误
            if (!translated) {
                throw new Error('翻译结果为空：API返回200但未包含有效内容');
            }
        }
        
        // 清理think标签和其他不需要的内容
        // 先移除think标签及其内容
        translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        translated = translated.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '').trim();
        translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // 移除可能的HTML实体编码的think标签
        translated = translated.replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/gi, '').trim();
        
        // 移除多余的换行和空白
        translated = translated.replace(/\n{3,}/g, '\n\n').trim();
        
        // 再次检查清理后是否为空
        if (!translated) {
            throw new Error('翻译结果为空：清理后内容为空');
        }
        
        return translated;
    } catch (error) {
        // 如果是网络错误或其他错误，直接抛出
        if (error.message && (error.message.includes('网络') || error.message.includes('连接') || error.message.includes('Failed'))) {
            throw error;
        }
        // 如果是翻译结果为空，也抛出错误
        throw new Error(`批量翻译失败: ${error.message || '未知错误'}`);
    }
}

async function requestChatCompletionTranslation(popup, text, provider, model, targetLanguageName = '简体中文') {
    const endpoint = getChatCompletionsEndpoint(popup, provider);
    if (!endpoint) {
        throw new Error('未找到可用的翻译端点');
    }

    const requestBody = {
        model: model?.name || model,
        messages: [
            {
                role: "system",
                content: `你是一名专业的翻译助手。请将用户提供的文本翻译成${targetLanguageName}，仅输出翻译后的内容，不要添加任何额外说明。`
            },
            {
                role: "user",
                content: String(text ?? '')
            }
        ],
        temperature: 0,
        stream: false,
        max_tokens: 800
    };

    try {
    const data = await popup.requestUtil.post(endpoint, requestBody, {
        provider: provider
    });
        
        // 检查响应数据是否有效
        if (!data) {
            throw new Error('翻译API返回空响应');
        }
        
    let translated = '';
        
        // 优先从 choices[0].message.content 获取
        if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                translated = choice.message.content;
            } else if (choice.delta && choice.delta.content) {
                translated = choice.delta.content;
            }
        }
        
        // 如果没有从choices获取到，尝试从response字段获取
        if (!translated && data.response) {
        translated = data.response;
    }
        
        // 如果还是没有，尝试从content字段获取
        if (!translated && data.content) {
            translated = data.content;
        }

    translated = typeof translated === 'string' ? translated.trim() : '';
        
        // 如果翻译结果为空，检查是否有错误信息
        if (!translated) {
            // 检查是否有错误信息
            if (data.error) {
                throw new Error(`翻译API返回错误: ${data.error.message || JSON.stringify(data.error)}`);
            }
            // 检查是否有think标签（某些模型会在think标签中返回内容）
            const thinkMatch = data.choices?.[0]?.message?.content?.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch && thinkMatch[1]) {
                translated = thinkMatch[1].trim();
            }
            
            // 如果还是没有内容，抛出错误
    if (!translated) {
                throw new Error('翻译结果为空：API返回200但未包含有效内容');
            }
    }
        
        // 清理think标签和其他不需要的内容
        // 先移除think标签及其内容
        translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        translated = translated.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '').trim();
    translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // 移除可能的HTML实体编码的think标签
        translated = translated.replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/gi, '').trim();
        
        // 移除多余的换行和空白
        translated = translated.replace(/\n{3,}/g, '\n\n').trim();
        
        // 再次检查清理后是否为空
        if (!translated) {
            throw new Error('翻译结果为空：清理后内容为空');
        }
        
    return translated;
    } catch (error) {
        // 如果是网络错误或其他错误，直接抛出
        if (error.message && (error.message.includes('网络') || error.message.includes('连接') || error.message.includes('Failed'))) {
            throw error;
        }
        // 如果是翻译结果为空，也抛出错误
        throw new Error(`翻译失败: ${error.message || '未知错误'}`);
    }
}

function setupDateTimeFilters(popup, force = false, container = null) {
    if (typeof document === 'undefined') return;
    let inputs;
    if (container) {
        inputs = Array.from(container.querySelectorAll('[data-role=\"datetime-filter\"]'));
    } else {
        inputs = Array.from(document.querySelectorAll('[data-role=\"datetime-filter\"]'));
    }
    console.log('找到日期时间过滤器输入框:', inputs.length, inputs.map(input => ({id: input.id, role: input.getAttribute('data-role')})));
    if (inputs.length === 0) return;

    popup.dateTimeFilterInputs = inputs;

    if (!popup.dateTimePickerElements) {
        console.log('创建日期时间选择器元素');
        createDateTimePickerElements(popup);
    } else {
        console.log('日期时间选择器元素已存在');
    }

    inputs.forEach(input => {
        // 如果不是强制模式且已经设置过，跳过
        if (!force && input.dataset.datetimePickerSetup === 'true') {
            console.log('输入框已设置，跳过:', input.id);
            return;
        }

        // 如果是强制模式，先清理之前的事件监听器
        if (force && input.dataset.datetimePickerSetup === 'true') {
            console.log('强制模式，清理之前的设置:', input.id);
            input.removeEventListener('click', input._datetimePickerClickHandler);
            input.removeEventListener('keydown', input._datetimePickerKeydownHandler);
        }

        input.dataset.datetimePickerSetup = 'true';
        input.readOnly = true;

        // 创建事件处理器
        input._datetimePickerClickHandler = () => {
            console.log('点击日期输入框:', input.id);
            openDateTimePicker(popup, input);
        };
        input._datetimePickerKeydownHandler = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDateTimePicker(popup, input);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                closeDateTimePicker(popup);
            }
        };

        input.addEventListener('click', input._datetimePickerClickHandler);
        input.addEventListener('keydown', input._datetimePickerKeydownHandler);
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-haspopup', 'dialog');
        input.setAttribute('aria-expanded', 'false');

        console.log('成功设置日期时间过滤器输入框:', input.id);
    });

    popup.dateTimePickerInitialized = true;
    updateDateTimePickerLocale(popup, popup.currentLanguage);
}

function createDateTimePickerElements(popup) {
    if (typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.className = 'datetime-picker-overlay';
    container.style.display = 'none';

    container.innerHTML = `
        <div class=\"datetime-picker-panel\" role=\"dialog\" aria-modal=\"true\">
            <div class=\"datetime-picker-header\">
                <button type=\"button\" class=\"datetime-picker-nav prev\" aria-label=\"Previous month\">‹</button>
                <div class=\"datetime-picker-month\"></div>
                <button type=\"button\" class=\"datetime-picker-nav next\" aria-label=\"Next month\">›</button>
            </div>
            <div class=\"datetime-picker-weekdays\"></div>
            <div class=\"datetime-picker-days\"></div>
            <div class=\"datetime-picker-footer\">
                <button type=\"button\" class=\"datetime-picker-btn datetime-picker-cancel\">取消</button>
                <button type=\"button\" class=\"datetime-picker-btn primary datetime-picker-confirm\">确定</button>
            </div>
        </div>
    `;

    // 暂时添加到body，但之后会重新定位
    document.body.appendChild(container);

    popup.dateTimePickerElements = {
        overlay: container,
        panel: container.querySelector('.datetime-picker-panel'),
        monthLabel: container.querySelector('.datetime-picker-month'),
        weekdays: container.querySelector('.datetime-picker-weekdays'),
        days: container.querySelector('.datetime-picker-days'),
        prevBtn: container.querySelector('.datetime-picker-nav.prev'),
        nextBtn: container.querySelector('.datetime-picker-nav.next'),
        cancelBtn: container.querySelector('.datetime-picker-cancel'),
        confirmBtn: container.querySelector('.datetime-picker-confirm')
    };

    popup.dateTimePickerState = {
        viewDate: new Date(),
        selectedDate: null
    };

    popup.dateTimePickerElements.prevBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        changeDateTimePickerMonth(popup, -1);
    });
    popup.dateTimePickerElements.nextBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        changeDateTimePickerMonth(popup, 1);
    });
    popup.dateTimePickerElements.cancelBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        closeDateTimePicker(popup);
    });
    popup.dateTimePickerElements.confirmBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        confirmDateTimePickerSelection(popup);
    });
}

function openDateTimePicker(popup, input) {
    console.log('打开日期时间选择器 for input:', input.id);
    if (!popup.dateTimePickerElements) {
        console.log('创建日期时间选择器元素');
        createDateTimePickerElements(popup);
    }

    popup.activeDateTimeInput = input;

    // 始终使用fixed定位，相对于视窗，确保在所有情况下都正确定位
    const overlay = popup.dateTimePickerElements.overlay;
    document.body.appendChild(overlay);
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '100000'; // 确保在所有对话框之上

    // 获取输入框相对于视窗的位置
    const inputRect = input.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    overlay.style.left = (inputRect.left + scrollX) + 'px';
    overlay.style.top = (inputRect.bottom + scrollY + 5) + 'px';

    // 强制显示
    overlay.style.display = 'block';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');


    const initialDate = input.value ? new Date(input.value) : new Date();
    if (!isNaN(initialDate.getTime())) {
        popup.dateTimePickerState.viewDate = initialDate;
        popup.dateTimePickerState.selectedDate = initialDate;
    } else {
        popup.dateTimePickerState.viewDate = new Date();
        popup.dateTimePickerState.selectedDate = null;
    }

    renderDateTimePicker(popup);

    setTimeout(() => {
        popup.dateTimePickerElements.panel.focus();
    }, 0);

    document.addEventListener('mousedown', popup.handleDateTimePickerOutsideClick, true);
    document.addEventListener('keydown', popup.handleDateTimePickerKeydown, true);
}

function closeDateTimePicker(popup) {
    if (!popup.dateTimePickerElements) return;
    const overlay = popup.dateTimePickerElements.overlay;
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    popup.activeDateTimeInput = null;

    document.removeEventListener('mousedown', popup.handleDateTimePickerOutsideClick, true);
    document.removeEventListener('keydown', popup.handleDateTimePickerKeydown, true);
    console.log('日期选择器已关闭');
}

function renderDateTimePicker(popup) {
    renderDateTimePickerHeader(popup);
    renderDateTimePickerWeekdays(popup);
    renderDateTimePickerDays(popup);
    updateDateTimePickerButtonsText(popup);
}

function renderDateTimePickerHeader(popup) {
    const viewDate = popup.dateTimePickerState.viewDate;
    const monthLabel = popup.dateTimePickerElements.monthLabel;
    const locale = popup.i18n?.getIntlLocale(popup.currentLanguage) || 'zh-CN';

    const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
    monthLabel.textContent = formatter.format(viewDate);
}

function renderDateTimePickerWeekdays(popup) {
    const weekdaysEl = popup.dateTimePickerElements.weekdays;
    weekdaysEl.innerHTML = '';

    const locale = popup.i18n?.getIntlLocale(popup.currentLanguage) || 'zh-CN';
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const baseDate = new Date(Date.UTC(2020, 5, 1));

    for (let i = 0; i < 7; i++) {
        const weekday = document.createElement('div');
        weekday.className = 'datetime-picker-weekday';
        weekday.textContent = formatter.format(new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000));
        weekdaysEl.appendChild(weekday);
    }
}

function renderDateTimePickerDays(popup) {
    const daysEl = popup.dateTimePickerElements.days;
    daysEl.innerHTML = '';

    const viewDate = popup.dateTimePickerState.viewDate;
    const selectedDate = popup.dateTimePickerState.selectedDate;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const offset = firstDay.getDay();
    for (let i = 0; i < offset; i++) {
        const cell = document.createElement('div');
        cell.className = 'datetime-picker-day empty';
        daysEl.appendChild(cell);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const cellDate = new Date(year, month, day);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'datetime-picker-day';
        cell.textContent = String(day);

        cell.addEventListener('click', (event) => {
            event.stopPropagation();
            selectDateTimePickerDate(popup, cellDate);
        });

        if (selectedDate &&
            cellDate.getFullYear() === selectedDate.getFullYear() &&
            cellDate.getMonth() === selectedDate.getMonth() &&
            cellDate.getDate() === selectedDate.getDate()) {
            cell.classList.add('selected');
        }

        daysEl.appendChild(cell);
    }
}

function updateDateTimePickerButtonsText(popup) {
    popup.dateTimePickerElements.cancelBtn.textContent = popup.t('popup.awr.datetime.cancel');
    popup.dateTimePickerElements.confirmBtn.textContent = popup.t('popup.awr.datetime.confirm');
}

function changeDateTimePickerMonth(popup, offset) {
    const viewDate = popup.dateTimePickerState.viewDate;
    popup.dateTimePickerState.viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    renderDateTimePicker(popup);
}

function selectDateTimePickerDate(popup, date) {
    popup.dateTimePickerState.selectedDate = date;
    renderDateTimePickerDays(popup);

    // 立即更新输入框并关闭选择器
    if (popup.activeDateTimeInput) {
        const isoValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        popup.activeDateTimeInput.value = isoValue;
        popup.activeDateTimeInput.dataset.isoValue = isoValue;
        popup.activeDateTimeInput.dispatchEvent(new Event('input'));
        closeDateTimePicker(popup);
    }
}

function confirmDateTimePickerSelection(popup) {
    if (!popup.activeDateTimeInput || !popup.dateTimePickerState.selectedDate) {
        closeDateTimePicker(popup);
        return;
    }

    const selected = popup.dateTimePickerState.selectedDate;
    popup.activeDateTimeInput.value = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')} ${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
    popup.activeDateTimeInput.dispatchEvent(new Event('input'));
    closeDateTimePicker(popup);
}

function cancelDateTimePickerSelection(popup) {
    closeDateTimePicker(popup);
}

function handleDateTimePickerOutsideClick(popup, event) {
    if (popup.dateTimePickerElements &&
        popup.dateTimePickerElements.overlay &&
        !popup.dateTimePickerElements.overlay.contains(event.target)) {
        closeDateTimePicker(popup);
    }
}

function handleDateTimePickerKeydown(popup, event) {
    if (event.key === 'Escape') {
        closeDateTimePicker(popup);
    }
}

function cleanupDateTimeFilters(popup) {
    if (!popup.dateTimeFilterInputs) return;

    popup.dateTimeFilterInputs.forEach(input => {
        if (input._datetimePickerClickHandler) {
            input.removeEventListener('click', input._datetimePickerClickHandler);
            delete input._datetimePickerClickHandler;
        }
        if (input._datetimePickerKeydownHandler) {
            input.removeEventListener('keydown', input._datetimePickerKeydownHandler);
            delete input._datetimePickerKeydownHandler;
        }
        input.dataset.datetimePickerSetup = 'false';
    });

    popup.dateTimeFilterInputs = null;
}

function updateDateTimePickerLocale(popup, language) {
    popup.currentLanguage = language || popup.currentLanguage || popup.i18n.defaultLanguage;
    if (popup.dateTimePickerInitialized) {
        renderDateTimePicker(popup);
    }
}

function addUserInteractionListeners(popup) {
    const interactionEvents = ['click', 'input', 'focus', 'keydown', 'mousedown', 'touchstart'];

    const markUserInteraction = () => {
        if (!popup.userHasInteracted) {
            popup.userHasInteracted = true;
            console.log('用户开始交互');

            setTimeout(() => {
                if (!popup.configChecked) {
                    popup.checkConfigurationStatus();
                    popup.configChecked = true;
                }
            }, 1000);
        }
    };

    interactionEvents.forEach(eventType => {
        document.addEventListener(eventType, markUserInteraction, {
            passive: true,
            once: false
        });
    });

    if (popup.questionInput) {
        popup.questionInput.addEventListener('focus', markUserInteraction, { passive: true });
    }

    if (popup.askButton) {
        popup.askButton.addEventListener('click', markUserInteraction, { passive: true });
    }
}

function detectBrowserCompatibility(popup) {
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

    if (isChrome || isEdge) {
        popup.chromeCompatibilityDelay = 1000;
    } else if (isFirefox) {
        popup.chromeCompatibilityDelay = 1500;
    } else {
        popup.chromeCompatibilityDelay = 1200;
    }

    return {
        isChrome,
        isFirefox,
        isEdge,
        isSafari
    };
}

function checkConfigurationStatus(popup) {
    if (popup.configChecked) {
        return;
    }

    const hasProviders = popup.providers && popup.providers.length > 0;
    const hasModels = popup.models && popup.models.length > 0;
    const hasValidApiKey = hasProviders && popup.providers.some(provider =>
        provider.apiKey && provider.apiKey.trim() !== ''
    );

    clearConfigurationNotice(popup);
    popup.configChecked = true;

    if (hasProviders && hasModels && hasValidApiKey) {
        console.log('配置检查完成：配置完整');
        return;
    }

    if (!hasProviders || !hasModels) {
        console.log('配置检查：缺少服务商或模型配置');
        showConfigurationNotice(popup, popup.t('popup.notice.configureProvidersAndModels'), 'warning');
    }
}

function clearConfigurationNotice(popup) {
    const noticeEl = document.querySelector('.configuration-notice');
    if (noticeEl) {
        noticeEl.remove();
    }
}

function showConfigurationNotice(popup, message, type = 'info') {
    clearConfigurationNotice(popup);

    const noticeEl = document.createElement('div');
    noticeEl.className = `configuration-notice ${type}`;
    noticeEl.innerHTML = `
        <span class=\"notice-text\">${message}</span>
        <button class=\"notice-close\" aria-label=\"Close\">×</button>
    `;

    const closeBtn = noticeEl.querySelector('.notice-close');
    closeBtn.addEventListener('click', () => {
        noticeEl.remove();
    });

    const container = document.querySelector('.configuration-notice-container') || document.body;
    container.appendChild(noticeEl);
}

