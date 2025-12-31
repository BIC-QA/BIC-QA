import { attachAwrModule } from './modules/awr.js';
import { attachInspectionModule } from './modules/diagnosis.js';
import { attachSqlOptimizationModule } from './modules/sql-optimization.js';
import { escapeHtml, formatTime } from './utils/common.js';
import { createRequestUtil } from './utils/request.js';
import { createStreamService } from './services/stream-service.js';
import { createRequestService } from './services/request-service.js';
import { createDomCache } from './core/dom-cache.js';
import { attachPopupEventHandlers } from './ui/event-handlers.js';
import { createQuestionController } from './controllers/question-controller.js';
import { createHistoryService } from './services/history-service.js';
import { createConversationView } from './ui/components/conversation-view.js';
import { createSuggestionPanel } from './ui/components/suggestion-panel.js';
import { createSettingsService } from './services/settings-service.js';
import { createConfigLoader } from './managers/config-loader.js';
import { createKnowledgeBaseManager } from './managers/knowledge-base-manager.js';
import { createParameterRulesManager } from './managers/parameter-rules-manager.js';
import { createContentFormatter } from './managers/content-formatter.js';
import { createUIDisplayManager } from './managers/ui-display-manager.js';
import { createResultOperationsManager } from './managers/result-operations-manager.js';
import { createTranslationManager } from './managers/translation-manager.js';
import { createSessionManager } from './managers/session-manager.js';
import { createProgressManager } from './managers/progress-manager.js';
import { createSummaryManager } from './managers/summary-manager.js';
import { createInputManager } from './managers/input-manager.js';
import { createMessageRenderer } from './managers/message-renderer.js';
import { createFeedbackManager } from './managers/feedback-manager.js';
import { createAnnouncementManager } from './managers/announcement-manager.js';
import { createQuestionProcessor } from './managers/question-processor.js';
import { createUserProfileManager } from './managers/user-profile-manager.js';
import { createProcessingControlManager } from './managers/processing-control-manager.js';
import { createCopyUtilsManager } from './managers/copy-utils-manager.js';
import { createLanguageManager } from './managers/language-manager.js';
import { createNavigationManager } from './managers/navigation-manager.js';
import { createApiUtilsManager } from './managers/api-utils-manager.js';
import { createKnowledgeBaseHandler } from './managers/knowledge-base-handler.js';
import { createUITextManager } from './managers/ui-text-manager.js';
import { createInitializationManager } from './managers/initialization-manager.js';
import { createErrorHandlerManager } from './managers/error-handler-manager.js';
import { createFullscreenManager } from './managers/fullscreen-manager.js';
import { createPolicyDialogManager } from './managers/policy-dialog-manager.js';
import { createScrollManager } from './managers/scroll-manager.js';
import { createTestManager } from './managers/test-manager.js';
import { createDateTimeInputManager } from './managers/datetime-input-manager.js';
import { createFeedbackHandlerManager } from './managers/feedback-handler-manager.js';
import { createOnboardingManager } from './managers/onboarding-manager.js';

// BIC-QA 弹出窗口脚本
export class BicQAPopup {
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
        this._kbImageList = [];
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
        // 初始化为默认语言，但会在 initLanguagePreference 中从存储读取实际语言
        this.currentLanguage = this.i18n.defaultLanguage;
        this.languageResources = {
            'zhcn': {
                userGuide: 'https://api.bic-qa.com/bic-qa-html/user-guide.html',
                notice: 'https://api.bic-qa.com/bic-qa-html/notice.html'
            },
            'en': {
                userGuide: 'https://api.bic-qa.com/bic-qa-html/user-guide.html',
                notice: 'https://api.bic-qa.com/bic-qa-html/notice.html'
            },
            'zh-tw': {
                userGuide: 'https://api.bic-qa.com/bic-qa-html/user-guide.html',
                notice: 'https://api.bic-qa.com/bic-qa-html/notice.html'
            },
            'jap': {
                userGuide: 'https://api.bic-qa.com/bic-qa-html/user-guide.html',
                notice: 'https://api.bic-qa.com/bic-qa-html/notice.html'
            }
        };
        this.iconUrls = {
            user: this.getAssetUrl('icons/bic-user.png'),
            ai: this.getAssetUrl('icons/bic-an.png'),
            copy: this.getAssetUrl('icons/copy.svg'),
            download: this.getAssetUrl('icons/download.svg'),
            clear: this.getAssetUrl('icons/clear.svg'),
            good: this.getAssetUrl('icons/good.svg'),
            bad: this.getAssetUrl('icons/bad.svg')
        };
        this.dateTimeFilterInputs = [];
        this.dateTimePickerInitialized = false;
        this.activeDateTimeInput = null;
        this.dateTimePickerElements = null;
        this.dateTimePickerState = {
            viewDate: new Date(),
            selectedDate: null
        };
        this.defaultAwrDatabaseType = '2101';
        this.storedAwrDatabaseType = null;

        // SQL优化相关属性
        this.sqlOptimizationSelectedFile = null;
        this.sqlOptimizationHistoryCurrentPage = 1;
        this.sqlOptimizationHistoryPageSize = 10;
        this.sqlOptimizationHistoryTotal = 0;
        this.sqlOptimizationHistoryList = [];

        // 保存最新版本号和插件ID，用于语言切换后重新显示图标和下载
        this.latestVersion = null;
        this.latestPluginId = null;
        // 标记是否应该显示更新图标（一旦显示就保持显示，除非明确检查到版本已是最新）
        this.shouldShowUpdateIcon = false;

        attachAwrModule(this);
        attachInspectionModule(this);
        attachSqlOptimizationModule(this);

        // 先初始化语言管理器，确保 getAcceptLanguage 方法可用
        const languageManager = createLanguageManager(this);
        this.applyLanguage = languageManager.applyLanguage.bind(languageManager);
        this.translateStaticElements = languageManager.translateStaticElements.bind(languageManager);
        this.applyI18nToElement = languageManager.applyI18nToElement.bind(languageManager);
        this.getAcceptLanguage = languageManager.getAcceptLanguage.bind(languageManager);

        // 先初始化API工具管理器，确保 setAuthHeaders 方法可用
        const apiUtilsManager = createApiUtilsManager(this);
        this.setAuthHeaders = apiUtilsManager.setAuthHeaders.bind(apiUtilsManager);

        // 初始化请求工具（需要在语言管理器和API工具管理器之后，以便使用 getAcceptLanguage 和 setAuthHeaders）
        this.requestUtil = createRequestUtil(this);
        this.domCache = createDomCache();

