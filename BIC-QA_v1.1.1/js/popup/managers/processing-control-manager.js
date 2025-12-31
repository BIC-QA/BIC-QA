/**
 * 处理控制管理器
 * 负责处理流程的控制，如停止处理、Ollama服务检测等
 */
export function createProcessingControlManager(popup) {
    return {
        /**
         * 检查是否为Ollama服务
         */
        isOllamaService(provider) {
            // 首先检查服务商类型
            if (provider.providerType === 'ollama') {
                return true;
            }

            // 检查服务商名称
            const providerName = provider.name.toLowerCase();
            if (providerName.includes('ollama')) {
                return true;
            }

            // 检查 API 端点
            try {
                const url = new URL(provider.apiEndpoint);
                const hostname = url.hostname.toLowerCase();

                // 检查是否为本地地址或自定义 IP
                if (hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname.startsWith('192.168.') ||
                    hostname.startsWith('10.') ||
                    hostname.startsWith('172.')) {

                    // 检查端口和路径是否匹配 Ollama 格式
                    const path = url.pathname.toLowerCase();
                    const port = url.port;

                    // 支持多种路径格式
                    if (path.includes('/v1/chat/completions') ||
                        path.includes('/v1') ||
                        path === '/' ||
                        path === '') {

                        // 检查端口是否为 11434（Ollama 默认端口）
                        if (port === '11434' || port === '') {
                            console.log('检测到 Ollama 服务，路径:', path, '端口:', port);
                            return true;
                        }
                    }
                }
            } catch (e) {
                console.warn('无法解析 API 端点 URL:', e.message);
            }

            return false;
        },

        /**
         * 停止处理
         */
        stopProcessing() {
            try {
                popup.hasBeenStopped = true;
                if (popup.abortController) {
                    popup.abortController.abort();
                }

                // 获取最新的对话容器中的result-title
                const currentContainer = popup.getCurrentConversationContainer();
                const resultTitle = currentContainer ? currentContainer.querySelector('.result-title') : null;

                if (resultTitle) {
                    resultTitle.textContent = popup.t('popup.progress.stopped');
                }

                // 获取最新的对话容器中的result-text-tips
                const resultTextTips = currentContainer ? currentContainer.querySelector('.result-text-tips') : null;

                if (resultTextTips) {
                    resultTextTips.textContent = popup.t('popup.progress.stoppedDescription');
                }
            } catch (e) {
                console.error('停止处理失败:', e);
            } finally {
                popup.isProcessing = false;
                popup.setLoading(false);
            }
        }
    };
}

