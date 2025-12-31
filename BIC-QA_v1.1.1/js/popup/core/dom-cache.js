function byId(id) {
    return document.getElementById(id);
}

function collectPolicyDialogs() {
    const dialogs = {};
    document.querySelectorAll('.policy-dialog').forEach(dialog => {
        dialogs[dialog.id] = dialog;
    });
    return dialogs;
}

function collectDomRefs() {
    const askButton = byId('askButton');
    const inspectionDialog = byId('inspectionDialog');
    const refs = {
        questionInput: byId('questionInput'),
        askButton,
        modelSelect: byId('modelSelect'),
        knowledgeBaseSelect: byId('knowledgeBaseSelect'),
        parameterRuleSelect: byId('parameterRuleSelect'),
        resultContainer: byId('resultContainer'),
        resultText: byId('resultText'),
        questionDisplay: byId('questionDisplay'),
        questionText: byId('questionText'),
        questionTime: byId('questionTime'),
        aiDisplay: byId('aiDisplay'),
        aiTime: byId('aiTime'),
        exportButton: byId('exportButton'),
        copyButton: byId('copyButton'),
        clearButton: byId('clearButton'),
        likeButton: byId('likeButton'),
        dislikeButton: byId('dislikeButton'),
        pageSummaryBtn: byId('pageSummaryBtn'),
        translateBtn: byId('translateBtn'),
        historyBtn: byId('historyBtn'),
        awrAnalysisBtn: byId('awrAnalysisBtn'),
        inspectionBtn: byId('inspectionBtn'),
        sqlOptimizationBtn: byId('sqlOptimizationBtn'),
        newSessionBtn: byId('newSessionBtn'),
        helpBtn: byId('helpBtn'),
        settingsBtn: byId('settingsBtn'),
        announcementBtn: byId('announcementBtn'),
        languageSwitcher: byId('languageSwitcher'),
        charCount: byId('charCount'),
        charCountContainer: document.querySelector('.character-count'),
        historyDialog: byId('historyDialog'),
        closeHistoryDialog: byId('closeHistoryDialog'),
        clearHistoryBtn: byId('clearHistoryBtn'),
        exportHistoryBtn: byId('exportHistoryBtn'),
        historyList: byId('historyList'),
        awrAnalysisDialog: byId('awrAnalysisDialog'),
        closeAwrDialog: byId('closeAwrDialog'),
        awrAnalysisForm: byId('awrAnalysisForm'),
        awrProblemDescription: byId('awrProblemDescription'),
        awrEmail: byId('awrEmail'),
        awrUserName: byId('awrUserName'),
        awrFileInput: byId('awrFileInput'),
        awrFileDisplay: byId('awrFileDisplay'),
        awrFileUploadBtn: byId('awrFileUploadBtn'),
        awrLanguage: byId('awrLanguage'),
        awrDatabaseType: byId('awrDatabaseType'),
        awrAgreeTerms: byId('agreeTerms'),
        awrCancelBtn: byId('awrCancelBtn'),
        awrSaveBtn: byId('awrSaveBtn'),
        inspectionDialog,
        closeInspectionDialog: byId('closeInspectionDialog'),
        inspectionForm: byId('inspectionForm'),
        inspectionEmail: byId('inspectionEmail'),
        inspectionUserName: byId('inspectionUserName'),
        inspectionFileInput: byId('inspectionFileInput'),
        inspectionFileDisplay: byId('inspectionFileDisplay'),
        inspectionFileUploadBtn: byId('inspectionFileUploadBtn'),
        inspectionLanguage: byId('inspectionLanguage'),
        inspectionDatabaseType: byId('inspectionDatabaseType'),
        inspectionAgreeTerms: byId('inspectionAgreeTerms'),
        inspectionCancelBtn: byId('inspectionCancelBtn'),
        inspectionSaveBtn: byId('inspectionSaveBtn'),
        inspectionTabs: inspectionDialog ? inspectionDialog.querySelectorAll('.inspection-tab-btn') : null,
        inspectionNewView: byId('inspectionNewView'),
        inspectionHistoryView: byId('inspectionHistoryView'),
        sqlOptimizationDialog: byId('sqlOptimizationDialog'),
        closeSqlOptimizationDialog: byId('closeSqlOptimizationDialog'),
        sqlOptimizationForm: byId('sqlOptimizationForm'),
        sqlOptimizationEmail: byId('sqlOptimizationEmail'),
        sqlOptimizationUserName: byId('sqlOptimizationUserName'),
        sqlOptimizationFileInput: byId('sqlOptimizationFileInput'),
        sqlOptimizationFileDisplay: byId('sqlOptimizationFileDisplay'),
        sqlOptimizationFileUploadBtn: byId('sqlOptimizationFileUploadBtn'),
        sqlOptimizationLanguage: byId('sqlOptimizationLanguage'),
        sqlOptimizationDatabaseType: byId('sqlOptimizationDatabaseType'),
        sqlOptimizationAgreeTerms: byId('sqlOptimizationAgreeTerms'),
        sqlOptimizationCancelBtn: byId('sqlOptimizationCancelBtn'),
        sqlOptimizationSaveBtn: byId('sqlOptimizationSaveBtn'),
        sqlOptimizationTabs: sqlOptimizationDialog ? sqlOptimizationDialog.querySelectorAll('.sql-optimization-tab-btn') : null,
        sqlOptimizationNewView: byId('sqlOptimizationNewView'),
        sqlOptimizationHistoryView: byId('sqlOptimizationHistoryView'),
        sqlOptimizationDownloadOrUpdateScriptCollectorBtn: byId('sqlOptimizationDownloadOrUpdateScriptCollectorBtn'),
        sqlOptimizationScriptCollectorCodeSelect: byId('sqlOptimizationScriptCollectorCodeSelect'),
        sqlOptimizationPluginDownloadOptions: byId('sqlOptimizationPluginDownloadOptions'),
        backToTopBtn: byId('backToTopBtn'),
        contentArea: document.querySelector('.content-area'),
        sendIcon: askButton ? askButton.querySelector('.send-icon') : null,
        stopIcon: askButton ? askButton.querySelector('.stop-icon') : null,
        policyDialogs: collectPolicyDialogs(),
        policyOpenButtons: Array.from(document.querySelectorAll('.js-open-policy')),
        policyCloseButtons: Array.from(document.querySelectorAll('.js-close-policy'))
    };

    return refs;
}

function ensureResultStructure(targetContainer) {
    const resultText = targetContainer ? targetContainer.querySelector('.result-text') : null;
    if (!resultText) {
        return {
            resultText: null,
            tipsEl: null,
            contentEl: null
        };
    }

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

    return {
        resultText,
        tipsEl,
        contentEl
    };
}

export function createDomCache() {
    let refs = collectDomRefs();

    return {
        refresh() {
            refs = collectDomRefs();
            return refs;
        },
        getRefs() {
            return refs;
        },
        assignTo(target) {
            const latest = collectDomRefs();
            Object.keys(latest).forEach((key) => {
                target[key] = latest[key];
            });
            refs = latest;
            return latest;
        },
        ensureResultStructure(targetContainer) {
            return ensureResultStructure(targetContainer);
        }
    };
}