        this.streamService = createStreamService(this);
        const requestService = createRequestService(this, this.streamService);
        this.callAIAPI = requestService.callAIAPI;
        this.callOllamaAPI = requestService.callOllamaAPI;
        this.streamChatWithConfig = requestService.streamChatWithConfig;
        this.streamChat = requestService.streamChat;
        this.handleStreamResponse = this.streamService.handleStreamResponse;

        const questionController = createQuestionController(this);
        this.handleAskQuestion = questionController.handleAskQuestion;
        this.generateQuestionSuggestions = questionController.generateQuestionSuggestions;
        this.callAPIForSuggestions = questionController.callAPIForSuggestions;
        this.shouldCheckLetterLimit = questionController.shouldCheckLetterLimit;
        this.getLetterLimit = questionController.getLetterLimit;
        this.getExpertTypeFromKnowledgeBase = questionController.getExpertTypeFromKnowledgeBase;
        this.parseSuggestions = questionController.parseSuggestions;

        const suggestionPanel = createSuggestionPanel(this);
        this.displaySuggestions = suggestionPanel.displaySuggestions;
        this.selectSuggestion = suggestionPanel.selectSuggestion;
        this.keepOriginalQuestion = suggestionPanel.keepOriginalQuestion;
        this.regenerateSuggestions = suggestionPanel.regenerateSuggestions;

        const historyService = createHistoryService(this);
        this.saveConversationHistory = historyService.saveConversationHistory;
        this.cleanupHistoryRecords = historyService.cleanupHistoryRecords;
        this.showHistoryDialog = historyService.showHistoryDialog;
        this.hideHistoryDialog = historyService.hideHistoryDialog;
        this.loadHistoryList = historyService.loadHistoryList;
        this.createHistoryItemElement = historyService.createHistoryItemElement;
        this.copyHistoryItem = historyService.copyHistoryItem;
        this.deleteHistoryItem = historyService.deleteHistoryItem;
        this.updateBatchButtons = historyService.updateBatchButtons;
        this.batchDeleteHistory = historyService.batchDeleteHistory;
        this.toggleSelectAll = historyService.toggleSelectAll;
        this.toggleHistoryExpansion = historyService.toggleHistoryExpansion;
        this.clearHistory = historyService.clearHistory;
        this.exportHistory = historyService.exportHistory;
        this.batchExportHistory = historyService.batchExportHistory;

        const conversationView = createConversationView(this);
        this.updateQuestionDisplay = conversationView.updateQuestionDisplay;
        this.updateAIDisplay = conversationView.updateAIDisplay;
        this.scrollToBottom = conversationView.scrollToBottom;
        this.createNewConversationContainer = conversationView.createNewConversationContainer;
        this.getCurrentConversationContainer = conversationView.getCurrentConversationContainer;
        this.getOrCreateConversationContainer = conversationView.getOrCreateConversationContainer;
        this.forceCreateNewConversationContainer = conversationView.forceCreateNewConversationContainer;
        this.clearConversationContainer = conversationView.clearConversationContainer;
        this.renderKnowledgeList = conversationView.renderKnowledgeList;
        this.resetFeedbackButtons = conversationView.resetFeedbackButtons;

        const settingsService = createSettingsService(this);
        this.initLanguagePreference = settingsService.initLanguagePreference;
        this.getStoredLanguagePreference = settingsService.getStoredLanguagePreference;
        this.handleLanguageChange = settingsService.handleLanguageChange;
        this.resetLanguageSwitcherSelection = settingsService.resetLanguageSwitcherSelection;
        this.updateLanguageSwitcherDisplay = settingsService.updateLanguageSwitcherDisplay;
        this.getLanguageDisplayName = settingsService.getLanguageDisplayName;
        this.applyLanguageInstructionToSystemContent = settingsService.applyLanguageInstructionToSystemContent;
        this.shouldAddInstructionForQuestion = settingsService.shouldAddInstructionForQuestion;
        this.isLikelyChinese = settingsService.isLikelyChinese;
        this.ensureChineseQuestion = settingsService.ensureChineseQuestion;
        this.translateQuestionToChinese = settingsService.translateQuestionToChinese;
        this.translateKnowledgeItems = settingsService.translateKnowledgeItems;
        this.getChatCompletionsEndpoint = settingsService.getChatCompletionsEndpoint;
        this.requestChatCompletionTranslation = settingsService.requestChatCompletionTranslation;
        this.setupDateTimeFilters = settingsService.setupDateTimeFilters;
        this.createDateTimePickerElements = settingsService.createDateTimePickerElements;
        this.openDateTimePicker = settingsService.openDateTimePicker;
        this.closeDateTimePicker = settingsService.closeDateTimePicker;
        this.renderDateTimePicker = settingsService.renderDateTimePicker;
        this.renderDateTimePickerHeader = settingsService.renderDateTimePickerHeader;
        this.renderDateTimePickerWeekdays = settingsService.renderDateTimePickerWeekdays;
        this.renderDateTimePickerDays = settingsService.renderDateTimePickerDays;
        this.updateDateTimePickerButtonsText = settingsService.updateDateTimePickerButtonsText;
        this.changeDateTimePickerMonth = settingsService.changeDateTimePickerMonth;
        this.selectDateTimePickerDate = settingsService.selectDateTimePickerDate;
        this.confirmDateTimePickerSelection = settingsService.confirmDateTimePickerSelection;
        this.cancelDateTimePickerSelection = settingsService.cancelDateTimePickerSelection;
        this.handleDateTimePickerOutsideClick = settingsService.handleDateTimePickerOutsideClick;
        this.handleDateTimePickerKeydown = settingsService.handleDateTimePickerKeydown;
        this.updateDateTimePickerLocale = settingsService.updateDateTimePickerLocale;
        this.cleanupDateTimeFilters = settingsService.cleanupDateTimeFilters;
        this.addUserInteractionListeners = settingsService.addUserInteractionListeners;
        this.detectBrowserCompatibility = settingsService.detectBrowserCompatibility;
        this.checkConfigurationStatus = settingsService.checkConfigurationStatus;
        this.clearConfigurationNotice = settingsService.clearConfigurationNotice;
        this.showConfigurationNotice = settingsService.showConfigurationNotice;

        // 初始化配置加载管理器
        const configLoader = createConfigLoader(this);
        this.loadSettings = configLoader.loadSettings.bind(configLoader);
        this.loadModelOptions = configLoader.loadModelOptions.bind(configLoader);
        this.loadKnowledgeServiceConfig = configLoader.loadKnowledgeServiceConfig.bind(configLoader);
        this.hasConfigChanges = configLoader.hasConfigChanges.bind(configLoader);
        this.syncConfigFromFile = configLoader.syncConfigFromFile.bind(configLoader);
        this.getEnvType = configLoader.getEnvType.bind(configLoader);

