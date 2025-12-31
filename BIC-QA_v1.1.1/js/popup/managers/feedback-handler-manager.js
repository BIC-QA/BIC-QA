// 反馈处理管理器
export function createFeedbackHandlerManager(popup) {
    return {
        handleFeedback(type, container) {
            const selectedKnowledgeBase = popup.knowledgeBaseSelect.value;

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
                                popup.showMessage(popup.t('popup.message.likeCancelled'), 'info');
                            } else {
                                // 如果当前未点赞，则点赞
                                likeBtn.classList.add('active');
                                dislikeBtn.classList.remove('active'); // 清空否定状态
                                popup.saveFeedback('like');
                                popup.showMessage(popup.t('popup.message.feedbackThanksPositive'), 'success');
                            }
                        } else if (type === 'dislike') {
                            if (isCurrentlyDisliked) {
                                // 如果当前已否定，则取消否定
                                dislikeBtn.classList.remove('active');
                                popup.showMessage(popup.t('popup.message.dislikeCancelled'), 'info');
                            } else {
                                // 如果当前未否定，则否定
                                dislikeBtn.classList.add('active');
                                likeBtn.classList.remove('active'); // 清空点赞状态
                                popup.saveFeedback('dislike');
                                popup.showMessage(popup.t('popup.message.feedbackThanksNegative'), 'info');
                            }
                        }
                    }
                }
                return;
            } else {
                //针对已经选择了的可以评价
                // 获取当前问题文本
                const questionDisplay = container ? container.querySelector('.question-text') : popup.questionText;
                const question = questionDisplay ? questionDisplay.textContent : '';

                // 获取当前回答文本
                const resultText = container ? container.querySelector('.result-text-content') : popup.resultText;
                const answer = resultText ? resultText.textContent : '';

                // 确定反馈类型
                const adviceType = type === 'like' ? 'good' : 'bad';
                
                // 调用统一处理函数
                popup.doAdviceForAnswer(question, answer, adviceType, container);
            }
        },

        async saveFeedback(type) {
            try {
                const currentQuestion = popup.questionInput.value;
                const currentAnswer = popup.resultText.textContent;
                const selectedModelValue = popup.modelSelect.value;
                let currentModel = '';
                try {
                    const key = JSON.parse(selectedModelValue);
                    const selectedModel = popup.models.find(m => m.name === key.name && (!key.provider || m.provider === key.provider));
                    currentModel = selectedModel ? `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）` : (key.name || '');
                } catch (_) {
                    const selectedModel = popup.models.find(m => m.name === selectedModelValue);
                    currentModel = selectedModel ? `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）` : selectedModelValue;
                }
                const currentKnowledgeBase = popup.knowledgeBaseSelect.value;

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
                    popup.cleanupHistoryRecords();
                }
            }
        },

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
    };
}

