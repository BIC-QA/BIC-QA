/**
 * API工具管理器
 * 负责API相关的工具方法，如设置认证头等
 */
export function createApiUtilsManager(popup) {
    return {
        /**
         * 设置认证头
         */
        setAuthHeaders(headers, provider) {
            // 添加 Accept-Language 头部
            headers['Accept-Language'] = popup.getAcceptLanguage();
            
            if (provider.authType === 'Bearer') {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            } else if (provider.authType === 'API-Key') {
                // 根据不同的API服务商设置不同的认证头
                const endpoint = provider.apiEndpoint.toLowerCase();

                if (endpoint.includes('deepseek')) {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                } else if (endpoint.includes('openai')) {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                } else if (endpoint.includes('anthropic') || endpoint.includes('claude')) {
                    headers['x-api-key'] = provider.apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                } else if (endpoint.includes('google') || endpoint.includes('gemini')) {
                    headers['x-goog-api-key'] = provider.apiKey;
                } else if (endpoint.includes('qianwen') || endpoint.includes('dashscope')) {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                } else if (endpoint.includes('zhipu')) {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                } else {
                    // 默认使用 Bearer 认证
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                }
            } else if (provider.authType === 'Custom') {
                // 自定义认证头
                if (provider.customHeaders) {
                    Object.assign(headers, provider.customHeaders);
                }
            }
        }
    };
}