        // 初始化知识库管理器
        const knowledgeBaseManager = createKnowledgeBaseManager(this);
        this.loadKnowledgeBaseOptions = knowledgeBaseManager.loadKnowledgeBaseOptions.bind(knowledgeBaseManager);
        this.loadKnowledgeBasesFromManager = knowledgeBaseManager.loadKnowledgeBasesFromManager.bind(knowledgeBaseManager);
        this.loadKnowledgeBasesDirectly = knowledgeBaseManager.loadKnowledgeBasesDirectly.bind(knowledgeBaseManager);
        this.loadKnowledgeBasesFromAPI = knowledgeBaseManager.loadKnowledgeBasesFromAPI.bind(knowledgeBaseManager);
        this.loadKnowledgeBasesFromConfig = knowledgeBaseManager.loadKnowledgeBasesFromConfig.bind(knowledgeBaseManager);
        this.getLanguageCandidateKeys = knowledgeBaseManager.getLanguageCandidateKeys.bind(knowledgeBaseManager);
        this.getLocalizedValue = knowledgeBaseManager.getLocalizedValue.bind(knowledgeBaseManager);
        this.formatKnowledgeBaseName = knowledgeBaseManager.formatKnowledgeBaseName.bind(knowledgeBaseManager);
        this.normalizeDatasetName = knowledgeBaseManager.normalizeDatasetName.bind(knowledgeBaseManager);
        this.localizeKnowledgeBase = knowledgeBaseManager.localizeKnowledgeBase.bind(knowledgeBaseManager);
        this.renderKnowledgeBasesFromData = knowledgeBaseManager.renderKnowledgeBasesFromData.bind(knowledgeBaseManager);
        this.loadDefaultKnowledgeBases = knowledgeBaseManager.loadDefaultKnowledgeBases.bind(knowledgeBaseManager);

        // 初始化参数规则管理器
        const parameterRulesManager = createParameterRulesManager(this);
        this.loadParameterRuleOptions = parameterRulesManager.loadParameterRuleOptions.bind(parameterRulesManager);
        this.getDefaultRulesByLanguage = parameterRulesManager.getDefaultRulesByLanguage.bind(parameterRulesManager);
        this.mergeRulesWithBuiltInSupport = parameterRulesManager.mergeRulesWithBuiltInSupport.bind(parameterRulesManager);
        this.mergeRulesWithoutDuplicates = parameterRulesManager.mergeRulesWithoutDuplicates.bind(parameterRulesManager);
        this.cleanDuplicateRulesWithBuiltInSupport = parameterRulesManager.cleanDuplicateRulesWithBuiltInSupport.bind(parameterRulesManager);
        this.cleanDuplicateRules = parameterRulesManager.cleanDuplicateRules.bind(parameterRulesManager);
        this.isBuiltInRule = parameterRulesManager.isBuiltInRule.bind(parameterRulesManager);
        this.getParameterRuleDisplayName = parameterRulesManager.getParameterRuleDisplayName.bind(parameterRulesManager);

        // 初始化内容格式化管理器
        const contentFormatter = createContentFormatter(this);
        this.formatContent = contentFormatter.formatContent.bind(contentFormatter);
        this.formatTableWithNewlines = contentFormatter.formatTableWithNewlines.bind(contentFormatter);
        this.processTableLinesWithNewlines = contentFormatter.processTableLinesWithNewlines.bind(contentFormatter);
        this.resetTableState = contentFormatter.resetTableState.bind(contentFormatter);
        this.isTableRow = contentFormatter.isTableRow.bind(contentFormatter);
        this.isTableSeparator = contentFormatter.isTableSeparator.bind(contentFormatter);
        this.parseTableRow = contentFormatter.parseTableRow.bind(contentFormatter);
        // clearFormatCache 已移至 session-manager.js

        // 初始化UI显示管理器
        const uiDisplayManager = createUIDisplayManager(this);
        this.showResult = uiDisplayManager.showResult.bind(uiDisplayManager);
        this.showMessage = uiDisplayManager.showMessage.bind(uiDisplayManager);
        this.showErrorResult = uiDisplayManager.showErrorResult.bind(uiDisplayManager);
        this.showLoadingOverlay = uiDisplayManager.showLoadingOverlay.bind(uiDisplayManager);
        this.hideLoadingOverlay = uiDisplayManager.hideLoadingOverlay.bind(uiDisplayManager);

        // 初始化结果操作管理器
        const resultOperationsManager = createResultOperationsManager(this);
        this.copyResult = resultOperationsManager.copyResult.bind(resultOperationsManager);
        this.exportResultAsHtml = resultOperationsManager.exportResultAsHtml.bind(resultOperationsManager);
        this.clearResult = resultOperationsManager.clearResult.bind(resultOperationsManager);

        // 初始化翻译管理器
        const translationManager = createTranslationManager(this);
        this.translateSelection = translationManager.translateSelection.bind(translationManager);
        this.translateText = translationManager.translateText.bind(translationManager);
        this.showTranslationDialog = translationManager.showTranslationDialog.bind(translationManager);
        this.updateTranslationDialog = translationManager.updateTranslationDialog.bind(translationManager);

        // 初始化会话管理器
        const sessionManager = createSessionManager(this);
        this.startNewSession = sessionManager.startNewSession.bind(sessionManager);
        this.clearFormatCache = sessionManager.clearFormatCache.bind(sessionManager);
        this.addToCurrentSessionHistory = sessionManager.addToCurrentSessionHistory.bind(sessionManager);

        // 初始化进度管理器
        const progressManager = createProgressManager(this);
        this.updateProgressMessagesBeforeFormat = progressManager.updateProgressMessagesBeforeFormat.bind(progressManager);
        this.updateProgressMessages = progressManager.updateProgressMessages.bind(progressManager);
        this.startProgressMessageReplacement = progressManager.startProgressMessageReplacement.bind(progressManager);
        this.stopProgressMessageReplacement = progressManager.stopProgressMessageReplacement.bind(progressManager);
        this.checkAndReplaceProgressMessages = progressManager.checkAndReplaceProgressMessages.bind(progressManager);
        this.replaceProgressMessagesAfterStream = progressManager.replaceProgressMessagesAfterStream.bind(progressManager);

        // 初始化摘要管理器
        const summaryManager = createSummaryManager(this);
        this.getPageSummary = summaryManager.getPageSummary.bind(summaryManager);
        this.showSummaryDialog = summaryManager.showSummaryDialog.bind(summaryManager);
        this.generateSummaryFromText = summaryManager.generateSummaryFromText.bind(summaryManager);
        this.analyzeContentStructure = summaryManager.analyzeContentStructure.bind(summaryManager);
        this.extractKeywords = summaryManager.extractKeywords.bind(summaryManager);

