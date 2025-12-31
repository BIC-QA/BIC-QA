// 测试管理器
export function createTestManager(popup) {
    return {
        async testStreamChat() {
            const testMessage = popup.questionInput.value.trim() || '怎么创建表';

            popup.setLoading(true);

            try {
                console.log('开始测试流式聊天...');
                console.log('测试消息:', testMessage);
                console.log('resultContainer元素:', popup.resultContainer);

                // 检查DOM元素是否正确初始化
                if (!popup.resultText) {
                    throw new Error(popup.t('popup.error.resultTextMissing'));
                }

                if (!popup.resultContainer) {
                    throw new Error(popup.t('popup.error.resultContainerMissing'));
                }

                // 获取当前选择的模型和服务商
                const selectedModelValue = popup.modelSelect.value;
                if (!selectedModelValue) {
                    throw new Error(popup.t('popup.error.selectModel'));
                }

                let selectedKey;
                try {
                    selectedKey = JSON.parse(selectedModelValue);
                } catch (_) {
                    selectedKey = { name: selectedModelValue };
                }

                const selectedModel = popup.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
                const provider = selectedModel ? popup.providers.find(p => p.name === selectedModel.provider) : null;

                if (!selectedModel || !provider) {
                    throw new Error(popup.t('popup.error.modelOrProviderMissing'));
                }

                // 清空并准备显示区域
                popup.resultText.innerHTML = '';
                popup.resultContainer.style.display = 'block';
                popup.resultText.style.display = 'block';

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
                testDiv.textContent = popup.t('popup.stream.testing', { provider: provider.name });
                popup.resultText.appendChild(testDiv);

                console.log('测试消息已添加到DOM');
                console.log('使用模型:', selectedModel.name);
                console.log('使用服务商:', provider.name);

                // 尝试调用流式聊天
                const result = await popup.streamChatWithConfig(testMessage, selectedModel, provider, null, null, popup.resultContainer);
                console.log('流式聊天完成，返回结果:', result);
                console.log('返回结果长度:', result ? result.length : 0);

                // 检查返回的结果
                if (result && result.length > 0) {
                    console.log('流式聊天成功，结果已显示');
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
                    noResultDiv.textContent = popup.t('popup.stream.noContent');
                    popup.resultText.appendChild(noResultDiv);
                }

                // 保存对话历史记录
                popup.saveConversationHistory(testMessage, result || '无返回内容', `${selectedModel.displayName || selectedModel.name}（${selectedModel.provider}）`, null, '');
            } catch (error) {
                console.error('测试流式聊天失败:', error);

                // 显示错误信息到结果区域
                if (popup.resultText) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = `
                        padding: 10px;
                        background-color: #f8d7da;
                        border: 1px solid #dc3545;
                        border-radius: 5px;
                        margin-bottom: 10px;
                        color: #721c24;
                    `;
                    errorDiv.textContent = error.message || popup.t('popup.error.testStreamChatFailed');
                    popup.resultText.appendChild(errorDiv);
                }

                popup.showErrorResult(error.message || popup.t('popup.error.testStreamChatFailed'), 'model');
            } finally {
                popup.setLoading(false);
            }
        },

        async testContentScript() {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                    popup.showMessage(popup.t('popup.message.contentScriptUnsupported'), 'error');
                    return;
                }

                console.log('测试content script连接...');
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'test'
                });

                if (response && response.success) {
                    popup.showMessage(popup.t('popup.message.contentScriptOk'), 'success');
                } else {
                    popup.showMessage(popup.t('popup.message.contentScriptResponseError'), 'error');
                }
            } catch (error) {
                console.error('Content script测试失败:', error);
                popup.showMessage(popup.t('popup.message.contentScriptConnectFailed', { error: error.message }), 'error');
            }
        }
    };
}

