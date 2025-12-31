/**
 * 反馈管理器
 * 负责用户反馈相关的功能（点赞、否定等）
 */
export function createFeedbackManager(popup) {
    return {
        /**
         * 统一的点赞和否定处理函数
         */
        async doAdviceForAnswer(question, answer, adviceType, container = null) {
            try {
                // 获取目标容器
                const targetContainer = container || popup.resultContainer;
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

                // 获取API密钥
                await popup.loadKnowledgeServiceConfig();
                let apiKey = '';

                if (popup.knowledgeServiceConfig && popup.knowledgeServiceConfig.api_key) {
                    apiKey = popup.knowledgeServiceConfig.api_key.trim();
                }

                if (!apiKey) {
                    console.error('未配置API密钥，无法提交反馈', 'error');
                    popup.showMessage(popup.t('popup.message.feedbackThanksPositive'), 'success');
                    return;
                }

                // 构建请求参数
                const requestData = {
                    id: currentFeedbackId ? parseInt(currentFeedbackId) : null,
                    question: question,
                    answer: answer,
                    adviceType: adviceType
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
                            popup.showMessage(popup.t('popup.message.likeCancelled'), 'info');
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
                            popup.showMessage(popup.t('popup.message.dislikeCancelled'), 'info');
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
                    popup.showMessage(message, 'success');
                } else {
                    // 显示错误消息
                    const errorMsg = response ? response.message || '操作失败' : '网络错误';
                    console.error('反馈操作失败:', errorMsg);
                    popup.showMessage(popup.t('popup.message.feedbackThanksPositive'), 'success');
                }

            } catch (error) {
                console.error('反馈操作失败:', error);
                popup.showMessage(popup.t('popup.message.feedbackThanksPositive'), 'success');
            }
        },

        /**
         * 新增反馈
         */
        async addFeedback(data, apiKey) {
            try {
                // 使用请求工具
                const tempProvider = {
                    authType: 'Bearer',
                    apiKey: apiKey
                };
                return await popup.requestUtil.post('/api/chat/addFeedback', data, {
                    provider: tempProvider
                });
            } catch (error) {
                console.error('新增反馈失败:', error);
                throw error;
            }
        },

        /**
         * 编辑反馈
         */
        async updateFeedback(data, apiKey) {
            try {
                // 使用请求工具
                const tempProvider = {
                    authType: 'Bearer',
                    apiKey: apiKey
                };
                return await popup.requestUtil.post('/api/chat/updateFeedback', data, {
                    provider: tempProvider
                });
            } catch (error) {
                console.error('编辑反馈失败:', error);
                throw error;
            }
        },

        /**
         * 删除反馈
         */
        async deleteFeedback(id, apiKey) {
            try {
                // 使用请求工具
                const tempProvider = {
                    authType: 'Bearer',
                    apiKey: apiKey
                };
                return await popup.requestUtil.post(`/api/chat/deleteFeedback?id=${id}`, null, {
                    provider: tempProvider
                });
            } catch (error) {
                console.error('删除反馈失败:', error);
                throw error;
            }
        },

        /**
         * 更新反馈UI状态
         */
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
        },

        /**
         * 保存反馈ID到容器中
         */
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
        },

        /**
         * 移除反馈ID
         */
        removeFeedbackId(container) {
            const existingIdElement = container.querySelector('.feedback-id');
            if (existingIdElement) {
                existingIdElement.remove();
            }
        },

        /**
         * 移除反馈样式
         */
        removeFeedbackStyle(container) {
            const likeBtn = container.querySelector('.like-btn');
            const dislikeBtn = container.querySelector('.dislike-btn');

            if (likeBtn) likeBtn.classList.remove('active');
            if (dislikeBtn) dislikeBtn.classList.remove('active');
        },

        /**
         * 格式化日期时间
         */
        formatDateTime(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
    };
}