        // 初始化输入管理器
        const inputManager = createInputManager(this);
        this.setLoading = inputManager.setLoading.bind(inputManager);
        this.updateButtonState = inputManager.updateButtonState.bind(inputManager);
        this.updateCharacterCount = inputManager.updateCharacterCount.bind(inputManager);
        this.updateLayoutState = inputManager.updateLayoutState.bind(inputManager);

        // 初始化消息渲染器
        const messageRenderer = createMessageRenderer(this);
        this.renderMessageList = messageRenderer.renderMessageList.bind(messageRenderer);

        // 初始化反馈管理器
        const feedbackManager = createFeedbackManager(this);
        this.doAdviceForAnswer = feedbackManager.doAdviceForAnswer.bind(feedbackManager);
        this.addFeedback = feedbackManager.addFeedback.bind(feedbackManager);
        this.updateFeedback = feedbackManager.updateFeedback.bind(feedbackManager);
        this.deleteFeedback = feedbackManager.deleteFeedback.bind(feedbackManager);
        this.updateFeedbackUI = feedbackManager.updateFeedbackUI.bind(feedbackManager);
        this.saveFeedbackId = feedbackManager.saveFeedbackId.bind(feedbackManager);
        this.removeFeedbackId = feedbackManager.removeFeedbackId.bind(feedbackManager);
        this.removeFeedbackStyle = feedbackManager.removeFeedbackStyle.bind(feedbackManager);
        this.formatDateTime = feedbackManager.formatDateTime.bind(feedbackManager);

        // 初始化公告管理器
        const announcementManager = createAnnouncementManager(this);
        this.handleAnnouncementClick = announcementManager.handleAnnouncementClick.bind(announcementManager);
        this.loadRegistrationEmail = announcementManager.loadRegistrationEmail.bind(announcementManager);

        // 初始化问题处理器
        const questionProcessor = createQuestionProcessor(this);
        this.processQuestion = questionProcessor.processQuestion.bind(questionProcessor);

        // 初始化用户信息管理器
        const userProfileManager = createUserProfileManager(this);
        this.resolveApiKey = userProfileManager.resolveApiKey.bind(userProfileManager);
        this.populateUserProfileFromApi = userProfileManager.populateUserProfileFromApi.bind(userProfileManager);

        // 初始化处理控制管理器
        const processingControlManager = createProcessingControlManager(this);
        this.isOllamaService = processingControlManager.isOllamaService.bind(processingControlManager);
        this.stopProcessing = processingControlManager.stopProcessing.bind(processingControlManager);

        // 初始化复制工具管理器
        const copyUtilsManager = createCopyUtilsManager(this);
        this.copyQuestionText = copyUtilsManager.copyQuestionText.bind(copyUtilsManager);
        this.fallbackCopyTextToClipboard = copyUtilsManager.fallbackCopyTextToClipboard.bind(copyUtilsManager);
        this.showCopySuccess = copyUtilsManager.showCopySuccess.bind(copyUtilsManager);

        // 语言管理器已在前面初始化（在 requestUtil 之前）

        // 初始化导航管理器
        const navigationManager = createNavigationManager(this);
        this.openSettings = navigationManager.openSettings.bind(navigationManager);
        this.openFullPage = navigationManager.openFullPage.bind(navigationManager);

        // API工具管理器已在前面初始化（在 requestUtil 之前）

        // 初始化知识库处理器
        const knowledgeBaseHandler = createKnowledgeBaseHandler(this);
        this.handleKnowledgeBaseChange = knowledgeBaseHandler.handleKnowledgeBaseChange.bind(knowledgeBaseHandler);

        // 初始化UI文本管理器
        const uiTextManager = createUITextManager(this);
        this.getRunAnalysisCountdownText = uiTextManager.getRunAnalysisCountdownText.bind(uiTextManager);

        // 初始化初始化管理器
        const initializationManager = createInitializationManager(this);
        this.initializeAfterLoad = initializationManager.initializeAfterLoad.bind(initializationManager);
        this.clearCacheOnStartup = initializationManager.clearCacheOnStartup.bind(initializationManager);
        this.initElements = initializationManager.initElements.bind(initializationManager);
        this.bindEvents = initializationManager.bindEvents.bind(initializationManager);

        // 初始化错误处理管理器
        const errorHandlerManager = createErrorHandlerManager(this);
        this.showErrorResult = errorHandlerManager.showErrorResult.bind(errorHandlerManager);

        // 初始化全屏管理器
        const fullscreenManager = createFullscreenManager(this);
        this.initFullscreenMode = fullscreenManager.initFullscreenMode.bind(fullscreenManager);
        this.toggleFullscreen = fullscreenManager.toggleFullscreen.bind(fullscreenManager);
        this.handleFullscreenChange = fullscreenManager.handleFullscreenChange.bind(fullscreenManager);

        // 初始化政策对话框管理器
        const policyDialogManager = createPolicyDialogManager(this);
        this.showPolicyDialog = policyDialogManager.showPolicyDialog.bind(policyDialogManager);
        this.hidePolicyDialog = policyDialogManager.hidePolicyDialog.bind(policyDialogManager);
        this.hideAllPolicyDialogs = policyDialogManager.hideAllPolicyDialogs.bind(policyDialogManager);

        // 初始化滚动管理器
        const scrollManager = createScrollManager(this);
        this.handleScroll = scrollManager.handleScroll.bind(scrollManager);
        this.scrollToTop = scrollManager.scrollToTop.bind(scrollManager);

        // 初始化测试管理器
        const testManager = createTestManager(this);
        this.testStreamChat = testManager.testStreamChat.bind(testManager);
        this.testContentScript = testManager.testContentScript.bind(testManager);

        // 初始化日期时间输入管理器
        const dateTimeInputManager = createDateTimeInputManager(this);
        this.commitDateTimeSelection = dateTimeInputManager.commitDateTimeSelection.bind(dateTimeInputManager);
        this.clearDateTimeSelection = dateTimeInputManager.clearDateTimeSelection.bind(dateTimeInputManager);
        this.handleTimeSelectionChange = dateTimeInputManager.handleTimeSelectionChange.bind(dateTimeInputManager);
        this.getSelectedTime = dateTimeInputManager.getSelectedTime.bind(dateTimeInputManager);
        this.setDateTimeInputElementValue = dateTimeInputManager.setDateTimeInputElementValue.bind(dateTimeInputManager);
        this.setDateTimeInputValue = dateTimeInputManager.setDateTimeInputValue.bind(dateTimeInputManager);
        this.clearDateTimeInputValue = dateTimeInputManager.clearDateTimeInputValue.bind(dateTimeInputManager);
        this.getDateTimeInputValue = dateTimeInputManager.getDateTimeInputValue.bind(dateTimeInputManager);
        this.updateDateTimeInputDisplay = dateTimeInputManager.updateDateTimeInputDisplay.bind(dateTimeInputManager);
        this.formatDateTimeForDisplay = dateTimeInputManager.formatDateTimeForDisplay.bind(dateTimeInputManager);
        this.normalizeISODateTime = dateTimeInputManager.normalizeISODateTime.bind(dateTimeInputManager);
        this.parseISODateTime = dateTimeInputManager.parseISODateTime.bind(dateTimeInputManager);
        this.toISOWithoutTimezone = dateTimeInputManager.toISOWithoutTimezone.bind(dateTimeInputManager);
        this.padNumber = dateTimeInputManager.padNumber.bind(dateTimeInputManager);

