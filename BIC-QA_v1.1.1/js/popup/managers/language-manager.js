/**
 * 语言管理器
 * 负责语言切换、翻译应用等功能
 */
export function createLanguageManager(popup) {
    return {
        /**
         * 翻译静态元素
         */
        translateStaticElements(language) {
            if (!popup.i18n) return;

            const translate = (key) => {
                if (!key) return undefined;
                const value = popup.i18n.t(key, language);
                return typeof value === 'string' ? value : undefined;
            };

            const setAttribute = (el, attr, key) => {
                const translation = translate(key);
                if (translation !== undefined) {
                    el.setAttribute(attr, translation);
                }
            };

            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const translation = translate(el.dataset.i18n);
                if (translation !== undefined) {
                    el.textContent = translation;
                }
            });

            // 处理包含版本号的元素
            const versionElements = Array.from(document.querySelectorAll('[data-i18n-html]')).filter(el => {
                const key = el.dataset.i18nHtml;
                return key && (key.includes('version') || key.includes('meta'));
            });
            
            // 异步更新版本号
            if (versionElements.length > 0) {
                (async () => {
                    try {
                        const { getVersionWithPrefix } = await import('../../utils/version.js');
                        const versionWithPrefix = await getVersionWithPrefix();
                        
                        versionElements.forEach((el) => {
                            const translation = translate(el.dataset.i18nHtml);
                            if (translation !== undefined) {
                                let html = translation;
                                // 先替换版本号占位符 {{version}}（支持在 span 标签内）
                                html = html.replace(/\{\{version\}\}/g, versionWithPrefix);
                                // 兼容旧格式：替换任意长度的版本号格式（如 v1.1, v1.1.0, v1.1.0.1 等）
                                // 匹配 v 开头，后跟数字和点号的组合，至少包含一个点号
                                html = html.replace(/v\d+(?:\.\d+)+/g, versionWithPrefix);
                                // 替换 span 标签内的版本号（支持任意长度）
                                html = html.replace(/<span>v\d+(?:\.\d+)+<\/span>/g, `<span>${versionWithPrefix}</span>`);
                                el.innerHTML = html;
                                
                                // 同时更新内部的版本号元素（如果有id）
                                const versionSpan = el.querySelector('#popup-version, #app-version');
                                if (versionSpan) {
                                    versionSpan.textContent = versionWithPrefix;
                                }
                            }
                        });
                    } catch (error) {
                        console.error('更新版本号失败:', error);
                        // 如果加载失败，使用原始翻译（但保留占位符）
                        versionElements.forEach((el) => {
                            const translation = translate(el.dataset.i18nHtml);
                            if (translation !== undefined) {
                                el.innerHTML = translation;
                            }
                        });
                    }
                })();
            }
            
            // 处理其他 data-i18n-html 元素
            document.querySelectorAll('[data-i18n-html]').forEach((el) => {
                // 跳过已经处理的版本号元素
                if (versionElements.includes(el)) {
                    return;
                }
                const translation = translate(el.dataset.i18nHtml);
                if (translation !== undefined) {
                    el.innerHTML = translation;
                }
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
                setAttribute(el, 'placeholder', el.dataset.i18nPlaceholder);
            });

            document.querySelectorAll('[data-i18n-title]').forEach((el) => {
                setAttribute(el, 'title', el.dataset.i18nTitle);
            });

            document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
                setAttribute(el, 'alt', el.dataset.i18nAlt);
            });

            document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
                setAttribute(el, 'aria-label', el.dataset.i18nAriaLabel);
            });

            document.querySelectorAll('[data-i18n-value]').forEach((el) => {
                const translation = translate(el.dataset.i18nValue);
                if (translation !== undefined) {
                    el.value = translation;
                }
            });

            // 处理 data-i18n-reminder-key 属性（用于提醒横幅的动态文本）
            document.querySelectorAll('[data-i18n-reminder-key]').forEach((el) => {
                const reminderKey = el.getAttribute('data-i18n-reminder-key');
                if (reminderKey) {
                    const translation = translate(reminderKey);
                    if (translation !== undefined) {
                        el.textContent = translation;
                    }
                }
            });
        },

        /**
         * 对指定元素及其子元素应用 i18n 翻译
         */
        applyI18nToElement(container, language = null) {
            if (!popup.i18n || !container) return;
            
            // 使用传入的语言参数，如果没有则使用当前语言
            const targetLanguage = language || popup.currentLanguage || popup.i18n.currentLanguage;
            
            const translate = (key) => {
                if (!key) return undefined;
                try {
                    const value = popup.i18n.t(key, targetLanguage);
                    // 如果翻译结果还是 key 本身，说明没有找到翻译，返回 undefined
                    if (value === key) {
                        console.warn(`未找到翻译键: ${key} (语言: ${targetLanguage})`);
                        return undefined;
                    }
                    return typeof value === 'string' ? value : undefined;
                } catch (error) {
                    console.error(`翻译键 ${key} 时出错:`, error);
                    return undefined;
                }
            };
            
            const setAttribute = (el, attr, key) => {
                const translation = translate(key);
                if (translation !== undefined) {
                    el.setAttribute(attr, translation);
                }
            };
            
            // 处理 data-i18n 属性
            container.querySelectorAll('[data-i18n]').forEach((el) => {
                const translation = translate(el.dataset.i18n);
                if (translation !== undefined) {
                    el.textContent = translation;
                }
            });
            
            // 处理 data-i18n-html 属性
            const versionElements = Array.from(container.querySelectorAll('[data-i18n-html]')).filter(el => {
                const key = el.dataset.i18nHtml;
                return key && (key.includes('version') || key.includes('meta'));
            });
            
            // 异步更新版本号元素
            if (versionElements.length > 0) {
                (async () => {
                    try {
                        const { getVersionWithPrefix } = await import('../../utils/version.js');
                        const versionWithPrefix = await getVersionWithPrefix();
                        
                        versionElements.forEach((el) => {
                            const translation = translate(el.dataset.i18nHtml);
                            if (translation !== undefined) {
                                let html = translation;
                                // 先替换版本号占位符 {{version}}（支持在 span 标签内）
                                html = html.replace(/\{\{version\}\}/g, versionWithPrefix);
                                // 兼容旧格式：替换任意长度的版本号格式（如 v1.1, v1.1.0, v1.1.0.1 等）
                                // 匹配 v 开头，后跟数字和点号的组合，至少包含一个点号
                                html = html.replace(/v\d+(?:\.\d+)+/g, versionWithPrefix);
                                // 替换 span 标签内的版本号（支持任意长度）
                                html = html.replace(/<span>v\d+(?:\.\d+)+<\/span>/g, `<span>${versionWithPrefix}</span>`);
                                el.innerHTML = html;
                                
                                // 同时更新内部的版本号元素（如果有id）
                                const versionSpan = el.querySelector('#popup-version, #app-version');
                                if (versionSpan) {
                                    versionSpan.textContent = versionWithPrefix;
                                }
                            }
                        });
                    } catch (error) {
                        console.error('更新版本号失败:', error);
                        // 如果加载失败，使用原始翻译
                        versionElements.forEach((el) => {
                            const translation = translate(el.dataset.i18nHtml);
                            if (translation !== undefined) {
                                el.innerHTML = translation;
                            }
                        });
                    }
                })();
            }
            
            // 处理其他 data-i18n-html 元素
            container.querySelectorAll('[data-i18n-html]').forEach((el) => {
                // 跳过已经处理的版本号元素
                if (versionElements.includes(el)) {
                    return;
                }
                const translation = translate(el.dataset.i18nHtml);
                if (translation !== undefined) {
                    el.innerHTML = translation;
                }
            });
            
            // 处理其他 i18n 属性
            container.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
                setAttribute(el, 'placeholder', el.dataset.i18nPlaceholder);
            });
            
            container.querySelectorAll('[data-i18n-title]').forEach((el) => {
                setAttribute(el, 'title', el.dataset.i18nTitle);
            });
            
            container.querySelectorAll('[data-i18n-alt]').forEach((el) => {
                setAttribute(el, 'alt', el.dataset.i18nAlt);
            });
            
            container.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
                setAttribute(el, 'aria-label', el.dataset.i18nAriaLabel);
            });
            
            container.querySelectorAll('[data-i18n-value]').forEach((el) => {
                const translation = translate(el.dataset.i18nValue);
                if (translation !== undefined) {
                    el.value = translation;
                }
            });

            // 处理 data-i18n-reminder-key 属性（用于提醒横幅的动态文本）
            container.querySelectorAll('[data-i18n-reminder-key]').forEach((el) => {
                const reminderKey = el.getAttribute('data-i18n-reminder-key');
                if (reminderKey) {
                    const translation = translate(reminderKey);
                    if (translation !== undefined) {
                        el.textContent = translation;
                    }
                }
            });
        },

        /**
         * 应用语言设置
         */
        async applyLanguage(language, options = {}) {
            const { persist = true, updateSwitcher = true } = options;
            let normalizedLanguage;

            try {
                normalizedLanguage = await popup.i18n.setLanguage(language);
            } catch (error) {
                console.error('设置语言失败，使用回退语言:', error);
                normalizedLanguage = await popup.i18n.setLanguage(popup.i18n.fallbackLanguage);
            }

            // 确保 popup.currentLanguage 和 i18n.currentLanguage 同步
            popup.currentLanguage = normalizedLanguage;
            if (popup.i18n) {
                popup.i18n.currentLanguage = normalizedLanguage;
            }
            
            console.log('applyLanguage 完成:', {
                inputLanguage: language,
                normalizedLanguage,
                popupCurrentLanguage: popup.currentLanguage,
                i18nCurrentLanguage: popup.i18n?.currentLanguage,
                persist,
                updateSwitcher
            });
            this.translateStaticElements(normalizedLanguage);
            popup.updateDateTimePickerLocale(normalizedLanguage);
            
            // 重新翻译已加载的政策对话框内容
            if (popup.policyDialogs) {
                Object.values(popup.policyDialogs).forEach(dialog => {
                    const contentContainer = dialog.querySelector('.policy-dialog-content');
                    if (contentContainer && contentContainer.dataset.loaded) {
                        this.applyI18nToElement(contentContainer, normalizedLanguage);
                    }
                });
            }

            // 重新翻译引导弹框和提醒横幅（如果存在）
            if (popup.updateOnboardingI18n) {
                popup.updateOnboardingI18n(normalizedLanguage);
            }

            // 更新所有对话容器中的 question-name 和 ai-name
            if (popup.resultContainer) {
                const conversationContainers = popup.resultContainer.querySelectorAll('.conversation-container');
                conversationContainers.forEach(container => {
                    const questionNameEl = container.querySelector('.question-display .question-name');
                    if (questionNameEl) {
                        questionNameEl.textContent = popup.t('popup.result.userName');
                    }
                    const aiNameEl = container.querySelector('.ai-display .ai-name');
                    if (aiNameEl) {
                        aiNameEl.textContent = popup.t('popup.result.aiName');
                    }
                });
            }

            // 语言切换完成后，如果应该显示更新图标，重新显示
            if (popup.shouldShowUpdateIcon && popup.latestVersion) {
                console.log('语言切换完成，重新显示更新图标，版本:', popup.latestVersion);
                // 延迟一点确保DOM更新完成
                setTimeout(() => {
                    popup.showUpdateIcon(popup.latestVersion);
                }, 100);
            }

            const htmlLocale = popup.i18n.getIntlLocale(normalizedLanguage);
            if (typeof document !== 'undefined') {
                document.title = popup.t('popup.meta.title');
                if (document.documentElement) {
                    document.documentElement.lang = htmlLocale;
                }
            }

            const resources = popup.languageResources[normalizedLanguage] || popup.languageResources[popup.i18n.fallbackLanguage];

            if (popup.languageSwitcher) {
                if (updateSwitcher) {
                    popup.languageSwitcher.dataset.selectedLanguage = normalizedLanguage;
                    // 设置对应的option为选中状态
                    const option = popup.languageSwitcher.querySelector(`option[value="${normalizedLanguage}"]`);
                    if (option) {
                        // 先清除所有选项的选中状态
                        Array.from(popup.languageSwitcher.options).forEach(opt => opt.selected = false);
                        // 设置当前语言的option为选中
                        option.selected = true;
                    }
                }
                // 只有在需要更新切换器时才调用，避免重置显示
                if (updateSwitcher) {
                    popup.updateLanguageSwitcherDisplay(normalizedLanguage);
                }
            }

            if (persist && typeof chrome !== 'undefined' && chrome.storage?.sync?.set) {
                try {
                    chrome.storage.sync.set({ uiLanguage: normalizedLanguage, uiLanguageSet: true }, () => {
                        if (chrome.runtime?.lastError) {
                            console.error('保存语言设置失败:', chrome.runtime.lastError);
                        }
                    });
                    popup.hasStoredLanguagePreference = true;
                } catch (error) {
                    console.error('保存语言设置失败:', error);
                }
            }

            const newSessionText = popup.newSessionBtn?.querySelector('.action-text');
            if (newSessionText) newSessionText.textContent = popup.t('popup.top.button.newSession');

            const historyText = popup.historyBtn?.querySelector('.action-text');
            if (historyText) historyText.textContent = popup.t('popup.top.button.history');

            const awrText = popup.awrAnalysisBtn?.querySelector('.action-text');
            if (awrText) awrText.textContent = popup.t('popup.top.button.awrAnalysis');
            const inspectionText = popup.inspectionBtn?.querySelector('.action-text');
            if (inspectionText) inspectionText.textContent = popup.t('popup.top.button.inspection');

            if (popup.settingsBtn) {
                const settingsText = popup.settingsBtn.querySelector('span:nth-of-type(2)');
                if (settingsText) settingsText.textContent = popup.t('popup.top.button.settings');
                popup.settingsBtn.title = popup.t('popup.top.tooltip.settings');
            }

            if (popup.helpBtn) {
                const helpText = popup.helpBtn.querySelector('.action-text');
                if (helpText) helpText.textContent = popup.t('popup.top.button.help');
                popup.helpBtn.title = popup.t('popup.top.tooltip.help');
                const userGuideBase = resources?.userGuide || 'pages/user-guide.html';
                popup.helpBtn.dataset.userGuidePath = userGuideBase;
            }

            if (popup.announcementBtn) {
                const noticeText = popup.announcementBtn.querySelector('.action-text');
                if (noticeText) noticeText.textContent = popup.t('popup.top.button.notice');
                popup.announcementBtn.title = popup.t('popup.top.tooltip.notice');
                const noticeBase = resources?.notice || 'pages/notice.html';
                popup.announcementBtn.dataset.noticePath = noticeBase;
            }

            const modelLabel = document.querySelector('label[for="modelSelect"]');
            if (modelLabel) modelLabel.textContent = popup.t('popup.main.label.model');

            const knowledgeLabel = document.querySelector('label[for="knowledgeBaseSelect"]');
            if (knowledgeLabel) knowledgeLabel.textContent = popup.t('popup.main.label.knowledge');

            const parameterLabel = document.querySelector('label[for="parameterRuleSelect"]');
            if (parameterLabel) parameterLabel.textContent = popup.t('popup.main.label.parameter');

            const uploadLabel = document.querySelector('label[for="awrFileDisplay"]');
            if (uploadLabel) uploadLabel.textContent = popup.t('popup.main.text.uploadLabel');

            if (popup.languageSwitcher) {
                popup.languageSwitcher.title = popup.t('popup.top.tooltip.languageSwitcher');
            }

            if (popup.modelSelect) {
                Array.from(popup.modelSelect.options).forEach(option => {
                    if (!option.value) {
                        if (option.disabled) {
                            option.textContent = popup.t('popup.main.option.noModelConfigured');
                        } else {
                            option.textContent = popup.t('popup.main.option.modelsLoading');
                        }
                    }
                });
            }

            if (popup.knowledgeBaseSelect && popup.knowledgeBaseSelect.options.length > 0) {
                const firstOption = popup.knowledgeBaseSelect.options[0];
                if (firstOption.value === '') {
                    firstOption.textContent = popup.t('popup.main.option.knowledgeNone');
                }
            }

            if (popup.parameterRuleSelect) {
                Array.from(popup.parameterRuleSelect.options).forEach(option => {
                    if (!option.value && option.disabled) {
                        option.textContent = popup.t('popup.main.option.noParameterRuleConfigured');
                    }
                });
            }

            if (popup.awrSaveBtn) {
                popup.awrSaveBtn.textContent = popup.t('popup.main.action.runAnalysis');
            }
            if (popup.awrCancelBtn) {
                popup.awrCancelBtn.textContent = popup.t('popup.main.action.close');
            }
            if (popup.awrFileUploadBtn) {
                popup.awrFileUploadBtn.textContent = popup.t('popup.main.action.uploadFile');
            }

            if (popup.knowledgeBaseSelect) {
                popup.loadKnowledgeBaseOptions();
            }

            if (popup.parameterRuleSelect) {
                popup.loadParameterRuleOptions();
            }
        },

        /**
         * 获取 Accept-Language 值
         */
        getAcceptLanguage() {
            // 优先使用 i18n.currentLanguage，确保与翻译系统一致
            const currentLang = popup.i18n?.currentLanguage || popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
            const langMap = {
                'zhcn': 'zh',
                'zh-tw': 'zh',
                'en': 'en',
                'jap': 'ja'
            };
            return langMap[currentLang.toLowerCase()] || 'zh';
        }
    };
}

