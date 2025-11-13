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
        this.previousKnowledgeBaseValue = '';
        this.hasStoredLanguagePreference = false;

        if (typeof I18nService === 'function') {
            this.i18n = new I18nService({
                defaultLanguage: 'zhcn',
                fallbackLanguage: 'zhcn',
                supportedLanguages: ['zhcn', 'en', 'zh-tw', 'jap'],
                languageAliases: {
                    'zh-CN': 'zhcn',
                    'zh_cn': 'zhcn',
                    'zhCN': 'zhcn',
                    'en-US': 'en',
                    'en_us': 'en',
                    'zh-TW': 'zh-tw',
                    'zh_tw': 'zh-tw',
                    'ja-JP': 'jap',
                    'ja_jp': 'jap'
                }
            });
        } else {
            console.warn('I18nService 未定义，使用默认翻译实现。');
            const fallbackLanguage = 'zhcn';
            this.i18n = {
                defaultLanguage: fallbackLanguage,
                fallbackLanguage,
                currentLanguage: fallbackLanguage,
                setLanguage: async () => fallbackLanguage,
                ensureLanguage: async () => ({}),
                getIntlLocale: () => 'zh-CN',
                t: (key) => key
            };
        }
        this.currentLanguage = this.i18n.defaultLanguage;
        this.languageResources = {
            'zhcn': {
                userGuide: 'user-guide.html',
                notice: 'notice.html'
            },
            'en': {
                userGuide: 'user-guide.html',
                notice: 'notice.html'
            },
            'zh-tw': {
                userGuide: 'user-guide.html',
                notice: 'notice.html'
            },
            'jap': {
                userGuide: 'user-guide.html',
                notice: 'notice.html'
            }
        };
        this.dateTimeFilterInputs = [];
        this.dateTimePickerInitialized = false;
        this.activeDateTimeInput = null;
        this.dateTimePickerElements = null;
        this.dateTimePickerState = {
            viewDate: new Date(),
            selectedDate: null
        };
        this.handleDateTimePickerOutsideClick = this.handleDateTimePickerOutsideClick.bind(this);
        this.handleDateTimePickerKeydown = this.handleDateTimePickerKeydown.bind(this);

        this.defaultAwrDatabaseType = '2101';
        this.storedAwrDatabaseType = null;

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
        await this.i18n.ensureLanguage(this.i18n.defaultLanguage);
        await this.initLanguagePreference();
        this.setupDateTimeFilters();
        if (!this.hasStoredLanguagePreference) {
            this.resetLanguageSwitcherSelection();
        }
        await this.loadStoredAwrDatabaseType();

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
            const locale = this.i18n?.getIntlLocale(this.currentLanguage);
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
        this.awrAnalysisBtn = document.getElementById('awrAnalysisBtn');
        this.inspectionBtn = document.getElementById('inspectionBtn');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.announcementBtn = document.getElementById('announcementBtn');
        this.languageSwitcher = document.getElementById('languageSwitcher');
        // 字符计数元素
        this.charCount = document.getElementById('charCount');
        this.charCountContainer = document.querySelector('.character-count');
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

        // AWR分析对话框元素
        this.awrAnalysisDialog = document.getElementById('awrAnalysisDialog');
        this.closeAwrDialog = document.getElementById('closeAwrDialog');
        this.awrAnalysisForm = document.getElementById('awrAnalysisForm');
        this.awrProblemDescription = document.getElementById('awrProblemDescription');
        this.awrEmail = document.getElementById('awrEmail');
        this.awrUserName = document.getElementById('awrUserName');
        this.awrFileInput = document.getElementById('awrFileInput');
        this.awrFileDisplay = document.getElementById('awrFileDisplay');
        this.awrFileUploadBtn = document.getElementById('awrFileUploadBtn');
        this.awrLanguage = document.getElementById('awrLanguage');
        this.awrDatabaseType = document.getElementById('awrDatabaseType');
        this.awrAgreeTerms = document.getElementById('agreeTerms');
        this.policyDialogs = {};
        document.querySelectorAll('.policy-dialog').forEach(dialog => {
            this.policyDialogs[dialog.id] = dialog;
        });
        this.policyOpenButtons = Array.from(document.querySelectorAll('.js-open-policy'));
        this.policyCloseButtons = Array.from(document.querySelectorAll('.js-close-policy'));
        this.awrCancelBtn = document.getElementById('awrCancelBtn');
        this.awrSaveBtn = document.getElementById('awrSaveBtn');
        this.selectedFile = null;
        this.awrCountdownInterval = null; // 用于存储AWR分析按钮倒计时定时器

        // AWR历史记录相关
        this.awrHistoryCurrentPage = 1;
        this.awrHistoryPageSize = 10;
        this.awrHistoryTotal = 0;
        this.awrHistoryList = [];
        this.awrHistorySearchKeyword = '';

        // 巡检诊断对话框元素
        this.inspectionDialog = document.getElementById('inspectionDialog');
        this.closeInspectionDialog = document.getElementById('closeInspectionDialog');
        this.inspectionForm = document.getElementById('inspectionForm');
        this.inspectionProblemDescription = document.getElementById('inspectionProblemDescription');
        this.inspectionEmail = document.getElementById('inspectionEmail');
        this.inspectionUserName = document.getElementById('inspectionUserName');
        this.inspectionFileInput = document.getElementById('inspectionFileInput');
        this.inspectionFileDisplay = document.getElementById('inspectionFileDisplay');
        this.inspectionFileUploadBtn = document.getElementById('inspectionFileUploadBtn');
        this.inspectionLanguage = document.getElementById('inspectionLanguage');
        this.inspectionDatabaseType = document.getElementById('inspectionDatabaseType');
        this.inspectionAgreeTerms = document.getElementById('inspectionAgreeTerms');
        this.inspectionCancelBtn = document.getElementById('inspectionCancelBtn');
        this.inspectionSaveBtn = document.getElementById('inspectionSaveBtn');
        this.inspectionSelectedFile = null;

        // 回到顶部按钮
        this.backToTopBtn = document.getElementById('backToTopBtn');

        // 布局控制元素
        this.contentArea = document.querySelector('.content-area');

        // 计时相关
        this.startTime = null;

        // 检测是否为弹出窗口模式
        this.isPopupMode = window.innerWidth <= 400 || window.innerHeight <= 600;
        this.initFullscreenMode();

        // 初始化字符计数显示
        // this.updateCharacterCount();

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
            this.questionInput.addEventListener('input', () => {
                this.updateButtonState();
                this.updateCharacterCount();
                // 如果输入字符超过5个，隐藏建议容器
                // if (this.questionInput.value.length > 5) {
                //     // 查找当前对话容器中的建议容器
                //     const currentContainer = this.getCurrentConversationContainer();
                //     const suggestionContainer = currentContainer ? currentContainer.querySelector('.suggestion-container') : null;
                //     if (suggestionContainer && suggestionContainer.style.display === 'block') {
                //         suggestionContainer.style.display = 'none';
                //     }
                // }
            });
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

            // 添加粘贴事件监听，限制粘贴内容长度
            this.questionInput.addEventListener('paste', (e) => {
                const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
                const isUsingKnowledgeBase = selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)';

                // 如果不使用知识库(None)，不限制粘贴
                if (!isUsingKnowledgeBase) {
                    return;
                }

                const maxLength = 500;
                const clipboardData = e.clipboardData || window.clipboardData;
                const pastedText = clipboardData.getData('text');

                // 获取当前输入框的内容
                const currentValue = this.questionInput.value;
                const selectionStart = this.questionInput.selectionStart;
                const selectionEnd = this.questionInput.selectionEnd;

                // 计算粘贴后的总长度
                const newValue = currentValue.substring(0, selectionStart) +
                    pastedText +
                    currentValue.substring(selectionEnd);

                // 如果粘贴后超过最大长度，阻止默认粘贴行为
                if (newValue.length > maxLength) {
                    e.preventDefault();

                    // 计算可以粘贴的字符数
                    const availableSpace = maxLength - (currentValue.length - (selectionEnd - selectionStart));

                    if (availableSpace > 0) {
                        // 只粘贴能容纳的部分
                        const truncatedText = pastedText.substring(0, availableSpace);
                        const finalValue = currentValue.substring(0, selectionStart) +
                            truncatedText +
                            currentValue.substring(selectionEnd);

                        // 手动设置值
                        this.questionInput.value = finalValue;

                        // 设置光标位置
                        const newCursorPos = selectionStart + truncatedText.length;
                        this.questionInput.setSelectionRange(newCursorPos, newCursorPos);

                        // 触发input事件更新按钮状态
                        this.questionInput.dispatchEvent(new Event('input'));

                        // 显示提示信息
                        this.showMessage(this.t('popup.message.pasteTruncated', { maxLength }), 'warning');
                    } else {
                        // 没有空间可以粘贴
                        this.showMessage(this.t('popup.message.inputFull', { maxLength }), 'warning');
                    }
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

        // 反馈按钮 - 修改这部分
        if (this.likeButton) {
            this.likeButton.addEventListener('click', () => {
                // 传入默认容器，而不是null
                const defaultContainer = this.resultContainer.querySelector('#conversation-default');
                this.handleFeedback('like', defaultContainer);
            });
        }
        if (this.dislikeButton) {
            this.dislikeButton.addEventListener('click', () => {
                // 传入默认容器，而不是null
                const defaultContainer = this.resultContainer.querySelector('#conversation-default');
                this.handleFeedback('dislike', defaultContainer);
            });
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

        if (this.awrAnalysisBtn) {
            this.awrAnalysisBtn.addEventListener('click', () => this.showAwrAnalysisDialog());
        }
        if (this.inspectionBtn) {
            this.inspectionBtn.addEventListener('click', () => {
                void this.showInspectionDialog();
            });
        }
        if (this.awrDatabaseType) {
            this.awrDatabaseType.addEventListener('change', (event) => this.handleAwrDatabaseTypeChange(event));
        }

        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => this.startNewSession());
        }

        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (this.languageSwitcher) {
            this.languageSwitcher.addEventListener('change', async (event) => {
                await this.handleLanguageChange(event);
            });
        }
        if (this.announcementBtn) {
            this.announcementBtn.addEventListener('click', () => this.handleAnnouncementClick());
        }

        // 政策弹窗事件
        if (this.policyOpenButtons && this.policyOpenButtons.length > 0) {
            this.policyOpenButtons.forEach(btn => {
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    const targetId = btn.dataset.target;
                    if (targetId) {
                        this.showPolicyDialog(targetId);
                    }
                });
            });
        }
        if (this.policyCloseButtons && this.policyCloseButtons.length > 0) {
            this.policyCloseButtons.forEach(btn => {
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    const targetId = btn.dataset.target;
                    if (targetId) {
                        this.hidePolicyDialog(targetId);
                    }
                });
            });
        }
        Object.values(this.policyDialogs).forEach(dialog => {
            dialog.addEventListener('click', (event) => {
                if (event.target === dialog) {
                    this.hidePolicyDialog(dialog.id);
                }
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                let handled = false;
                Object.entries(this.policyDialogs).forEach(([dialogId, dialog]) => {
                    if (dialog.style.display === 'flex') {
                        this.hidePolicyDialog(dialogId);
                        handled = true;
                    }
                });
                if (handled) {
                    event.stopPropagation();
                }
            }
        });

        // 在 bindEvents() 方法中添加（大约在第320行附近）
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

        // 添加历史记录事件委托
        if (this.historyList) {
            this.historyList.addEventListener('click', (e) => {
                const target = e.target;

                // 处理复制按钮点击
                if (target.classList.contains('copy-btn')) {
                    const id = target.dataset.id;
                    this.copyHistoryItem(id);
                }

                // 处理删除按钮点击
                if (target.classList.contains('delete-single-btn')) {
                    const id = target.dataset.id;
                    this.deleteHistoryItem(id);
                }

                // 处理批量导出按钮点击
                if (target.id === 'batchExportBtn') {
                    this.batchExportHistory();
                }

                // 处理批量删除按钮点击
                if (target.id === 'batchDeleteBtn') {
                    this.batchDeleteHistory();
                }
            });

            // 处理复选框变化
            this.historyList.addEventListener('change', (e) => {
                const target = e.target;

                // 处理全选复选框
                if (target.id === 'selectAllCheckbox') {
                    this.toggleSelectAll();
                }

                // 处理单个复选框
                if (target.classList.contains('history-checkbox')) {
                    this.updateBatchButtons();
                }
            });
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

        // AWR分析对话框事件
        if (this.closeAwrDialog) {
            this.closeAwrDialog.addEventListener('click', () => this.hideAwrAnalysisDialog());
        }
        if (this.awrCancelBtn) {
            this.awrCancelBtn.addEventListener('click', () => this.hideAwrAnalysisDialog());
        }
        if (this.awrAnalysisForm) {
            this.awrAnalysisForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAwrAnalysisSubmit();
            });
        }
        if (this.awrFileUploadBtn) {
            this.awrFileUploadBtn.addEventListener('click', () => {
                if (this.awrFileInput) {
                    this.awrFileInput.click();
                }
            });
        }
        if (this.awrFileInput) {
            this.awrFileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // 巡检诊断对话框事件
        if (this.closeInspectionDialog) {
            this.closeInspectionDialog.addEventListener('click', () => this.hideInspectionDialog());
        }
        if (this.inspectionCancelBtn) {
            this.inspectionCancelBtn.addEventListener('click', () => this.hideInspectionDialog());
        }
        if (this.inspectionForm) {
            this.inspectionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleInspectionSubmit();
            });
        }
        if (this.inspectionFileUploadBtn) {
            this.inspectionFileUploadBtn.addEventListener('click', () => {
                if (this.inspectionFileInput) {
                    this.inspectionFileInput.click();
                }
            });
        }
        if (this.inspectionFileInput) {
            this.inspectionFileInput.addEventListener('change', (e) => {
                this.handleInspectionFileSelect(e);
            });
        }

        // AWR选项卡切换
        document.querySelectorAll('.awr-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchAwrTab(btn.dataset.tab);
            });
        });

        // 历史记录刷新按钮
        // 搜索按钮事件
        const searchBtn = document.getElementById('awrRefreshHistoryBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleAwrSearch();
            });
        }

        // 重置按钮事件
        const resetBtn = document.getElementById('awrResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.handleAwrReset();
            });
        }

        // 分页按钮
        const prevBtn = document.getElementById('awrPrevPageBtn');
        const nextBtn = document.getElementById('awrNextPageBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.awrHistoryCurrentPage > 1) {
                    // 保持当前筛选条件
                    const startTime = this.getDateTimeInputValue('awrStartTime');
                    const endTime = this.getDateTimeInputValue('awrEndTime');
                    const status = document.getElementById('awrStatusFilter')?.value || '';
                    this.loadAwrHistoryList(this.awrHistoryCurrentPage - 1, this.awrHistoryPageSize, '', startTime, endTime, status);
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.awrHistoryTotal / this.awrHistoryPageSize);
                if (this.awrHistoryCurrentPage < totalPages) {
                    // 保持当前筛选条件
                    const startTime = this.getDateTimeInputValue('awrStartTime');
                    const endTime = this.getDateTimeInputValue('awrEndTime');
                    const status = document.getElementById('awrStatusFilter')?.value || '';
                    this.loadAwrHistoryList(this.awrHistoryCurrentPage + 1, this.awrHistoryPageSize, '', startTime, endTime, status);
                }
            });
        }

        // 搜索功能（防抖）
        // 移除实时搜索，改为点击搜索按钮触发
        // 搜索输入框的实时搜索已移除，现在需要点击搜索按钮

        // 回到顶部按钮事件
        if (this.backToTopBtn) {
            this.backToTopBtn.addEventListener('click', () => this.scrollToTop());
        }

        // 监听滚动事件，控制回到顶部按钮的显示
        window.addEventListener('scroll', () => this.handleScroll());

        // 监听存储变化，当设置发生变化时重新检查配置状态
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.providers || changes.models) {
                    console.log('检测到配置变化，重新加载设置...');
                    // 延迟重新加载，确保设置已保存
                    setTimeout(() => {
                        this.loadSettings();
                    }, 500);
                }
                if (changes.uiLanguage) {
                    const newLanguage = changes.uiLanguage.newValue || this.i18n.defaultLanguage;
                    this.applyLanguage(newLanguage, { persist: false }).catch(error => {
                        console.error('应用存储语言变更失败:', error);
                    });
                }
            }
        });

        // 打开完整页面按钮
        const openFullPageBtn = document.getElementById('openFullPageBtn');
        if (openFullPageBtn) {
            openFullPageBtn.addEventListener('click', () => this.openFullPage());
        }
        // 添加复制问题按钮的事件监听器
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-question-btn')) {
                this.copyQuestionText(e.target.closest('.copy-question-btn'));
            }
        });
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
        await this.applyLanguage(this.currentLanguage, { persist: false, updateSwitcher: this.hasStoredLanguagePreference });
    }

    loadModelOptions() {
        const select = this.modelSelect;
        select.innerHTML = '';

        if (this.models.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = this.t('popup.main.option.noModelConfigured');
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
        if (!select) return;

        this.previousKnowledgeBaseValue = select.value || '';
        select.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = this.t('popup.main.option.knowledgeNone');
        select.appendChild(defaultOption);

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
        // 知识库选项加载完成后，更新字符计数显示
        this.updateCharacterCount();
    }
    // 从知识库管理器加载知识库
    async loadKnowledgeBasesFromManager() {
        try {
            // 优先尝试从API获取
            console.log('尝试从API获取知识库列表...');
            const apiResult = await this.loadKnowledgeBasesFromAPI();
            if (apiResult.success) {
                console.log('从API成功获取知识库列表:', apiResult.data);
                this.renderKnowledgeBasesFromData(apiResult.data);
                return;
            }

            // API失败，尝试从知识库管理器获取
            console.log('API获取失败，尝试从知识库管理器获取...');
            const knowledgeBases = window.knowledgeBaseManager.getKnowledgeBases();

            if (knowledgeBases && knowledgeBases.length > 0) {
                this.renderKnowledgeBasesFromData(knowledgeBases);
            } else {
                console.log('知识库列表为空');
                this.loadDefaultKnowledgeBases();
            }
        } catch (error) {
            console.error('从知识库管理器加载失败:', error);
            await this.loadKnowledgeBasesDirectly();
        }
    }

    // 直接加载知识库配置（备用方案）
    async loadKnowledgeBasesDirectly() {
        try {
            console.log('尝试从API加载知识库列表...');

            // 优先尝试调用接口获取知识库列表
            const apiResult = await this.loadKnowledgeBasesFromAPI();
            if (apiResult.success) {
                console.log('从API成功获取知识库列表:', apiResult.data);
                this.renderKnowledgeBasesFromData(apiResult.data);
                return;
            }

            // API调用失败，尝试从配置文件加载
            console.log('API调用失败，尝试从配置文件加载...');
            await this.loadKnowledgeBasesFromConfig();

        } catch (error) {
            console.error('加载知识库列表失败:', error);
            // 如果所有方法都失败，使用硬编码的默认值
            this.loadDefaultKnowledgeBases();
        }
    }

    // 新增：从API加载知识库列表
    async loadKnowledgeBasesFromAPI() {
        try {
            console.log('正在调用知识库API...');
            const apiUrl = 'http://www.dbaiops.cn/api/knowledge-datasets/list';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // 如果需要发送请求体，可以在这里添加
                // body: JSON.stringify({})
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(this.t('popup.error.apiRequestFailedStatus', { status: response.status, statusText: response.statusText }));
            }

            const data = await response.json();
            console.log('API返回数据:', data);

            // 根据API返回的数据结构进行适配
            let knowledgeBases = [];

            if (data.status === "success" && Array.isArray(data.data)) {
                // 格式1: { status: "success", data: [...] }
                knowledgeBases = data.data;
            } else if (data.success && Array.isArray(data.data)) {
                // 格式2: { success: true, data: [...] }
                knowledgeBases = data.data;
            } else if (Array.isArray(data)) {
                // 格式3: 直接返回数组
                knowledgeBases = data;
            } else if (data.knowledge_bases && Array.isArray(data.knowledge_bases)) {
                // 格式4: { knowledge_bases: [...] }
                knowledgeBases = data.knowledge_bases;
            } else {
                throw new Error(this.t('popup.error.apiUnexpectedFormat'));
            }

            // 验证数据格式
            if (!knowledgeBases.every(kb => (kb.id || kb.code) && kb.name)) {
                throw new Error(this.t('popup.error.kbDataInvalid'));
            }

            // 数据格式标准化，确保id字段存在
            knowledgeBases = knowledgeBases.map(kb => ({
                ...kb,
                id: kb.code || kb.id // 优先使用code字段作为id
            }));

            return {
                success: true,
                data: knowledgeBases
            };

        } catch (error) {
            console.error('API调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 新增：从配置文件加载知识库列表
    async loadKnowledgeBasesFromConfig() {
        try {
            console.log('从配置文件加载知识库列表...');
            const language = this.currentLanguage || this.i18n?.defaultLanguage || 'zhcn';
            const fallbackFile = 'config/knowledge_bases.json';
            const languageSpecificFile = language === 'en' ? 'config/knowledge_bases_en.json' : fallbackFile;

            const fetchConfig = async (file) => {
                const url = chrome.runtime.getURL(file);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`配置文件加载失败: ${file} (${response.status})`);
                }
                return response.json();
            };

            let config;
            try {
                config = await fetchConfig(languageSpecificFile);
            } catch (langError) {
                if (languageSpecificFile !== fallbackFile) {
                    console.warn(`加载语言专属知识库配置失败，回退到默认配置: ${langError.message}`);
                    config = await fetchConfig(fallbackFile);
                } else {
                    throw langError;
                }
            }

            const knowledgeBases = Array.isArray(config.knowledge_bases) ? config.knowledge_bases : [];
            console.log('从配置文件加载的知识库列表:', knowledgeBases);
            this.renderKnowledgeBasesFromData(knowledgeBases);

        } catch (error) {
            console.error('从配置文件加载知识库列表失败:', error);
            throw error; // 继续抛出错误，让上层处理
        }
    }

    // 新增：渲染知识库数据到下拉框
    getLanguageCandidateKeys(language) {
        const lang = (language || '').toString().toLowerCase();
        const normalized = typeof this.i18n?.normalizeLanguage === 'function'
            ? this.i18n.normalizeLanguage(lang)
            : lang;
        const candidates = new Set();
        const addCandidate = (value) => {
            if (!value) return;
            candidates.add(value.toLowerCase());
        };

        addCandidate(normalized);
        addCandidate(normalized.replace('-', '_'));
        addCandidate(normalized.replace('_', '-'));
        addCandidate(normalized.replace(/[-_]/g, ''));

        normalized.split(/[-_]/).forEach(addCandidate);

        const aliasMap = {
            'zhcn': ['zh', 'zh-cn', 'zh_cn', 'cn', 'zh-hans', 'zh_hans'],
            'zh-tw': ['zh-tw', 'zh_tw', 'tw', 'zh-hant', 'zh_hant'],
            'en': ['en', 'en-us', 'en_us', 'en-gb', 'en_gb'],
            'jap': ['jap', 'ja', 'jp', 'ja-jp', 'ja_jp']
        };
        (aliasMap[normalized] || []).forEach(addCandidate);

        return Array.from(candidates).filter(Boolean);
    }

    getLocalizedValue(value, defaultValue = '') {
        if (value === null || value === undefined) {
            return defaultValue;
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value !== 'object') {
            return defaultValue;
        }

        const language = this.currentLanguage || this.i18n?.defaultLanguage || 'zhcn';
        const fallbackLanguage = this.i18n?.fallbackLanguage || 'zhcn';

        const searchKeys = [
            ...this.getLanguageCandidateKeys(language),
            ...this.getLanguageCandidateKeys(fallbackLanguage)
        ];

        for (const key of searchKeys) {
            if (key && Object.prototype.hasOwnProperty.call(value, key)) {
                const candidate = value[key];
                if (typeof candidate === 'string' && candidate.trim() !== '') {
                    return candidate;
                }
            }
        }

        const firstString = Object.values(value).find(item => typeof item === 'string' && item.trim() !== '');
        return firstString !== undefined ? firstString : defaultValue;
    }

    // 格式化知识库显示名称
    formatKnowledgeBaseName(name) {
        const normalizationMap = {
            'Mysql生态': 'MySQL',
            'Mysql,PG兼容生态': 'PostgreSQL'
        };
        const language = this.currentLanguage || this.i18n?.defaultLanguage || 'zhcn';
        const sourceName = this.getLocalizedValue(name, typeof name === 'string' ? name : '');
        if (!sourceName) {
            return '';
        }

        const normalizedName = normalizationMap[sourceName] || sourceName;
        const defaultMap = {
            'MySQL兼容': 'MySQL',
            'PG兼容生态': 'PostgreSQL',
            '盘古数据库': '盘古(PanGu)'
        };

        if (language === 'en') {
            if (!/[\u4e00-\u9fff]/.test(sourceName)) {
                return normalizedName;
            }
            const englishMap = {
                'MySQL兼容': 'MySQL Compatible',
                'Mysql生态': 'MySQL Ecosystem',
                'Mysql,PG兼容生态': 'PostgreSQL Compatible Ecosystem',
                'PG兼容生态': 'PostgreSQL Compatible Ecosystem',
                '盘古数据库': 'Pangu (PanGu)',
                '磐维': 'Panwei',
                '达梦': 'Dameng',
                'Gbase': 'GBase',
                'Gbase 分布式': 'GBase Distributed',
                'GBase 分布式': 'GBase Distributed',
                '神通-OSCAR': 'Shentong OSCAR',
                '虚谷数据库': 'Xugu Database',
                '操作系统': 'Operating Systems',
                'KingBase': 'Kingbase',
                'OpenGauss': 'openGauss'
            };
            return englishMap[sourceName] || englishMap[normalizedName] || normalizedName;
        }

        if (language === 'zh-tw') {
            const traditionalMap = {
                '知识库': '知識庫',
                '盘古数据库': '盤古資料庫',
                '磐维': '磐維',
                '操作系统': '操作系統'
            };
            return traditionalMap[sourceName] || traditionalMap[normalizedName] || defaultMap[sourceName] || defaultMap[normalizedName] || normalizedName;
        }

        return defaultMap[sourceName] || defaultMap[normalizedName] || normalizedName;
    }

    normalizeDatasetName(localizedName, datasetName, language) {
        const normalizedLanguage = typeof this.i18n?.normalizeLanguage === 'function'
            ? this.i18n.normalizeLanguage(language)
            : (language || '').toLowerCase();
        const fallbackLang = typeof this.i18n?.normalizeLanguage === 'function'
            ? this.i18n.normalizeLanguage(this.i18n?.fallbackLanguage || 'zhcn')
            : (this.i18n?.fallbackLanguage || 'zhcn').toLowerCase();
        const rawName = this.getLocalizedValue(datasetName, typeof datasetName === 'string' ? datasetName : '');
        const trimmed = (rawName || '').trim();
        const suffixMap = {
            'zhcn': '知识库',
            'zh-tw': '知識庫',
            'en': 'Knowledge Base',
            'jap': 'ナレッジベース'
        };
        const suffix = suffixMap[normalizedLanguage] || suffixMap[fallbackLang] || 'Knowledge Base';
        const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
        const hasEnglish = /[A-Za-z]/.test(trimmed);

        if (!localizedName) {
            return trimmed || '';
        }

        if (!trimmed) {
            return `${localizedName} ${suffix}`.trim();
        }

        if (normalizedLanguage === 'en') {
            if (hasChinese) {
                return `${localizedName} ${suffix}`.trim();
            }
            return trimmed.replace(/知识库|知識庫/g, 'Knowledge Base');
        }

        if (normalizedLanguage === 'zh-tw') {
            if (!hasChinese && hasEnglish) {
                return trimmed.replace(/Knowledge Base/gi, suffix);
            }
            return trimmed.replace(/知识库/g, suffix);
        }

        if (!hasChinese && hasEnglish) {
            return trimmed.replace(/Knowledge Base/gi, suffix);
        }

        return trimmed;
    }

    localizeKnowledgeBase(kb) {
        if (!kb) return kb;
        const language = this.currentLanguage || this.i18n?.defaultLanguage || 'zhcn';
        let localizedName = this.formatKnowledgeBaseName(kb.name);
        if (!localizedName) {
            const fallbackName = this.getLocalizedValue(kb.name, typeof kb.name === 'string' ? kb.name : '');
            localizedName = fallbackName || kb.id || '';
        }
        const datasetName = this.normalizeDatasetName(localizedName, kb.dataset_name, language);

        return {
            ...kb,
            name: localizedName,
            dataset_name: datasetName
        };
    }

    renderKnowledgeBasesFromData(knowledgeBases) {
        const select = this.knowledgeBaseSelect;
        if (!select || !Array.isArray(knowledgeBases)) return;

        const optionById = new Map();
        Array.from(select.options).forEach(option => {
            try {
                const value = JSON.parse(option.value);
                if (value && value.id) {
                    optionById.set(value.id, option);
                }
            } catch (e) {
                // 忽略默认项或解析失败的选项
            }
        });

        // 清理非默认项，避免语言切换时残留旧文案
        Array.from(select.options).forEach(option => {
            if (option.value) {
                select.removeChild(option);
            }
        });

        let appendedCount = 0;

        knowledgeBases.forEach(kb => {
            const localized = this.localizeKnowledgeBase(kb);
            let option = optionById.get(localized.id);
            if (!option) {
                option = document.createElement('option');
                optionById.set(localized.id, option);
                appendedCount += 1;
            }
            option.value = JSON.stringify(localized);
            option.textContent = localized.name;
            select.appendChild(option);
        });

        console.log(`成功加载 ${knowledgeBases.length} 个知识库选项 (新增 ${appendedCount} 个)`);
        if (this.previousKnowledgeBaseValue) {
            select.value = this.previousKnowledgeBaseValue;
            this.previousKnowledgeBaseValue = '';
        }
        this.updateCharacterCount(); // 添加这行
    }

    // 加载硬编码的默认知识库（最终备用方案）
    loadDefaultKnowledgeBases() {
        console.log('使用硬编码的默认知识库列表');

        const language = this.currentLanguage || this.i18n?.defaultLanguage || "zhcn";
        const isEnglish = language === "en";

        const baseKnowledgeBases = [
            {
                id: "2101",
                name: { zh: "Oracle", en: "Oracle" },
                dataset_name: { zh: "Oracle 知识库", en: "Oracle Knowledge Base" }
            },
            {
                id: "2102",
                name: { zh: "MySQL兼容", en: "MySQL Compatible" },
                dataset_name: { zh: "MySQL兼容 知识库", en: "MySQL Compatible Knowledge Base" }
            },
            {
                id: "2103",
                name: { zh: "达梦", en: "Dameng" },
                dataset_name: { zh: "达梦 知识库", en: "Dameng Knowledge Base" }
            },
            {
                id: "2104",
                name: { zh: "PG兼容生态", en: "PostgreSQL Compatible Ecosystem" },
                dataset_name: { zh: "PG兼容生态 知识库", en: "PostgreSQL Compatible Ecosystem Knowledge Base" }
            },
            {
                id: "2105",
                name: { zh: "SQL Server", en: "SQL Server" },
                dataset_name: { zh: "SQL Server 知识库", en: "SQL Server Knowledge Base" }
            },
            {
                id: "2106",
                name: { zh: "神通-OSCAR", en: "Shentong OSCAR" },
                dataset_name: { zh: "神通-OSCAR 知识库", en: "Shentong OSCAR Knowledge Base" }
            },
            {
                id: "2107",
                name: { zh: "YashanDB", en: "YashanDB" },
                dataset_name: { zh: "YashanDB 知识库", en: "YashanDB Knowledge Base" }
            },
            {
                id: "2108",
                name: { zh: "Redis", en: "Redis" },
                dataset_name: { zh: "Redis 知识库", en: "Redis Knowledge Base" }
            },
            {
                id: "2109",
                name: { zh: "MongoDB", en: "MongoDB" },
                dataset_name: { zh: "MongoDB 知识库", en: "MongoDB Knowledge Base" }
            },
            {
                id: "2110",
                name: { zh: "Redis Cluster", en: "Redis Cluster" },
                dataset_name: { zh: "Redis Cluster 知识库", en: "Redis Cluster Knowledge Base" }
            },
            {
                id: "2111",
                name: { zh: "DB2", en: "DB2" },
                dataset_name: { zh: "DB2 知识库", en: "DB2 Knowledge Base" }
            },
            {
                id: "2114",
                name: { zh: "KingBase", en: "Kingbase" },
                dataset_name: { zh: "KingBase 知识库", en: "Kingbase Knowledge Base" }
            },
            {
                id: "2115",
                name: { zh: "Gbase", en: "GBase" },
                dataset_name: { zh: "Gbase 知识库", en: "GBase Knowledge Base" }
            },
            {
                id: "2116",
                name: { zh: "磐维", en: "Panwei" },
                dataset_name: { zh: "磐维 知识库", en: "Panwei Knowledge Base" }
            },
            {
                id: "2117",
                name: { zh: "OpenGauss", en: "openGauss" },
                dataset_name: { zh: "OpenGauss 知识库", en: "openGauss Knowledge Base" }
            },
            {
                id: "2201",
                name: { zh: "TDSQL", en: "TDSQL" },
                dataset_name: { zh: "TDSQL 知识库", en: "TDSQL Knowledge Base" }
            },
            {
                id: "2202",
                name: { zh: "GaussDB", en: "GaussDB" },
                dataset_name: { zh: "GaussDB 知识库", en: "GaussDB Knowledge Base" }
            },
            {
                id: "2203",
                name: { zh: "OceanBase", en: "OceanBase" },
                dataset_name: { zh: "OceanBase 知识库", en: "OceanBase Knowledge Base" }
            },
            {
                id: "2204",
                name: { zh: "TiDB", en: "TiDB" },
                dataset_name: { zh: "TiDB 知识库", en: "TiDB Knowledge Base" }
            },
            {
                id: "2205",
                name: { zh: "GoldenDB", en: "GoldenDB" },
                dataset_name: { zh: "GoldenDB 知识库", en: "GoldenDB Knowledge Base" }
            },
            {
                id: "2206",
                name: { zh: "Gbase 分布式", en: "GBase Distributed" },
                dataset_name: { zh: "Gbase 分布式 知识库", en: "GBase Distributed Knowledge Base" }
            },
            {
                id: "2208",
                name: { zh: "GBase 8a", en: "GBase 8a" },
                dataset_name: { zh: "GBase 8a 知识库", en: "GBase 8a Knowledge Base" }
            },
            {
                id: "2209",
                name: { zh: "HashData", en: "HashData" },
                dataset_name: { zh: "HashData 知识库", en: "HashData Knowledge Base" }
            },
            {
                id: "2118",
                name: { zh: "GreatSQL", en: "GreatSQL" },
                dataset_name: { zh: "GreatSQL 知识库", en: "GreatSQL Knowledge Base" }
            },
            {
                id: "2119",
                name: { zh: "虚谷数据库", en: "Xugu Database" },
                dataset_name: { zh: "虚谷 知识库", en: "Xugu Knowledge Base" }
            },
            {
                id: "1111",
                name: { zh: "操作系统", en: "Operating Systems" },
                dataset_name: { zh: "操作系统 知识库", en: "Operating Systems Knowledge Base" }
            }
        ];

        const defaultKnowledgeBases = baseKnowledgeBases.map(item => ({
            id: item.id,
            name: isEnglish ? item.name.en : item.name.zh,
            dataset_name: isEnglish ? item.dataset_name.en : item.dataset_name.zh
        }));

        const select = this.knowledgeBaseSelect;
        defaultKnowledgeBases.forEach(kb => {
            const option = document.createElement('option');
            option.value = JSON.stringify(kb); // 存储完整的知识库对象
            option.textContent = this.formatKnowledgeBaseName(kb.name);
            select.appendChild(option);
        });

        console.log(`使用默认值，添加了 ${defaultKnowledgeBases.length} 个知识库选项`);
        if (this.previousKnowledgeBaseValue) {
            select.value = this.previousKnowledgeBaseValue;
            this.previousKnowledgeBaseValue = "";
        }
        this.updateCharacterCount(); // 添加这行
    }
    loadParameterRuleOptions() {
        try {
            const select = this.parameterRuleSelect;

            // 从Chrome存储中获取所有规则
            chrome.storage.sync.get(['rules', 'defaultRulesModified', 'uiLanguage'], (result) => {
                const savedRules = result.rules || [];
                const defaultRulesModified = result.defaultRulesModified || false;
                const uiLanguage = result.uiLanguage || 'zhcn';

                // 获取默认规则（根据当前语言）
                const defaultRules = this.getDefaultRulesByLanguage(uiLanguage);

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
                    option.textContent = this.t('popup.main.option.noParameterRuleConfigured');
                    option.disabled = true;
                    select.appendChild(option);
                } else {
                    // 使用所有规则（内置+用户自定义）
                    allRules.forEach((rule, index) => {
                        const option = document.createElement('option');
                        option.value = JSON.stringify(rule);
                        option.textContent = this.getParameterRuleDisplayName(rule);
                        if (rule.isDefault) {
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
            option.textContent = this.t('popup.main.option.parameterRuleLoadFailed');
            option.disabled = true;
            select.appendChild(option);
        }
    }

    // 根据语言获取默认规则
    getDefaultRulesByLanguage(language) {
        const languageMap = {
            'zhcn': 'zh-CN',
            'zh-tw': 'zh-CN',
            'en': 'en-US',
            'jap': 'ja-JP'
        };

        const targetLanguage = languageMap[language] || 'zh-CN';

        // 所有默认规则，按语言分组
        const allDefaultRules = [
            {
                "description": "适用于快速检索场景，返回更多相关结果",
                "id": "default-fast-search",
                "isDefault": true,
                "name": "精准检索",
                "similarity": 0.7,
                "topN": 6,
                "language": "zh-CN",
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
                "language": "zh-CN",
                "temperature": 1.0,
                "prompt": "你是一个专业的数据库专家，你的任务是基于提供的知识库内容为用户提供创新、全面的解答。\n\n## 回答要求\n1. 创新思维：\n   - 基于知识库内容进行多角度分析\n   - 提供创新的解决方案和思路\n   - 结合行业趋势和最佳实践\n   - 鼓励探索性思维\n\n2. 全面性：\n   - 不仅回答直接问题，还要考虑相关因素\n   - 提供多种可能的解决方案\n   - 分析不同场景下的适用性\n   - 包含风险评估和优化建议\n\n3. 版本信息处理：\n   - 开头注明：> 适用版本：{{version_info}}\n   - 如果不同版本有差异，需要明确指出\n   - 结尾再次确认：> 适用版本：{{version_info}}\n\n4. 回答结构：\n   - 先总结核心要点\n   - 分点详细展开\n   - 提供多种思路和方案\n   - 包含创新性建议和未来趋势\n\n5. 特殊情况处理：\n   - 如果信息不完整，提供多种可能的解决方案\n   - 如果存在版本差异，分析各版本的优劣势\n   - 可以适度提供创新性建议和未来发展方向\n\n## 重要：流式输出要求\n- 请直接开始回答，不要使用<think>标签进行思考\n- 立即开始输出内容，实现真正的实时流式体验\n- 边思考边输出，让用户能够实时看到回答过程\n\n请确保回答专业、创新、全面，并始终注意版本兼容性。如果分析Oracle的错误号ORA-XXXXX，则不能随意匹配其他类似错误号，必须严格匹配号码，只允许去除左侧的0或者在左侧填充0使之达到5位数字。"
            },
            {
                "description": "Suitable for fast search scenarios, returns more relevant results",
                "id": "default-fast-search-en",
                "isDefault": true,
                "name": "Precise Search",
                "similarity": 0.7,
                "topN": 6,
                "language": "en-US",
                "temperature": 0.7,
                "prompt": "You are a professional database expert. Your task is to provide accurate and practical answers to users based on the provided knowledge base content.\n\n## Answer Requirements\n1. Content Accuracy:\n   - Strictly answer based on the provided knowledge base content\n   - Prioritize high-relevance content\n   - Ensure information accuracy and completeness\n   - Can appropriately supplement relevant knowledge background\n\n2. Practicality:\n   - Provide actionable advice and steps\n   - Combine with actual application scenarios\n   - Include necessary precautions and best practices\n   - Add examples and explanations appropriately\n\n3. Version Information Handling:\n   - Note at the beginning: > Applicable Version: {{version_info}}\n   - If there are differences between versions, clearly indicate them\n   - Confirm again at the end: > Applicable Version: {{version_info}}\n\n4. Answer Structure:\n   - First summarize the core points\n   - Expand in detail point by point\n   - Provide specific examples if necessary\n   - Supplement relevant background knowledge appropriately\n\n5. Special Case Handling:\n   - If information is incomplete, clearly indicate the limitations\n   - If version differences exist, clearly explain the differences between versions\n   - Can appropriately provide relevant suggestions\n\n## Important: Streaming Output Requirements\n- Please start answering directly, do not use <think> tags for thinking\n- Immediately start outputting content to achieve a true real-time streaming experience\n- Think while outputting, allowing users to see the answering process in real-time\n\nPlease ensure answers are professional, accurate, and practical, and always pay attention to version compatibility. When analyzing Oracle error numbers ORA-XXXXX, do not arbitrarily match other similar error numbers. You must strictly match the number, only allowing removal of leading zeros or padding zeros on the left to make it 5 digits."
            },
            {
                "description": "Suitable for innovative thinking scenarios, provides multi-angle analysis and innovative solutions",
                "id": "default-flexible-search-en",
                "isDefault": false,
                "name": "Flexible Search",
                "similarity": 0.6,
                "topN": 8,
                "language": "en-US",
                "temperature": 1.0,
                "prompt": "You are a professional database expert. Your task is to provide innovative and comprehensive answers to users based on the provided knowledge base content.\n\n## Answer Requirements\n1. Innovative Thinking:\n   - Conduct multi-angle analysis based on knowledge base content\n   - Provide innovative solutions and ideas\n   - Combine industry trends and best practices\n   - Encourage exploratory thinking\n\n2. Comprehensiveness:\n   - Not only answer direct questions but also consider related factors\n   - Provide multiple possible solutions\n   - Analyze applicability in different scenarios\n   - Include risk assessment and optimization suggestions\n\n3. Version Information Handling:\n   - Note at the beginning: > Applicable Version: {{version_info}}\n   - If there are differences between versions, clearly indicate them\n   - Confirm again at the end: > Applicable Version: {{version_info}}\n\n4. Answer Structure:\n   - First summarize the core points\n   - Expand in detail point by point\n   - Provide multiple ideas and solutions\n   - Include innovative suggestions and future trends\n\n5. Special Case Handling:\n   - If information is incomplete, provide multiple possible solutions\n   - If version differences exist, analyze the advantages and disadvantages of each version\n   - Can appropriately provide innovative suggestions and future development directions\n\n## Important: Streaming Output Requirements\n- Please start answering directly, do not use <think> tags for thinking\n- Immediately start outputting content to achieve a true real-time streaming experience\n   - Think while outputting, allowing users to see the answering process in real-time\n\nPlease ensure answers are professional, innovative, and comprehensive, and always pay attention to version compatibility. When analyzing Oracle error numbers ORA-XXXXX, do not arbitrarily match other similar error numbers. You must strictly match the number, only allowing removal of leading zeros or padding zeros on the left to make it 5 digits."
            },
            {
                "description": "高速検索シーンに適用され、より関連性の高い結果を返します",
                "id": "default-fast-search-ja",
                "isDefault": true,
                "name": "精密検索",
                "similarity": 0.7,
                "topN": 6,
                "language": "ja-JP",
                "temperature": 0.7,
                "prompt": "あなたは専門的なデータベースエキスパートです。あなたのタスクは、提供されたナレッジベースのコンテンツに基づいて、ユーザーに正確で実用的な回答を提供することです。\n\n## 回答要件\n1. コンテンツの正確性：\n   - 提供されたナレッジベースのコンテンツに厳密に基づいて回答する\n   - 高関連性のコンテンツを優先的に使用する\n   - 情報の正確性と完全性を確保する\n   - 関連する知識背景を適度に補足できる\n\n2. 実用性：\n   - 実行可能なアドバイスと手順を提供する\n   - 実際のアプリケーションシナリオと組み合わせる\n   - 必要な注意事項とベストプラクティスを含める\n   - 例と説明を適切に追加する\n\n3. バージョン情報の処理：\n   - 冒頭に注記：> 適用バージョン：{{version_info}}\n   - 異なるバージョンに差異がある場合は、明確に指摘する\n   - 最後に再度確認：> 適用バージョン：{{version_info}}\n\n4. 回答構造：\n   - まず核心ポイントを要約する\n   - ポイントごとに詳細に展開する\n   - 必要に応じて具体的な例を提供する\n   - 関連する背景知識を適切に補足する\n\n5. 特殊ケースの処理：\n   - 情報が不完全な場合、情報の限界を明確に指摘する\n   - バージョンの差異が存在する場合、各バージョンの違いを明確に説明する\n   - 関連する提案を適度に提供できる\n\n## 重要：ストリーミング出力要件\n- <think>タグを使用して思考せず、直接回答を開始してください\n- コンテンツの出力を即座に開始し、真のリアルタイムストリーミング体験を実現する\n- 出力しながら思考し、ユーザーが回答プロセスをリアルタイムで確認できるようにする\n\n回答が専門的で、正確で、実用的であることを確保し、常にバージョン互換性に注意してください。Oracleのエラー番号ORA-XXXXXを分析する場合、他の類似するエラー番号を任意に一致させてはいけません。番号を厳密に一致させる必要があり、左側の0を削除するか、左側に0を埋めて5桁にすることを許可するのみです。"
            },
            {
                "description": "革新的な思考シーンに適用され、多角的な分析と革新的なソリューションを提供します",
                "id": "default-flexible-search-ja",
                "isDefault": false,
                "name": "柔軟検索",
                "similarity": 0.6,
                "topN": 8,
                "language": "ja-JP",
                "temperature": 1.0,
                "prompt": "あなたは専門的なデータベースエキスパートです。あなたのタスクは、提供されたナレッジベースのコンテンツに基づいて、ユーザーに革新的で包括的な回答を提供することです。\n\n## 回答要件\n1. 革新的な思考：\n   - ナレッジベースのコンテンツに基づいて多角的な分析を行う\n   - 革新的なソリューションとアイデアを提供する\n   - 業界のトレンドとベストプラクティスを組み合わせる\n   - 探索的思考を奨励する\n\n2. 包括性：\n   - 直接的な質問に答えるだけでなく、関連する要因も考慮する\n   - 複数の可能なソリューションを提供する\n   - 異なるシナリオでの適用性を分析する\n   - リスク評価と最適化提案を含める\n\n3. バージョン情報の処理：\n   - 冒頭に注記：> 適用バージョン：{{version_info}}\n   - 異なるバージョンに差異がある場合は、明確に指摘する\n   - 最後に再度確認：> 適用バージョン：{{version_info}}\n\n4. 回答構造：\n   - まず核心ポイントを要約する\n   - ポイントごとに詳細に展開する\n   - 複数のアイデアとソリューションを提供する\n   - 革新的な提案と将来のトレンドを含める\n\n5. 特殊ケースの处理：\n   - 信息が不完全な場合、複数の可能なソリューションを提供する\n   - バージョンの差異が存在する場合、各バージョンの優劣を分析する\n   - 革新的な提案と将来の発展方向を適度に提供できる\n\n## 重要：ストリーミング出力要件\n- <think>タグを使用して思考せず、直接回答を開始してください\n- コンテンツの出力を即座に開始し、真のリアルタイムストリーミング体験を実現する\n- 出力しながら思考し、ユーザーが回答プロセスをリアルタイムで確認できるようにする\n\n回答が専門的で、革新的で、包括的であることを確保し、常にバージョン互換性に注意してください。Oracleのエラー番号ORA-XXXXXを分析する場合、他の類似するエラー番号を任意に一致させてはいけません。番号を厳密に一致させる必要があり、左側の0を删除するか、左側に0を埋めて5桁にすることを許可するのみです。"
            }
        ];

        // 根据目标语言过滤规则
        return allDefaultRules.filter(rule => rule.language === targetLanguage);
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
        const builtInIds = ['default-fast-search', 'default-flexible-search', 'default-fast-search-en', 'default-flexible-search-en', 'default-fast-search-ja', 'default-flexible-search-ja'];
        return builtInIds.includes(ruleId);
    }
    getParameterRuleDisplayName(rule) {
        if (!rule) {
            return '';
        }

        if (this.isBuiltInRule(rule.id)) {
            let translationKey = '';
            if (rule.id === 'default-fast-search') {
                translationKey = 'popup.main.option.parameterRulePrecise';
            } else if (rule.id === 'default-flexible-search') {
                translationKey = 'popup.main.option.parameterRuleFlexible';
            }

            if (translationKey && typeof this.t === 'function') {
                const localized = this.t(translationKey);
                if (localized && typeof localized === 'string' && localized !== translationKey) {
                    return localized;
                }
            }

            const language = this.currentLanguage || this.i18n?.defaultLanguage || 'zhcn';
            const normalized = typeof this.i18n?.normalizeLanguage === 'function'
                ? this.i18n.normalizeLanguage(language)
                : language;

            const fallbackMap = {
                'default-fast-search': {
                    'zhcn': '精准检索',
                    'en': 'Precise search',
                    'zh-tw': '精準檢索',
                    'jap': '精密検索'
                },
                'default-flexible-search': {
                    'zhcn': '灵活检索',
                    'en': 'Flexible search',
                    'zh-tw': '靈活檢索',
                    'jap': '柔軟検索'
                }
            };

            const perLanguage = fallbackMap[rule.id];
            if (perLanguage) {
                const fallbackLanguage = this.i18n?.fallbackLanguage || 'zhcn';
                return perLanguage[normalized] || perLanguage[fallbackLanguage] || rule.name || translationKey;
            }
        }

        if (rule.name) {
            return rule.name;
        }

        return '';
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
                    letter_limit: this.knowledgeServiceConfig.letter_limit,
                    isOpenLetterLimit: this.knowledgeServiceConfig.isOpenLetterLimit,
                    updated_at: this.knowledgeServiceConfig.updated_at
                });
            } else {
                console.log('没有找到知识库服务配置，使用默认值');
                // 设置默认配置
                this.knowledgeServiceConfig = {
                    default_url: 'http://www.dbaiops.cn/api/chat/message',
                    api_key: '',
                    enabled: false,
                    updated_at: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('加载知识库服务配置失败:', error);
            // 设置默认配置
            this.knowledgeServiceConfig = {
                default_url: 'http://www.dbaiops.cn/api/chat/message',
                api_key: '',
                enabled: false,
                updated_at: new Date().toISOString()
            };
        }
        // 在方法最后添加同步调用
        await this.syncConfigFromFile();
    }
    async syncConfigFromFile() {
        try {
            // 读取配置文件
            const timestamp = new Date().getTime();
            const response = await fetch(chrome.runtime.getURL(`config/knowledge_service.json?t=${timestamp}`));
            if (!response.ok) {
                throw new Error(this.t('popup.error.configLoadFailed'));
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
            const hasChanges = this.hasConfigChanges(currentConfig, mergedConfig);

            if (hasChanges) {
                // 更新存储
                await chrome.storage.sync.set({ knowledgeServiceConfig: mergedConfig });

                // 更新当前配置
                this.knowledgeServiceConfig = mergedConfig;

                console.log('配置已从文件同步到存储:', mergedConfig);
            } else {
                console.log('配置无变化，跳过同步');
            }

            return true;

        } catch (error) {
            console.error('配置同步失败:', error);
            return false;
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
        // 保存当前标志状态，在字符长度判断后重置
        const shouldSkipCheck = this._skipLetterLimitCheck;
        // 记录开始时间
        this.startTime = Date.now();

        // 获取问题内容
        const question = this.questionInput.value.trim();
        if (!question) {
            this.showMessage(this.t('popup.message.enterQuestion'), 'error');
            this.isProcessing = false;
            return;
        }

        // 检查是否选择了知识库且输入字符少于等于5个
        const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
        debugger
        if (selectedKnowledgeBase && this.shouldCheckLetterLimit() && question.length <= this.getLetterLimit() && !shouldSkipCheck) {


            // 强制创建新的对话容器
            const conversationContainer = this.forceCreateNewConversationContainer();
            this.updateLayoutState();

            this.setLoading(true);
            // 显示建议问题
            await this.generateQuestionSuggestions(question, selectedKnowledgeBase, conversationContainer);
            this.isProcessing = false;
            return;
        } else {
            //清空操作
            this.questionInput.value = '';
            this.updateCharacterCount();
        }
        // 重置跳过字符限制检查的标志
        this._skipLetterLimitCheck = false;
        // 强制创建新的对话容器，确保每次对话都独立
        const conversationContainer = this.forceCreateNewConversationContainer();

        // 检查是否有配置的服务商和模型
        if (this.providers.length === 0) {
            this.showErrorResult(this.t('popup.error.providersNotConfigured'), 'model', conversationContainer);
            this.isProcessing = false;
            return;
        }

        if (this.models.length === 0) {
            this.showErrorResult(this.t('popup.error.modelNotConfigured'), 'model', conversationContainer);
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
                this.showErrorResult(this.t('popup.error.selectModel'), 'model', conversationContainer);
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
                this.showErrorResult(this.t('popup.error.modelOrProviderMissing'), 'model', conversationContainer);
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

            this.showErrorResult(this.t('popup.error.processingFailed', { error: error.message }), 'model', conversationContainer);
        } finally {
            this.setLoading(false);
            this.isProcessing = false; // 重置处理状态
        }
    }
    // 生成问题建议
    async generateQuestionSuggestions(shortQuestion, knowledgeBase, conversationContainer) {
        try {

            // 显示问题和AI助手
            this.updateQuestionDisplay(shortQuestion, conversationContainer);

            // 更新标题为生成建议状态
            const resultTitle = conversationContainer.querySelector('.result-title');
            if (resultTitle) {
                resultTitle.textContent = this.t('popup.suggestion.generating');
            }

            // 根据知识库类型确定专家类型
            const expertType = this.getExpertTypeFromKnowledgeBase(knowledgeBase);

            // 构建提示词
            const prompt = `你是一个${expertType}专家，你的任务是补全上述意图生成三条意思相近的用户查询，要求每条生成字数不能少于10字，返回的结果以数组形式放在固定字段。用户输入：${shortQuestion}`;

            // 调用API生成建议
            const suggestions = await this.callAPIForSuggestions(prompt, shortQuestion);

            // 显示建议问题
            this.displaySuggestions(suggestions, conversationContainer);

        } catch (error) {
            console.error('生成建议问题失败:', error);
            this.showErrorResult(this.t('popup.error.suggestionFailed'), 'error', conversationContainer);
        }
        // 更新会话历史，标记这不是第一次对话
        this.addToCurrentSessionHistory(shortQuestion, "已生成建议问题");
    }
    // 添加配置变化检查方法
    hasConfigChanges(oldConfig, newConfig) {
        const allFields = ['api_key', 'default_url', 'enabled', 'letter_limit', 'isOpenLetterLimit', 'updated_at'];
        return allFields.some(field => oldConfig[field] !== newConfig[field]);
    }
    // 根据知识库获取专家类型
    getExpertTypeFromKnowledgeBase(knowledgeBase) {
        const kbLower = knowledgeBase.toLowerCase();
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
        } else {
            return '数据库';
        }
    }

    // 调用API生成建议
    async callAPIForSuggestions(prompt, originalQuestion = '') {
        console.log('callAPIForSuggestions=======');
        // 获取选中的模型
        const selectedModelValue = this.modelSelect.value;
        if (!selectedModelValue) {
            throw new Error(this.t('popup.error.selectModel'));
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
            throw new Error(this.t('popup.error.modelOrProviderMissing'));
        }

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json'
        };

        // 使用现有的认证头设置方法
        this.setAuthHeaders(headers, provider);

        // 构建请求体 - 使用与现有代码相同的结构
        const suggestionSystemPrompt = this.applyLanguageInstructionToSystemContent(
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

        // 确保API端点正确
        let apiEndpoint = provider.apiEndpoint;
        if (apiEndpoint.indexOf("/chat/completions") === -1) {
            apiEndpoint = apiEndpoint + "/chat/completions";
        }

        try {
            // 调用API - 使用正确的属性名
            const response = await fetch(apiEndpoint, {
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

            const result = await response.json();
            const content = result.choices[0].message.content;

            // 解析返回的建议问题
            return this.parseSuggestions(content);

        } catch (error) {
            console.error('API调用失败:', error);
            throw error;
        }
    }
    // 检查是否应该进行字符限制检查
    shouldCheckLetterLimit() {
        return this.knowledgeServiceConfig && this.knowledgeServiceConfig.isOpenLetterLimit === true;
    }

    // 获取字符限制数量
    getLetterLimit() {
        return this.knowledgeServiceConfig && this.knowledgeServiceConfig.letter_limit ?
            this.knowledgeServiceConfig.letter_limit : 5;
    }
    // 解析建议问题
    parseSuggestions(content) {
        try {
            // 尝试解析 JSON 格式的 content
            const parsedContent = JSON.parse(content);

            // 如果包含 queries 数组，直接使用
            if (parsedContent.queries && Array.isArray(parsedContent.queries)) {
                return parsedContent.queries.slice(0, 3); // 最多返回3个建议
            }
        } catch (error) {
            // JSON 解析失败，使用原来的逻辑
            console.log('JSON解析失败，使用原有解析逻辑:', error);
        }

        // 原有的解析逻辑（作为备用）
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

        // 如果解析失败，生成默认建议
        if (suggestions.length === 0) {
            suggestions.push(
                "请详细说明您遇到的具体问题",
                "请提供更多关于您需求的详细信息",
                "请描述您希望实现的具体功能"
            );
        }
        return suggestions.slice(0, 3); // 最多返回3个建议
    }

    displaySuggestions(suggestions, conversationContainer) {
        // 更新标题
        const resultTitle = conversationContainer.querySelector('.result-title');
        if (resultTitle) {
            resultTitle.textContent = this.t('popup.suggestion.title');
        }
        // 显示结果容器
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        debugger
        // 判断是否是第一次对话（使用默认容器）
        const isFirstConversation = conversationContainer.id === 'conversation-default';

        let suggestionContainer;
        let suggestionList;

        if (isFirstConversation) {
            // 第一次对话：使用HTML中现有的固定ID结构
            suggestionContainer = conversationContainer.querySelector('#suggestionContainer');
            suggestionList = conversationContainer.querySelector('#suggestionList');
            debugger;
            if (suggestionContainer && suggestionList) {
                // 清空现有内容
                suggestionList.innerHTML = '';
                suggestionContainer.style.display = 'block';
            } else {
                // 如果HTML结构不存在，创建新的（备用方案）
                suggestionContainer = document.createElement('div');
                suggestionContainer.id = 'suggestionContainer';
                suggestionContainer.className = 'suggestion-container';
                suggestionContainer.style.display = 'block';

                const suggestionHeader = document.createElement('div');
                suggestionHeader.className = 'suggestion-header';
                suggestionHeader.innerHTML = this.t('popup.suggestion.headerHtml');

                suggestionList = document.createElement('div');
                suggestionList.id = 'suggestionList';
                suggestionList.className = 'suggestion-list';

                suggestionContainer.appendChild(suggestionHeader);
                suggestionContainer.appendChild(suggestionList);

                const resultText = conversationContainer.querySelector('.result-text');
                if (resultText) {
                    resultText.appendChild(suggestionContainer);
                }
            }
        } else {
            // 后续对话：使用时间戳ID，避免冲突
            // 先移除现有的建议容器
            const existingSuggestion = conversationContainer.querySelector('.suggestion-container');
            if (existingSuggestion) {
                existingSuggestion.remove();
            }

            // 创建新的建议容器
            suggestionContainer = document.createElement('div');
            suggestionContainer.id = `suggestionContainer-${Date.now()}`;
            suggestionContainer.className = 'suggestion-container';
            suggestionContainer.style.display = 'block';

            // 创建建议头部
            const suggestionHeader = document.createElement('div');
            suggestionHeader.className = 'suggestion-header';
            suggestionHeader.innerHTML = this.t('popup.suggestion.headerHtml');

            // 创建建议列表
            suggestionList = document.createElement('div');
            suggestionList.className = 'suggestion-list';

            // 组装建议容器
            suggestionContainer.appendChild(suggestionHeader);
            suggestionContainer.appendChild(suggestionList);

            // 添加到结果区域
            const resultText = conversationContainer.querySelector('.result-text');
            if (resultText) {
                resultText.appendChild(suggestionContainer);
            }
        }

        // 添加建议项（两种情况下都执行）
        suggestions.forEach((suggestion, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';

            suggestionItem.innerHTML = `
            <div class="suggestion-text">${suggestion}</div>
            <button class="suggestion-select-btn" data-suggestion="${suggestion}">选择此问题</button>
        `;

            // 添加点击事件
            const selectBtn = suggestionItem.querySelector('.suggestion-select-btn');
            selectBtn.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });

            suggestionList.appendChild(suggestionItem);

        });
        // 在建议问题列表后添加"保持原问题"选项
        const keepOriginalItem = document.createElement('div');
        keepOriginalItem.className = 'suggestion-item keep-original-item';
        keepOriginalItem.innerHTML = `
        <div class="suggestion-text">生成的建议问题中没有我想要的</div>
        <div class="suggestion-buttons">
        <button class="suggestion-select-btn keep-original-btn">直接问答</button>
        <button class="suggestion-select-btn regenerate-btn">重新生成</button>
    </div>
    `;
        // 添加重新生成按钮的点击事件
        const regenerateBtn = keepOriginalItem.querySelector('.regenerate-btn');
        regenerateBtn.addEventListener('click', () => {
            this.regenerateSuggestions();
        });
        // 添加点击事件
        const keepOriginalBtn = keepOriginalItem.querySelector('.keep-original-btn');
        keepOriginalBtn.addEventListener('click', () => {
            this.keepOriginalQuestion();
        });

        suggestionList.appendChild(keepOriginalItem);
        this.setLoading(false);
        const resultActions = conversationContainer.querySelector('.result-actions');
        if (resultActions) {
            resultActions.style.display = 'block';
            setTimeout(() => {
                resultActions.style.opacity = '1';
            }, 100);
        }
    }

    // 选择建议问题
    selectSuggestion(suggestion) {
        debugger;
        // 将建议问题填入输入框
        this.questionInput.value = suggestion;
        this.updateCharacterCount();

        // 清空结果容器
        if (this.resultContainer) {
            // this.resultContainer.style.display = 'none';
        }

        // 自动触发问答
        this.handleAskQuestion();
    }
    // 保持原问题继续问答
    keepOriginalQuestion() {
        // 获取原始问题（从当前对话容器中获取）
        const currentContainer = this.getCurrentConversationContainer();
        if (!currentContainer) {
            console.error('无法获取当前对话容器');
            return;
        }

        // 从对话容器中获取原始问题
        const questionDisplay = currentContainer.querySelector('.question-display .question-text');
        if (!questionDisplay) {
            console.error('无法获取原始问题');
            return;
        }

        const originalQuestion = questionDisplay.textContent.trim();

        // 将原始问题填入输入框
        this.questionInput.value = originalQuestion;
        this.updateCharacterCount();

        // 设置标志，跳过字符长度检查
        this._skipLetterLimitCheck = true;

        // 清空结果容器
        if (this.resultContainer) {
            // 可以选择清空或保留当前容器
        }

        // 自动触发问答
        this.handleAskQuestion();
    }
    // 重新生成建议问题
    async regenerateSuggestions() {
        // 获取原始问题（从当前对话容器中获取）
        const currentContainer = this.getCurrentConversationContainer();
        if (!currentContainer) {
            console.error('无法获取当前对话容器');
            return;
        }

        // 从对话容器中获取原始问题
        const questionDisplay = currentContainer.querySelector('.question-display .question-text');
        if (!questionDisplay) {
            console.error('无法获取原始问题');
            return;
        }

        const originalQuestion = questionDisplay.textContent.trim();

        // 将原始问题填入输入框
        this.questionInput.value = originalQuestion;
        this.updateCharacterCount();

        // 设置标志，跳过字符长度检查
        this._skipLetterLimitCheck = false;

        // 清空结果容器
        if (this.resultContainer) {
            // 可以选择清空或保留当前容器
        }

        // 自动触发问答
        this.handleAskQuestion();
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
        debugger;
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
    // 清空对话容器的辅助方法
    clearConversationContainer(container) {
        if (!container) return;

        // 保存反馈按钮状态
        const likeBtn = container.querySelector('.like-btn');
        const dislikeBtn = container.querySelector('.dislike-btn');
        const isLiked = likeBtn ? likeBtn.classList.contains('active') : false;
        const isDisliked = dislikeBtn ? dislikeBtn.classList.contains('active') : false;

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
            resultTitle.textContent = this.t('popup.result.title');
        }
        debugger;
        // 清空结果文本
        const resultText = container.querySelector('.result-text');
        if (resultText) {
            resultText.innerHTML = `
                <p class="result-text-tips"></p>
                <div class="result-text-content"></div>
                <div class="result-text-knowlist"></div>
                 <!-- 建议问题显示区域 -->
                
            `;
        }

        // 恢复反馈按钮状态
        if (likeBtn) {
            if (isLiked) {
                likeBtn.classList.add('active');
            } else {
                likeBtn.classList.remove('active');
            }
        }
        if (dislikeBtn) {
            if (isDisliked) {
                dislikeBtn.classList.add('active');
            } else {
                dislikeBtn.classList.remove('active');
            }
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
                resultTitle.textContent = this.t('popup.progress.failed');
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
            const solutionKeys = errorType === 'knowledge'
                ? [
                    'popup.error.solution.kbTestConnection',
                    'popup.error.solution.kbApiKey',
                    'popup.error.solution.kbReconfigure'
                ]
                : [
                    'popup.error.solution.modelConnection',
                    'popup.error.solution.modelSettings',
                    'popup.error.solution.modelApiKey',
                    'popup.error.solution.modelReconfigure'
                ];

            solutions = solutionKeys.map(key => this.t(key));

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
                        ${this.t('popup.error.title')}
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
                        <strong>${this.t('popup.error.solutionsTitle')}</strong>
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
                this.showErrorResult(this.t('popup.error.selectModel'), 'model', conversationContainer);
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
                this.showErrorResult(this.t('popup.error.modelOrProviderMissing'), 'model', conversationContainer);
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
            if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)') {
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
                    this.showErrorResult(this.t('popup.error.configureKnowledgeConnection'), 'knowledge', conversationContainer);
                    return;
                }

                // 检查知识库服务URL和API密钥
                if (!this.knowledgeServiceConfig.default_url || !this.knowledgeServiceConfig.api_key) {
                    console.log('配置检查失败:');
                    console.log('- default_url:', this.knowledgeServiceConfig.default_url);
                    console.log('- api_key:', this.knowledgeServiceConfig.api_key ? '已配置' : '未配置');

                    this.showErrorResult(this.t('popup.error.incompleteKnowledgeConfig'), 'knowledge', conversationContainer);
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
                        tipsEl.textContent = this.t('popup.progress.processing');
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
                        resultTitle.textContent = this.t('popup.progress.generating');
                    }

                    this.updateLayoutState();

                let knowledgeQuestion = question;
                if (this.shouldAddInstructionForQuestion(question)) {
                    knowledgeQuestion = await this.ensureChineseQuestion(question, provider, selectedModel);
                }

                const answer = await this.streamChat(
                    knowledgeQuestion,
                        this.knowledgeServiceConfig.default_url,
                        this.knowledgeServiceConfig.api_key,
                        selectedKnowledgeBase,
                        parameterRule, // 传递参数规则
                        selectedModel,
                        provider,
                    conversationContainer, // 传递对话容器
                    question // 保留用户原始问题用于展示
                    );

                    // 保存对话历史
                    this.saveConversationHistory(question, answer, `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, selectedKnowledgeBase, pageUrl);

                    return answer;
                } catch (streamError) {
                    debugger;
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
                            errorMessage = this.t('popup.error.kbNetworkFailed', { details: streamError.message ? `: ${streamError.message}` : '' });
                        } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                            errorMessage = this.t('popup.error.kbAuthFailed');
                        } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                            errorMessage = this.t('popup.error.kbPermissionDenied');
                        } else if (streamError.message.includes('未配置')) {
                            errorMessage = this.t('popup.error.kbConfigIncomplete');
                        } else if (streamError.message.includes('404')) {
                            errorMessage = this.t('popup.error.kbNotFound');
                        } else if (streamError.message.includes('500')) {
                            errorMessage = this.t('popup.error.kbInternal');
                        } else {
                            // 提取原始错误信息，避免重复
                            const originalError = streamError.message.replace(/知识库服务调用失败:|知识库查询失败:|知识库服务网络请求失败:/g, '').trim();
                            errorMessage = this.t('popup.error.kbCallFailed', { error: originalError || this.t('popup.common.unknownError') });
                        }
                    } else if (streamError.message.includes('大模型服务调用失败:') ||
                        streamError.message.includes('模型服务调用失败:') ||
                        streamError.message.includes('API调用失败:')) {
                        debugger;
                        // 大模型服务错误
                        errorType = 'model';
                        if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                            errorMessage = this.t('popup.error.modelNetworkFailed', { details: streamError.message ? `: ${streamError.message}` : '' });
                        } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                            errorMessage = this.t('popup.error.modelAuthFailed');
                        } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                            errorMessage = this.t('popup.error.modelPermissionDenied');
                        } else if (streamError.message.includes('未配置')) {
                            errorMessage = this.t('popup.error.modelConfigIncomplete');
                        } else if (streamError.message.includes('404')) {
                            errorMessage = this.t('popup.error.modelNotFound', { details: streamError.message ? `: ${streamError.message}` : '' });
                        } else if (streamError.message.includes('400')) {
                            errorMessage = this.t('popup.error.modelBadRequest', { details: '' });
                        } else if (streamError.message.includes('429')) {
                            errorMessage = this.t('popup.error.modelRateLimited');
                        } else if (streamError.message.includes('500')) {
                            errorMessage = this.t('popup.error.modelInternal');
                        } else {
                            // 提取原始错误信息，避免重复
                            const originalError = streamError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                            errorMessage = this.t('popup.error.modelCallFailed', { error: originalError || this.t('popup.common.unknownError') });
                        }
                    } else {
                        // 其他错误，默认为大模型服务错误
                        if (streamError.message.includes("知识库")) {
                            errorType = 'knowledge';
                            if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                                errorMessage = this.t('popup.error.kbNetworkFailed', { details: streamError.message ? `: ${streamError.message}` : '' });
                            } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                                errorMessage = this.t('popup.error.kbAuthFailed');
                            } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                                errorMessage = this.t('popup.error.kbPermissionDenied');
                            } else if (streamError.message.includes('未配置')) {
                                errorMessage = this.t('popup.error.kbConfigIncomplete');
                            } else if (streamError.message.includes('404')) {
                                errorMessage = this.t('popup.error.kbNotFound');
                            } else if (streamError.message.includes('500')) {
                                errorMessage = this.t('popup.error.kbInternal');
                            } else {
                                // 提取原始错误信息，避免重复
                                const originalError = streamError.message.replace(/知识库服务调用失败:|知识库查询失败:|知识库服务网络请求失败:/g, '').trim();
                                errorMessage = this.t('popup.error.kbCallFailed', { error: originalError || this.t('popup.common.unknownError') });
                            }
                        } else {

                            debugger;
                            errorType = 'model';
                            if (streamError.message.includes('网络') || streamError.message.includes('连接') || streamError.message.includes('Failed to fetch')) {
                                errorMessage = this.t('popup.error.modelNetworkFailed', { details: streamError.message ? `: ${streamError.message}` : '' });
                            } else if (streamError.message.includes('认证') || streamError.message.includes('401')) {
                                errorMessage = this.t('popup.error.modelAuthFailed');
                            } else if (streamError.message.includes('权限') || streamError.message.includes('403')) {
                                errorMessage = this.t('popup.error.modelPermissionDenied');
                            } else if (streamError.message.includes('未配置')) {
                                errorMessage = this.t('popup.error.modelConfigIncomplete');
                            } else if (streamError.message.includes('404')) {
                                errorMessage = this.t('popup.error.modelNotFound', { details: streamError.message ? `: ${streamError.message}` : '' });
                            } else if (streamError.message.includes('400')) {
                                errorMessage = this.t('popup.error.modelBadRequest', { details: streamError.message ? `: ${streamError.message}` : '' });
                            } else if (streamError.message.includes('429')) {
                                errorMessage = this.t('popup.error.modelRateLimited');
                            } else if (streamError.message.includes('500')) {
                                errorMessage = this.t('popup.error.modelInternal');
                            } else {
                                // 提取原始错误信息，避免重复
                                const originalError = streamError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                                errorMessage = this.t('popup.error.modelCallFailed', { error: originalError || this.t('popup.common.unknownError') });
                            }
                        }

                    }

                    this.showErrorResult(errorMessage, errorType, conversationContainer);
                    return;
                }
            } else {
                debugger;
                // 不使用知识库(None)，直接调用AI API
                try {
                    let answer;
                    console.log("-----provider------", provider);
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
                    let errorMessage = this.t('popup.error.modelCallFailed', { error: this.t('popup.common.unknownError') });

                    debugger;
                    // 根据具体错误类型提供更精准的信息
                    if (apiError.message.includes('网络') || apiError.message.includes('连接') || apiError.message.includes('Failed to fetch')) {
                        errorMessage = this.t('popup.error.modelNetworkFailed', { details: apiError.message ? `: ${apiError.message}` : '' });
                    } else if (apiError.message.includes('认证') || apiError.message.includes('401')) {
                        errorMessage = this.t('popup.error.modelAuthFailed');
                    } else if (apiError.message.includes('权限') || apiError.message.includes('403')) {
                        errorMessage = this.t('popup.error.modelPermissionDenied');
                    } else if (apiError.message.includes('未配置')) {
                        errorMessage = this.t('popup.error.modelConfigIncomplete');
                    } else if (apiError.message.includes('404')) {
                        errorMessage = this.t('popup.error.modelNotFound', { details: apiError.message ? `: ${apiError.message}` : '' });
                    } else if (apiError.message.includes('400')) {
                        errorMessage = this.t('popup.error.modelBadRequest', { details: apiError.message ? `: ${apiError.message}` : '' });
                    } else if (apiError.message.includes('429')) {
                        errorMessage = this.t('popup.error.modelRateLimited');
                    } else if (apiError.message.includes('500')) {
                        errorMessage = this.t('popup.error.modelInternal');
                    } else {
                        // 提取原始错误信息，避免重复
                        const originalError = apiError.message.replace(/模型服务调用失败:|API调用失败:|大模型服务调用失败:/g, '').trim();
                        errorMessage = this.t('popup.error.modelCallFailed', { error: originalError || this.t('popup.common.unknownError') });
                    }

                    this.showErrorResult(errorMessage, 'model', conversationContainer);
                    return;
                }
            }
        } catch (error) {
            console.error('处理问题过程中发生错误:', error);
            this.showErrorResult(this.t('popup.error.processingDuring', { error: error.message }), 'model', conversationContainer);
            return;
        }
    }

    async callAIAPI(question, pageContent, pageUrl, provider, model, knowledgeBaseId = null, parameterRule = null, container = null) {
       console.log('callAIAPI=======');
       
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

        console.log("-----question", question);
        console.log("-----pageContent", pageContent);
        console.log("-----pageUrl", pageUrl);
        console.log("-----provider", provider);
        console.log("-----model", model);

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
            tipsEl.textContent = this.t('popup.progress.processing');
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
            resultTitle.textContent = this.t('popup.progress.generating');
        }

        this.updateLayoutState();

        var context = `页面URL: ${pageUrl}\n页面内容: ${pageContent.substring(0, 2000)}...`;

        // 构建系统提示词
        let systemContent = "你是一个智能问答助手，基于用户提供的页面内容来回答问题。请提供准确、有用的回答。";

        // 添加参数规则调试信息
        console.log('=== 参数规则调试信息 ===');
        console.log('parameterRule:', parameterRule);
        if (parameterRule) {
            // console.log('parameterRule.prompt:', parameterRule.prompt);
            console.log('parameterRule.similarity:', parameterRule.similarity);
            console.log('parameterRule.topN:', parameterRule.topN);
            console.log('parameterRule.temperature:', parameterRule.temperature);
        }
        console.log('========================');
        // 如果选择了参数规则，使用规则中的提示词
        if (parameterRule && parameterRule.prompt) {
            let rulePrompt = parameterRule.prompt;
            rulePrompt = this.applyLanguageInstructionToSystemContent(rulePrompt, question);
            // 合并提示词：规则提示 + 基础提示（保持原有结构，规则优先）
            systemContent = `${rulePrompt}\n\n${systemContent}`;
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
        } else {
            context = `${question}`;
        }

        console.log('知识库处理后的systemContent:', systemContent);
        systemContent = this.applyLanguageInstructionToSystemContent(systemContent, question);

        // 构建对话历史消息
        const messages = [
            {
                role: "system",
                content: systemContent
            }
        ];

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
        } else {
            requestBody.temperature = 0.7;
        }



        const headers = {
            'Content-Type': 'application/json'
        };

        // 设置认证头
        this.setAuthHeaders(headers, provider);

        // 其他服务商使用标准的chat/completions接口
        if (provider.apiEndpoint.indexOf("/chat/completions") > -1) {
            provider.apiEndpoint = provider.apiEndpoint
        } else {
            provider.apiEndpoint = provider.apiEndpoint + "/chat/completions"
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
                        resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
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
        console.log('callOllamaAPI=======');
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

        console.log("-----question", question);
        console.log("-----pageContent", pageContent);
        console.log("-----pageUrl", pageUrl);
        console.log("-----provider", provider);
        console.log("-----model", model);

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
                tipsEl.textContent = this.t('popup.progress.processing');
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
            resultTitle.textContent = this.t('popup.progress.generating');
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
        systemContent = this.applyLanguageInstructionToSystemContent(systemContent, question);

        // 如果选择了参数规则，使用规则中的提示词
        if (parameterRule && parameterRule.prompt) {
            let rulePrompt = parameterRule.prompt;
            rulePrompt = this.applyLanguageInstructionToSystemContent(rulePrompt, question);
            // 规则提示词优先，保留基础提示作为补充
            systemContent = `${rulePrompt}\n\n${systemContent}`;
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
        } else {
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
        } else {
            requestBody.temperature = 0.7;
        }


        const headers = {
            'Content-Type': 'application/json'
        };

        // 设置认证头
        this.setAuthHeaders(headers, provider);
        // if (provider.apiEndpoint.includes('aliyuncs.com')) {
        //     // 通义千问使用不同的聊天接口
        //     if (provider.apiEndpoint.includes('/services/aigc/text-generation/generation')) {
        //         // 已经是正确的端点，保持不变
        //         console.log('使用通义千问API端点:', provider.apiEndpoint);
        //     } else {
        //         // 替换为通义千问的聊天接口
        //         provider.apiEndpoint = provider.apiEndpoint.replace('/compatible-mode/v1', '/compatible-mode/v1/services/aigc/text-generation/generation');
        //         console.log('转换为通义千问API端点:', provider.apiEndpoint);
        //     }
        // } else {
        //     // 其他服务商使用标准的chat/completions接口
        //     if(provider.apiEndpoint.indexOf("/chat/completions")>-1){
        //         provider.apiEndpoint=provider.apiEndpoint
        //     }else{
        //         provider.apiEndpoint=provider.apiEndpoint+"/chat/completions"
        //     }
        // }
        // 其他服务商使用标准的chat/completions接口
        if (provider.apiEndpoint.indexOf("/chat/completions") > -1) {
            provider.apiEndpoint = provider.apiEndpoint
        } else {
            provider.apiEndpoint = provider.apiEndpoint + "/chat/completions"
        }
        // if(provider.apiEndpoint.indexOf("/chat/completions")>-1){
        //     provider.apiEndpoint=provider.apiEndpoint
        // }else{
        //     provider.apiEndpoint=provider.apiEndpoint+"/chat/completions"
        // }
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
                // 显示result-actions
                const resultActions = conversationContainer.querySelector('.result-actions');
                if (resultActions) {
                    resultActions.style.display = 'block';
                    setTimeout(() => {
                        resultActions.style.opacity = '1';
                    }, 100);
                }
                // 计算用时并更新标题
                if (this.startTime) {
                    const endTime = Date.now();
                    const duration = Math.round((endTime - this.startTime) / 1000);
                    const resultTitle = conversationContainer.querySelector('.result-title');
                    if (resultTitle) {
                        resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
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
                    // this.resultText.innerHTML = formattedContent;
                    console.warn('未能获取到contentEl，跳过最终内容更新');
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
            // console.log('接收到数据块，长度:', chunk.length, 'buffer总长度:', buffer.length);

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
                            // this.resultText.innerHTML = finalFormattedContent;
                            console.warn('未能获取到contentEl，跳过最终内容更新');
                        }

                        // 设置最终提示
                        if (tipsEl) {
                            if (this._useKnowledgeBaseThisTime) {
                                const count = typeof this._kbMatchCount === 'number' ? this._kbMatchCount : 0;
                                if (count === 0) {
                                    tipsEl.innerHTML = this.t('popup.progress.kbNoMatch', { count });
                                } else {
                                    tipsEl.innerHTML = this.t('popup.progress.kbMatch', { count });
                                }
                            } else {
                                tipsEl.textContent = this.t('popup.progress.completedWithResult');
                            }
                        }

                        // 在流式输出结束后，如果使用了知识库且有条目，展示"参考知识库"列表
                        if (!this.hasBeenStopped && this._useKnowledgeBaseThisTime && Array.isArray(this._kbItems) && this._kbItems.length > 0) {
                            console.log('=== 准备渲染知识库列表 ===');
                            console.log('hasBeenStopped:', this.hasBeenStopped);
                            console.log('_useKnowledgeBaseThisTime:', this._useKnowledgeBaseThisTime);
                            // console.log('_kbItems:', this._kbItems);
                            // console.log('_kbItems.length:', this._kbItems.length);
                            // console.log('targetContainer:', targetContainer);
                            console.log('流式处理完成，渲染知识库列表，条目数量:', this._kbItems.length);
                            this.renderKnowledgeList(this._kbItems, targetContainer);
                        } else {
                            console.log('=== 不渲染知识库列表的原因 ===');
                            console.log('hasBeenStopped:', this.hasBeenStopped);
                            console.log('_useKnowledgeBaseThisTime:', this._useKnowledgeBaseThisTime);
                            // console.log('_kbItems:', this._kbItems);
                            // console.log('_kbItems type:', typeof this._kbItems);
                            // console.log('Array.isArray(_kbItems):', Array.isArray(this._kbItems));
                            console.log('_kbItemsLength:', Array.isArray(this._kbItems) ? this._kbItems.length : 'not array');
                            console.log('流式处理完成，不渲染知识库列表');
                        }

                        // 延迟执行提示信息替换，确保DOM更新完成
                        setTimeout(() => {
                            this.replaceProgressMessagesAfterStream();
                        }, 100);

                        // 重置反馈按钮状态
                        this.resetFeedbackButtons(targetContainer);
                        const resultActions = targetContainer ? targetContainer.querySelector('.result-actions') : null;
                        if (resultActions) {
                            resultActions.style.display = 'block';
                            // 使用setTimeout确保DOM更新后再显示
                            setTimeout(() => {
                                resultActions.style.opacity = '1';
                            }, 100);
                        }
                        // 更新标题显示完成状态和用时
                        if (this.startTime) {
                            const endTime = Date.now();
                            const duration = Math.round((endTime - this.startTime) / 1000);
                            const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                            if (resultTitle) {
                                resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
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
                                // console.log('接收到内容:', delta.content);
                                fullContent += delta.content;

                                // 使用防抖更新显示内容
                                await debouncedUpdate(fullContent);
                            }
                        }
                        // 处理其他可能的格式
                        else if (data.content) {
                            // console.log('接收到内容:', data.content);
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
                this.showMessage(this.t('popup.message.configureStreamUrl'), 'error');
                // this.openSettings();
                throw new Error(this.t('popup.message.configureStreamUrl'));
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
            throw new Error(this.t('popup.error.streamConfigFailed', { error: error.message }));
        }
    }
    // 流式聊天方法
    async streamChat(message, streamUrl = null, apiKey = null, knowledgeBaseId = null, parameterRule = null, model = null, provider = null, container = null, originalQuestion = null) {
        // 重新设置开始时间，确保每次对话都有正确的计时
        this.startTime = Date.now();

        // 重置停止状态，确保每次对话都有正确的状态
        this.hasBeenStopped = false;

        // 重置知识库使用状态，确保每次对话都有正确的状态
        this._useKnowledgeBaseThisTime = false;

        // 检查必要参数
        if (!streamUrl) {
            this.showMessage(this.t('popup.message.configureStreamUrl'), 'error');
            // 移除自动跳转，让用户自己决定是否去设置
            throw new Error(this.t('popup.message.configureStreamUrl'));
        }
        // if (!apiKey) {
        //     this.showMessage('请先在设置页面配置API密钥', 'error');
        //     // 移除自动跳转，让用户自己决定是否去设置
        //     throw new Error('未配置API密钥，请先在设置页面配置');
        // }

        // 界面显示逻辑已移至processQuestion方法中处理，这里不再重复

        try {
            const displayQuestion = originalQuestion || message;

            console.log('开始知识库查询请求:', message);
            console.log('使用配置 - streamUrl:', streamUrl);
            console.log('knowledgeBaseId:', knowledgeBaseId);
            console.log('parameterRule:', parameterRule);
            console.log('model:', model);
            console.log('provider:', provider);
            console.log('displayQuestion:', displayQuestion);

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
                language: this.getLanguageDisplayName(this.currentLanguage),
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
                throw new Error(this.t('popup.error.kbQueryFailed', { error: responseData.message || '未知错误' }));
            }

            // 提取data数组中的内容，并更新提示
            let contextContent = '';
            let matchCount = 0;
            let knowledgeItems = [];
            if (responseData.data && Array.isArray(responseData.data)) {
                knowledgeItems = responseData.data.map(item => (typeof item === 'string' ? item : String(item)));

                const targetLanguageName = this.getLanguageDisplayName(this.currentLanguage);
                const needContextTranslation = this.currentLanguage && this.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');

                if (needContextTranslation) {
                    try {
                        knowledgeItems = await this.translateKnowledgeItems(knowledgeItems, targetLanguageName, provider, model);
                    } catch (error) {
                        console.error('翻译知识库内容失败:', error);
                    }
                }

                contextContent = knowledgeItems.join('\n\n');
                matchCount = knowledgeItems.length;
                // 存储完整知识库条目，供结束后展示
                this._kbItems = knowledgeItems;
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
                    tipsEl.innerHTML = this.t('popup.progress.kbSearching', { count: matchCount });
                }
            }

            // 如果知识库返回0条，直接提示并终止，不调用大模型
            if (knowledgeBaseId && matchCount === 0) {
                // 使用传入的container参数而不是this.resultText
                const targetContainer = container || this.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;
                const tipsEl = resultText?.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = this.t('popup.progress.kbNoMatch', { count: matchCount });
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
                        resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
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
                let finalAnswer = await this.callOllamaAPI(
                    displayQuestion,
                    contextContent, // 使用知识库查询结果作为context
                    window.location.href, // 页面URL
                    provider,
                    model,
                    knowledgeBaseId,
                    parameterRule,
                    container // 传递当前对话容器
                );

                const targetLanguageName = this.getLanguageDisplayName(this.currentLanguage);
                const needsTranslation = this.currentLanguage && this.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');

                if (needsTranslation) {
                    try {
                        const translatedAnswer = await this.requestChatCompletionTranslation(
                            finalAnswer,
                            provider,
                            model,
                            targetLanguageName
                        );
                        if (translatedAnswer && translatedAnswer.trim()) {
                            finalAnswer = translatedAnswer.trim();
                        }
                    } catch (translationError) {
                        console.error('回答翻译成目标语言失败:', translationError);
                    }
                }

                return finalAnswer;
            } catch (modelError) {
                console.error('大模型服务调用失败:', modelError);
                // 直接抛出大模型服务错误，不包装成知识库服务错误
                throw new Error(this.t('popup.error.modelServiceFailed', { error: modelError.message }));
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
            // console.log('resultText元素:', this.resultText);
            console.log('resultContainer元素:', this.resultContainer);

            // 检查DOM元素是否正确初始化
            if (!this.resultText) {
                throw new Error(this.t('popup.error.resultTextMissing'));
            }

            if (!this.resultContainer) {
                throw new Error(this.t('popup.error.resultContainerMissing'));
            }

            // 获取当前选择的模型和服务商
            const selectedModelValue = this.modelSelect.value;
            if (!selectedModelValue) {
                throw new Error(this.t('popup.error.selectModel'));
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
                throw new Error(this.t('popup.error.modelOrProviderMissing'));
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
            testDiv.textContent = this.t('popup.stream.testing', { provider: provider.name });
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
                noResultDiv.textContent = this.t('popup.stream.noContent');
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
                errorDiv.innerHTML = this.t('popup.stream.testFailedHtml', { error: error.message });
                this.resultText.appendChild(errorDiv);
            }

            this.showMessage(this.t('popup.message.streamChatTestFailed', { 'error': error.message }), 'error');
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
            } else if (endpoint.includes('aliyun') || endpoint.includes('tongyi')) {
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
            this.showMessage(this.t('popup.message.generateSummaryHint'), 'info');
            return;
        }

        this.setLoading(true);

        try {
            // 直接对resultText区域的内容生成摘要
            const summary = await this.generateSummaryFromText(resultContent);
            this.showSummaryDialog(summary);
        } catch (error) {
            console.error('生成摘要失败:', error);
            this.showMessage(this.t('popup.message.generateSummaryError'), 'error');
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
                this.showMessage(this.t('popup.message.summaryCopied'), 'success');
            } catch (error) {
                console.error('复制失败:', error);
                this.showMessage(this.t('popup.message.copyFailed'), 'error');
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
            this.showMessage(this.t('popup.message.translateHint'), 'info');
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
                    copyTranslationBtn.innerHTML = this.t('popup.translation.copiedHtml');
                    copyTranslationBtn.style.background = '#28a745';

                    setTimeout(() => {
                        copyTranslationBtn.innerHTML = originalText;
                        copyTranslationBtn.style.background = '#007bff';
                    }, 2000);

                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage(this.t('popup.message.copyManual'), 'error');
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
                    copyTranslationBtn.innerHTML = this.t('popup.translation.copiedHtml');
                    copyTranslationBtn.style.background = '#28a745';

                    setTimeout(() => {
                        copyTranslationBtn.innerHTML = originalText;
                        copyTranslationBtn.style.background = '#007bff';
                    }, 2000);

                } catch (error) {
                    console.error('复制失败:', error);
                    this.showMessage(this.t('popup.message.copyManual'), 'error');
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
                throw new Error(this.t('popup.error.selectModel'));
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
                throw new Error(this.t('popup.error.modelOrProviderMissing'));
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
        chrome.runtime.sendMessage({ action: 'openFullPage' }, (response) => {
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

        // 立即更新字符计数显示（无论选择什么）
        this.updateCharacterCount();
        // 如果选择了"不使用知识库(None)"，清空知识库列表
        if (!selectedKnowledgeBase || selectedKnowledgeBase === '不使用知识库(None)') {
            console.log('handleKnowledgeBaseChange: 选择不使用知识库(None)，清空知识库列表');
            const knowlistEl = this.resultText?.querySelector('.result-text-knowlist');
            if (knowlistEl) {
                knowlistEl.innerHTML = '';
                console.log('知识库列表已清空');
            }
            // 重置状态变量
            this._useKnowledgeBaseThisTime = false;
            this._kbMatchCount = 0;
            this._kbItems = [];

            // 更新字符计数显示
            this.updateCharacterCount();
            return;
        }

        // 如果选择了知识库，更新字符计数显示
        this.updateCharacterCount();

        // 如果选择了知识库（不是"不使用知识库(None)"），检查知识库服务配置
        if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)') {
            // 重新加载知识库服务配置，确保获取最新配置
            console.log('选择知识库，重新加载配置...');
            await this.loadKnowledgeServiceConfig();

            // 检查知识库服务配置
            if (!this.knowledgeServiceConfig) {
                this.showMessage(this.t('popup.message.configureKbConnection'), 'error');
                return;
            }

            // 检查知识库服务URL是否配置
            if (!this.knowledgeServiceConfig.default_url || this.knowledgeServiceConfig.default_url.trim() === '') {
                this.showMessage(this.t('popup.message.configureKbUrl'), 'error');
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
                this.showMessage(this.t('popup.message.configureKbApiKey'), 'error');
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

    updateCharacterCount() {
        if (!this.questionInput || !this.charCount || !this.charCountContainer) return;

        const currentLength = this.questionInput.value.length;
        const selectedKnowledgeBase = this.knowledgeBaseSelect.value;
        const isUsingKnowledgeBase = selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)';
        const maxLength = isUsingKnowledgeBase ? 500 : Infinity;

        // 更新字符计数显示
        if (isUsingKnowledgeBase) {
            this.charCount.textContent = currentLength;
            this.charCountContainer.style.display = 'block';

            // 根据字符数量更新样式
            this.charCountContainer.classList.remove('warning', 'danger');

            if (currentLength >= maxLength) {
                this.charCountContainer.classList.add('danger');
            } else if (currentLength >= maxLength * 0.8) { // 80%时显示警告
                this.charCountContainer.classList.add('warning');
            }
        } else {
            // 不使用知识库(None)时隐藏字符计数
            this.charCountContainer.style.display = 'none';
            // 清除样式类
            this.charCountContainer.classList.remove('warning', 'danger');
        }
        const charCount = this.questionInput.value.length;
        const charCountElement = document.getElementById('charCount');
        if (charCountElement) {
            charCountElement.textContent = charCount;
        }

        // 如果输入框有内容且建议容器显示，则隐藏建议容器
        // if (charCount > 5) {
        //     const currentContainer = this.getCurrentConversationContainer();
        //     const suggestionContainer = currentContainer ? currentContainer.querySelector('.suggestion-container') : null;
        //     if (suggestionContainer && suggestionContainer.style.display === 'block') {
        //         suggestionContainer.style.display = 'none';
        //     }
        // }
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
    // 获取当前对话容器
    getCurrentConversationContainer() {
        // 获取所有对话容器
        const containers = this.resultContainer.querySelectorAll('.conversation-container');
        if (containers.length === 0) {
            return null;
        }

        // 返回最后一个容器（当前正在使用的）
        return containers[containers.length - 1];
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
        // 显示result-actions
        const resultActions = targetContainer ? targetContainer.querySelector('.result-actions') : this.resultContainer.querySelector('.result-actions');
        if (resultActions) {
            resultActions.style.display = 'block';
            // 使用setTimeout确保DOM更新后再显示
            setTimeout(() => {
                resultActions.style.opacity = '1';
            }, 100);
        }
        // 渲染结果到内容容器
        contentEl.innerHTML = this.formatContent(text);

        // 结束提示
        if (this._useKnowledgeBaseThisTime) {
            const count = typeof this._kbMatchCount === 'number' ? this._kbMatchCount : 0;
            if (count === 0) {
                tipsEl.innerHTML = this.t('popup.progress.kbNoMatch', { count });
            } else {
                tipsEl.innerHTML = this.t('popup.progress.kbMatch', { count });
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
            tipsEl.textContent = this.t('popup.progress.completedWithResult');
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
                resultTitle.textContent = this.t('popup.progress.answerCompleted', { seconds: duration });
            }
        }
    }

    showMessage(message, type = 'info', options = {}) {
        // options: { centered?: boolean, durationMs?: number, maxWidth?: string, background?: string }
        const { centered = false, durationMs = 3000, maxWidth, background } = options || {};

        // 创建临时消息显示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;

        const resolvedBg = background || (type === 'error' ? '#e74c3c' : (type === 'success' ? '#1e7e34' : '#3498db'));

        let baseStyle = `
			position: fixed;
			padding: 10px 15px;
			border-radius: 6px;
			color: white;
			font-size: 14px;
			z-index: 20000;
            background: ${resolvedBg};
			box-shadow: 0 2px 10px rgba(0,0,0,0.2);
		`;

        if (centered) {
            const widthStyle = maxWidth ? `max-width: ${maxWidth};` : '';
            baseStyle += `
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				text-align: center;
				${widthStyle}
			`;
        } else {
            baseStyle += `
				top: 20px;
				right: 20px;
			`;
        }

        messageDiv.style.cssText = baseStyle;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, Math.max(0, Number(durationMs) || 3000));
    }

    // 显示全局加载遮罩
    showLoadingOverlay(message) {
        const finalMessage = message || this.t('popup.progress.processing');
        // 避免重复创建
        let overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            const textEl = overlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = finalMessage;
            overlay.style.display = 'flex';
            return;
        }

        // 注入一次性样式（用于旋转动画）
        if (!document.getElementById('globalLoadingStyle')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'globalLoadingStyle';
            styleTag.textContent = `@keyframes bicqa_spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`;
            document.head.appendChild(styleTag);
        }

        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: #fff;
            border-radius: 10px;
            padding: 20px 24px;
            min-width: 260px;
            max-width: 320px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.15);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 22px; height: 22px;
            border: 3px solid #e9ecef;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: bicqa_spin 0.9s linear infinite;
        `;

        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = finalMessage;
        text.style.cssText = `
            font-size: 14px;
            color: #333;
        `;

        box.appendChild(spinner);
        box.appendChild(text);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    // 隐藏全局加载遮罩
    hideLoadingOverlay() {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async copyResult(container = null) {
        // 获取目标容器
        const targetContainer = container || this.resultContainer;
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;

        if (!resultText) {
            this.showMessage(this.t('popup.message.noContentToCopy'), 'error');
            return;
        }

        const text = resultText.textContent;
        try {
            await navigator.clipboard.writeText(text);
            this.showMessage(this.t('popup.message.copied'), 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showMessage(this.t('popup.message.copyFailed'), 'error');
        }
    }

    async exportResultAsHtml(container = null) {
        try {
            // 获取目标容器
            const targetContainer = container || this.resultContainer;
            const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;

            if (!resultText) {
                this.showMessage(this.t('popup.message.noContentToExport'), 'error');
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

            const locale = this.i18n?.getIntlLocale(this.currentLanguage);

            // 创建完整的HTML文档
            const fullHtml = `<!DOCTYPE html>
<html lang="${locale}">
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
            <div class="subtitle">导出时间：${now.toLocaleString(locale)}</div>
        </div>
        
        <div class="question-section">
            <div class="question-label">问题：</div>
            <div class="question-text">${this.escapeHtml(question)}</div>
            <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                <img src="icons/copy.svg" alt="复制" class="copy-icon">
            </button>
        </div>
        
        <div class="result-section">
            <div class="result-label">回答：</div>
            <div class="result-content">${resultHtml}</div>
        </div>
        
        <div class="meta-info">
            <p>由 BIC-QA 扩展生成 | 导出时间：${now.toLocaleString(locale)}</p>
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
                    toggleLink.textContent = this.t('popup.common.expandDetails');
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
                            toggleLink.textContent = this.t('popup.common.expandDetails');
                            
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
                            toggleLink.textContent = this.t('popup.common.collapseDetails');
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
                    toggleLink.textContent = this.t('popup.common.expandDetails');
                    fullContent.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;

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

            this.showMessage(this.t('popup.message.exportHtmlSuccess'), 'success');

        } catch (error) {
            console.error('导出失败:', error);
            this.showMessage(this.t('popup.message.exportFailed'), 'error');
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
                resultTitle.textContent = this.t('popup.result.title');
            }

            this.showMessage(this.t('popup.message.clearConversationSuccess'), 'success');
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
            resultTitle.textContent = this.t('popup.result.title');
        }

        // 清空输入框并聚焦
        this.questionInput.value = '';
        this.questionInput.focus();

        // 更新字符计数显示
        this.updateCharacterCount();

        // 更新布局状态
        this.updateLayoutState();

        // 重置反馈按钮状态
        this.resetFeedbackButtons();
    }

    // 处理用户反馈
    // 处理用户反馈
    handleFeedback(type, container) {
        const selectedKnowledgeBase = this.knowledgeBaseSelect.value;

        // 如果选择了"不使用知识库(None)"，清空知识库列表
        if (!selectedKnowledgeBase || selectedKnowledgeBase === '不使用知识库(None)') {
            if (container) {
                const likeBtn = container.querySelector('.like-btn');
                const dislikeBtn = container.querySelector('.dislike-btn');

                if (likeBtn && dislikeBtn) {
                    const isCurrentlyLiked = likeBtn.classList.contains('active');
                    const isCurrentlyDisliked = dislikeBtn.classList.contains('active');

                    // 处理点赞逻辑
                    if (type === 'like') {
                        if (isCurrentlyLiked) {
                            // 如果当前已点赞，则取消点赞
                            likeBtn.classList.remove('active');
                            this.showMessage(this.t('popup.message.likeCancelled'), 'info');
                        } else {
                            // 如果当前未点赞，则点赞
                            likeBtn.classList.add('active');
                            dislikeBtn.classList.remove('active'); // 清空否定状态
                            this.saveFeedback('like');
                            this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
                        }
                    } else if (type === 'dislike') {
                        if (isCurrentlyDisliked) {
                            // 如果当前已否定，则取消否定
                            dislikeBtn.classList.remove('active');
                            this.showMessage(this.t('popup.message.dislikeCancelled'), 'info');
                        } else {
                            // 如果当前未否定，则否定
                            dislikeBtn.classList.add('active');
                            likeBtn.classList.remove('active'); // 清空点赞状态
                            this.saveFeedback('dislike');
                            this.showMessage(this.t('popup.message.feedbackThanksNegative'), 'info');
                        }
                    }
                }
                return;
            }
        } else {
            //针对已经选择了的可以评价
            // 获取当前问题文本
            const questionDisplay = container ? container.querySelector('.question-text') : this.questionText;
            const question = questionDisplay ? questionDisplay.textContent : '';

            // 获取当前回答文本
            const resultText = container ? container.querySelector('.result-text-content') : this.resultText;
            const answer = resultText ? resultText.textContent : '';

            // 确定反馈类型
            const adviceType = type === 'like' ? 'good' : 'bad';
            debugger;
            // 调用统一处理函数
            // 直接调用统一处理函数
            this.doAdviceForAnswer(question, answer, adviceType, container);

        }

        return;
        // 如果指定了容器，针对该容器的按钮进行操作
        if (container) {
            const likeBtn = container.querySelector('.like-btn');
            const dislikeBtn = container.querySelector('.dislike-btn');

            if (likeBtn && dislikeBtn) {
                const isCurrentlyLiked = likeBtn.classList.contains('active');
                const isCurrentlyDisliked = dislikeBtn.classList.contains('active');

                // 处理点赞逻辑
                if (type === 'like') {
                    if (isCurrentlyLiked) {
                        // 如果当前已点赞，则取消点赞
                        likeBtn.classList.remove('active');
                        this.showMessage(this.t('popup.message.likeCancelled'), 'info');
                        this.doAdviceForAnswer(question, answer, adviceType, container);
                    } else {
                        // 如果当前未点赞，则点赞
                        likeBtn.classList.add('active');
                        dislikeBtn.classList.remove('active'); // 清空否定状态
                        this.saveFeedback('like');
                        this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
                        this.doAdviceForAnswer(question, answer, adviceType, container);
                    }
                } else if (type === 'dislike') {
                    if (isCurrentlyDisliked) {
                        // 如果当前已否定，则取消否定
                        dislikeBtn.classList.remove('active');
                        this.showMessage(this.t('popup.message.dislikeCancelled'), 'info');
                        this.doAdviceForAnswer(question, answer, adviceType, container);
                    } else {
                        // 如果当前未否定，则否定
                        dislikeBtn.classList.add('active');
                        likeBtn.classList.remove('active'); // 清空点赞状态
                        this.saveFeedback('dislike');
                        this.showMessage(this.t('popup.message.feedbackThanksNegative'), 'info');
                        this.doAdviceForAnswer(question, answer, adviceType, container);
                    }
                }
            }
            return;
        }
        debugger;
        // 如果没有指定容器，说明是第一轮对话，使用默认容器
        const defaultContainer = this.resultContainer.querySelector('#conversation-default');
        if (defaultContainer) {
            // 递归调用，传入默认容器
            this.handleFeedback(type, defaultContainer);
            return;
        }

        // 如果连默认容器都没有，使用全局按钮（备用方案）
        const likeBtn = this.likeButton;
        const dislikeBtn = this.dislikeButton;

        if (!likeBtn || !dislikeBtn) return;

        const isCurrentlyLiked = likeBtn.classList.contains('active');
        const isCurrentlyDisliked = dislikeBtn.classList.contains('active');

        // 处理点赞逻辑
        if (type === 'like') {
            if (isCurrentlyLiked) {
                // 如果当前已点赞，则取消点赞
                likeBtn.classList.remove('active');
                this.showMessage(this.t('popup.message.likeCancelled'), 'info');
            } else {
                // 如果当前未点赞，则点赞
                likeBtn.classList.add('active');
                dislikeBtn.classList.remove('active'); // 清空否定状态
                this.saveFeedback('like');
                this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
            }
            this.doAdviceForAnswer(question, answer, adviceType, container);
        } else if (type === 'dislike') {
            if (isCurrentlyDisliked) {
                // 如果当前已否定，则取消否定
                dislikeBtn.classList.remove('active');
                this.showMessage(this.t('popup.message.dislikeCancelled'), 'info');
            } else {
                // 如果当前未否定，则否定
                dislikeBtn.classList.add('active');
                likeBtn.classList.remove('active'); // 清空点赞状态
                this.saveFeedback('dislike');
                this.showMessage(this.t('popup.message.feedbackThanksNegative'), 'info');
            }
            this.doAdviceForAnswer(question, answer, adviceType, container);
        }

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
                        this.showMessage(this.t('popup.message.openFullscreenFallback'), 'info');
                    }
                } catch (error) {
                    console.error('打开全屏窗口失败:', error);
                    this.showMessage(this.t('popup.message.openFullscreenFailed'), 'error');
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
            this.showMessage(this.t('popup.message.toggleFullscreenFailed'), 'error');
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
                this.showMessage(this.t('popup.message.contentScriptUnsupported'), 'error');
                return;
            }

            console.log('测试content script连接...');
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'test'
            });

            if (response && response.success) {
                this.showMessage(this.t('popup.message.contentScriptOk'), 'success');
            } else {
                this.showMessage(this.t('popup.message.contentScriptResponseError'), 'error');
            }
        } catch (error) {
            console.error('Content script测试失败:', error);
            this.showMessage(this.t('popup.message.contentScriptConnectFailed', { error: error.message }), 'error');
        }
    }

    // 保存对话历史记录
    saveConversationHistory(question, answer, modelName, knowledgeBaseId, pageUrl) {
        try {
            // 限制问题和回答的长度，避免存储过大
            const maxLength = 1000; // 限制每个字段的最大长度
            const safeQuestion = typeof question === 'string' ? question : (question ?? '');
            const safeAnswer = typeof answer === 'string' ? answer : (answer ?? '');
            const truncatedQuestion = safeQuestion.length > maxLength ? safeQuestion.substring(0, maxLength) + '...' : safeQuestion;
            const truncatedAnswer = safeAnswer.length > maxLength ? safeAnswer.substring(0, maxLength) + '...' : safeAnswer;

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
                console.log('保存对话历史记录失败:', error);
                // 如果保存失败，尝试清理旧记录
                this.cleanupHistoryRecords();
            });

            console.log('对话历史记录已保存，当前记录数:', this.conversationHistory.length);
        } catch (error) {
            console.log('保存对话历史记录失败:', error);
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

    showPolicyDialog(dialogId) {
        if (!dialogId || !this.policyDialogs || !this.policyDialogs[dialogId]) return;
        const dialog = this.policyDialogs[dialogId];
        dialog.style.display = 'flex';
        dialog.setAttribute('aria-hidden', 'false');
        const focusTarget = dialog.querySelector('.js-close-policy') || dialog.querySelector('.close-btn');
        if (focusTarget) {
            setTimeout(() => focusTarget.focus(), 0);
        }
    }

    hidePolicyDialog(dialogId) {
        if (!dialogId || !this.policyDialogs || !this.policyDialogs[dialogId]) return;
        const dialog = this.policyDialogs[dialogId];
        dialog.style.display = 'none';
        dialog.setAttribute('aria-hidden', 'true');
    }

    hideAllPolicyDialogs() {
        if (!this.policyDialogs) return;
        Object.keys(this.policyDialogs).forEach(dialogId => {
            this.hidePolicyDialog(dialogId);
        });
    }

    async initLanguagePreference() {
        try {
            const preference = await this.getStoredLanguagePreference();
            this.hasStoredLanguagePreference = preference.stored === true;
            const language = preference.uiLanguage || this.i18n.defaultLanguage;
            const normalized = await this.i18n.setLanguage(language);
            this.currentLanguage = normalized;
            await this.applyLanguage(normalized, { persist: false, updateSwitcher: this.hasStoredLanguagePreference });
        } catch (error) {
            console.error('加载语言设置失败:', error);
            const fallback = await this.i18n.setLanguage(this.i18n.fallbackLanguage);
            this.currentLanguage = fallback;
            this.hasStoredLanguagePreference = false;
            await this.applyLanguage(fallback, { persist: false, updateSwitcher: false });
        }
    }

    getStoredLanguagePreference() {
        const defaultLanguage = this.i18n?.defaultLanguage || 'zhcn';
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
                    const hasExplicitLanguage = Object.prototype.hasOwnProperty.call(items, 'uiLanguage') && typeof items.uiLanguage === 'string' && items.uiLanguage;
                    const stored = items.uiLanguageSet === true || hasExplicitLanguage;
                    resolve({
                        uiLanguage: stored ? (items.uiLanguage || defaultLanguage) : defaultLanguage,
                        stored
                    });
                });
            } catch (error) {
                console.error('读取语言偏好异常:', error);
                resolve({ uiLanguage: defaultLanguage, stored: false });
            }
        });
    }

    async handleLanguageChange(event) {
        const selectedLanguage = event?.target?.value || this.i18n.defaultLanguage;
        this.hasStoredLanguagePreference = true;
        await this.applyLanguage(selectedLanguage);

        // 语言改变时重新加载参数规则选项
        this.loadParameterRuleOptions();
    }

    resetLanguageSwitcherSelection() {
        this.updateLanguageSwitcherDisplay(this.currentLanguage || '');
    }

    updateLanguageSwitcherDisplay(language) {
        if (!this.languageSwitcher) return;

        if (language) {
            this.languageSwitcher.dataset.selectedLanguage = language;
        } else {
            delete this.languageSwitcher.dataset.selectedLanguage;
        }

        this.languageSwitcher.value = '';
        this.languageSwitcher.selectedIndex = 0;

        const placeholderOption = this.languageSwitcher.querySelector('option[value=""]');
        if (placeholderOption) {
            placeholderOption.selected = true;
        }
    }

    getLanguageDisplayName(languageCode) {
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

    applyLanguageInstructionToSystemContent(content, originalQuestion = '') {
        if (!content) return content;

        const needsByLocale = this.currentLanguage && this.currentLanguage !== 'zhcn';
        const needsByQuestion = this.shouldAddInstructionForQuestion(originalQuestion);

        if (needsByLocale || needsByQuestion) {
            const targetLanguageName = this.getLanguageDisplayName(this.currentLanguage);
            const instruction = `如果用户的问题不是中文，请先将其翻译成中文仅用于检索和理解，但务必继续使用用户原始语言进行思考与推理，最终将思考和回答等一切文字请翻译成${targetLanguageName}输出。`;

            if (content.includes(instruction)) {
                return content;
            }

            return `${instruction}\n\n${content}`;
        }

        return content;
    }

    shouldAddInstructionForQuestion(question) {
        if (!question || typeof question !== 'string') return false;
        const normalized = question.replace(/\s+/g, '');
        if (!normalized) return false;
        return !this.isLikelyChinese(normalized);
    }

    isLikelyChinese(text) {
        if (!text) return false;
        const chineseCharRegex = /[\u4e00-\u9fff]/;
        const alphabeticRegex = /[A-Za-z]/;

        const hasChinese = chineseCharRegex.test(text);
        if (hasChinese) {
            return true;
        }

        // If contains letters and punctuation but no Chinese, treat as non-Chinese
        // For scripts like Japanese kana, extend detection
        const japaneseRegex = /[\u3040-\u30ff]/;
        if (japaneseRegex.test(text)) {
            return false;
        }

        // Default: if no Chinese characters, assume not Chinese
        return false;
    }

    async ensureChineseQuestion(question, provider, model) {
        if (!this.shouldAddInstructionForQuestion(question)) {
            return question;
        }

        if (!provider || !model) {
            return question;
        }

        try {
            const translated = await this.translateQuestionToChinese(question, provider, model);
            if (translated && this.isLikelyChinese(translated)) {
                console.log('翻译后的提问:', translated);
                return translated.trim();
            }
        } catch (error) {
            console.error('翻译问题为中文失败:', error);
        }

        return question;
    }

    async translateQuestionToChinese(question, provider, model) {
        return await this.requestChatCompletionTranslation(question, provider, model, '简体中文');
    }

    async translateKnowledgeItems(items = [], targetLanguageName, provider, model) {
        if (!Array.isArray(items) || items.length === 0) {
            return items;
        }

        if (!targetLanguageName || targetLanguageName.includes('中文')) {
            return items;
        }

        const translatedItems = [];
        for (const item of items) {
            if (!item || typeof item !== 'string') {
                translatedItems.push(item);
                continue;
            }

            try {
                const translated = await this.requestChatCompletionTranslation(item, provider, model, targetLanguageName);
                translatedItems.push(translated && translated.trim() ? translated.trim() : item);
            } catch (error) {
                console.error('翻译知识库条目失败:', error);
                translatedItems.push(item);
            }
        }

        return translatedItems;
    }

    getChatCompletionsEndpoint(provider) {
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

    async requestChatCompletionTranslation(text, provider, model, targetLanguageName = '简体中文') {
        const endpoint = this.getChatCompletionsEndpoint(provider);
        if (!endpoint) {
            throw new Error('未找到可用的翻译端点');
        }

        const headers = {
            'Content-Type': 'application/json'
        };
        this.setAuthHeaders(headers, provider);

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

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`翻译请求失败: ${response.status} ${response.statusText} ${errorText}`);
        }

        const data = await response.json();
        let translated = '';
        if (data.choices && data.choices[0]?.message?.content) {
            translated = data.choices[0].message.content;
        } else if (data.response) {
            translated = data.response;
        }

        translated = typeof translated === 'string' ? translated.trim() : '';
        if (!translated) {
            throw new Error('翻译结果为空');
        }
        translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        return translated;
    }

    setupDateTimeFilters(force = false) {
        if (typeof document === 'undefined') return;
        const inputs = Array.from(document.querySelectorAll('[data-role="datetime-filter"]'));
        if (inputs.length === 0) return;

        this.dateTimeFilterInputs = inputs;

        if (!this.dateTimePickerElements) {
            this.createDateTimePickerElements();
        }

        inputs.forEach(input => {
            if (!force && input.dataset.datetimePickerSetup === 'true') {
                return;
            }
            input.dataset.datetimePickerSetup = 'true';
            input.readOnly = true;
            input.addEventListener('click', () => this.openDateTimePicker(input));
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.openDateTimePicker(input);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    this.closeDateTimePicker();
                }
            });
            input.setAttribute('role', 'combobox');
            input.setAttribute('aria-haspopup', 'dialog');
            input.setAttribute('aria-expanded', 'false');
        });

        this.dateTimePickerInitialized = true;
        this.updateDateTimePickerLocale(this.currentLanguage);
    }

    createDateTimePickerElements() {
        if (typeof document === 'undefined') return;

        const container = document.createElement('div');
        container.className = 'datetime-picker-overlay';
        container.style.display = 'none';

        container.innerHTML = `
            <div class="datetime-picker-panel" role="dialog" aria-modal="true">
                <div class="datetime-picker-header">
                    <button type="button" class="datetime-picker-nav prev" aria-label="Previous month">‹</button>
                    <div class="datetime-picker-month"></div>
                    <button type="button" class="datetime-picker-nav next" aria-label="Next month">›</button>
                </div>
                <div class="datetime-picker-weekdays"></div>
                <div class="datetime-picker-days"></div>
                <div class="datetime-picker-time">
                    <label class="datetime-picker-time-label"></label>
                    <div class="datetime-picker-time-selects">
                        <select class="datetime-picker-hour"></select>
                        <span class="datetime-picker-time-separator">:</span>
                        <select class="datetime-picker-minute"></select>
                    </div>
                </div>
                <div class="datetime-picker-actions">
                    <button type="button" class="datetime-picker-btn clear"></button>
                    <div class="datetime-picker-actions-spacer"></div>
                    <button type="button" class="datetime-picker-btn cancel"></button>
                    <button type="button" class="datetime-picker-btn confirm primary"></button>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        const hourSelect = container.querySelector('.datetime-picker-hour');
        const minuteSelect = container.querySelector('.datetime-picker-minute');

        for (let h = 0; h < 24; h++) {
            const option = document.createElement('option');
            option.value = this.padNumber(h);
            option.textContent = this.padNumber(h);
            hourSelect.appendChild(option);
        }

        for (let m = 0; m < 60; m++) {
            const option = document.createElement('option');
            option.value = this.padNumber(m);
            option.textContent = this.padNumber(m);
            minuteSelect.appendChild(option);
        }

        this.dateTimePickerElements = {
            container,
            panel: container.querySelector('.datetime-picker-panel'),
            month: container.querySelector('.datetime-picker-month'),
            weekdaysContainer: container.querySelector('.datetime-picker-weekdays'),
            daysContainer: container.querySelector('.datetime-picker-days'),
            prevBtn: container.querySelector('.datetime-picker-nav.prev'),
            nextBtn: container.querySelector('.datetime-picker-nav.next'),
            hourSelect,
            minuteSelect,
            timeLabel: container.querySelector('.datetime-picker-time-label'),
            clearBtn: container.querySelector('.datetime-picker-btn.clear'),
            cancelBtn: container.querySelector('.datetime-picker-btn.cancel'),
            confirmBtn: container.querySelector('.datetime-picker-btn.confirm')
        };

        this.dateTimePickerElements.prevBtn.addEventListener('click', () => this.changeDateTimePickerMonth(-1));
        this.dateTimePickerElements.nextBtn.addEventListener('click', () => this.changeDateTimePickerMonth(1));
        this.dateTimePickerElements.clearBtn.addEventListener('click', () => this.clearDateTimeSelection());
        this.dateTimePickerElements.cancelBtn.addEventListener('click', () => this.closeDateTimePicker());
        this.dateTimePickerElements.confirmBtn.addEventListener('click', () => this.commitDateTimeSelection());
        this.dateTimePickerElements.hourSelect.addEventListener('change', () => this.handleTimeSelectionChange());
        this.dateTimePickerElements.minuteSelect.addEventListener('change', () => this.handleTimeSelectionChange());
    }

    openDateTimePicker(input) {
        if (!this.dateTimePickerElements || !input) return;

        this.activeDateTimeInput = input;
        input.setAttribute('aria-expanded', 'true');

        const isoValue = input.dataset.isoValue || '';
        const baseDate = this.parseISODateTime(isoValue) || new Date();

        this.dateTimePickerState.selectedDate = new Date(baseDate);
        this.dateTimePickerState.viewDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

        this.dateTimePickerElements.hourSelect.value = this.padNumber(baseDate.getHours());
        this.dateTimePickerElements.minuteSelect.value = this.padNumber(baseDate.getMinutes());

        this.renderDateTimePicker();

        const rect = input.getBoundingClientRect();
        const container = this.dateTimePickerElements.container;
        container.style.display = 'block';
        container.style.top = `${window.scrollY + rect.bottom + 4}px`;
        container.style.left = `${window.scrollX + rect.left}px`;
        container.style.minWidth = `${rect.width}px`;

        requestAnimationFrame(() => {
            container.classList.add('visible');
        });

        document.addEventListener('mousedown', this.handleDateTimePickerOutsideClick, true);
        document.addEventListener('keydown', this.handleDateTimePickerKeydown, true);
    }

    closeDateTimePicker() {
        if (!this.dateTimePickerElements) return;
        const { container } = this.dateTimePickerElements;
        container.classList.remove('visible');
        container.style.display = 'none';
        if (this.activeDateTimeInput) {
            this.activeDateTimeInput.setAttribute('aria-expanded', 'false');
            this.activeDateTimeInput = null;
        }
        document.removeEventListener('mousedown', this.handleDateTimePickerOutsideClick, true);
        document.removeEventListener('keydown', this.handleDateTimePickerKeydown, true);
    }

    renderDateTimePicker() {
        if (!this.dateTimePickerElements) return;
        this.renderDateTimePickerHeader();
        this.renderDateTimePickerWeekdays();
        this.renderDateTimePickerDays();
        this.updateDateTimePickerButtonsText();
    }

    renderDateTimePickerHeader() {
        if (!this.dateTimePickerElements) return;
        const { month } = this.dateTimePickerElements;
        const locale = this.i18n?.getIntlLocale(this.currentLanguage) || 'en-US';
        const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' });
        month.textContent = formatter.format(this.dateTimePickerState.viewDate);
    }

    renderDateTimePickerWeekdays() {
        if (!this.dateTimePickerElements) return;
        const { weekdaysContainer } = this.dateTimePickerElements;
        const locale = this.i18n?.getIntlLocale(this.currentLanguage) || 'en-US';
        weekdaysContainer.innerHTML = '';

        const baseDate = new Date(2020, 5, 7); // Sunday
        for (let i = 0; i < 7; i++) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + i);
            const label = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
            const cell = document.createElement('div');
            cell.className = 'datetime-picker-weekday';
            cell.textContent = label;
            weekdaysContainer.appendChild(cell);
        }
    }

    renderDateTimePickerDays() {
        if (!this.dateTimePickerElements) return;
        const { daysContainer } = this.dateTimePickerElements;
        daysContainer.innerHTML = '';

        const viewDate = this.dateTimePickerState.viewDate;
        const selectedDate = this.dateTimePickerState.selectedDate;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const startWeekday = firstDayOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const totalCells = 42;
        const today = new Date();

        for (let i = 0; i < totalCells; i++) {
            const dayCell = document.createElement('button');
            dayCell.type = 'button';
            dayCell.className = 'datetime-picker-day';

            let cellYear = year;
            let cellMonth = month;
            let cellDay;
            let isCurrentMonth = true;

            if (i < startWeekday) {
                cellDay = daysInPrevMonth - startWeekday + i + 1;
                cellMonth = month - 1;
                if (cellMonth < 0) {
                    cellMonth = 11;
                    cellYear = year - 1;
                }
                isCurrentMonth = false;
            } else if (i >= startWeekday + daysInMonth) {
                cellDay = i - (startWeekday + daysInMonth) + 1;
                cellMonth = month + 1;
                if (cellMonth > 11) {
                    cellMonth = 0;
                    cellYear = year + 1;
                }
                isCurrentMonth = false;
            } else {
                cellDay = i - startWeekday + 1;
            }

            const displayDay = this.padNumber(cellDay);
            dayCell.textContent = displayDay;

            if (!isCurrentMonth) {
                dayCell.classList.add('other-month');
            }

            const cellDate = new Date(cellYear, cellMonth, cellDay);
            if (selectedDate &&
                selectedDate.getFullYear() === cellYear &&
                selectedDate.getMonth() === cellMonth &&
                selectedDate.getDate() === cellDay) {
                dayCell.classList.add('selected');
            }

            if (cellDate.toDateString() === today.toDateString()) {
                dayCell.classList.add('today');
            }

            dayCell.addEventListener('click', () => {
                const time = this.getSelectedTime();
                const newSelected = new Date(cellYear, cellMonth, cellDay, time.hour, time.minute, 0, 0);
                this.dateTimePickerState.selectedDate = newSelected;
                this.renderDateTimePickerDays();
            });

            daysContainer.appendChild(dayCell);
        }
    }

    updateDateTimePickerButtonsText() {
        if (!this.dateTimePickerElements) return;
        const { clearBtn, cancelBtn, confirmBtn, timeLabel } = this.dateTimePickerElements;
        clearBtn.textContent = this.t('popup.awr.datetime.clear');
        cancelBtn.textContent = this.t('popup.awr.datetime.cancel');
        confirmBtn.textContent = this.t('popup.awr.datetime.confirm');
        timeLabel.textContent = this.t('popup.awr.datetime.timeLabel');
    }

    changeDateTimePickerMonth(offset) {
        if (!this.dateTimePickerState || !this.dateTimePickerElements) return;
        const viewDate = this.dateTimePickerState.viewDate;
        this.dateTimePickerState.viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        this.renderDateTimePicker();
    }

    commitDateTimeSelection() {
        if (!this.activeDateTimeInput || !this.dateTimePickerElements) {
            this.closeDateTimePicker();
            return;
        }

        const targetInput = this.activeDateTimeInput;
        let selected = this.dateTimePickerState.selectedDate;
        if (!selected) {
            const viewDate = this.dateTimePickerState.viewDate;
            selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        }

        const time = this.getSelectedTime();
        selected.setHours(time.hour, time.minute, 0, 0);

        const isoValue = this.toISOWithoutTimezone(selected);
        this.setDateTimeInputElementValue(targetInput, isoValue);

        this.closeDateTimePicker();
        targetInput?.focus();
    }

    clearDateTimeSelection() {
        if (!this.activeDateTimeInput) {
            this.closeDateTimePicker();
            return;
        }
        this.setDateTimeInputElementValue(this.activeDateTimeInput, '');
        this.dateTimePickerState.selectedDate = null;
        this.renderDateTimePickerDays();
        this.closeDateTimePicker();
    }

    handleDateTimePickerOutsideClick(event) {
        if (!this.dateTimePickerElements) return;
        const { container } = this.dateTimePickerElements;
        if (container.contains(event.target)) return;
        if (this.activeDateTimeInput && this.activeDateTimeInput.contains(event.target)) return;
        this.closeDateTimePicker();
    }

    handleDateTimePickerKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeDateTimePicker();
        }
    }

    handleTimeSelectionChange() {
        if (!this.dateTimePickerState.selectedDate) return;
        const time = this.getSelectedTime();
        this.dateTimePickerState.selectedDate.setHours(time.hour, time.minute, 0, 0);
    }

    getSelectedTime() {
        if (!this.dateTimePickerElements) {
            return { hour: 0, minute: 0 };
        }
        const hour = parseInt(this.dateTimePickerElements.hourSelect.value, 10) || 0;
        const minute = parseInt(this.dateTimePickerElements.minuteSelect.value, 10) || 0;
        return { hour, minute };
    }

    setDateTimeInputElementValue(input, isoValue) {
        if (!input) return;
        if (!isoValue) {
            input.dataset.isoValue = '';
            input.value = '';
            input.title = '';
            return;
        }
        const normalized = this.normalizeISODateTime(isoValue);
        input.dataset.isoValue = normalized;
        const display = this.formatDateTimeForDisplay(normalized, this.currentLanguage);
        input.value = display;
        input.title = display;
    }

    setDateTimeInputValue(id, isoValue) {
        const input = document.getElementById(id);
        if (!input) return;
        this.setDateTimeInputElementValue(input, isoValue);
    }

    clearDateTimeInputValue(id) {
        const input = document.getElementById(id);
        if (!input) return;
        input.dataset.isoValue = '';
        input.value = '';
        input.title = '';
    }

    getDateTimeInputValue(id) {
        const input = document.getElementById(id);
        if (!input) return '';
        return input.dataset.isoValue || '';
    }

    updateDateTimePickerLocale(language) {
        if (!this.dateTimeFilterInputs) return;
        const locale = this.i18n?.getIntlLocale(language) || 'en-US';

        this.dateTimeFilterInputs.forEach(input => {
            const placeholderKey = input.dataset.i18nPlaceholder;
            if (placeholderKey) {
                input.placeholder = this.t(placeholderKey);
            }
            this.updateDateTimeInputDisplay(input, language);
        });

        if (this.dateTimePickerElements) {
            this.renderDateTimePicker();
        }
    }

    updateDateTimeInputDisplay(input, language) {
        if (!input) return;
        const isoValue = input.dataset.isoValue || '';
        if (!isoValue) {
            input.value = '';
            input.title = '';
            return;
        }
        const display = this.formatDateTimeForDisplay(isoValue, language);
        input.value = display;
        input.title = display;
    }

    formatDateTimeForDisplay(isoValue, language) {
        if (!isoValue) return '';
        const date = this.parseISODateTime(isoValue);
        if (!date) return isoValue;
        const locale = this.i18n?.getIntlLocale(language) || 'en-US';
        const formatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return formatter.format(date);
    }

    normalizeISODateTime(value) {
        if (!value) return '';
        let result = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
            result = `${result}T00:00:00`;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(result)) {
            result = `${result}:00:00`;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(result)) {
            result = `${result}:00`;
        } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(result)) {
            result = `${result.replace(' ', 'T')}:00`;
        }
        return result;
    }

    parseISODateTime(value) {
        if (!value) return null;
        const normalized = this.normalizeISODateTime(value);
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date;
    }

    toISOWithoutTimezone(date) {
        if (!(date instanceof Date)) return '';
        const year = date.getFullYear();
        const month = this.padNumber(date.getMonth() + 1);
        const day = this.padNumber(date.getDate());
        const hour = this.padNumber(date.getHours());
        const minute = this.padNumber(date.getMinutes());
        const second = this.padNumber(date.getSeconds());
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    padNumber(value) {
        return String(value).padStart(2, '0');
    }

    translateStaticElements(language) {
        if (!this.i18n) return;

        const translate = (key) => {
            if (!key) return undefined;
            const value = this.i18n.t(key, language);
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

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
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
    }
    async applyLanguage(language, options = {}) {
        const { persist = true, updateSwitcher = true } = options;
        let normalizedLanguage;

        try {
            normalizedLanguage = await this.i18n.setLanguage(language);
        } catch (error) {
            console.error('设置语言失败，使用回退语言:', error);
            normalizedLanguage = await this.i18n.setLanguage(this.i18n.fallbackLanguage);
        }

        this.currentLanguage = normalizedLanguage;
        this.translateStaticElements(normalizedLanguage);
        this.updateDateTimePickerLocale(normalizedLanguage);

        const htmlLocale = this.i18n.getIntlLocale(normalizedLanguage);
        if (typeof document !== 'undefined') {
            document.title = this.t('popup.meta.title');
            if (document.documentElement) {
                document.documentElement.lang = htmlLocale;
            }
        }

        const resources = this.languageResources[normalizedLanguage] || this.languageResources[this.i18n.fallbackLanguage];

        if (this.languageSwitcher) {
            if (updateSwitcher) {
                this.languageSwitcher.dataset.selectedLanguage = normalizedLanguage;
            }
            this.updateLanguageSwitcherDisplay(normalizedLanguage);
        }

        if (persist && typeof chrome !== 'undefined' && chrome.storage?.sync?.set) {
            try {
                chrome.storage.sync.set({ uiLanguage: normalizedLanguage, uiLanguageSet: true }, () => {
                    if (chrome.runtime?.lastError) {
                        console.error('保存语言设置失败:', chrome.runtime.lastError);
                    }
                });
                this.hasStoredLanguagePreference = true;
            } catch (error) {
                console.error('保存语言设置失败:', error);
            }
        }

        const newSessionText = this.newSessionBtn?.querySelector('.action-text');
        if (newSessionText) newSessionText.textContent = this.t('popup.top.button.newSession');

        const historyText = this.historyBtn?.querySelector('.action-text');
        if (historyText) historyText.textContent = this.t('popup.top.button.history');

        const awrText = this.awrAnalysisBtn?.querySelector('.action-text');
        if (awrText) awrText.textContent = this.t('popup.top.button.awrAnalysis');
        const inspectionText = this.inspectionBtn?.querySelector('.action-text');
        if (inspectionText) inspectionText.textContent = this.t('popup.top.button.inspection');

        if (this.settingsBtn) {
            const settingsText = this.settingsBtn.querySelector('span:nth-of-type(2)');
            if (settingsText) settingsText.textContent = this.t('popup.top.button.settings');
            this.settingsBtn.title = this.t('popup.top.tooltip.settings');
        }

        if (this.helpBtn) {
            const helpText = this.helpBtn.querySelector('.action-text');
            if (helpText) helpText.textContent = this.t('popup.top.button.help');
            this.helpBtn.title = this.t('popup.top.tooltip.help');
            const userGuideBase = resources?.userGuide || 'user-guide.html';
            this.helpBtn.dataset.userGuidePath = userGuideBase;
        }

        if (this.announcementBtn) {
            const noticeText = this.announcementBtn.querySelector('.action-text');
            if (noticeText) noticeText.textContent = this.t('popup.top.button.notice');
            this.announcementBtn.title = this.t('popup.top.tooltip.notice');
            const noticeBase = resources?.notice || 'notice.html';
            this.announcementBtn.dataset.noticePath = noticeBase;
        }

        const modelLabel = document.querySelector('label[for=\"modelSelect\"]');
        if (modelLabel) modelLabel.textContent = this.t('popup.main.label.model');

        const knowledgeLabel = document.querySelector('label[for=\"knowledgeBaseSelect\"]');
        if (knowledgeLabel) knowledgeLabel.textContent = this.t('popup.main.label.knowledge');

        const parameterLabel = document.querySelector('label[for=\"parameterRuleSelect\"]');
        if (parameterLabel) parameterLabel.textContent = this.t('popup.main.label.parameter');

        const uploadLabel = document.querySelector('label[for=\"awrFileDisplay\"]');
        if (uploadLabel) uploadLabel.textContent = this.t('popup.main.text.uploadLabel');

        if (this.languageSwitcher) {
            this.languageSwitcher.title = this.t('popup.top.tooltip.languageSwitcher');
        }

        if (this.modelSelect) {
            Array.from(this.modelSelect.options).forEach(option => {
                if (!option.value) {
                    if (option.disabled) {
                        option.textContent = this.t('popup.main.option.noModelConfigured');
                    } else {
                        option.textContent = this.t('popup.main.option.modelsLoading');
                    }
                }
            });
        }

        if (this.knowledgeBaseSelect && this.knowledgeBaseSelect.options.length > 0) {
            const firstOption = this.knowledgeBaseSelect.options[0];
            if (firstOption.value === '') {
                firstOption.textContent = this.t('popup.main.option.knowledgeNone');
            }
        }

        if (this.parameterRuleSelect) {
            Array.from(this.parameterRuleSelect.options).forEach(option => {
                if (!option.value && option.disabled) {
                    option.textContent = this.t('popup.main.option.noParameterRuleConfigured');
                }
            });
        }

        if (this.awrSaveBtn) {
            this.awrSaveBtn.textContent = this.t('popup.main.action.runAnalysis');
        }
        if (this.awrCancelBtn) {
            this.awrCancelBtn.textContent = this.t('popup.main.action.close');
        }
        if (this.awrFileUploadBtn) {
            this.awrFileUploadBtn.textContent = this.t('popup.main.action.uploadFile');
        }

        if (this.knowledgeBaseSelect) {
            this.loadKnowledgeBaseOptions();
        }

        if (this.parameterRuleSelect) {
            this.loadParameterRuleOptions();
        }
    }

    t(key, params = undefined) {
        if (!this.i18n) return key;
        return this.i18n.t(key, this.currentLanguage, params);
    }

    getRunAnalysisCountdownText(seconds) {
        const suffix = this.t('popup.main.text.secondSuffix');
        return `${this.t('popup.main.action.runAnalysis')} (${seconds}${suffix})`;
    }

    handleAnnouncementClick() {
        const storedPath = this.announcementBtn?.dataset.noticePath;
        if (!storedPath) {
            console.warn('未找到公告页路径，使用默认 notice.html');
        }
        const noticeFile = storedPath || 'notice.html';
        try {
            const noticeUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
                ? chrome.runtime.getURL(noticeFile)
                : noticeFile;

            if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
                chrome.tabs.create({ url: noticeUrl, active: true }, () => {
                    if (chrome.runtime?.lastError) {
                        console.error('打开公告页面失败:', chrome.runtime.lastError);
                        window.open(noticeUrl, '_blank');
                    }
                });
            } else {
                window.open(noticeUrl, '_blank');
            }
        } catch (error) {
            console.error('打开公告页面失败:', error);
            window.open(`notice.html?lang=${normalizedLanguage}`, '_blank');
        }
    }

    // 显示AWR分析对话框
    async showAwrAnalysisDialog() {
        if (this.awrAnalysisDialog) {
            this.awrAnalysisDialog.style.display = 'flex';
            // 先重置表单（清除问题描述和文件）
            this.resetAwrForm();
            // 然后加载注册邮箱（这样不会覆盖邮箱字段）
            await this.loadRegistrationEmail();
            // 渲染后查询用户信息并回显
            try {
                await this.populateUserProfileFromApi();
            } catch (e) {
                console.error('加载用户信息失败:', e);
            }
        }
    }

    // 隐藏AWR分析对话框
    hideAwrAnalysisDialog() {
        if (this.awrAnalysisDialog) {
            this.awrAnalysisDialog.style.display = 'none';
            // 清理倒计时定时器
            if (this.awrCountdownInterval) {
                clearInterval(this.awrCountdownInterval);
                this.awrCountdownInterval = null;
            }
            // 重置按钮状态
            if (this.awrSaveBtn) {
                this.awrSaveBtn.disabled = false;
                this.awrSaveBtn.textContent = this.t('popup.main.action.runAnalysis');
            }
            // 重置表单（不清空邮箱，下次打开时会重新加载注册邮箱）
            this.resetAwrForm();
        }
    }

    // 显示巡检诊断对话框
    async showInspectionDialog() {
        if (!this.inspectionDialog) return;
        this.inspectionDialog.style.display = 'flex';
        this.resetInspectionForm();
        await this.loadRegistrationEmail(this.inspectionEmail);
        try {
            await this.populateUserProfileFromApi({
                userNameInput: this.inspectionUserName,
                emailInput: this.inspectionEmail
            });
        } catch (error) {
            console.error('加载巡检诊断用户信息失败:', error);
        }
    }

    // 隐藏巡检诊断对话框
    hideInspectionDialog() {
        if (!this.inspectionDialog) return;
        this.inspectionDialog.style.display = 'none';
        if (this.inspectionSaveBtn) {
            this.inspectionSaveBtn.disabled = false;
            this.inspectionSaveBtn.textContent = this.t('popup.inspection.form.submit');
        }
        this.resetInspectionForm();
    }

    resetInspectionForm() {
        if (this.inspectionProblemDescription) {
            this.inspectionProblemDescription.value = '';
        }
        if (this.inspectionEmail) {
            // 保留已有邮箱信息
            this.inspectionEmail.value = this.inspectionEmail.value || '';
        }
        if (this.inspectionFileDisplay) {
            this.inspectionFileDisplay.value = '';
            this.inspectionFileDisplay.placeholder = this.t('popup.inspection.form.uploadPlaceholder');
        }
        if (this.inspectionFileInput) {
            this.inspectionFileInput.value = '';
        }
        if (this.inspectionLanguage) {
            this.inspectionLanguage.value = 'zh';
        }
        if (this.inspectionDatabaseType) {
            this.inspectionDatabaseType.value = '';
        }
        if (this.inspectionAgreeTerms) {
            this.inspectionAgreeTerms.checked = false;
        }
        this.inspectionSelectedFile = null;
    }

    handleInspectionFileSelect(e) {
        const file = e?.target?.files?.[0];
        if (file) {
            this.inspectionSelectedFile = file;
            if (this.inspectionFileDisplay) {
                this.inspectionFileDisplay.value = file.name;
                this.inspectionFileDisplay.placeholder = file.name;
            }
        } else {
            this.inspectionSelectedFile = null;
            if (this.inspectionFileDisplay) {
                this.inspectionFileDisplay.value = '';
                this.inspectionFileDisplay.placeholder = this.t('popup.inspection.form.uploadPlaceholder');
            }
        }
    }

    async handleInspectionSubmit() {
        if (!this.inspectionSaveBtn || this.inspectionSaveBtn.disabled) {
            return;
        }

        const email = this.inspectionEmail?.value.trim() || '';
        if (!email) {
            this.showMessage(this.t('popup.message.enterEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.inspectionEmail?.focus();
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            this.showMessage(this.t('popup.message.invalidEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.inspectionEmail?.focus();
            return;
        }

        if (!this.inspectionSelectedFile) {
            this.showMessage(this.t('popup.message.selectFile'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.inspectionFileUploadBtn?.focus();
            return;
        }

        const databaseCode = this.inspectionDatabaseType?.value || '';
        if (!databaseCode) {
            this.showMessage(this.t('popup.message.selectDatabaseType'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.inspectionDatabaseType?.focus();
            return;
        }

        if (!this.inspectionAgreeTerms || !this.inspectionAgreeTerms.checked) {
            this.showMessage(this.t('popup.message.agreeTerms'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.inspectionAgreeTerms?.focus();
            return;
        }

        const originalButtonText = this.inspectionSaveBtn.textContent || '';
        this.inspectionSaveBtn.disabled = true;

        const formData = {
            username: this.inspectionUserName?.value.trim() || '',
            email,
            problemDescription: this.inspectionProblemDescription?.value.trim() || '',
            file: this.inspectionSelectedFile,
            language: this.inspectionLanguage?.value || 'zh',
            databaseCode
        };

        this.showLoadingOverlay(this.t('popup.inspection.loading'));
        try {
            const response = await this.submitInspectionAnalysis(formData);
            this.hideLoadingOverlay();

            if (response && response.status === 'success') {
                this.showMessage(this.t('popup.message.inspectionSubmitSuccess'), 'success', { centered: true, durationMs: 6000, maxWidth: '380px', background: '#1e7e34' });
                this.hideInspectionDialog();
            } else {
                const errorMsg = response?.message || this.t('popup.message.inspectionSubmitFailed', { error: this.t('popup.common.unknownError') });
                this.showMessage(errorMsg, 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            }
        } catch (error) {
            console.error('提交巡检诊断失败:', error);
            this.hideLoadingOverlay();
            this.showMessage(this.t('popup.message.inspectionSubmitFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        } finally {
            this.inspectionSaveBtn.disabled = false;
            this.inspectionSaveBtn.textContent = originalButtonText || this.t('popup.inspection.form.submit');
        }
    }

    async submitInspectionAnalysis(formData) {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }

        const formDataToSend = new FormData();
        formDataToSend.append('file', formData.file);

        const queryParams = new URLSearchParams();
        queryParams.append('username', formData.username);
        queryParams.append('email', formData.email);
        queryParams.append('language', formData.language || 'zh');
        if (formData.databaseCode) {
            queryParams.append('code', formData.databaseCode);
        }
        if (formData.problemDescription) {
            queryParams.append('backgroundHint', formData.problemDescription);
        }

        const baseUrl = 'http://www.dbaiops.cn/api/inspection/upload';
        const url = `${baseUrl}?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('巡检诊断接口调用失败:', error);
            throw error;
        }
    }

    // 加载注册邮箱
    async loadRegistrationEmail(targetInput = this.awrEmail) {
        try {
            const result = await chrome.storage.sync.get(['registration']);
            const registration = result.registration;
            if (registration && registration.status === 'registered' && registration.email) {
                if (targetInput) {
                    targetInput.value = registration.email;
                }
                console.log('已加载注册邮箱:', registration.email);
            } else {
                console.log('未找到有效的注册邮箱');
                if (targetInput) {
                    targetInput.value = '';
                }
            }
        } catch (error) {
            console.error('加载注册邮箱失败:', error);
            if (targetInput) {
                targetInput.value = '';
            }
        }
    }
    async loadStoredAwrDatabaseType() {
        const defaultValue = this.defaultAwrDatabaseType;
        let storedValue = defaultValue;

        if (typeof chrome === 'undefined' || !chrome.storage?.sync?.get) {
            this.storedAwrDatabaseType = storedValue;
            if (this.awrDatabaseType) {
                this.awrDatabaseType.value = storedValue;
            }
            return storedValue;
        }

        try {
            storedValue = await new Promise((resolve) => {
                try {
                    chrome.storage.sync.get({ awrDatabaseType: defaultValue }, (items) => {
                        if (chrome.runtime?.lastError) {
                            console.error('读取AWR数据库类型失败:', chrome.runtime.lastError);
                            resolve(defaultValue);
                        } else {
                            resolve(items.awrDatabaseType || defaultValue);
                        }
                    });
                } catch (error) {
                    console.error('读取AWR数据库类型异常:', error);
                    resolve(defaultValue);
                }
            });
        } catch (error) {
            console.error('读取AWR数据库类型异常:', error);
            storedValue = defaultValue;
        }

        this.storedAwrDatabaseType = storedValue;

        if (this.awrDatabaseType) {
            this.awrDatabaseType.value = storedValue;
        }

        return storedValue;
    }

    handleAwrDatabaseTypeChange(event) {
        const rawValue = event?.target?.value || '';
        const valueToStore = rawValue || this.defaultAwrDatabaseType;
        this.storedAwrDatabaseType = valueToStore;

        if (!rawValue && this.awrDatabaseType) {
            // 恢复为默认值，避免出现空选项
            this.awrDatabaseType.value = valueToStore;
        }

        if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
            return;
        }

        try {
            if (rawValue) {
                chrome.storage.sync.set({ awrDatabaseType: valueToStore }, () => {
                    if (chrome.runtime?.lastError) {
                        console.error('保存AWR数据库类型失败:', chrome.runtime.lastError);
                    }
                });
            } else if (chrome.storage.sync.remove) {
                chrome.storage.sync.remove('awrDatabaseType', () => {
                    if (chrome.runtime?.lastError) {
                        console.error('移除AWR数据库类型失败:', chrome.runtime.lastError);
                    }
                });
            }
        } catch (error) {
            console.error('保存AWR数据库类型异常:', error);
        }
    }

    // 重置AWR表单（不清空邮箱，保留注册邮箱）
    resetAwrForm() {
        if (this.awrProblemDescription) {
            this.awrProblemDescription.value = '';
        }
        // 注意：邮箱字段不清空，在showAwrAnalysisDialog中会单独加载注册邮箱
        if (this.awrFileDisplay) {
            this.awrFileDisplay.value = '';
            this.awrFileDisplay.placeholder = this.t('popup.awr.form.uploadPlaceholder');
        }
        if (this.awrFileInput) {
            this.awrFileInput.value = '';
        }
        // 重置语言选择为中文（默认值）
        if (this.awrLanguage) {
            this.awrLanguage.value = 'zh';
        }
        if (this.awrDatabaseType) {
            const defaultValue = this.storedAwrDatabaseType || this.defaultAwrDatabaseType;
            this.awrDatabaseType.value = defaultValue;
        }
        if (this.awrAgreeTerms) {
            this.awrAgreeTerms.checked = false;
        }
        this.selectedFile = null;
    }

    // 处理文件选择
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectedFile = file;
            if (this.awrFileDisplay) {
                this.awrFileDisplay.value = file.name;
                this.awrFileDisplay.placeholder = file.name;
            }
            console.log('已选择文件:', file.name);
        } else {
            this.selectedFile = null;
            if (this.awrFileDisplay) {
                this.awrFileDisplay.value = '';
                this.awrFileDisplay.placeholder = this.t('popup.awr.form.uploadPlaceholder');
            }
        }
    }

    // 处理AWR分析表单提交
    async handleAwrAnalysisSubmit() {
        // 检查按钮是否已禁用（防止重复点击）
        if (this.awrSaveBtn && this.awrSaveBtn.disabled) {
            return;
        }

        // 验证必填项
        if (!this.awrEmail || !this.awrEmail.value.trim()) {
            this.showMessage(this.t('popup.message.enterEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.awrEmail?.focus();
            return;
        }

        // 验证邮箱格式
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(this.awrEmail.value.trim())) {
            this.showMessage(this.t('popup.message.invalidEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.awrEmail?.focus();
            return;
        }

        // 验证文件是否已选择
        if (!this.selectedFile) {
            this.showMessage(this.t('popup.message.selectFile'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.awrFileUploadBtn?.focus();
            return;
        }

        // 验证数据库类型
        const databaseCode = this.awrDatabaseType?.value || '';
        if (!databaseCode) {
            this.showMessage(this.t('popup.message.selectDatabaseType'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.awrDatabaseType?.focus();
            return;
        }

        // 验证声明勾选
        if (!this.awrAgreeTerms || !this.awrAgreeTerms.checked) {
            this.showMessage(this.t('popup.message.agreeTerms'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            this.awrAgreeTerms?.focus();
            return;
        }

        // 验证用户名
        const username = this.awrUserName?.value.trim() || '';
        // if (!username) {
        //     this.showMessage('用户名不能为空，请检查用户信息是否已加载', 'error');
        //     return;
        // }

        // 验证通过后，禁用按钮并设置5秒倒计时
        const originalButtonText = this.awrSaveBtn?.textContent || '';
        if (this.awrSaveBtn) {
            this.awrSaveBtn.disabled = true;
            this.awrSaveBtn.textContent = this.getRunAnalysisCountdownText(5);
        }

        // 开始5秒倒计时
        let countdown = 5;
        // 清理之前的定时器（如果存在）
        if (this.awrCountdownInterval) {
            clearInterval(this.awrCountdownInterval);
        }
        this.awrCountdownInterval = setInterval(() => {
            countdown--;
            if (this.awrSaveBtn) {
                if (countdown > 0) {
                    this.awrSaveBtn.textContent = this.getRunAnalysisCountdownText(countdown);
                } else {
                    this.awrSaveBtn.textContent = originalButtonText;
                    this.awrSaveBtn.disabled = false;
                    clearInterval(this.awrCountdownInterval);
                    this.awrCountdownInterval = null;
                }
            } else {
                clearInterval(this.awrCountdownInterval);
                this.awrCountdownInterval = null;
            }
        }, 1000);

        // 收集表单数据
        const language = this.awrLanguage?.value || 'zh';
        const formData = {
            username: username,
            email: this.awrEmail.value.trim(),
            problemDescription: this.awrProblemDescription?.value.trim() || '',
            file: this.selectedFile,
            language: language,
            databaseCode
        };

        console.log('AWR分析表单数据:', {
            username: formData.username,
            email: formData.email,
            problemDescription: formData.problemDescription,
            fileName: formData.file ? formData.file.name : '无文件',
            language: formData.language,
            databaseCode: formData.databaseCode
        });

        // 调用后端接口
        this.showLoadingOverlay(this.t('popup.awr.history.overlayAnalyzing'));
        try {
            const response = await this.submitAwrAnalysis(formData);

            // 处理响应
            if (response && response.status === 'success') {
                this.hideLoadingOverlay();
                this.showMessage(this.t('popup.message.awrSubmitSuccess'), 'success', { centered: true, durationMs: 6000, maxWidth: '380px', background: '#1e7e34' });

                // 如果当前在历史记录页面，刷新列表
                const historyView = document.getElementById('awrHistoryView');
                if (historyView && historyView.classList.contains('active')) {
                    this.loadAwrHistoryList(this.awrHistoryCurrentPage);
                }

                this.hideAwrAnalysisDialog();
                // 如果成功关闭对话框，清理倒计时
                if (this.awrCountdownInterval) {
                    clearInterval(this.awrCountdownInterval);
                    this.awrCountdownInterval = null;
                }
                if (this.awrSaveBtn) {
                    this.awrSaveBtn.textContent = originalButtonText;
                }
            } else {
                const errorMsg = response?.message || '提交失败，请稍后重试(Submission failed, please try again later)';
                this.hideLoadingOverlay();
                this.showMessage(errorMsg, 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
            }
        } catch (error) {
            console.error('提交AWR分析失败(Submission failed):', error);
            this.hideLoadingOverlay();
            this.showMessage(this.t('popup.message.awrSubmitFailed', { error: error.message || '未知错误(Unknown error)' }), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        }
        // 注意：按钮的重新启用由倒计时控制，不需要在这里手动启用
    }

    // 解析可用的apiKey（优先知识服务配置，其次服务商/模型）
    resolveApiKey() {
        let apiKey = '';
        if (this.knowledgeServiceConfig && this.knowledgeServiceConfig.api_key && this.knowledgeServiceConfig.api_key.trim()) {
            apiKey = this.knowledgeServiceConfig.api_key.trim();
        }
        if (!apiKey && Array.isArray(this.providers)) {
            const providerWithKey = this.providers.find(p => p && p.apiKey && String(p.apiKey).trim());
            if (providerWithKey) apiKey = String(providerWithKey.apiKey).trim();
        }
        if (!apiKey && Array.isArray(this.models)) {
            const modelWithKey = this.models.find(m => m && m.apiKey && String(m.apiKey).trim());
            if (modelWithKey) apiKey = String(modelWithKey.apiKey).trim();
        }
        return apiKey;
    }

    // 调用用户信息接口并回显用户名、邮箱
    async populateUserProfileFromApi({ userNameInput = this.awrUserName, emailInput = this.awrEmail } = {}) {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            // 重置输入框为空
            if (userNameInput) {
                userNameInput.value = '';
            }
            if (emailInput) {
                emailInput.value = '';
            }
            this.showMessage(this.t('popup.message.apiKeyValidationFailed'), 'error');
            return;
        }

        const url = 'http://www.dbaiops.cn/api/user/profile';
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            if (!resp.ok) {
                // 如果是401未授权或其他错误，重置输入框并显示提示
                if (userNameInput) {
                    userNameInput.value = '';
                }
                if (emailInput) {
                    emailInput.value = '';
                }
                this.showMessage(this.t('popup.message.apiKeyValidationFailed'), 'error');
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            const data = await resp.json();

            // 解析固定返回结构 { code, success, user: { userName, email, ... } }
            if (!data || data.code !== 200 || data.success !== true || !data.user) {
                // 用户信息返回格式异常或无用户数据，重置输入框并显示提示
                if (userNameInput) {
                    userNameInput.value = '';
                }
                if (emailInput) {
                    emailInput.value = '';
                }
                this.showMessage(this.t('popup.message.apiKeyValidationFailed'), 'error');
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
                this.showMessage(this.t('popup.message.apiKeyValidationFailed'), 'error');
            }
        }
    }

    // 提交AWR分析接口调用
    async submitAwrAnalysis(formData) {
        // 获取apiKey
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }

        // 构建FormData用于文件上传
        const formDataToSend = new FormData();
        formDataToSend.append('file', formData.file);

        // 构建URL查询参数
        const queryParams = new URLSearchParams();
        queryParams.append('username', formData.username);
        queryParams.append('email', formData.email);
        // language 参数，默认为 'zh'
        queryParams.append('language', formData.language || 'zh');
        if (formData.databaseCode) {
            queryParams.append('code', formData.databaseCode);
        }
        // backgroundHint 是可选的，只有填写了才添加
        if (formData.problemDescription) {
            queryParams.append('backgroundHint', formData.problemDescription);
        }

        // 构建完整URL
        const baseUrl = 'http://www.dbaiops.cn/api/awr/upload';

        const url = `${baseUrl}?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // 返回响应格式: { status: "", data: null, message: "" }
            return result;
        } catch (error) {
            console.error('AWR分析接口调用失败(AWR analysis interface call failed):', error);
            throw error;
        }
    }

    // ==================== AWR历史记录功能 ====================

    // 选项卡切换方法
    switchAwrTab(tabName) {
        // 切换选项卡按钮状态
        document.querySelectorAll('.awr-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 切换内容视图
        const newView = document.getElementById('awrNewAnalysisView');
        const historyView = document.getElementById('awrHistoryView');

        if (tabName === 'new') {
            if (newView) newView.classList.add('active');
            if (historyView) historyView.classList.remove('active');
            // 切换到新建分析时，如果用户名为空，重新获取用户信息
            if (!this.awrUserName?.value.trim()) {
                this.populateUserProfileFromApi().catch(e => {
                    console.error('切换到新建分析时获取用户信息失败:', e);
                });
            }
        } else {
            if (newView) newView.classList.remove('active');
            if (historyView) historyView.classList.add('active');
            // 切换到历史记录时自动加载（使用当前筛选条件）
            const startTime = this.getDateTimeInputValue('awrStartTime');
            const endTime = this.getDateTimeInputValue('awrEndTime');
            const status = document.getElementById('awrStatusFilter')?.value || '';
            this.loadAwrHistoryList(1, this.awrHistoryPageSize, '', startTime, endTime, status);
        }
    }

    // 处理搜索按钮点击
    handleAwrSearch() {
        // 获取所有筛选条件
        const startTime = this.getDateTimeInputValue('awrStartTime');
        const endTime = this.getDateTimeInputValue('awrEndTime');
        const status = document.getElementById('awrStatusFilter')?.value || '';

        // 重置到第一页
        this.loadAwrHistoryList(1, this.awrHistoryPageSize, '', startTime, endTime, status);
    }

    // 处理重置按钮点击
    handleAwrReset() {
        // 清空所有筛选条件
        const statusSelect = document.getElementById('awrStatusFilter');

        this.clearDateTimeInputValue('awrStartTime');
        this.clearDateTimeInputValue('awrEndTime');
        if (statusSelect) statusSelect.value = '';

        // 重新加载列表（使用空条件）
        this.loadAwrHistoryList(1, this.awrHistoryPageSize, '', '', '', '');
    }

    // 查询AWR历史记录列表（分页）
    async loadAwrHistoryList(page = 1, pageSize = 10, keyword = '', startTime = '', endTime = '', status = '') {
        try {
            const apiKey = this.resolveApiKey();
            if (!apiKey) {
                this.showMessage(this.t('popup.message.apiKeyNotConfigured'), 'error');
                return;
            }

            // 获取用户名作为查询条件（只能查看自己的记录）
            let username = this.awrUserName?.value.trim() || '';

            // 如果输入框中没有用户名，尝试从注册信息中获取
            if (!username) {
                try {
                    const result = await chrome.storage.sync.get(['registration']);
                    const registration = result.registration;
                    if (registration && registration.status === 'registered' && registration.username) {
                        username = registration.username;
                        // 同时更新输入框的值
                        if (this.awrUserName) {
                            this.awrUserName.value = username;
                        }
                    }
                } catch (error) {
                    console.error('获取注册信息失败:', error);
                }
            }

            // 如果还是获取不到用户名，尝试从API获取
            if (!username) {
                try {
                    await this.populateUserProfileFromApi();
                    username = this.awrUserName?.value.trim() || '';
                } catch (error) {
                    console.error('从API获取用户信息失败:', error);
                }
            }

            if (!username || username === '-') {
                this.showMessage(this.t('popup.message.fetchUserInfoFailed'), 'error');
                return;
            }

            // 构建请求体
            const requestBody = {
                pageNum: page,
                pageSize: pageSize,
                username: username  // 添加用户名查询条件
            };

            // 关键词搜索已移除，不再使用

            // 添加状态筛选
            if (status !== '') {
                requestBody.status = parseInt(status);
            }

            // 添加时间范围筛选
            if (startTime) {
                const startDateTime = this.parseISODateTime(startTime);
                if (startDateTime) {
                    const year = startDateTime.getFullYear();
                    const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
                    const day = String(startDateTime.getDate()).padStart(2, '0');
                    const hours = String(startDateTime.getHours()).padStart(2, '0');
                    const minutes = String(startDateTime.getMinutes()).padStart(2, '0');
                    const seconds = String(startDateTime.getSeconds()).padStart(2, '0');
                    requestBody.startTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                }
            }

            if (endTime) {
                const endDateTime = this.parseISODateTime(endTime);
                if (endDateTime) {
                    endDateTime.setHours(23, 59, 59, 999);
                    const year = endDateTime.getFullYear();
                    const month = String(endDateTime.getMonth() + 1).padStart(2, '0');
                    const day = String(endDateTime.getDate()).padStart(2, '0');
                    const hours = String(endDateTime.getHours()).padStart(2, '0');
                    const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
                    const seconds = String(endDateTime.getSeconds()).padStart(2, '0');
                    requestBody.endTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                }
            }

            const url = 'http://www.dbaiops.cn/api/awr/list';

            this.showLoadingOverlay(this.t('popup.awr.history.loadingHistory'));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // 解析返回格式: { status: "", data: { list: [], total: 0, pageNum: 1, pageSize: 10, ... } }
            if (result.status === 'success' || result.status === '200' || result.data) {
                const data = result.data || {};
                const list = data.list || [];

                // 转换数据格式，适配前端显示
                this.awrHistoryList = list.map(item => {
                    return {
                        id: item.id,
                        email: item.email || '',
                        language: item.language || 'zh',
                        problemDescription: item.backgroundHint || '',
                        fileName: item.awrFilename || '',
                        status: this.convertStatusNumberToString(item.status),
                        createTime: this.parseDateTime(item.createdAt),
                        reportUrl: item.reportFileurl || null,
                        username: item.username || '',
                        fileUrl: item.awrFileurl || null
                    };
                });

                this.awrHistoryTotal = data.total || 0;
                this.awrHistoryCurrentPage = data.pageNum || page;
                this.awrHistoryPageSize = data.pageSize || pageSize;

                this.renderAwrHistoryList();
                this.updateAwrPagination();
            } else {
                throw new Error(result.message || '查询失败(Query failed)');
            }

            this.hideLoadingOverlay();
            // 注意：不在查询成功后清空用户名和邮箱，因为新建分析也需要用到这些信息
        } catch (error) {
            console.error('加载AWR历史记录失败:', error);
            this.hideLoadingOverlay();
            this.showMessage(this.t('popup.message.loadHistoryFailed', { error: error.message || '未知错误(Unknown error)' }), 'error');
            // 显示空状态
            this.renderAwrHistoryList();
            // 如果查询出错，将输入框设置为空
            if (this.awrUserName) {
                this.awrUserName.value = '';
            }
            if (this.awrEmail) {
                this.awrEmail.value = '';
            }
        }
    }

    // 转换状态数字为字符串
    convertStatusNumberToString(statusNum) {
        // 状态映射：0-未分析, 1-成功, 2-失败, 3-执行中
        const statusMap = {
            0: 'pending',    // 未分析
            1: 'success',    // 成功
            2: 'failed',     // 失败
            3: 'running'     // 执行中
        };
        return statusMap[statusNum] || 'unknown';
    }

    // 转换状态字符串为显示文本
    convertStatusToString(statusStr) {
        const statusTextMap = {
            'pending': '未分析',
            'success': '成功',
            'failed': '失败',
            'running': '执行中',
            'unknown': '未知'
        };
        return statusTextMap[statusStr] || statusStr;
    }

    // 解析日期时间对象
    parseDateTime(dateTimeObj) {
        if (!dateTimeObj) return null;

        // 如果已经是字符串格式，直接返回
        if (typeof dateTimeObj === 'string') {
            return dateTimeObj;
        }

        // 如果是对象格式 { dateTime: "2024-01-01T00:00:00", offset: { totalSeconds: 0 } }
        if (dateTimeObj.dateTime) {
            return dateTimeObj.dateTime;
        }

        return null;
    }
    // 渲染历史记录列表
    renderAwrHistoryList() {
        const tbody = document.getElementById('awrHistoryList');
        const table = document.getElementById('awrHistoryTable');
        if (!tbody || !table) return;

        if (this.awrHistoryList.length === 0) {
            // 清空表格并显示空状态
            tbody.innerHTML = '';
            const tableContainer = table.closest('.awr-history-table-container');
            if (tableContainer) {
                table.style.display = 'none';
                let emptyDiv = tableContainer.querySelector('.empty-history');
                if (!emptyDiv) {
                    emptyDiv = document.createElement('div');
                    emptyDiv.className = 'empty-history';
                    tableContainer.appendChild(emptyDiv);
                }
                const emptyTitle = this.t('popup.awr.history.emptyTitle');
                const emptySubtitle = this.t('popup.awr.history.emptySubtitle');
                emptyDiv.innerHTML = `
                    <div class="empty-history-icon">📝</div>
                    <div class="empty-history-text">${this.escapeHtml(emptyTitle)}</div>
                    <div class="empty-history-subtext">${this.escapeHtml(emptySubtitle)}</div>
                `;
                emptyDiv.style.display = 'block';
            }
            return;
        }

        // 显示表格，隐藏空状态
        table.style.display = 'table';
        const tableContainer = table.closest('.awr-history-table-container');
        if (tableContainer) {
            const emptyDiv = tableContainer.querySelector('.empty-history');
            if (emptyDiv) {
                emptyDiv.style.display = 'none';
            }
        }

        // 清空并重新渲染表格行
        tbody.innerHTML = '';

        this.awrHistoryList.forEach(item => {
            const row = this.createAwrHistoryTableRow(item);
            tbody.appendChild(row);
        });
    }

    // 创建历史记录表格行
    createAwrHistoryTableRow(item) {
        const tr = document.createElement('tr');
        tr.className = 'awr-history-row';
        const locale = this.i18n?.getIntlLocale(this.currentLanguage);

        // 格式化时间
        let createTime = this.t('popup.awr.history.unknown');
        if (item.createTime) {
            try {
                const date = new Date(item.createTime);
                if (!isNaN(date.getTime())) {
                    createTime = date.toLocaleString(locale);
                }
            } catch (e) {
                console.error('日期解析失败:', e);
            }
        }

        // 状态文本和样式
        const statusText = this.getAwrStatusText(item.status);
        const statusClass = this.getAwrStatusClass(item.status);

        // 判断重发邮件按钮是否应该禁用（只有成功状态可以重发邮件）
        const isResendDisabled = item.status !== 'success';
        const resendDisabledAttr = isResendDisabled ? 'disabled' : '';
        const resendDisabledClass = isResendDisabled ? 'disabled' : '';
        const resendTitle = isResendDisabled
            ? this.t('popup.awr.history.resendDisabledTooltip')
            : this.t('popup.awr.history.resendTooltip');

        // 问题描述（截断显示）
        const problemDesc = item.problemDescription || '';
        const problemPreview = problemDesc.length > 30 ? problemDesc.substring(0, 30) + '...' : problemDesc;

        // 文件名（截断显示）
        const fileName = item.fileName || '';
        const fileNamePreview = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;

        // 构建表格行内容
        const noFileText = this.t('popup.awr.history.notSpecified');
        const unknownText = this.t('popup.awr.history.unknown');
        const languageKeyMap = {
            'zh': 'popup.awr.history.language.zh',
            'en': 'popup.awr.history.language.en'
        };
        const languageKey = languageKeyMap[item.language] || 'popup.awr.history.language.unknown';
        const languageText = this.t(languageKey);
        const resendButtonLabel = this.t('popup.awr.history.resendButton');

        tr.innerHTML = `
            <td class="awr-table-cell-time">${this.escapeHtml(createTime)}</td>
            <td class="awr-table-cell-status">
                <span class="awr-history-status ${statusClass}">${statusText}</span>
            </td>
            <td class="awr-table-cell-filename" title="${this.escapeHtml(fileName)}">${this.escapeHtml(fileNamePreview || noFileText)}</td>
            <td class="awr-table-cell-problem" title="${this.escapeHtml(problemDesc)}">${this.escapeHtml(problemPreview || '-')}</td>
            <td class="awr-table-cell-email">${this.escapeHtml(item.email || unknownText)}</td>
            <td class="awr-table-cell-language">${this.escapeHtml(languageText)}</td>
            <td class="awr-table-cell-actions">
                <div class="awr-history-actions">
                    <button class="awr-action-btn reanalyze-btn ${resendDisabledClass}" data-id="${item.id}" title="${resendTitle}" ${resendDisabledAttr}>
                        ${this.escapeHtml(resendButtonLabel)}
                    </button>
                   
                </div>
            </td>
        `;
        // ${item.reportUrl ? `<a href="${item.reportUrl}" target="_blank" class="awr-action-btn view-btn" title="查看报告">查看报告</a>` : ''}
        // 绑定重新分析按钮事件（只有在未禁用时才绑定）
        const reanalyzeBtn = tr.querySelector('.reanalyze-btn');
        if (reanalyzeBtn && !isResendDisabled) {
            reanalyzeBtn.addEventListener('click', () => {
                this.handleReanalyze(item);
            });
        }

        return tr;
    }

    // 获取状态文本
    getAwrStatusText(status) {
        const key = {
            'pending': 'popup.awr.history.status.pending',
            'success': 'popup.awr.history.status.success',
            'failed': 'popup.awr.history.status.failed',
            'running': 'popup.awr.history.status.running',
            'unknown': 'popup.awr.history.status.unknown'
        }[status] || 'popup.awr.history.status.unknown';
        return this.t(key);
    }

    // 获取状态样式类
    getAwrStatusClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'success': 'status-success',
            'failed': 'status-failed',
            'running': 'status-running',
            'unknown': 'status-unknown'
        };
        return classMap[status] || '';
    }

    // 更新分页控件
    updateAwrPagination() {
        // 计算总页数
        const totalPages = Math.ceil(this.awrHistoryTotal / this.awrHistoryPageSize);
        const pageInfo = document.getElementById('awrPageInfo');
        const prevBtn = document.getElementById('awrPrevPageBtn');
        const nextBtn = document.getElementById('awrNextPageBtn');

        if (pageInfo) {
            const safeTotalPages = totalPages > 0 ? totalPages : 1;
            pageInfo.textContent = this.t('popup.awr.pagination.info', {
                current: this.awrHistoryCurrentPage,
                total: safeTotalPages,
                records: this.awrHistoryTotal
            });
        }

        if (prevBtn) {
            prevBtn.disabled = this.awrHistoryCurrentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.awrHistoryCurrentPage >= totalPages || totalPages === 0;
        }
    }

    // 重新分析功能
    async handleReanalyze(item) {
        // 检查状态：只有成功状态可以重发邮件
        if (item.status !== 'success') {
            this.showMessage(this.t('popup.message.resendEmailOnlySuccess'), 'error', { centered: true });
            return;
        }

        // 确认操作
        // if (!confirm('确定要重新分析这条记录吗？')) {
        //     return;
        // }

        try {
            const apiKey = this.resolveApiKey();
            if (!apiKey) {
                this.showMessage(this.t('popup.message.apiKeyNotConfiguredShort'), 'error', { centered: true });
                return;
            }

            // 构建URL，使用查询参数传递id
            const url = `http://www.dbaiops.cn/api/awr/resendEmail?id=${encodeURIComponent(item.id)}`;

            this.showLoadingOverlay(this.t('popup.awr.history.resendingEmail'));

            // 使用Fetch方式，POST请求，不需要body
            const requestOptions = {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            };

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 解析返回结果: { status: "", data: null, message: "" }
            const result = await response.json();

            // 判断status字段，通常成功时status为"success"、"ok"或"200"
            // 如果status为空字符串，根据HTTP状态码判断（200-299为成功）
            const successStatuses = ['success', 'ok', '200'];
            const statusStr = String(result.status || '').toLowerCase().trim();
            const isSuccess = statusStr && successStatuses.includes(statusStr);
            const isEmptyStatus = !result.status || result.status === '';

            // 如果status表示成功，或者status为空但HTTP状态码为2xx，则认为成功
            if (isSuccess || (isEmptyStatus && response.ok)) {
                this.hideLoadingOverlay();

                this.showMessage(this.t('popup.message.resendEmailSuccess'), 'success', { centered: true });
                // 刷新列表，保持当前筛选条件
                const startTime = this.getDateTimeInputValue('awrStartTime');
                const endTime = this.getDateTimeInputValue('awrEndTime');
                const status = document.getElementById('awrStatusFilter')?.value || '';
                // this.loadAwrHistoryList(this.awrHistoryCurrentPage, this.awrHistoryPageSize, '', startTime, endTime, status);
            } else {
                // 如果status明确表示失败，或有错误message，则抛出错误
                const errorMessage = result.message || (result.status ? `重新分析失败，状态(Re-analysis failed, status): ${result.status}` : '重新分析失败(Re-analysis failed)');
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('重新分析失败:', error);
            this.hideLoadingOverlay();
            this.showMessage(this.t('popup.message.reanalyzeFailed', { error: error.message || '未知错误(Unknown error)' }), 'error', { centered: true });
        }
    }

    // ==================== AWR历史记录功能结束 ====================

    // 加载历史记录列表
    loadHistoryList() {
        const historyList = this.historyList;
        historyList.innerHTML = '';

        if (this.conversationHistory.length === 0) {
            const emptyTitle = this.t('popup.history.emptyTitle');
            const emptySubtitle = this.t('popup.history.emptySubtitle');
            historyList.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history-icon">📝</div>
                    <div class="empty-history-text">${emptyTitle}</div>
                    <div class="empty-history-subtext">${emptySubtitle}</div>
                </div>
            `;
            return;
        }

        // 添加批量操作区域
        const batchActionsDiv = document.createElement('div');
        batchActionsDiv.className = 'batch-actions';
        const selectAllText = this.t('popup.history.selectAll');
        const initialExportText = this.t('popup.history.batchExport', { count: 0 });
        const initialDeleteText = this.t('popup.history.batchDelete', { count: 0 });
        batchActionsDiv.innerHTML = `
            <div class="batch-controls">
                <label class="select-all-label">
                    <input type="checkbox" id="selectAllCheckbox">
                    ${selectAllText}
                </label>
                <div class="batch-buttons">
                    <button id="batchExportBtn" class="batch-export-btn" disabled>
                        ${initialExportText}
                    </button>
                    <button id="batchDeleteBtn" class="batch-delete-btn" disabled>
                        ${initialDeleteText}
                    </button>
                </div>
            </div>
        `;
        historyList.appendChild(batchActionsDiv);

        this.conversationHistory.forEach((item, index) => {
            const historyItem = this.createHistoryItemElement(item, index);
            historyList.appendChild(historyItem);
        });
    }

    // 创建历史记录项元素
    createHistoryItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'history-item';
        const locale = this.i18n?.getIntlLocale(this.currentLanguage);

        const questionPreview = item.question.length > 50 ? item.question.substring(0, 50) + '...' : item.question;
        const answerPreview = item.answer.length > 100 ? item.answer.substring(0, 100) + '...' : item.answer;
        const time = new Date(item.timestamp).toLocaleString(locale);

        const deleteTitle = this.t('popup.history.deleteSingleTitle');
        const modelLabel = this.t('popup.history.modelLabel');
        const knowledgeLabel = this.t('popup.history.knowledgeLabel');
        const pageLabel = this.t('popup.history.pageLabel');
        const questionLabel = this.t('popup.history.questionLabel');
        const answerLabel = this.t('popup.history.answerLabel');
        const fullQuestionLabel = this.t('popup.history.fullQuestionLabel');
        const fullAnswerLabel = this.t('popup.history.fullAnswerLabel');
        const checkboxAriaLabel = this.t('popup.history.selectRecordAria', { time });

        div.innerHTML = `
            <div class="history-header">
                <div class="history-time">
                    <input type="checkbox" class="history-checkbox" data-id="${item.id}" aria-label="${checkboxAriaLabel}">
                    ${time}
                </div>
                <div class="history-actions">
                    <button class="history-action-btn delete-single-btn" data-id="${item.id}" title="${deleteTitle}">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="history-meta">
                <span class="history-model">${modelLabel} ${item.modelName}</span>
                ${item.knowledgeBaseName ? `<span class="history-knowledge-base">${knowledgeLabel} ${item.knowledgeBaseName}</span>` : ''}
                ${item.pageUrl ? `<span class="history-url">${pageLabel} ${new URL(item.pageUrl).hostname}</span>` : ''}
            </div>
            <div class="history-question">
                <strong>${questionLabel}</strong> ${this.escapeHtml(questionPreview)}
            </div>
            <div class="history-answer">
                <strong>${answerLabel}</strong> ${this.escapeHtml(answerPreview)}
            </div>
            <div class="history-full-content" id="history-full-${item.id}" style="display: none;">
                <div class="history-full-question">
                    <strong>${fullQuestionLabel}</strong><br>
                    ${this.escapeHtml(item.question)}
                </div>
                <div class="history-full-answer">
                    <strong>${fullAnswerLabel}</strong><br>
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
                const questionLabel = this.t('popup.history.questionLabel');
                const answerLabel = this.t('popup.history.answerLabel');
                const textToCopy = `${questionLabel} ${item.question}\n\n${answerLabel} ${item.answer}`;
                await navigator.clipboard.writeText(textToCopy);
                this.showMessage(this.t('popup.message.copied'), 'success');
            }
        } catch (error) {
            console.error('复制历史记录失败:', error);
            this.showMessage(this.t('popup.message.copyFailed'), 'error');
        }
    }

    // 删除历史记录项
    deleteHistoryItem(id) {
        try {
            const confirmMessage = this.t('popup.history.confirmDeleteSingle');
            if (!confirm(confirmMessage)) {
                return;
            }

            this.conversationHistory = this.conversationHistory.filter(h => h.id !== id);
            chrome.storage.sync.set({
                conversationHistory: this.conversationHistory
            });
            this.loadHistoryList();
            this.showMessage(this.t('popup.message.historyDeleted'), 'success');
        } catch (error) {
            console.error('删除历史记录失败:', error);
            this.showMessage(this.t('popup.message.deleteFailed'), 'error');
        }
    }
    // 在合适的位置添加这个方法（比如在 deleteHistoryItem 方法后面）
    updateBatchButtons() {
        const checkboxes = document.querySelectorAll('.history-checkbox:checked');
        const batchExportBtn = document.getElementById('batchExportBtn');
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');

        const selectedCount = checkboxes.length;

        if (batchExportBtn) {
            batchExportBtn.disabled = selectedCount === 0;
            batchExportBtn.textContent = this.t('popup.history.batchExport', { count: selectedCount });
        }

        if (batchDeleteBtn) {
            batchDeleteBtn.disabled = selectedCount === 0;
            batchDeleteBtn.textContent = this.t('popup.history.batchDelete', { count: selectedCount });
        }
    }
    // 在合适的位置添加这个方法
    batchDeleteHistory() {
        const checkboxes = document.querySelectorAll('.history-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (selectedIds.length === 0) {
            this.showMessage(this.t('popup.message.selectRecordsToDelete'), 'warning');
            return;
        }

        const confirmMessage = this.t('popup.history.confirmDeleteSelected', { count: selectedIds.length });
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            this.conversationHistory = this.conversationHistory.filter(h => !selectedIds.includes(h.id));
            chrome.storage.sync.set({
                conversationHistory: this.conversationHistory
            });
            this.loadHistoryList();
            this.showMessage(this.t('popup.message.deleteHistorySelectionSuccess', { count: selectedIds.length }), 'success');
        } catch (error) {
            console.error('批量删除历史记录失败:', error);
            this.showMessage(this.t('popup.message.batchDeleteFailed'), 'error');
        }
    }
    // 在合适的位置添加这个方法
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const checkboxes = document.querySelectorAll('.history-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });

        this.updateBatchButtons();
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
            const confirmMessage = this.t('popup.history.confirmClearAll');
            if (confirm(confirmMessage)) {
                this.conversationHistory = [];
                await chrome.storage.sync.set({
                    conversationHistory: []
                });
                this.loadHistoryList();
                this.showMessage(this.t('popup.message.historyCleared'), 'success');
            }
        } catch (error) {
            console.error('清空历史记录失败:', error);
            // 如果是存储配额问题，尝试清理而不是完全清空
            if (error.message && error.message.includes('quota')) {
                console.log('检测到存储配额问题，尝试清理旧记录...');
                await this.cleanupHistoryRecords();
                this.loadHistoryList();
                this.showMessage(this.t('popup.message.historyCleaned'), 'info');
            } else {
                this.showMessage(this.t('popup.message.clearFailed'), 'error');
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
            a.download = `bic-qa-history-all-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showMessage(this.t('popup.message.exportAllHistorySuccess', { count: this.conversationHistory.length }), 'success');
        } catch (error) {
            console.error('导出历史记录失败:', error);
            this.showMessage(this.t('popup.message.exportFailed'), 'error');
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
            const locale = this.i18n?.getIntlLocale(this.currentLanguage);
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
            let contentTypeKey = 'text';
            if (text.includes('http') || text.includes('www')) {
                contentTypeKey = 'withLinks';
            }
            if (text.includes('代码') || text.includes('function') || text.includes('class')) {
                contentTypeKey = 'code';
            }
            if (text.includes('错误') || text.includes('Error') || text.includes('失败')) {
                contentTypeKey = 'error';
            }
            const contentType = this.t(`popup.summary.contentType.${contentTypeKey}`);

            // 构建摘要
            const summaryParts = [];
            summaryParts.push(this.t('popup.summary.header'));
            summaryParts.push('');
            summaryParts.push(this.t('popup.summary.contentTypeLabel', { type: contentType }));
            summaryParts.push('');

            if (title) {
                summaryParts.push(this.t('popup.summary.titleLabel', { title }));
                summaryParts.push('');
            }

            summaryParts.push(this.t('popup.summary.statsHeader'));
            summaryParts.push(this.t('popup.summary.statChars', { count: charCount }));
            summaryParts.push(this.t('popup.summary.statWords', { count: wordCount }));
            summaryParts.push(this.t('popup.summary.statLines', { count: lineCount }));
            summaryParts.push(this.t('popup.summary.statSentences', { count: sentenceCount }));
            summaryParts.push('');

            summaryParts.push(this.t('popup.summary.previewHeader', { preview: contentPreview }));
            summaryParts.push('');

            // 如果内容很长，提供分段分析
            if (lines.length > 10) {
                const sections = this.analyzeContentStructure(lines);
                summaryParts.push(this.t('popup.summary.structureHeader'));
                sections.forEach((section, index) => {
                    summaryParts.push(this.t('popup.summary.structureItem', {
                        index: index + 1,
                        title: section.title,
                        lines: section.lines
                    }));
                });
                summaryParts.push('');
            }

            // 添加关键词分析
            const keywords = this.extractKeywords(text);
            if (keywords.length > 0) {
                summaryParts.push(`${this.t('popup.summary.keywordsLabel')}${keywords.slice(0, 10).join(', ')}`);
                summaryParts.push('');
            }

            summaryParts.push(`${this.t('popup.summary.generatedAt')}${new Date().toLocaleString(locale || undefined)}`);

            return summaryParts.join('\n');

        } catch (error) {
            console.error('生成文本摘要失败:', error);
            return this.t('popup.summary.generateFailed', { error: error.message || 'Unknown error' });
        }
    }

    analyzeContentStructure(lines) {
        const sections = [];
        let sectionIndex = 1;
        let currentSection = { title: this.t('popup.summary.section.start'), lines: 0 };

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

                sectionIndex += 1;
                currentSection = {
                    title: line.trim() || this.t('popup.summary.section.default', { index: sectionIndex }),
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
            .sort(([, a], [, b]) => b - a)
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
            this.showConfigurationNotice(this.t('popup.notice.configureProvidersAndModels'), 'warning');
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
            settingsBtn.textContent = this.t('popup.common.goToSettings');
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
            settingsBtn.textContent = this.t('popup.common.goToSettings');
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
        this.showMessage(this.t('popup.message.newSessionStarted'), 'success');

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
            // console.log('resultText元素:', this.resultText);

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
    batchExportHistory() {
        const checkboxes = document.querySelectorAll('.history-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (selectedIds.length === 0) {
            this.showMessage(this.t('popup.message.selectRecordsToExport'), 'warning');
            return;
        }

        try {
            // 筛选选中的历史记录
            const selectedHistory = this.conversationHistory.filter(h => selectedIds.includes(h.id));

            const exportData = {
                conversationHistory: selectedHistory,
                exportTime: new Date().toISOString(),
                totalCount: selectedHistory.length,
                selectedCount: selectedIds.length,
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bic-qa-history-selected-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showMessage(this.t('popup.message.exportHistorySelectionSuccess', { count: selectedHistory.length }), 'success');
        } catch (error) {
            console.error('批量导出历史记录失败:', error);
            this.showMessage(this.t('popup.message.batchExportFailed'), 'error');
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
                // console.log('从传入的container中查找.result-text:', resultText);
                // console.log('targetContainer.innerHTML:', targetContainer.innerHTML);
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

            // console.log('最终使用的resultText:', resultText);
            // console.log('resultText.innerHTML:', resultText.innerHTML);

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
            titleEl.textContent = this.t('popup.knowledge.referenceTitle');
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
                toggleEl.textContent = this.t('popup.common.viewAll');
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
                    toggleEl.textContent = isHidden
                        ? this.t('popup.common.collapseDetails')
                        : this.t('popup.common.viewAll');
                });

                listEl.appendChild(itemEl);
            });

            console.log('知识库列表渲染完成，共渲染', items.length, '条知识库');
            // console.log('最终knowlistEl.innerHTML:', knowlistEl.innerHTML);
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
                resultTitle.textContent = this.t('popup.progress.stopped');
            }

            // 获取最新的对话容器中的result-text-tips
            const resultTextTips = currentContainer ? currentContainer.querySelector('.result-text-tips') : null;

            if (resultTextTips) {
                resultTextTips.textContent = this.t('popup.progress.stoppedDescription');
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
        debugger;
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
        debugger;
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
                        <div class="question-name" data-i18n="popup.result.userName">用户</div>
                        <div class="question-time">${timeStr}</div>
                    </div>
                </div>
                <div class="question-content">
                    <div class="question-text">${question}</div>
                    <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                        <img src="icons/copy.svg" alt="复制" class="copy-icon">
                    </button>
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

            const questionNameEl = questionDisplay.querySelector('.question-name');
            if (questionNameEl) {
                questionNameEl.textContent = this.t('popup.result.userName');
            }
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
                            <div class="question-name" data-i18n="popup.result.userName">用户</div>
                            <div class="question-time"></div>
                        </div>
                    </div>
                    <div class="question-content">
                        <div class="question-text"></div>
                        <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                            <img src="icons/copy.svg" alt="复制" class="copy-icon">
                        </button>
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

        const questionNameEl = conversationContainer.querySelector('.question-display .question-name');
        if (questionNameEl) {
            questionNameEl.textContent = this.t('popup.result.userName');
        }

        const aiNameEl = conversationContainer.querySelector('.ai-display .ai-name');
        if (aiNameEl) {
            aiNameEl.textContent = this.t('popup.result.aiName');
        }

        const resultTitleEl = conversationContainer.querySelector('.result-title');
        if (resultTitleEl) {
            resultTitleEl.textContent = this.t('popup.result.title');
        }

        // 将新容器添加到主结果容器中
        if (this.resultContainer) {
            this.resultContainer.appendChild(conversationContainer);
        }
        const resultActions = conversationContainer.querySelector('.result-actions');
        if (resultActions) {
            // 初始时隐藏result-actions，等待内容加载完成后显示
            resultActions.style.display = 'none';
            resultActions.style.opacity = '0';
            resultActions.style.transition = 'opacity 0.3s ease';
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
            resultTitle.textContent = this.t('popup.result.title');
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
        // 【修改点5】在clearConversationContainer方法中，清空内容时隐藏result-actions
        const resultActions = container.querySelector('.result-actions');
        if (resultActions) {
            resultActions.style.display = 'none';
            resultActions.style.opacity = '0';
        }
    }
    // 统一的点赞和否定处理函数
    // 统一的点赞和否定处理函数
    async doAdviceForAnswer(question, answer, adviceType, container = null) {
        debugger;
        try {
            debugger;
            // 获取目标容器
            const targetContainer = container || this.resultContainer;
            if (!targetContainer) {
                console.error('未找到目标容器');
                return;
            }

            // 获取当前容器的反馈按钮
            const likeBtn = targetContainer.querySelector('.like-btn');
            const dislikeBtn = targetContainer.querySelector('.dislike-btn');

            if (!likeBtn || !dislikeBtn) {
                console.error('未找到反馈按钮');
                return;
            }

            // 检查当前状态
            const isCurrentlyLiked = likeBtn.classList.contains('active');
            const isCurrentlyDisliked = dislikeBtn.classList.contains('active');

            // 获取当前容器的反馈ID（隐藏字段）
            const feedbackIdElement = targetContainer.querySelector('.feedback-id');
            const currentFeedbackId = feedbackIdElement ? feedbackIdElement.textContent : null;

            // 获取当前时间
            const now = new Date();
            const operTime = now.toISOString().slice(0, 19).replace('T', ' ');

            // 获取API密钥
            await this.loadKnowledgeServiceConfig();
            let apiKey = '';
            let apiUserId = 0; // 默认用户ID，你可以根据需要修改

            if (this.knowledgeServiceConfig && this.knowledgeServiceConfig.api_key) {
                apiKey = this.knowledgeServiceConfig.api_key.trim();
            }

            if (!apiKey) {
                console.error('未配置API密钥，无法提交反馈', 'error');
                this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
                // this.showMessage('未配置API密钥，无法提交反馈', 'error');
                return;
            }

            // 构建请求参数
            const requestData = {
                id: currentFeedbackId ? parseInt(currentFeedbackId) : null,
                question: question,
                answer: answer,
                adviceType: adviceType,
                // operTime: operTime,
                // apiUserId: apiUserId
            };

            // 构建请求头
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            let response;
            let operation = '';

            // 根据当前状态和操作类型决定API调用
            if (adviceType === 'good') {
                if (isCurrentlyLiked) {
                    // 当前已点赞，再次点击取消点赞（删除）
                    if (currentFeedbackId) {
                        operation = 'delete';
                        response = await this.deleteFeedback(currentFeedbackId, apiKey);
                    } else {
                        // 没有ID，直接移除样式
                        this.removeFeedbackStyle(targetContainer);
                        this.showMessage(this.t('popup.message.likeCancelled'), 'info');
                        return;
                    }
                } else {
                    // 当前未点赞，执行点赞操作
                    if (currentFeedbackId && isCurrentlyDisliked) {
                        // 从否定改为点赞（编辑）
                        operation = 'update';
                        response = await this.updateFeedback(requestData, apiKey);
                    } else {
                        // 新增点赞
                        operation = 'add';
                        response = await this.addFeedback(requestData, apiKey);
                    }
                }
            } else if (adviceType === 'bad') {
                if (isCurrentlyDisliked) {
                    // 当前已否定，再次点击取消否定（删除）
                    if (currentFeedbackId) {
                        operation = 'delete';
                        response = await this.deleteFeedback(currentFeedbackId, apiKey);
                    } else {
                        // 没有ID，直接移除样式
                        this.removeFeedbackStyle(targetContainer);
                        this.showMessage(this.t('popup.message.dislikeCancelled'), 'info');
                        return;
                    }
                } else {
                    // 当前未否定，执行否定操作
                    if (currentFeedbackId && isCurrentlyLiked) {
                        // 从点赞改为否定（编辑）
                        operation = 'update';
                        response = await this.updateFeedback(requestData, apiKey);
                    } else {
                        // 新增否定
                        operation = 'add';
                        response = await this.addFeedback(requestData, apiKey);
                    }
                }
            }
            debugger;

            // 处理响应
            if (response && response.status === 'success') {
                // 更新UI状态
                this.updateFeedbackUI(targetContainer, adviceType, operation, response.data);

                // 显示成功消息
                let message = '';
                if (operation === 'add') {
                    message = adviceType === 'good' ? '感谢您的反馈！👍' : '感谢您的反馈👎！我们会继续改进。';
                } else if (operation === 'update') {
                    message = adviceType === 'good' ? '感谢您的反馈！👍' : '感谢您的反馈👎！我们会继续改进。';
                } else if (operation === 'delete') {
                    message = adviceType === 'good' ? '已取消点赞' : '已取消否定';
                }
                this.showMessage(message, 'success');
            } else {
                // 显示错误消息
                const errorMsg = response ? response.message || '操作失败' : '网络错误';
                console.error('反馈操作失败:', errorMsg);
                this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
                // this.showMessage(errorMsg, 'error');
            }

        } catch (error) {
            console.error('反馈操作失败:', error);
            this.showMessage(this.t('popup.message.feedbackThanksPositive'), 'success');
            // this.showMessage('操作失败，请稍后重试', 'error');
        }
    }

    // 新增反馈
    async addFeedback(data, apiKey) {
        try {
            const response = await fetch('http://www.dbaiops.cn/api/chat/addFeedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('新增反馈失败:', error);
            throw error;
        }
    }

    // 编辑反馈
    async updateFeedback(data, apiKey) {
        try {
            const response = await fetch('http://www.dbaiops.cn/api/chat/updateFeedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('编辑反馈失败:', error);
            throw error;
        }
    }

    // 删除反馈
    async deleteFeedback(id, apiKey) {
        try {
            const response = await fetch(`http://www.dbaiops.cn/api/chat/deleteFeedback?id=${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('删除反馈失败:', error);
            throw error;
        }
    }

    // 更新反馈UI状态
    updateFeedbackUI(container, adviceType, operation, responseData) {
        const likeBtn = container.querySelector('.like-btn');
        const dislikeBtn = container.querySelector('.dislike-btn');

        if (!likeBtn || !dislikeBtn) return;

        // 移除所有活跃状态
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');

        // 根据操作类型更新状态
        if (operation === 'add' || operation === 'update') {
            if (adviceType === 'good') {
                likeBtn.classList.add('active');
            } else if (adviceType === 'bad') {
                dislikeBtn.classList.add('active');
            }

            // 保存反馈ID
            this.saveFeedbackId(container, responseData.id || responseData.feedbackId);
        } else if (operation === 'delete') {
            // 删除操作，移除反馈ID
            this.removeFeedbackId(container);
        }
    }

    // 保存反馈ID到容器中
    saveFeedbackId(container, feedbackId) {
        // 移除旧的反馈ID元素
        this.removeFeedbackId(container);

        // 创建新的反馈ID元素（隐藏）
        const feedbackIdElement = document.createElement('div');
        feedbackIdElement.className = 'feedback-id';
        feedbackIdElement.style.display = 'none';
        feedbackIdElement.textContent = feedbackId;

        // 添加到容器中
        container.appendChild(feedbackIdElement);
    }

    // 移除反馈ID
    removeFeedbackId(container) {
        const existingIdElement = container.querySelector('.feedback-id');
        if (existingIdElement) {
            existingIdElement.remove();
        }
    }

    // 移除反馈样式
    removeFeedbackStyle(container) {
        const likeBtn = container.querySelector('.like-btn');
        const dislikeBtn = container.querySelector('.dislike-btn');

        if (likeBtn) likeBtn.classList.remove('active');
        if (dislikeBtn) dislikeBtn.classList.remove('active');
    }

    // 格式化日期时间
    formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    // 复制问题文本功能
    copyQuestionText(button) {
        try {
            // 获取问题文本
            const questionText = button.parentElement.querySelector('.question-text');
            const textToCopy = questionText.textContent || questionText.innerText;

            if (!textToCopy || textToCopy.trim() === '') {
                console.log('没有找到问题文本');
                return;
            }

            // 复制到剪贴板
            navigator.clipboard.writeText(textToCopy).then(() => {
                // 显示复制成功提示
                this.showCopySuccess(button);
            }).catch(err => {
                console.error('复制失败:', err);
                // 降级方案：使用传统方法
                this.fallbackCopyTextToClipboard(textToCopy, button);
            });
        } catch (error) {
            console.error('复制功能出错:', error);
        }
    }

    // 降级复制方案
    fallbackCopyTextToClipboard(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showCopySuccess(button);
            } else {
                console.log('复制失败');
            }
        } catch (err) {
            console.error('复制失败:', err);
        }

        document.body.removeChild(textArea);
    }

    // 显示复制成功提示
    // 简洁蓝色提示：屏幕居中显示"复制成功"
    showCopySuccess() {
        try {
            const existing = document.querySelector('.bicqa-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = 'bicqa-toast';
            toast.textContent = this.t('popup.message.copied');
            toast.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) scale(.98);
			background: #1d4ed8;
			color: #fff;
			padding: 12px 18px;
			border-radius: 8px;
			font-size: 14px;
			line-height: 1;
			box-shadow: 0 4px 16px rgba(0,0,0,.2);
			z-index: 2147483647;
			opacity: 0;
			transition: opacity .15s ease, transform .15s ease;
			pointer-events: none;
		`;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translate(-50%, -50%) scale(1)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translate(-50%, -50%) scale(.98)';
                setTimeout(() => toast.remove(), 150);
            }, 1500);
        } catch (e) {
            console.warn(e);
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