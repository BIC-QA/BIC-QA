import { escapeHtml } from '../utils/common.js';

function bindToPopup(fn, popup) {
    return fn.bind(null, popup);
}

export function createHistoryService(popup) {
    return {
        saveConversationHistory: bindToPopup(saveConversationHistory, popup),
        cleanupHistoryRecords: bindToPopup(cleanupHistoryRecords, popup),
        showHistoryDialog: bindToPopup(showHistoryDialog, popup),
        hideHistoryDialog: bindToPopup(hideHistoryDialog, popup),
        loadHistoryList: bindToPopup(loadHistoryList, popup),
        createHistoryItemElement: bindToPopup(createHistoryItemElement, popup),
        copyHistoryItem: bindToPopup(copyHistoryItem, popup),
        deleteHistoryItem: bindToPopup(deleteHistoryItem, popup),
        updateBatchButtons: bindToPopup(updateBatchButtons, popup),
        batchDeleteHistory: bindToPopup(batchDeleteHistory, popup),
        toggleSelectAll: bindToPopup(toggleSelectAll, popup),
        toggleHistoryExpansion: bindToPopup(toggleHistoryExpansion, popup),
        clearHistory: bindToPopup(clearHistory, popup),
        exportHistory: bindToPopup(exportHistory, popup),
        batchExportHistory: bindToPopup(batchExportHistory, popup)
    };
}

