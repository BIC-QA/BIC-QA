/**
 * 知识库处理器
 * 负责处理知识库选择变化等操作
 */
export function createKnowledgeBaseHandler(popup) {
    return {
        /**
         * 处理知识库选择变化
         */
        async handleKnowledgeBaseChange() {
            const selectedKnowledgeBase = popup.knowledgeBaseSelect.value;

            // 立即更新字符计数显示（无论选择什么）
            popup.updateCharacterCount();
            // 如果选择了"不使用知识库(None)"，清空知识库列表
            if (!selectedKnowledgeBase || selectedKnowledgeBase === '不使用知识库(None)') {
                console.log('handleKnowledgeBaseChange: 选择不使用知识库(None)，清空知识库列表');
                const knowlistEl = popup.resultText?.querySelector('.result-text-knowlist');
                if (knowlistEl) {
                    knowlistEl.innerHTML = '';
                    console.log('知识库列表已清空');
                }
                // 重置状态变量
                popup._useKnowledgeBaseThisTime = false;
                popup._kbMatchCount = 0;
                popup._kbItems = [];
                popup._kbImageList = [];

                // 更新字符计数显示
                popup.updateCharacterCount();
                return;
            }

            // 如果选择了知识库，更新字符计数显示
            popup.updateCharacterCount();

            // 如果选择了知识库（不是"不使用知识库(None)"），检查知识库服务配置
            if (selectedKnowledgeBase && selectedKnowledgeBase !== '不使用知识库(None)') {
                // 重新加载知识库服务配置，确保获取最新配置
                console.log('选择知识库，重新加载配置...');
                await popup.loadKnowledgeServiceConfig();

                // 检查知识库服务配置
                if (!popup.knowledgeServiceConfig) {
                    popup.showMessage(popup.t('popup.message.configureKbConnection'), 'error');
                    return;
                }

                // 检查知识库服务URL是否配置
                if (!popup.knowledgeServiceConfig.default_url || popup.knowledgeServiceConfig.default_url.trim() === '') {
                    popup.showMessage(popup.t('popup.message.configureKbUrl'), 'error');
                    // 提供跳转选项
                    setTimeout(() => {
                        if (confirm('是否跳转到设置页面配置知识库服务URL？')) {
                            popup.openSettings('knowledge-service-config');
                        }
                    }, 1000);
                    return;
                }
            }
        }
    };
}

