export function attachPopupEventHandlers(popup) {
    const self = popup;

    self.addUserInteractionListeners();

    const {
        askButton,
        questionInput,
        resultContainer,
        copyButton,
        exportButton,
        clearButton,
        likeButton,
        dislikeButton,
        pageSummaryBtn,
        translateBtn,
        historyBtn,
        awrAnalysisBtn,
        inspectionBtn,
        sqlOptimizationBtn,
        awrDatabaseType,
        newSessionBtn,
        settingsBtn,
        languageSwitcher,
        announcementBtn,
        policyOpenButtons,
        policyCloseButtons,
        policyDialogs,
        closeHistoryDialog,
        clearHistoryBtn,
        exportHistoryBtn,
        historyList,
        knowledgeBaseSelect,
        closeAwrDialog,
        awrCancelBtn,
        awrAnalysisForm,
        awrFileUploadBtn,
        awrFileInput,
        closeInspectionDialog,
        inspectionCancelBtn,
        inspectionForm,
        inspectionFileUploadBtn,
        inspectionFileInput,
        inspectionTabs,
        closeSqlOptimizationDialog,
        sqlOptimizationCancelBtn,
        sqlOptimizationForm,
        sqlOptimizationFileUploadBtn,
        sqlOptimizationFileInput,
        sqlOptimizationTabs,
        sqlOptimizationDownloadOrUpdateScriptCollectorBtn,
        backToTopBtn,
    } = self;

    if (askButton) {
        askButton.addEventListener('click', () => {
            if (self.isProcessing) {
                self.stopProcessing();
            } else {
                self.handleAskQuestion();
            }
        });
    }

    if (questionInput) {
        questionInput.addEventListener('input', () => {
            self.updateButtonState();
            self.updateCharacterCount();
        });
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    return;
                }
                if (e.ctrlKey) {
                    e.preventDefault();
                    self.handleAskQuestion();
                    return;
                }
                e.preventDefault();
                self.handleAskQuestion();
            }
        });
        questionInput.addEventListener('paste', (e) => {
            const selectedKnowledgeBase = self.knowledgeBaseSelect.value;
            const isUsingKnowledgeBase = selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)';

            if (!isUsingKnowledgeBase) {
                return;
            }

            const maxLength = 500;
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text');
            const currentValue = questionInput.value;
            const selectionStart = questionInput.selectionStart;
            const selectionEnd = questionInput.selectionEnd;
            const newValue = currentValue.substring(0, selectionStart) + pastedText + currentValue.substring(selectionEnd);

            if (newValue.length > maxLength) {
                e.preventDefault();
                const availableSpace = maxLength - (currentValue.length - (selectionEnd - selectionStart));

                if (availableSpace > 0) {
                    const truncatedText = pastedText.substring(0, availableSpace);
                    const finalValue = currentValue.substring(0, selectionStart) + truncatedText + currentValue.substring(selectionEnd);
                    questionInput.value = finalValue;
                    const newCursorPos = selectionStart + truncatedText.length;
                    questionInput.setSelectionRange(newCursorPos, newCursorPos);
                    questionInput.dispatchEvent(new Event('input'));
                    self.showMessage(self.t('popup.message.pasteTruncated', { maxLength }), 'warning');
                } else {
                    self.showMessage(self.t('popup.message.inputFull', { maxLength }), 'warning');
                }
            }
        });
    }

    if (resultContainer) {
        resultContainer.addEventListener('click', (e) => {
            // 处理代码块复制按钮
            if (e.target.classList.contains('code-copy-btn') || e.target.closest('.code-copy-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const copyBtn = e.target.classList.contains('code-copy-btn') ? e.target : e.target.closest('.code-copy-btn');
                const codeId = copyBtn.getAttribute('data-code-id');
                if (codeId) {
                    const codeElement = document.getElementById(codeId);
                    if (codeElement) {
                        const codeText = codeElement.textContent || codeElement.innerText;
                        navigator.clipboard.writeText(codeText).then(() => {
                            // 显示复制成功提示
                            const originalTitle = copyBtn.getAttribute('title');
                            copyBtn.setAttribute('title', self.t('popup.message.copied'));
                            copyBtn.style.opacity = '1';
                            copyBtn.style.background = '#d4edda';
                            copyBtn.style.borderColor = '#28a745';
                            
                            setTimeout(() => {
                                copyBtn.setAttribute('title', originalTitle || '复制代码');
                                copyBtn.style.opacity = '0.7';
                                copyBtn.style.background = 'rgba(255, 255, 255, 0.9)';
                                copyBtn.style.borderColor = '#e9ecef';
                            }, 2000);
                            
                            self.showMessage(self.t('popup.message.copied'), 'success');
                        }).catch(err => {
                            console.error('复制失败:', err);
                            self.showMessage(self.t('popup.message.copyFailed'), 'error');
                        });
                    }
                }
                return;
            }

            const target = e.target.closest('button');
            if (!target) return;

            const conversationContainer = target.closest('.conversation-container');
            if (!conversationContainer) return;
            if (conversationContainer.id === 'conversation-default') {
                return;
            }

            if (target.classList.contains('export-btn') || target.id.startsWith('export-')) {
                e.preventDefault();
                self.exportResultAsHtml(conversationContainer);
            } else if (target.classList.contains('copy-btn') || target.id.startsWith('copy-')) {
                e.preventDefault();
                self.copyResult(conversationContainer);
            } else if (target.classList.contains('clear-btn') || target.id.startsWith('clear-')) {
                e.preventDefault();
                self.clearResult(conversationContainer);
            } else if (target.classList.contains('like-btn') || target.id.startsWith('like-')) {
                e.preventDefault();
                self.handleFeedback('like', conversationContainer);
            } else if (target.classList.contains('dislike-btn') || target.id.startsWith('dislike-')) {
                e.preventDefault();
                self.handleFeedback('dislike', conversationContainer);
            }
        });
    }

    if (copyButton) {
        copyButton.addEventListener('click', () => self.copyResult());
    }
    if (exportButton) {
        exportButton.addEventListener('click', () => self.exportResultAsHtml());
    }
    if (clearButton) {
        clearButton.addEventListener('click', () => self.clearResult());
    }
    if (likeButton) {
        likeButton.addEventListener('click', () => {
            const defaultContainer = self.resultContainer.querySelector('#conversation-default');
            self.handleFeedback('like', defaultContainer);
        });
    }
    if (dislikeButton) {
        dislikeButton.addEventListener('click', () => {
            const defaultContainer = self.resultContainer.querySelector('#conversation-default');
            self.handleFeedback('dislike', defaultContainer);
        });
    }

    if (pageSummaryBtn) {
        pageSummaryBtn.addEventListener('click', () => self.getPageSummary());
    }
    if (translateBtn) {
        translateBtn.addEventListener('click', () => self.translateSelection());
    }
    if (historyBtn) {
        historyBtn.addEventListener('click', () => self.showHistoryDialog());
    }
    if (awrAnalysisBtn) {
        awrAnalysisBtn.addEventListener('click', () => self.showAwrAnalysisDialog());
    }
    if (inspectionBtn) {
        inspectionBtn.addEventListener('click', () => {
            void self.showInspectionDialog();
        });
    }
    if (sqlOptimizationBtn) {
        sqlOptimizationBtn.addEventListener('click', () => {
            void self.showSqlOptimizationDialog();
        });
    }
    if (awrDatabaseType) {
        awrDatabaseType.addEventListener('change', (event) => self.handleAwrDatabaseTypeChange(event));
    }
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', () => self.startNewSession());
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => self.openSettings());
    }
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', async (event) => {
            await self.handleLanguageChange(event);
        });
    }
    if (announcementBtn) {
        announcementBtn.addEventListener('click', () => self.handleAnnouncementClick());
    }

    if (policyOpenButtons && policyOpenButtons.length > 0) {
        policyOpenButtons.forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = btn.dataset.target;
                if (targetId) {
                    self.showPolicyDialog(targetId);
                }
            });
        });
    }
    if (policyCloseButtons && policyCloseButtons.length > 0) {
        policyCloseButtons.forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = btn.dataset.target;
                if (targetId) {
                    self.hidePolicyDialog(targetId);
                }
            });
        });
    }
    if (policyDialogs) {
        Object.values(policyDialogs).forEach(dialog => {
            dialog.addEventListener('click', (event) => {
                if (event.target === dialog) {
                    self.hidePolicyDialog(dialog.id);
                }
            });
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            let handled = false;
            Object.entries(self.policyDialogs).forEach(([dialogId, dialog]) => {
                if (dialog.style.display === 'flex') {
                    self.hidePolicyDialog(dialogId);
                    handled = true;
                }
            });
            if (handled) {
                event.stopPropagation();
            }
        }
    });

    if (closeHistoryDialog) {
        closeHistoryDialog.addEventListener('click', () => self.hideHistoryDialog());
    }
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => self.clearHistory());
    }
    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', () => self.exportHistory());
    }

    if (historyList) {
        historyList.addEventListener('click', (e) => {
            const target = e.target;

            if (target.classList.contains('copy-btn')) {
                const id = target.dataset.id;
                self.copyHistoryItem(id);
            }

            if (target.classList.contains('delete-single-btn')) {
                const id = target.dataset.id;
                self.deleteHistoryItem(id);
            }

            if (target.id === 'batchExportBtn') {
                self.batchExportHistory();
            }

            if (target.id === 'batchDeleteBtn') {
                self.batchDeleteHistory();
            }
        });

        historyList.addEventListener('change', (e) => {
            const target = e.target;

            if (target.id === 'selectAllCheckbox') {
                self.toggleSelectAll();
            }

            if (target.classList.contains('history-checkbox')) {
                self.updateBatchButtons();
            }
        });
    }

    if (knowledgeBaseSelect) {
        knowledgeBaseSelect.addEventListener('change', () => self.handleKnowledgeBaseChange());
    }

    if (closeAwrDialog) {
        closeAwrDialog.addEventListener('click', (event) => {
            event.stopPropagation();
            self.hideAwrAnalysisDialog();
        });
    }
    if (awrCancelBtn) {
        awrCancelBtn.addEventListener('click', () => self.hideAwrAnalysisDialog());
    }
    if (awrAnalysisForm) {
        awrAnalysisForm.addEventListener('submit', (e) => {
            e.preventDefault();
            self.handleAwrAnalysisSubmit();
        });
    }
    if (awrFileUploadBtn) {
        awrFileUploadBtn.addEventListener('click', () => {
            if (self.awrFileInput) {
                self.awrFileInput.click();
            }
        });
    }
    if (awrFileInput) {
        awrFileInput.addEventListener('change', (e) => {
            self.handleFileSelect(e);
        });
    }

    if (closeInspectionDialog) {
        closeInspectionDialog.addEventListener('click', () => self.hideInspectionDialog());
    }
    if (inspectionCancelBtn) {
        inspectionCancelBtn.addEventListener('click', () => self.hideInspectionDialog());
    }
    if (closeSqlOptimizationDialog) {
        closeSqlOptimizationDialog.addEventListener('click', () => self.hideSqlOptimizationDialog());
    }
    if (sqlOptimizationCancelBtn) {
        sqlOptimizationCancelBtn.addEventListener('click', () => self.hideSqlOptimizationDialog());
    }
    if (sqlOptimizationForm) {
        sqlOptimizationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            self.handleSqlOptimizationSubmit();
        });
    }
    if (sqlOptimizationFileUploadBtn) {
        console.log('绑定SQL优化文件上传按钮事件');
        sqlOptimizationFileUploadBtn.addEventListener('click', () => {
            console.log('SQL优化文件上传按钮被点击');
            if (self.sqlOptimizationFileInput) {
                console.log('触发文件输入框点击');
                self.sqlOptimizationFileInput.click();
            } else {
                console.log('SQL优化文件输入框不存在');
            }
        });
    } else {
        console.log('SQL优化文件上传按钮不存在');
    }
    if (sqlOptimizationFileInput) {
        sqlOptimizationFileInput.addEventListener('change', (e) => {
            self.handleSqlOptimizationFileSelect(e);
        });
    }
    if (sqlOptimizationTabs && sqlOptimizationTabs.length > 0) {
        sqlOptimizationTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                self.switchSqlOptimizationTab(btn.dataset.tab);
            });
        });
    }
    if (sqlOptimizationDownloadOrUpdateScriptCollectorBtn) {
        sqlOptimizationDownloadOrUpdateScriptCollectorBtn.addEventListener('click', () => {
            self.showSqlOptimizationScriptCollectorOptions();
        });
    }
    if (inspectionForm) {
        inspectionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            self.handleInspectionSubmit();
        });
    }
    if (inspectionFileUploadBtn) {
        inspectionFileUploadBtn.addEventListener('click', () => {
            if (self.inspectionFileInput) {
                self.inspectionFileInput.click();
            }
        });
    }
    if (inspectionFileInput) {
        inspectionFileInput.addEventListener('change', (e) => {
            self.handleInspectionFileSelect(e);
        });
    }
    if (inspectionTabs && inspectionTabs.length > 0) {
        inspectionTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                self.switchInspectionTab(btn.dataset.tab);
            });
        });
    }
    const inspectionSearchBtn = document.getElementById('inspectionHistorySearchBtn');
    if (inspectionSearchBtn) {
        inspectionSearchBtn.addEventListener('click', () => {
            self.handleInspectionSearch();
        });
    }
    const inspectionResetBtn = document.getElementById('inspectionHistoryResetBtn');
    if (inspectionResetBtn) {
        inspectionResetBtn.addEventListener('click', () => {
            self.handleInspectionReset();
        });
    }

    const sqlOptimizationSearchBtn = document.getElementById('sqlOptimizationHistorySearchBtn');
    if (sqlOptimizationSearchBtn) {
        sqlOptimizationSearchBtn.addEventListener('click', () => {
            self.handleSqlOptimizationSearch();
        });
    }
    const sqlOptimizationResetBtn = document.getElementById('sqlOptimizationHistoryResetBtn');
    if (sqlOptimizationResetBtn) {
        sqlOptimizationResetBtn.addEventListener('click', () => {
            self.handleSqlOptimizationReset();
        });
    }
    const inspectionPrevBtn = document.getElementById('inspectionPrevPageBtn');
    if (inspectionPrevBtn) {
        inspectionPrevBtn.addEventListener('click', () => {
            if (self.inspectionHistoryCurrentPage > 1) {
                const startTime = self.getDateTimeInputValue('inspectionStartTime');
                const endTime = self.getDateTimeInputValue('inspectionEndTime');
                const status = document.getElementById('inspectionStatusFilter')?.value || '';
                self.loadInspectionHistoryList(self.inspectionHistoryCurrentPage - 1, self.inspectionHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }
    const inspectionNextBtn = document.getElementById('inspectionNextPageBtn');
    if (inspectionNextBtn) {
        inspectionNextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(self.inspectionHistoryTotal / self.inspectionHistoryPageSize);
            if (self.inspectionHistoryCurrentPage < totalPages) {
                const startTime = self.getDateTimeInputValue('inspectionStartTime');
                const endTime = self.getDateTimeInputValue('inspectionEndTime');
                const status = document.getElementById('inspectionStatusFilter')?.value || '';
                self.loadInspectionHistoryList(self.inspectionHistoryCurrentPage + 1, self.inspectionHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }

    const sqlOptimizationPrevBtn = document.getElementById('sqlOptimizationPrevPageBtn');
    if (sqlOptimizationPrevBtn) {
        sqlOptimizationPrevBtn.addEventListener('click', () => {
            if (self.sqlOptimizationHistoryCurrentPage > 1) {
                const startTime = self.getDateTimeInputValue('sqlOptimizationStartTime');
                const endTime = self.getDateTimeInputValue('sqlOptimizationEndTime');
                const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
                self.loadSqlOptimizationHistoryList(self.sqlOptimizationHistoryCurrentPage - 1, self.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }
    const sqlOptimizationNextBtn = document.getElementById('sqlOptimizationNextPageBtn');
    if (sqlOptimizationNextBtn) {
        sqlOptimizationNextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(self.sqlOptimizationHistoryTotal / self.sqlOptimizationHistoryPageSize);
            if (self.sqlOptimizationHistoryCurrentPage < totalPages) {
                const startTime = self.getDateTimeInputValue('sqlOptimizationStartTime');
                const endTime = self.getDateTimeInputValue('sqlOptimizationEndTime');
                const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
                self.loadSqlOptimizationHistoryList(self.sqlOptimizationHistoryCurrentPage + 1, self.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }

    document.querySelectorAll('#awrAnalysisDialog .awr-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            self.switchAwrTab(btn.dataset.tab);
        });
    });

    const awrSearchBtn = document.getElementById('awrRefreshHistoryBtn');
    if (awrSearchBtn) {
        awrSearchBtn.addEventListener('click', () => {
            self.handleAwrSearch();
        });
    }
    const awrResetBtn = document.getElementById('awrResetBtn');
    if (awrResetBtn) {
        awrResetBtn.addEventListener('click', () => {
            self.handleAwrReset();
        });
    }
    const awrPrevBtn = document.getElementById('awrPrevPageBtn');
    const awrNextBtn = document.getElementById('awrNextPageBtn');
    if (awrPrevBtn) {
        awrPrevBtn.addEventListener('click', () => {
            if (self.awrHistoryCurrentPage > 1) {
                const startTime = self.getDateTimeInputValue('awrStartTime');
                const endTime = self.getDateTimeInputValue('awrEndTime');
                const status = document.getElementById('awrStatusFilter')?.value || '';
                self.loadAwrHistoryList(self.awrHistoryCurrentPage - 1, self.awrHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }
    if (awrNextBtn) {
        awrNextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(self.awrHistoryTotal / self.awrHistoryPageSize);
            if (self.awrHistoryCurrentPage < totalPages) {
                const startTime = self.getDateTimeInputValue('awrStartTime');
                const endTime = self.getDateTimeInputValue('awrEndTime');
                const status = document.getElementById('awrStatusFilter')?.value || '';
                self.loadAwrHistoryList(self.awrHistoryCurrentPage + 1, self.awrHistoryPageSize, '', startTime, endTime, status);
            }
        });
    }

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => self.scrollToTop());
    }

    window.addEventListener('scroll', () => self.handleScroll());

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.providers || changes.models) {
                console.log('检测到配置变化，重新加载设置...');
                setTimeout(() => {
                    self.loadSettings();
                }, 500);
            }
            if (changes.uiLanguage) {
                const newLanguage = changes.uiLanguage.newValue || self.i18n.defaultLanguage;
                self.applyLanguage(newLanguage, { persist: false }).catch(error => {
                    console.error('应用存储语言变更失败:', error);
                });
            }
        }
    });

    const openFullPageBtn = document.getElementById('openFullPageBtn');
    if (openFullPageBtn) {
        openFullPageBtn.addEventListener('click', () => self.openFullPage());
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('.copy-question-btn')) {
            self.copyQuestionText(e.target.closest('.copy-question-btn'));
        }
    });

    const inspectionSearchInput = document.getElementById('inspectionHistorySearchInput');
    if (inspectionSearchInput) {
        inspectionSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                self.handleInspectionSearch();
            }
        });
    }

    const awrSearchInput = document.getElementById('awrHistorySearchInput');
    if (awrSearchInput) {
        awrSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                self.handleAwrSearch();
            }
        });
    }
}

