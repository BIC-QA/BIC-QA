/**
 * 输入区域管理器
 * 负责输入区域相关的功能，包括字符计数、按钮状态、布局状态等
 */
export function createInputManager(popup) {
    return {
        /**
         * 设置加载状态
         */
        setLoading(loading) {
            if (!popup.askButton) return;
            if (loading) {
                // 切换为停止图标
                if (popup.sendIcon) popup.sendIcon.style.display = 'none';
                if (popup.stopIcon) popup.stopIcon.style.display = 'inline';
            } else {
                // 切换为发送图标
                if (popup.stopIcon) popup.stopIcon.style.display = 'none';
                if (popup.sendIcon) popup.sendIcon.style.display = 'inline';
                popup.updateButtonState();
            }
        },

        /**
         * 更新按钮状态
         */
        updateButtonState() {
            if (!popup.questionInput || !popup.askButton) return;

            const hasInput = popup.questionInput.value.trim().length > 0;
            if (hasInput) {
                popup.askButton.classList.add('active');
                popup.askButton.disabled = false;
            } else {
                popup.askButton.classList.remove('active');
                popup.askButton.disabled = true;
            }
        },

        /**
         * 更新字符计数
         */
        updateCharacterCount() {
            if (!popup.questionInput || !popup.charCount || !popup.charCountContainer) return;

            const currentLength = popup.questionInput.value.length;
            const selectedKnowledgeBase = popup.knowledgeBaseSelect.value;
            const isUsingKnowledgeBase = selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)';
            const maxLength = isUsingKnowledgeBase ? 500 : Infinity;

            // 更新字符计数显示
            if (isUsingKnowledgeBase) {
                popup.charCount.textContent = currentLength;
                popup.charCountContainer.style.display = 'block';

                // 根据字符数量更新样式
                popup.charCountContainer.classList.remove('warning', 'danger');

                if (currentLength >= maxLength) {
                    popup.charCountContainer.classList.add('danger');
                } else if (currentLength >= maxLength * 0.8) { // 80%时显示警告
                    popup.charCountContainer.classList.add('warning');
                }
            } else {
                // 不使用知识库(None)时隐藏字符计数
                popup.charCountContainer.style.display = 'none';
                // 清除样式类
                popup.charCountContainer.classList.remove('warning', 'danger');
            }
            const charCount = popup.questionInput.value.length;
            const charCountElement = document.getElementById('charCount');
            if (charCountElement) {
                charCountElement.textContent = charCount;
            }

            // 如果输入框有内容且建议容器显示，则隐藏建议容器
            // if (charCount > 5) {
            //     const currentContainer = popup.getCurrentConversationContainer();
            //     const suggestionContainer = currentContainer ? currentContainer.querySelector('.suggestion-container') : null;
            //     if (suggestionContainer && suggestionContainer.style.display === 'block') {
            //         suggestionContainer.style.display = 'none';
            //     }
            // }
        },

        /**
         * 更新布局状态
         */
        updateLayoutState() {
            if (!popup.contentArea || !popup.resultContainer) return;

            const hasResult = popup.resultContainer.style.display !== 'none';

            if (hasResult) {
                popup.contentArea.classList.remove('no-result');
                popup.contentArea.classList.add('has-result');
            } else {
                popup.contentArea.classList.remove('has-result');
                popup.contentArea.classList.add('no-result');
            }
        }
    };
}