function saveConversationHistory(popup, question, answer, modelName, knowledgeBaseId, pageUrl) {
    try {
        const maxLength = 1000;
        const safeQuestion = typeof question === 'string' ? question : (question ?? '');
        const safeAnswer = typeof answer === 'string' ? answer : (answer ?? '');
        const truncatedQuestion = safeQuestion.length > maxLength ? safeQuestion.substring(0, maxLength) + '...' : safeQuestion;
        const truncatedAnswer = safeAnswer.length > maxLength ? safeAnswer.substring(0, maxLength) + '...' : safeAnswer;

        let knowledgeBaseName = null;
        let knowledgeBaseIdForHistory = knowledgeBaseId;

        if (knowledgeBaseId) {
            try {
                const knowledgeBase = JSON.parse(knowledgeBaseId);
                if (knowledgeBase.name) {
                    knowledgeBaseName = knowledgeBase.name;
                    knowledgeBaseIdForHistory = knowledgeBase.id;
                }
            } catch (parseError) {
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
            pageUrl: pageUrl ? pageUrl.substring(0, 200) : '',
            timestamp: new Date().toISOString()
        };

        popup.conversationHistory.unshift(historyItem);

        if (popup.conversationHistory.length > 50) {
            popup.conversationHistory = popup.conversationHistory.slice(0, 50);
        }

        chrome.storage.sync.set({
            conversationHistory: popup.conversationHistory
        }).catch(error => {
            console.log('保存对话历史记录失败:', error);
            cleanupHistoryRecords(popup);
        });

        console.log('对话历史记录已保存，当前记录数:', popup.conversationHistory.length);
    } catch (error) {
        console.log('保存对话历史记录失败:', error);
    }
}

async function cleanupHistoryRecords(popup) {
    try {
        console.log('开始清理历史记录...');

        if (popup.conversationHistory.length > 20) {
            popup.conversationHistory = popup.conversationHistory.slice(0, 20);
        }

        const result = await chrome.storage.sync.get(['feedbackHistory']);
        const feedbackHistory = result.feedbackHistory || [];

        if (feedbackHistory.length > 20) {
            const cleanedFeedbackHistory = feedbackHistory.slice(0, 20);
            await chrome.storage.sync.set({ feedbackHistory: cleanedFeedbackHistory });
            console.log('反馈历史记录已清理，保留20条');
        }

        await chrome.storage.sync.set({
            conversationHistory: popup.conversationHistory
        });

        console.log('历史记录清理完成');
    } catch (error) {
        console.error('清理历史记录失败:', error);
    }
}

function showHistoryDialog(popup) {
    if (popup.historyDialog) {
        popup.historyDialog.style.display = 'flex';
        
        // 确保更新图标仍然可见（如果应该显示）
        if (popup.ensureUpdateIconVisible) {
            setTimeout(() => {
                popup.ensureUpdateIconVisible();
            }, 100);
        }
        
        loadHistoryList(popup);
    }
}

function hideHistoryDialog(popup) {
    if (popup.historyDialog) {
        popup.historyDialog.style.display = 'none';
    }
}

function loadHistoryList(popup) {
    const historyList = popup.historyList;
    if (!historyList) return;

    historyList.innerHTML = '';

    if (!popup.conversationHistory || popup.conversationHistory.length === 0) {
        const emptyTitle = popup.t('popup.history.emptyTitle');
        const emptySubtitle = popup.t('popup.history.emptySubtitle');
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-history-icon">📝</div>
                <div class="empty-history-text">${emptyTitle}</div>
                <div class="empty-history-subtext">${emptySubtitle}</div>
            </div>
        `;
        return;
    }

    const batchActionsDiv = document.createElement('div');
    batchActionsDiv.className = 'batch-actions';
    const selectAllText = popup.t('popup.history.selectAll');
    const initialExportText = popup.t('popup.history.batchExport', { count: 0 });
    const initialDeleteText = popup.t('popup.history.batchDelete', { count: 0 });
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

    popup.conversationHistory.forEach((item, index) => {
        const historyItem = createHistoryItemElement(popup, item, index);
        historyList.appendChild(historyItem);
    });
}

function createHistoryItemElement(popup, item) {
    const div = document.createElement('div');
    div.className = 'history-item';
    const locale = popup.i18n?.getIntlLocale(popup.currentLanguage);

    const questionPreview = item.question.length > 50 ? item.question.substring(0, 50) + '...' : item.question;
    const answerPreview = item.answer.length > 100 ? item.answer.substring(0, 100) + '...' : item.answer;
    const time = new Date(item.timestamp).toLocaleString(locale);

    const deleteTitle = popup.t('popup.history.deleteSingleTitle');
    const modelLabel = popup.t('popup.history.modelLabel');
    const knowledgeLabel = popup.t('popup.history.knowledgeLabel');
    const pageLabel = popup.t('popup.history.pageLabel');
    const questionLabel = popup.t('popup.history.questionLabel');
    const answerLabel = popup.t('popup.history.answerLabel');
    const fullQuestionLabel = popup.t('popup.history.fullQuestionLabel');
    const fullAnswerLabel = popup.t('popup.history.fullAnswerLabel');
    const checkboxAriaLabel = popup.t('popup.history.selectRecordAria', { time });

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
        </div>
        <div class="history-question">
            <strong>${questionLabel}</strong> ${escapeHtml(questionPreview)}
        </div>
        <div class="history-answer">
            <strong>${answerLabel}</strong> ${escapeHtml(answerPreview)}
        </div>
        <div class="history-full-content" id="history-full-${item.id}" style="display: none;">
            <div class="history-full-question">
                <strong>${fullQuestionLabel}</strong><br>
                ${escapeHtml(item.question)}
            </div>
            <div class="history-full-answer">
                <strong>${fullAnswerLabel}</strong><br>
                ${escapeHtml(item.answer)}
            </div>
        </div>
    `;

    return div;
}

async function copyHistoryItem(popup, id) {
    try {
        const item = popup.conversationHistory.find(h => h.id === id);
        if (item) {
            const questionLabel = popup.t('popup.history.questionLabel');
            const answerLabel = popup.t('popup.history.answerLabel');
            const textToCopy = `${questionLabel} ${item.question}\n\n${answerLabel} ${item.answer}`;
            await navigator.clipboard.writeText(textToCopy);
            popup.showMessage(popup.t('popup.message.copied'), 'success');
        }
    } catch (error) {
        console.error('复制历史记录失败:', error);
        popup.showMessage(popup.t('popup.message.copyFailed'), 'error');
    }
}

function deleteHistoryItem(popup, id) {
    try {
        const confirmMessage = popup.t('popup.history.confirmDeleteSingle');
        if (!confirm(confirmMessage)) {
            return;
        }

        popup.conversationHistory = popup.conversationHistory.filter(h => h.id !== id);
        chrome.storage.sync.set({
            conversationHistory: popup.conversationHistory
        });
        loadHistoryList(popup);
        popup.showMessage(popup.t('popup.message.historyDeleted'), 'success');
    } catch (error) {
        console.error('删除历史记录失败:', error);
        popup.showMessage(popup.t('popup.message.deleteFailed'), 'error');
    }
}

function updateBatchButtons(popup) {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    const batchExportBtn = document.getElementById('batchExportBtn');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');

    const selectedCount = checkboxes.length;

    if (batchExportBtn) {
        batchExportBtn.disabled = selectedCount === 0;
        batchExportBtn.textContent = popup.t('popup.history.batchExport', { count: selectedCount });
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = selectedCount === 0;
        batchDeleteBtn.textContent = popup.t('popup.history.batchDelete', { count: selectedCount });
    }
}

function batchDeleteHistory(popup) {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

    if (selectedIds.length === 0) {
        popup.showMessage(popup.t('popup.message.selectRecordsToDelete'), 'warning');
        return;
    }

    const confirmMessage = popup.t('popup.history.confirmDeleteSelected', { count: selectedIds.length });
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        popup.conversationHistory = popup.conversationHistory.filter(h => !selectedIds.includes(h.id));
        chrome.storage.sync.set({
            conversationHistory: popup.conversationHistory
        });
        loadHistoryList(popup);
        popup.showMessage(popup.t('popup.message.deleteHistorySelectionSuccess', { count: selectedIds.length }), 'success');
    } catch (error) {
        console.error('批量删除历史记录失败:', error);
        popup.showMessage(popup.t('popup.message.batchDeleteFailed'), 'error');
    }
}

function toggleSelectAll(popup) {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.history-checkbox');
    if (!selectAllCheckbox) return;

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateBatchButtons(popup);
}

function toggleHistoryExpansion(_, id) {
    const fullContent = document.getElementById(`history-full-${id}`);
    if (fullContent) {
        fullContent.style.display = fullContent.style.display === 'none' ? 'block' : 'none';
    }
}

async function clearHistory(popup) {
    try {
        const confirmMessage = popup.t('popup.history.confirmClearAll');
        if (confirm(confirmMessage)) {
            popup.conversationHistory = [];
            await chrome.storage.sync.set({
                conversationHistory: []
            });
            loadHistoryList(popup);
            popup.showMessage(popup.t('popup.message.historyCleared'), 'success');
        }
    } catch (error) {
        console.error('清空历史记录失败:', error);
        if (error.message && error.message.includes('quota')) {
            console.log('检测到存储配额问题，尝试清理旧记录...');
            await cleanupHistoryRecords(popup);
            loadHistoryList(popup);
            popup.showMessage(popup.t('popup.message.historyCleaned'), 'info');
        } else {
            popup.showMessage(popup.t('popup.message.clearFailed'), 'error');
        }
    }
}

async function exportHistory(popup) {
    try {
        // 从 manifest.json 获取版本号
        const { getVersion } = await import('../../utils/version.js');
        const version = await getVersion();

        const exportData = {
            conversationHistory: popup.conversationHistory,
            exportTime: new Date().toISOString(),
            totalCount: popup.conversationHistory.length,
            version: version
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

        popup.showMessage(popup.t('popup.message.exportAllHistorySuccess', { count: popup.conversationHistory.length }), 'success');
    } catch (error) {
        console.error('导出历史记录失败:', error);
        popup.showMessage(popup.t('popup.message.exportFailed'), 'error');
    }
}

async function batchExportHistory(popup) {
    const checkboxes = document.querySelectorAll('.history-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);

    if (selectedIds.length === 0) {
        popup.showMessage(popup.t('popup.message.selectRecordsToExport'), 'warning');
        return;
    }

    try {
        // 从 manifest.json 获取版本号
        const { getVersion } = await import('../../utils/version.js');
        const version = await getVersion();

        const selectedHistory = popup.conversationHistory.filter(h => selectedIds.includes(h.id));

        const exportData = {
            conversationHistory: selectedHistory,
            exportTime: new Date().toISOString(),
            totalCount: selectedHistory.length,
            selectedCount: selectedIds.length,
            version: version
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

        popup.showMessage(popup.t('popup.message.exportHistorySelectionSuccess', { count: selectedHistory.length }), 'success');
    } catch (error) {
        console.error('批量导出历史记录失败:', error);
        popup.showMessage(popup.t('popup.message.batchExportFailed'), 'error');
    }
}

