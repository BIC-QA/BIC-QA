/**
 * 会话管理器
 * 负责会话相关的功能，包括开启新会话、清理缓存等
 */
export function createSessionManager(popup) {
    return {
        /**
         * 开启新会话
         */
        startNewSession() {
            console.log('开启新会话');

            // 停止定期检查提示信息
            popup.stopProgressMessageReplacement();

            // 清空当前结果
            popup.clearResult();

            // 清空当前会话历史
            popup.currentSessionHistory = [];
            console.log('startNewSession: 当前会话历史已清空');

            // 重置知识库相关状态变量
            popup._useKnowledgeBaseThisTime = false;
            popup._kbMatchCount = 0;
            popup._kbItems = [];
            popup._kbImageList = [];
            console.log('startNewSession: 知识库状态变量已重置');

            // 显示提示消息
            popup.showMessage(popup.t('popup.message.newSessionStarted'), 'success');

            // 重置一些会话相关的状态
            // 重置计时
            popup.startTime = null;

            // 重置加载状态
            popup.setLoading(false);

            // 重置按钮状态
            popup.updateButtonState();

            // 确保输入框获得焦点
            if (popup.questionInput) {
                popup.questionInput.focus();
                console.log('输入框已获得焦点');
            } else {
                console.warn('未找到输入框元素');
            }

            // 重新开始定期检查提示信息
            setTimeout(() => {
                popup.startProgressMessageReplacement();
            }, 1000);

            // 可选：重置其他会话相关的状态
            // 例如清除任何缓存的上下文信息等

            console.log('新会话已开启，所有状态已重置');
        },

        /**
         * 清理格式缓存
         */
        clearFormatCache() {
            popup._lastContent = null;
            popup._lastFormattedContent = null;
        },

        /**
         * 添加到当前会话历史
         */
        addToCurrentSessionHistory(userQuestion, aiAnswer) {
            // 检查是否已经存在相同的对话，避免重复添加
            const lastUserMessage = popup.currentSessionHistory[popup.currentSessionHistory.length - 2];
            const lastAssistantMessage = popup.currentSessionHistory[popup.currentSessionHistory.length - 1];

            // 如果最后一条用户消息和AI回答与当前要添加的相同，则不添加
            if (lastUserMessage && lastAssistantMessage &&
                lastUserMessage.role === "user" && lastAssistantMessage.role === "assistant" &&
                lastUserMessage.content === userQuestion && lastAssistantMessage.content === aiAnswer) {
                console.log('检测到重复对话，跳过添加:', { userQuestion, aiAnswer });
                return;
            }

            // 添加用户问题
            popup.currentSessionHistory.push({
                role: "user",
                content: userQuestion
            });

            // 添加AI回答
            popup.currentSessionHistory.push({
                role: "assistant",
                content: aiAnswer
            });

            // 保持最多6条消息（3轮对话）
            if (popup.currentSessionHistory.length > 6) {
                popup.currentSessionHistory = popup.currentSessionHistory.slice(-6);
            }

            console.log('当前会话历史:', popup.currentSessionHistory);
        }
    };
}

