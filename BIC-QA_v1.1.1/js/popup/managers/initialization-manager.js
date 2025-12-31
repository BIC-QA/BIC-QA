// 初始化管理器
import { attachPopupEventHandlers } from '../ui/event-handlers.js';

export function createInitializationManager(popup) {
    return {
        async initializeAfterLoad() {
            // 等待DOM完全加载
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                });
            }

            // 移除不必要的100ms延迟，直接开始加载设置
            // 加载设置
            await popup.loadSettings();
            await popup.i18n.ensureLanguage(popup.i18n.defaultLanguage);
            
            // 初始化语言偏好，确保同步
            await popup.initLanguagePreference();
            
            // 再次验证语言同步状态
            if (popup.i18n?.currentLanguage !== popup.currentLanguage) {
                console.warn('语言同步验证失败，强制同步:', {
                    popupCurrentLanguage: popup.currentLanguage,
                    i18nCurrentLanguage: popup.i18n?.currentLanguage
                });
                // 以 i18n.currentLanguage 为准（因为它是最新的）
                if (popup.i18n?.currentLanguage) {
                    popup.currentLanguage = popup.i18n.currentLanguage;
                } else if (popup.currentLanguage) {
                    popup.i18n.currentLanguage = popup.currentLanguage;
                }
            }
            
            console.log('语言初始化最终状态:', {
                popupCurrentLanguage: popup.currentLanguage,
                i18nCurrentLanguage: popup.i18n?.currentLanguage,
                hasStoredLanguagePreference: popup.hasStoredLanguagePreference
            });
            
            popup.setupDateTimeFilters();
            // 只有在用户没有存储语言偏好时才重置语言切换器显示
            // 但不要改变实际的语言设置
            if (!popup.hasStoredLanguagePreference) {
                // 重置语言切换器显示（只影响UI，不影响实际语言）
                popup.resetLanguageSwitcherSelection();
            } else {
                // 如果有存储的语言偏好，确保语言切换器显示正确的选中状态
                if (popup.languageSwitcher && popup.currentLanguage) {
                    popup.languageSwitcher.dataset.selectedLanguage = popup.currentLanguage;
                    // 设置对应的option为选中状态
                    const option = popup.languageSwitcher.querySelector(`option[value="${popup.currentLanguage}"]`);
                    if (option) {
                        option.selected = true;
                    }
                }
            }
            await popup.loadStoredAwrDatabaseType();

            // 将配置检查和版本检查改为异步非阻塞操作，不延迟执行
            // 使用 requestIdleCallback 或 setTimeout(0) 来确保不阻塞UI渲染
            const runDeferredTasks = () => {
                // 使用 setTimeout(0) 将任务推迟到下一个事件循环，不阻塞UI
                setTimeout(async () => {
                    popup.checkConfigurationStatus();
                    // 检查并显示引导（如果用户未完成配置）
                    if (popup.checkAndShowOnboarding) {
                        popup.checkAndShowOnboarding();
                    }

                    // 等待DOM完全加载后再检查版本更新
                    const checkVersionUpdate = async () => {
                        try {
                            const apiKey = popup.resolveApiKey ? popup.resolveApiKey() : '';
                            console.log('检查版本更新 - API key存在:', !!apiKey, '长度:', apiKey.length);
                            if (apiKey) {
                                console.log('用户有有效的API key，开始检查版本更新');
                                await popup.checkVersionUpdate();
                            } else {
                                console.log('没有有效的API key，跳过版本检查');
                            }
                        } catch (error) {
                            console.error('版本检查失败:', error);
                        }
                    };

                    // 如果DOM已经加载完成，直接执行；否则等待
                    if (document.readyState === 'complete' || (document.readyState === 'interactive' && document.getElementById('update-icon'))) {
                        console.log('DOM已加载，开始版本检查');
                        await checkVersionUpdate();
                    } else {
                        console.log('等待DOM加载完成...');
                        const domReady = () => {
                            if (document.getElementById('update-icon')) {
                                console.log('DOM加载完成，开始版本检查');
                                checkVersionUpdate();
                            } else {
                                console.log('DOM加载但update-icon不存在，继续等待...');
                                setTimeout(domReady, 100);
                            }
                        };

                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', domReady);
                        } else {
                            domReady();
                        }
                    }
                }, 0);
            };

            // 如果支持 requestIdleCallback，使用它；否则使用 setTimeout
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(runDeferredTasks, { timeout: 100 });
            } else {
                runDeferredTasks();
            }
        },

        async clearCacheOnStartup() {
            try {
                const locale = popup.i18n?.getIntlLocale(popup.currentLanguage);
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
        },

        initElements() {
            const refs = popup.domCache.assignTo(popup);

            popup.policyDialogs = refs.policyDialogs || {};
            popup.policyOpenButtons = refs.policyOpenButtons || [];
            popup.policyCloseButtons = refs.policyCloseButtons || [];

            popup.abortController = null;
            popup.hasBeenStopped = false;
            popup.selectedFile = null;
            popup.awrCountdownInterval = null;

            // AWR历史记录相关
            popup.awrHistoryCurrentPage = 1;
            popup.awrHistoryPageSize = 10;
            popup.awrHistoryTotal = 0;
            popup.awrHistoryList = [];
            popup.awrHistorySearchKeyword = '';

            // 巡检相关状态
            popup.inspectionSelectedFile = null;
            popup.inspectionHistoryCurrentPage = 1;
            popup.inspectionHistoryPageSize = 10;
            popup.inspectionHistoryTotal = 0;
            popup.inspectionHistoryList = [];

            // 计时相关
            popup.startTime = null;

            // 检测是否为弹出窗口模式
            popup.isPopupMode = window.innerWidth <= 400 || window.innerHeight <= 600;
            popup.initFullscreenMode();
        },

        bindEvents() {
            attachPopupEventHandlers(popup);
        }
    };
}