        // 初始化反馈处理管理器
        const feedbackHandlerManager = createFeedbackHandlerManager(this);
        this.handleFeedback = feedbackHandlerManager.handleFeedback.bind(feedbackHandlerManager);
        this.saveFeedback = feedbackHandlerManager.saveFeedback.bind(feedbackHandlerManager);
        this.sendFeedbackToServer = feedbackHandlerManager.sendFeedbackToServer.bind(feedbackHandlerManager);

        // 初始化引导管理器
        const onboardingManager = createOnboardingManager(this);
        this.checkAndShowOnboarding = onboardingManager.checkAndShowOnboarding.bind(onboardingManager);
        this.hideOnboarding = onboardingManager.hideOnboarding.bind(onboardingManager);

        // 绑定版本检查方法
        this.checkVersionUpdate = this.checkVersionUpdate.bind(this);
        this.ensureUpdateIconVisible = this.ensureUpdateIconVisible.bind(this);

        this.initElements();
        this.bindEvents();

        // 启动图标保护机制
        this.startUpdateIconProtection();

        // 确保页面完全加载后再初始化
        this.initializeAfterLoad();

    }

    getAssetUrl(relativePath) {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
            try {
                return chrome.runtime.getURL(relativePath);
            } catch (error) {
                console.warn('获取扩展资源路径失败:', error);
            }
        }
        if (/^(?:\.\.?\/|https?:|data:|chrome-extension:|\/)/.test(relativePath)) {
            return relativePath;
        }
        return `../${relativePath}`;
    }

    // initializeAfterLoad, clearCacheOnStartup, initElements, bindEvents 方法已移至 initialization-manager.js

    // 以下方法已迁移到 managers/config-loader.js
    // async getEnvType() - 已迁移
    // async loadSettings() - 已迁移
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
        // 注意：这里不应该再次调用 applyLanguage，因为 initLanguagePreference 已经调用过了
        // 如果再次调用可能会覆盖之前设置的语言
        // await this.applyLanguage(this.currentLanguage, { persist: false, updateSwitcher: this.hasStoredLanguagePreference });
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

    // loadKnowledgeBaseOptions, loadKnowledgeBasesFromManager, loadKnowledgeBasesDirectly, loadKnowledgeBasesFromAPI, loadKnowledgeBasesFromConfig, getLanguageCandidateKeys, getLocalizedValue, formatKnowledgeBaseName, normalizeDatasetName, localizeKnowledgeBase, renderKnowledgeBasesFromData, loadDefaultKnowledgeBases 方法已移至 knowledge-base-manager.js
    // loadParameterRuleOptions, getDefaultRulesByLanguage, mergeRulesWithBuiltInSupport, mergeRulesWithoutDuplicates, cleanDuplicateRulesWithBuiltInSupport, cleanDuplicateRules, isBuiltInRule, getParameterRuleDisplayName 方法已移至 parameter-rules-manager.js
    // loadKnowledgeServiceConfig, hasConfigChanges, syncConfigFromFile 方法已移至 config-loader.js


    // showErrorResult 方法已移至 error-handler-manager.js
    // processQuestion 方法已移至 question-processor.js
    // formatContent, formatTableWithNewlines, processTableLinesWithNewlines 等方法已移至 content-formatter.js
    // renderMessageList 方法已移至 message-renderer.js
    // testStreamChat, testContentScript 方法已移至 test-manager.js

    // getAcceptLanguage 方法已移至 language-manager.js
    // setAuthHeaders 方法已移至 api-utils-manager.js
    // getPageSummary, showSummaryDialog 方法已移至 summary-manager.js

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
                ">${escapeHtml(translatedText)}</div>
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
                            ">${escapeHtml(originalText)}</div>
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

    // updateTranslationDialog 和 translateText 方法已移至 translation-manager.js

    // openSettings, openFullPage 方法已移至 navigation-manager.js
    // handleKnowledgeBaseChange 方法已移至 knowledge-base-handler.js

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
                this.renderKnowledgeList(this._kbItems, targetContainer, this._kbImageList);
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
        // options: { centered?: boolean, durationMs?: number, maxWidth?: string, background?: string, replaceExisting?: boolean }
        const { centered = false, durationMs = 3000, maxWidth, background, replaceExisting = false } = options || {};

        if (replaceExisting) {
            document.querySelectorAll('.message').forEach(node => node.remove());
        }

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

        const copyIconUrl = this.iconUrls.copy;

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
            <div class="question-text">${escapeHtml(question)}</div>
            <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                <img src="${copyIconUrl}" alt="复制" class="copy-icon">
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
        this._kbImageList = [];
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


    // handleFeedback, saveFeedback, sendFeedbackToServer 方法已移至 feedback-handler-manager.js

    // handleScroll, scrollToTop 方法已移至 scroll-manager.js
    // initFullscreenMode, toggleFullscreen, handleFullscreenChange 方法已移至 fullscreen-manager.js
    // testContentScript 方法已移至 test-manager.js





    // showPolicyDialog, hidePolicyDialog, hideAllPolicyDialogs 方法已移至 policy-dialog-manager.js
    // commitDateTimeSelection, clearDateTimeSelection, handleTimeSelectionChange, getSelectedTime, setDateTimeInputElementValue, setDateTimeInputValue, clearDateTimeInputValue, getDateTimeInputValue, updateDateTimeInputDisplay, formatDateTimeForDisplay, normalizeISODateTime, parseISODateTime, toISOWithoutTimezone, padNumber 方法已移至 datetime-input-manager.js

    // translateStaticElements, applyI18nToElement, applyLanguage 方法已移至 language-manager.js
    // getAcceptLanguage 方法已移至 language-manager.js
    // getRunAnalysisCountdownText 方法已移至 ui-text-manager.js

    t(key, params = undefined) {
        if (!this.i18n) return key;
        // 优先使用 i18n.currentLanguage，如果不存在则使用 popup.currentLanguage
        // 确保语言一致性
        const languageToUse = this.i18n.currentLanguage || this.currentLanguage || this.i18n.defaultLanguage;
        return this.i18n.t(key, languageToUse, params);
    }

    // handleAnnouncementClick 和 loadRegistrationEmail 方法已移至 announcement-manager.js
    // resolveApiKey 和 populateUserProfileFromApi 方法已移至 user-profile-manager.js
    // submitAwrAnalysis 方法已在 modules/awr.js 中通过 attachAwrModule 绑定

    /**
     * 检查版本更新
     * 调用/api/plugin/getLatest接口获取最新版本信息并与manifest.json比较
     */
    async checkVersionUpdate() {
        try {
            console.log('开始执行版本检查...');
            const apiKey = this.resolveApiKey();
            console.log('API key检查结果:', {
                exists: !!apiKey,
                length: apiKey ? apiKey.length : 0,
                firstChars: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'
            });

            if (!apiKey) {
                console.log('没有有效的API key，跳过版本检查');
                return;
            }

            console.log('发现有效的API key，开始调用getLatest接口');

            // 调用getLatest接口获取最新版本，指定pluginType为qa
            const url = '/api/plugin/getLatest';
            const tempProvider = {
                authType: 'Bearer',
                apiKey: apiKey
            };

            // 传递pluginType参数，确保只获取qa插件的版本
            const requestBody = {
                pluginType: 'qa'
            };

            const response = await this.requestUtil.post(url, requestBody, {
                provider: tempProvider
            });
            console.log('getLatest接口返回:', response);

            if (response && response.status === 'success' && response.data) {
                const latestPlugin = response.data;
                
                // 验证返回的插件类型是否为qa
                if (latestPlugin.plugin_type !== 'qa') {
                    console.warn('返回的插件类型不是qa，跳过版本检查:', latestPlugin.plugin_type);
                    return;
                }

                const latestVersion = latestPlugin.version;
                const pluginId = latestPlugin.plugin_id;

                console.log('获取到的最新版本信息:', {
                    version: latestVersion,
                    pluginId: pluginId,
                    pluginName: latestPlugin.plugin_name,
                    pluginType: latestPlugin.plugin_type
                });

                if (latestVersion) {
                    // 获取manifest.json中的版本
                    const manifestVersion = chrome.runtime.getManifest().version;
                    console.log('manifest.json版本:', manifestVersion);

                    const comparisonResult = this.compareVersions(manifestVersion, latestVersion);
                    console.log('版本比较结果:', {
                        manifestVersion,
                        latestVersion,
                        comparisonResult,
                        needsUpdate: comparisonResult < 0
                    });

                    // 比较版本
                    if (comparisonResult < 0) {
                        console.log('检测到新版本，开始显示更新提示和图标');
                        // 保存最新版本号和插件ID
                        this.latestVersion = latestVersion;
                        this.latestPluginId = pluginId;
                        // 标记应该显示图标
                        this.shouldShowUpdateIcon = true;
                        // 启动保护机制，确保图标不会被意外隐藏
                        this.startUpdateIconProtection();
                        // 当前版本落后，需要更新
                        this.showVersionUpdateNotice(latestVersion);
                        this.showUpdateIcon(latestVersion);
                    } else {
                        console.log('当前版本已是最新，无需更新');

                        // 本地版本与服务器版本一致，调用updatePluginVersion接口保存版本信息
                        try {
                            console.log('版本一致，开始调用updatePluginVersion接口保存版本信息');
                            await this.updatePluginVersion(latestVersion, pluginId);
                        } catch (updateError) {
                            console.error('保存插件版本信息失败:', updateError);
                            // 不影响其他逻辑，继续执行
                        }

                        // 只有明确检查到版本已是最新时才隐藏图标
                        this.latestVersion = null;
                        this.latestPluginId = null;
                        this.shouldShowUpdateIcon = false;
                        this.hideUpdateIcon();
                        // 停止保护机制
                        this.stopUpdateIconProtection();
                    }
                } else {
                    console.log('未找到版本信息，保持当前图标状态');
                    // 如果已经显示图标，保持显示状态
                    if (this.shouldShowUpdateIcon && this.latestVersion) {
                        console.log('保持更新图标显示状态');
                        this.showUpdateIcon(this.latestVersion);
                    }
                }
            } else {
                console.log('getLatest接口返回格式不正确，保持当前图标状态');
                // 如果已经显示图标，保持显示状态
                if (this.shouldShowUpdateIcon && this.latestVersion) {
                    console.log('保持更新图标显示状态');
                    this.showUpdateIcon(this.latestVersion);
                }
            }
        } catch (error) {
            console.error('版本检查失败:', error);
            // 检查失败时，如果已经显示图标，保持显示状态
            if (this.shouldShowUpdateIcon && this.latestVersion) {
                console.log('版本检查失败，保持更新图标显示状态');
                this.showUpdateIcon(this.latestVersion);
            }
        }
    }

    /**
     * 更新插件版本信息到服务器
     * @param {string} version - 版本号
     * @param {string} pluginId - 插件ID
     */
    async updatePluginVersion(version, pluginId) {
        try {
            console.log('开始调用updatePluginVersion接口，版本:', version, '插件ID:', pluginId);

            const apiKey = this.resolveApiKey();
            if (!apiKey) {
                console.warn('没有有效的API key，跳过版本信息保存');
                return;
            }

            const url = '/user/updatePluginVersion';
            const tempProvider = {
                authType: 'Bearer',
                apiKey: apiKey
            };

            const requestBody = {
                pluginId: pluginId,
                version: version,
                pluginType: 'qa'
            };

            const response = await this.requestUtil.post(url, requestBody, {
                provider: tempProvider
            });

            console.log('updatePluginVersion接口返回:', response);

            if (response && response.code === 200) {
                console.log('插件版本信息保存成功');
            } else {
                console.warn('插件版本信息保存失败:', response);
            }
        } catch (error) {
            console.error('调用updatePluginVersion接口失败:', error);
            throw error; // 重新抛出错误，让调用方处理
        }
    }

    /**
     * 比较版本号
     * @param {string} currentVersion - 当前版本
     * @param {string} latestVersion - 最新版本
     * @returns {number} -1: 当前版本小，0: 相等，1: 当前版本大
     */
    compareVersions(currentVersion, latestVersion) {
        const currentParts = currentVersion.split('.').map(Number);
        const latestParts = latestVersion.split('.').map(Number);

        const maxLength = Math.max(currentParts.length, latestParts.length);

        for (let i = 0; i < maxLength; i++) {
            const currentPart = currentParts[i] || 0;
            const latestPart = latestParts[i] || 0;

            if (currentPart < latestPart) {
                return -1;
            } else if (currentPart > latestPart) {
                return 1;
            }
        }

        return 0;
    }

    /**
     * 显示版本更新提示
     * @param {string} latestVersion - 最新版本号
     */
    showVersionUpdateNotice(latestVersion) {
        // 避免重复显示
        if (document.getElementById('version-update-notice')) {
            return;
        }

        // 获取当前版本
        const currentVersion = chrome.runtime.getManifest().version;

        const notice = document.createElement('div');
        notice.id = 'version-update-notice';
        notice.className = 'version-update-notice';
        notice.innerHTML = `
            <div class="version-update-content">
                <div class="version-update-icon">🔄</div>
                <div class="version-update-text">
                    <div class="version-update-title">发现新版本 ${latestVersion}</div>
                    <div class="version-update-message">您的当前版本 ${currentVersion} ，请及时更新以获得最佳体验</div>
                </div>
                <div class="version-update-actions">
                    <button class="version-update-download-btn">立即下载</button>
                    <button class="version-update-dismiss-btn">稍后提醒</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .version-update-notice {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                min-width: 400px;
                max-width: 500px;
                animation: slideIn 0.5s ease-out;
            }

            .version-update-content {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                gap: 12px;
                color: white;
            }

            .version-update-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .version-update-text {
                flex: 1;
            }

            .version-update-title {
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 4px;
            }

            .version-update-message {
                font-size: 14px;
                opacity: 0.9;
            }

            .version-update-actions {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }

            .version-update-download-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .version-update-download-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
            }

            .version-update-dismiss-btn {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }

            .version-update-dismiss-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            @keyframes slideIn {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // 绑定事件
        const downloadBtn = notice.querySelector('.version-update-download-btn');
        const dismissBtn = notice.querySelector('.version-update-dismiss-btn');

        downloadBtn.addEventListener('click', () => {
            this.downloadLatestVersion(latestVersion);
            notice.remove();
        });

        dismissBtn.addEventListener('click', () => {
            notice.remove();
        });

        // 添加到页面
        document.body.appendChild(notice);

        // 10秒后自动隐藏（给用户更多时间阅读）
        setTimeout(() => {
            if (notice.parentNode) {
                notice.style.animation = 'slideUp 0.3s ease-in';
                setTimeout(() => notice.remove(), 300);
            }
        }, 10000);
    }


    /**
     * 显示更新图标
     * @param {string} latestVersion - 最新版本号
     */
    showUpdateIcon(latestVersion) {
        console.log('showUpdateIcon被调用，版本:', latestVersion);

        // 查找版本号元素
        const versionText = document.querySelector('.version-text');
        if (!versionText) {
            console.error('未找到version-text元素');
            return;
        }

        // 检查是否已经存在update-icon
        let updateIcon = document.getElementById('update-icon');
        
        if (!updateIcon) {
            // 动态创建img标签
            updateIcon = document.createElement('img');
            updateIcon.id = 'update-icon';
            updateIcon.className = 'update-icon';
            updateIcon.alt = '有新版本';
            
            // 插入到版本号span后面
            const popupVersion = document.getElementById('popup-version');
            if (popupVersion && popupVersion.parentNode) {
                // 在版本号span后面插入一个空格和图标
                popupVersion.parentNode.insertBefore(document.createTextNode(' '), popupVersion.nextSibling);
                popupVersion.parentNode.insertBefore(updateIcon, popupVersion.nextSibling);
            } else {
                // 如果找不到版本号span，直接追加到version-text末尾
                versionText.appendChild(document.createTextNode(' '));
                versionText.appendChild(updateIcon);
            }
            console.log('动态创建update-icon元素并插入到DOM');
        }

        // 更新图标的src根据主题模式
        this.updateUpdateIconTheme();

        // 强制显示图标，确保不会被其他操作隐藏
        updateIcon.style.display = 'inline';
        updateIcon.style.visibility = 'visible';
        updateIcon.style.opacity = '1';
        updateIcon.style.position = 'relative';
        updateIcon.style.zIndex = '10001'; // 确保在对话框之上显示
        updateIcon.title = `发现新版本 ${latestVersion}，点击查看详情`;
        // 设置data属性标记图标应该显示
        updateIcon.setAttribute('data-should-show', 'true');
        console.log('图标已设置为显示状态，并标记为应该显示');

        // 绑定点击事件（如果还没有绑定）
        if (!updateIcon.hasAttribute('data-click-bound')) {
            updateIcon.addEventListener('click', () => {
                console.log('点击了更新图标');
                this.showVersionUpdateNotice(latestVersion);
            });
            updateIcon.setAttribute('data-click-bound', 'true');
            console.log('绑定了点击事件');
        }

        // 同时更新GitHub图标主题
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.updateGitHubIconTheme(isDarkMode);
    }

    /**
     * 更新GitHub图标主题
     * @param {boolean} isDarkMode - 是否为深色模式
     */
    updateGitHubIconTheme(isDarkMode) {
        const githubIcon = document.querySelector('.repo-links .repo-icon[alt="GitHub"]');
        if (githubIcon) {
            const iconPath = isDarkMode ? '../icons/github-black.png' : '../icons/github-white.png';
            githubIcon.src = iconPath;
        }
    }

    /**
     * 隐藏更新图标
     * 只有在明确检查到版本已是最新时才调用此方法
     */
    hideUpdateIcon() {
        const updateIcon = document.getElementById('update-icon');
        if (updateIcon) {
            // 只有在不应该显示时才隐藏
            if (!this.shouldShowUpdateIcon) {
                updateIcon.style.display = 'none';
                updateIcon.removeAttribute('data-should-show');
                console.log('更新图标已隐藏（版本已是最新）');
            } else {
                console.log('图标标记为应该显示，不隐藏');
            }
        }
    }

    /**
     * 确保更新图标显示（如果应该显示）
     * 在关键操作后调用此方法，确保图标不会被意外隐藏
     */
    ensureUpdateIconVisible() {
        if (this.shouldShowUpdateIcon && this.latestVersion) {
            const updateIcon = document.getElementById('update-icon');
            if (updateIcon) {
                // 如果图标存在但被隐藏了，重新显示
                const isHidden = updateIcon.style.display === 'none' || 
                                updateIcon.style.visibility === 'hidden' ||
                                window.getComputedStyle(updateIcon).display === 'none' ||
                                window.getComputedStyle(updateIcon).visibility === 'hidden';
                
                if (isHidden) {
                    console.log('检测到图标被隐藏，重新显示');
                    this.showUpdateIcon(this.latestVersion);
                }
            } else {
                // 如果图标不存在，重新创建并显示
                console.log('图标不存在，重新创建并显示');
                this.showUpdateIcon(this.latestVersion);
            }
        }
    }

    /**
     * 启动更新图标保护机制
     * 使用MutationObserver监听图标变化，确保图标不会被意外隐藏
     */
    startUpdateIconProtection() {
        // 如果已经启动了保护机制，先停止
        this.stopUpdateIconProtection();

        // 使用MutationObserver监听DOM变化
        if (typeof MutationObserver !== 'undefined') {
            this.updateIconObserver = new MutationObserver((mutations) => {
                if (this.shouldShowUpdateIcon && this.latestVersion) {
                    const updateIcon = document.getElementById('update-icon');
                    if (updateIcon) {
                        const isHidden = updateIcon.style.display === 'none' || 
                                        updateIcon.style.visibility === 'hidden' ||
                                        window.getComputedStyle(updateIcon).display === 'none' ||
                                        window.getComputedStyle(updateIcon).visibility === 'hidden';
                        
                        if (isHidden && updateIcon.getAttribute('data-should-show') === 'true') {
                            console.log('检测到图标被意外隐藏，自动恢复显示');
                            this.showUpdateIcon(this.latestVersion);
                        }
                    }
                }
            });

            // 观察整个文档的变化
            this.updateIconObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });

            // 定期检查图标状态（作为备用保护）
            this.updateIconProtectionInterval = setInterval(() => {
                this.ensureUpdateIconVisible();
            }, 2000); // 每2秒检查一次
        }
    }

    /**
     * 停止更新图标保护机制
     */
    stopUpdateIconProtection() {
        if (this.updateIconObserver) {
            this.updateIconObserver.disconnect();
            this.updateIconObserver = null;
        }
        if (this.updateIconProtectionInterval) {
            clearInterval(this.updateIconProtectionInterval);
            this.updateIconProtectionInterval = null;
        }
    }

    /**
     * 根据主题模式更新更新图标
     */
    updateUpdateIconTheme() {
        const updateIcon = document.getElementById('update-icon');
        if (!updateIcon) return;

        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const iconPath = isDarkMode ? '../icons/update-white.png': '../icons/update-black.png'; 
        updateIcon.src = iconPath;
    }

    /**
     * 下载最新版本
     * @param {string} version - 版本号
     */
    async downloadLatestVersion(version) {
        try {
            const apiKey = this.resolveApiKey();
            if (!apiKey) {
                this.showMessage('无法下载：未找到API key', 'error');
                return;
            }

            const pluginId = this.latestPluginId;
            if (!pluginId) {
                this.showMessage('无法下载：未找到插件ID', 'error');
                return;
            }

            // 显示下载提示
            this.showMessage(`正在下载版本 ${version}...`, 'info');

            // 调用下载接口（与巡检诊断下载方式保持一致）
            const url = '/api/plugin/download';
            const queryParams = new URLSearchParams({
                pluginId: pluginId,
                apiKey: apiKey
            });

            const baseURL = this.requestUtil?.baseURL || 'http://api.bic-qa.com';
            const resolvedUrl = new URL(url, baseURL);
            resolvedUrl.search = queryParams.toString();

            const tempProvider = {
                authType: 'Bearer',
                apiKey: apiKey
            };

            const headers = this.requestUtil.buildHeaders({}, tempProvider, false);
            // 设置Content-Type为application/json
            headers['Content-Type'] = 'application/json';

            // 对于qa插件下载，发送空数组作为body（与巡检诊断保持一致的结构）
            const requestBody = [];

            const response = await fetch(resolvedUrl.toString(), {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)  // 发送空数组，保持与巡检诊断下载接口一致的格式
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`下载失败: HTTP ${response.status} ${response.statusText} - ${errorText}`);
            }

            // 从响应头中提取文件名
            let filename = `qa-${version}.zip`; // 默认文件名
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
                console.log('Content-Disposition header:', contentDisposition);
                // 解析 content-disposition 头，格式通常是: attachment; filename="qa-3.0.0.zip"
                // 支持多种格式: filename="xxx", filename=xxx, filename*=UTF-8''xxx
                const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].trim();
                    // 移除可能的引号
                    filename = filename.replace(/^['"]|['"]$/g, '');
                    // 如果文件名包含编码（RFC 5987格式），尝试解码
                    if (filename.startsWith("UTF-8''")) {
                        try {
                            filename = decodeURIComponent(filename.substring(7));
                        } catch (e) {
                            console.warn('文件名解码失败，使用原始文件名:', filename);
                        }
                    } else {
                        // 尝试解码URI编码
                        try {
                            filename = decodeURIComponent(filename);
                        } catch (e) {
                            // 如果解码失败，使用原始文件名
                        }
                    }
                    console.log('提取的文件名:', filename);
                }
            }

            const blob = await response.blob();
            console.log('下载的blob大小:', blob.size, 'bytes');
            console.log('下载的blob类型:', blob.type);
            
            if (!blob || blob.size === 0) {
                throw new Error('下载的文件为空');
            }
            
            // 触发浏览器下载
            try {
                const downloadUrl = window.URL.createObjectURL(blob);
                console.log('创建下载URL:', downloadUrl);
                
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename; // 使用从响应头提取的文件名
                link.style.display = 'none'; // 隐藏链接
                document.body.appendChild(link);
                
                console.log('准备触发下载，文件名:', filename);
                link.click();
                
                // 延迟移除，确保下载已开始
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);
                    console.log('下载链接已清理');
                }, 100);
                
                this.showMessage(`版本 ${version} 下载已开始`, 'success');
            } catch (downloadError) {
                console.error('触发下载失败:', downloadError);
                throw new Error(`下载失败: ${downloadError.message}`);
            }

        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage('下载失败，请稍后重试', 'error');
        }
    }








    // generateSummaryFromText, analyzeContentStructure, extractKeywords 方法已移至 summary-manager.js



    // startNewSession, clearFormatCache, addToCurrentSessionHistory 方法已移至 session-manager.js
    // resetTableState, isTableRow, isTableSeparator, parseTableRow 方法已移至 content-formatter.js
    // updateProgressMessagesBeforeFormat, updateProgressMessages, startProgressMessageReplacement, stopProgressMessageReplacement, checkAndReplaceProgressMessages, replaceProgressMessagesAfterStream 方法已移至 progress-manager.js
    // isOllamaService, stopProcessing 方法已移至 processing-control-manager.js
    // getCurrentConversationContainer, getOrCreateConversationContainer, forceCreateNewConversationContainer, clearConversationContainer 方法已在 conversation-view.js 中
    // 反馈相关方法已移至 feedback-manager.js
    // doAdviceForAnswer, addFeedback, updateFeedback, deleteFeedback, updateFeedbackUI, saveFeedbackId, removeFeedbackId, removeFeedbackStyle, formatDateTime
    // copyQuestionText, fallbackCopyTextToClipboard, showCopySuccess 方法已移至 copy-utils-manager.js

}