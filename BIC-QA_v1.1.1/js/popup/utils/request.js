/**
 * 统一的 HTTP 请求工具类
 * 基于原生 fetch，提供统一的请求接口、错误处理、拦截器等功能
 * 
 * @class RequestUtil
 */
export class RequestUtil {
    /**
     * 创建 RequestUtil 实例
     * @param {Object} options 配置选项
     * @param {Function} options.getAcceptLanguage 获取 Accept-Language 的函数
     * @param {Function} options.setAuthHeaders 设置认证头部的函数
     * @param {Object} options.defaultHeaders 默认请求头
     * @param {number} options.timeout 默认超时时间（毫秒）
     * @param {Function} options.onRequest 请求拦截器
     * @param {Function} options.onResponse 响应拦截器
     * @param {Function} options.onError 错误拦截器
     */
    constructor(options = {}) {
        this.getAcceptLanguage = options.getAcceptLanguage || (() => 'zh');
        this.setAuthHeaders = options.setAuthHeaders || (() => {});
        this.defaultHeaders = options.defaultHeaders || {};
        this.timeout = options.timeout || 30000; // 默认30秒
        this.onRequest = options.onRequest || null;
        this.onResponse = options.onResponse || null;
        this.onError = options.onError || null;
        // 默认基础URL
        this.baseURL = options.baseURL || 'http://api.bic-qa.com';
        // 'http://api.bic-qa.com';
        // 'http://192.168.32.98:8180';
        
        // 存储活动的请求控制器，用于取消请求
        this.abortControllers = new Map();
        
        // 异步从 storage 加载 QA服务URL 并更新 baseURL（不阻塞构造函数）
        this.loadBaseURLFromStorage().catch(err => {
            console.warn('加载baseURL失败:', err);
        });
    }
    
    /**
     * 规范化URL格式，确保协议部分正确
     * @param {string} url 需要规范化的URL
     * @returns {string} 规范化后的URL
     */
    normalizeURL(url) {
        if (!url || typeof url !== 'string') {
            return url;
        }

        url = url.trim();

        // 如果已经包含正确的协议，直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // 处理不完整的协议格式，如 "http:192.168.32.98:8180" -> "http://192.168.32.98:8180"
        if (url.startsWith('http:') && !url.startsWith('http://')) {
            return url.replace('http:', 'http://');
        }
        if (url.startsWith('https:') && !url.startsWith('https://')) {
            return url.replace('https:', 'https://');
        }

        // 如果没有协议，添加默认的http协议
        if (!url.includes('://')) {
            return 'http://' + url;
        }

        return url;
    }

    /**
     * 从完整URL中提取基础URL
     * @param {string} url 完整URL，例如 'https://api.bic-qa.com/api/chat/message'
     * @returns {string} 基础URL，例如 'http://api.bic-qa.com'
     */
    extractBaseURL(url) {
        if (!url || typeof url !== 'string') {
            return 'http://api.bic-qa.com';
        }
        
        try {
            // 移除末尾的斜杠
            url = url.trim().replace(/\/+$/, '');
            
            // 如果已经是基础URL（不包含路径），直接返回
            if (!url.includes('/api/') && !url.match(/\/[^\/]+\.[^\/]+$/)) {
                return url;
            }
            
            // 解析URL，提取协议、主机和端口
            const urlObj = new URL(url);
            const baseURL = `${urlObj.protocol}//${urlObj.host}`;
            return baseURL;
        } catch (error) {
            console.warn('解析URL失败，使用默认baseURL:', error);
            return 'http://api.bic-qa.com';
        }
    }
    
    /**
     * 从 storage 加载 QA服务URL 并更新 baseURL
     */
    async loadBaseURLFromStorage() {
        try {
            const result = await chrome.storage.sync.get(['knowledgeServiceConfig']);
            if (result.knowledgeServiceConfig && result.knowledgeServiceConfig.default_url) {
                const qaServiceUrl = result.knowledgeServiceConfig.default_url.trim();
                if (qaServiceUrl) {
                    const baseURL = this.extractBaseURL(qaServiceUrl);
                    this.baseURL = baseURL;
                    console.log('从storage加载QA服务URL，更新baseURL为:', this.baseURL);
                }
            }
        } catch (error) {
            console.warn('从storage加载QA服务URL失败，使用默认baseURL:', error);
        }
    }
    
    /**
     * 更新 baseURL
     * @param {string} url QA服务URL（完整URL或基础URL）
     */
    updateBaseURL(url) {
        if (url && typeof url === 'string' && url.trim()) {
            this.baseURL = this.extractBaseURL(url.trim());
            console.log('baseURL已更新为:', this.baseURL);
        }
    }

    /**
     * 获取 Accept-Language 值
     * @returns {string}
     */
    getAcceptLanguageValue() {
        try {
            return this.getAcceptLanguage();
        } catch (error) {
            console.warn('获取 Accept-Language 失败，使用默认值 zh:', error);
            return 'zh';
        }
    }

    /**
     * 处理 URL，如果是相对路径则拼接基础URL
     * @param {string} url 请求URL（可以是完整URL或相对路径）
     * @returns {string} 处理后的完整URL
     */
    resolveURL(url) {
        if (!url) {
            return this.baseURL;
        }
        
        // 如果已经是完整的URL（包含协议），直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // 如果是相对路径，拼接基础URL
        const baseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
        const path = url.startsWith('/') ? url : '/' + url;
        return baseURL + path;
    }

    /**
     * 构建请求头
     * @param {Object} headers 自定义请求头
     * @param {Object} provider Provider 配置对象（可选）
     * @param {boolean} isFormData 是否为 FormData
     * @returns {Object}
     */
    buildHeaders(headers = {}, provider = null, isFormData = false) {
        const defaultHeaders = { ...this.defaultHeaders };
        
        // 添加 Accept-Language
        defaultHeaders['Accept-Language'] = this.getAcceptLanguageValue();
        
        // 如果不是 FormData，添加默认 Content-Type
        if (!isFormData && !headers['Content-Type'] && !defaultHeaders['Content-Type']) {
            defaultHeaders['Content-Type'] = 'application/json';
        }
        
        // 合并自定义头部
        const finalHeaders = { ...defaultHeaders, ...headers };
        
        // 如果有 provider，设置认证头
        if (provider) {
            this.setAuthHeaders(finalHeaders, provider);
        }
        
        return finalHeaders;
    }

    /**
     * 构建 fetch 请求选项（用于流式请求等需要直接访问 response 的场景）
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @param {string} options.method 请求方法
     * @param {Object} options.headers 请求头
     * @param {Object} options.body 请求体
     * @param {Object} options.provider Provider 配置对象
     * @param {AbortSignal} options.signal AbortSignal
     * @param {boolean} options.isFormData 是否为 FormData
     * @returns {Object} fetch 选项对象
     */
    buildFetchOptions(url, options = {}) {
        const {
            method = 'POST',
            headers = {},
            body = null,
            provider = null,
            signal = null,
            isFormData = false
        } = options;

        // 构建请求头
        const finalHeaders = this.buildHeaders(headers, provider, isFormData);

        // 处理请求体
        let finalBody = body;
        if (body !== null) {
            if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !isFormData) {
                finalBody = JSON.stringify(body);
            } else {
                finalBody = body;
            }
        }

        // 构建 fetch 选项
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: finalHeaders,
            signal: signal || undefined
        };

        if (finalBody !== null) {
            fetchOptions.body = finalBody;
        }

        return fetchOptions;
    }

    /**
     * 处理请求拦截器
     * @param {Object} config 请求配置
     * @returns {Object}
     */
    async handleRequestInterceptor(config) {
        if (this.onRequest && typeof this.onRequest === 'function') {
            try {
                return await this.onRequest(config);
            } catch (error) {
                console.error('请求拦截器错误:', error);
                return config;
            }
        }
        return config;
    }

    /**
     * 处理响应拦截器
     * @param {Response} response 响应对象
     * @param {Object} config 请求配置
     * @returns {Response}
     */
    async handleResponseInterceptor(response, config) {
        if (this.onResponse && typeof this.onResponse === 'function') {
            try {
                return await this.onResponse(response, config);
            } catch (error) {
                console.error('响应拦截器错误:', error);
                return response;
            }
        }
        return response;
    }

    /**
     * 处理错误拦截器
     * @param {Error} error 错误对象
     * @param {Object} config 请求配置
     * @returns {Promise<Error>}
     */
    async handleErrorInterceptor(error, config) {
        if (this.onError && typeof this.onError === 'function') {
            try {
                return await this.onError(error, config);
            } catch (err) {
                console.error('错误拦截器异常:', err);
                return error;
            }
        }
        return error;
    }

    /**
     * 解析响应数据
     * @param {Response} response 响应对象
     * @returns {Promise<any>}
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (error) {
                console.error('解析 JSON 响应失败:', error);
                const text = await response.text();
                throw new Error(`JSON 解析失败: ${text}`);
            }
        }
        
        return await response.text();
    }

    /**
     * 处理错误响应
     * @param {Response} response 响应对象
     * @returns {Promise<Error>}
     */
    async handleErrorResponse(response) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData = null;
        
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
                const text = await response.text();
                if (text) {
                    errorMessage = text;
                }
            }
        } catch (error) {
            console.error('读取错误响应失败:', error);
        }
        
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = errorData;
        error.response = response;
        
        return error;
    }

    /**
     * 创建 AbortController 并设置超时
     * @param {number} timeout 超时时间（毫秒）
     * @param {string} requestId 请求ID
     * @returns {AbortController}
     */
    createAbortController(timeout, requestId) {
        const controller = new AbortController();
        
        if (timeout > 0) {
            const timeoutId = setTimeout(() => {
                controller.abort();
                this.abortControllers.delete(requestId);
            }, timeout);
            
            // 存储 timeoutId 以便可以清除
            controller._timeoutId = timeoutId;
        }
        
        if (requestId) {
            this.abortControllers.set(requestId, controller);
        }
        
        return controller;
    }

    /**
     * 取消请求
     * @param {string} requestId 请求ID
     */
    cancelRequest(requestId) {
        const controller = this.abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            if (controller._timeoutId) {
                clearTimeout(controller._timeoutId);
            }
            this.abortControllers.delete(requestId);
        }
    }

    /**
     * 取消所有请求
     */
    cancelAllRequests() {
        this.abortControllers.forEach((controller, requestId) => {
            controller.abort();
            if (controller._timeoutId) {
                clearTimeout(controller._timeoutId);
            }
        });
        this.abortControllers.clear();
    }

    /**
     * 发送 HTTP 请求
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @param {string} options.method 请求方法 (GET, POST, PUT, DELETE 等)
     * @param {Object} options.headers 请求头
     * @param {Object} options.body 请求体（对象，会自动 JSON.stringify）
     * @param {FormData|Blob|string} options.data 原始请求数据（FormData、Blob 等）
     * @param {Object} options.provider Provider 配置对象
     * @param {number} options.timeout 超时时间（毫秒），0 表示不超时
     * @param {string} options.requestId 请求ID，用于取消请求
     * @param {boolean} options.redirect 是否跟随重定向
     * @param {AbortSignal} options.signal 自定义 AbortSignal
     * @param {Function} options.onProgress 进度回调（用于文件上传）
     * @returns {Promise<any>}
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            data = null,
            provider = null,
            timeout = this.timeout,
            requestId = null,
            redirect = 'follow',
            signal = null,
            onProgress = null
        } = options;

        // 处理URL，如果是相对路径则拼接基础URL
        const resolvedURL = this.resolveURL(url);

        // 检查是否为 FormData
        const isFormData = data instanceof FormData || body instanceof FormData;
        
        // 构建请求配置
        let config = {
            url: resolvedURL,
            method: method.toUpperCase(),
            headers: this.buildHeaders(headers, provider, isFormData),
            body: null,
            provider,
            timeout,
            requestId,
            redirect,
            signal,
            isFormData
        };

        // 处理请求体
        if (data) {
            // 如果提供了 data，优先使用 data
            config.body = data;
            // 如果是 FormData，移除 Content-Type，让浏览器自动设置
            if (data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
        } else if (body !== null) {
            // 如果有 body，根据类型处理
            if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
                config.body = JSON.stringify(body);
            } else {
                config.body = body;
            }
        }

        // 请求拦截器
        config = await this.handleRequestInterceptor(config);

        // 创建 AbortController
        let abortController = null;
        let finalSignal = signal;
        
        if (!finalSignal && (timeout > 0 || requestId)) {
            abortController = this.createAbortController(timeout, requestId);
            finalSignal = abortController.signal;
        } else if (finalSignal && timeout > 0) {
            // 如果提供了 signal，但仍然需要超时，创建一个新的 controller
            abortController = this.createAbortController(timeout, requestId);
            // 如果原 signal 被中止，也要中止新的 controller
            finalSignal.addEventListener('abort', () => {
                if (abortController) {
                    abortController.abort();
                }
            });
        }

        try {
            // 发送请求
            const fetchOptions = {
                method: config.method,
                headers: config.headers,
                body: config.body,
                redirect: config.redirect,
                signal: finalSignal
            };

            const response = await fetch(config.url, fetchOptions);

            // 响应拦截器
            const interceptedResponse = await this.handleResponseInterceptor(response, config);

            // 检查响应状态
            if (!interceptedResponse.ok) {
                const error = await this.handleErrorResponse(interceptedResponse);
                throw await this.handleErrorInterceptor(error, config);
            }

            // 解析响应数据
            const data = await this.parseResponse(interceptedResponse);
            
            // 清除超时
            if (abortController && abortController._timeoutId) {
                clearTimeout(abortController._timeoutId);
            }
            if (requestId) {
                this.abortControllers.delete(requestId);
            }

            return data;
        } catch (error) {
            // 清除超时
            if (abortController && abortController._timeoutId) {
                clearTimeout(abortController._timeoutId);
            }
            if (requestId) {
                this.abortControllers.delete(requestId);
            }

            // 处理错误
            if (error.name === 'AbortError') {
                error.message = '请求已取消或超时';
            }
            
            throw await this.handleErrorInterceptor(error, config);
        }
    }

    /**
     * GET 请求
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * POST 请求
     * @param {string} url 请求 URL
     * @param {Object|FormData} data 请求数据
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async post(url, data = null, options = {}) {
        if (data instanceof FormData) {
            return this.request(url, { ...options, method: 'POST', data });
        }
        return this.request(url, { ...options, method: 'POST', body: data });
    }

    /**
     * PUT 请求
     * @param {string} url 请求 URL
     * @param {Object} data 请求数据
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async put(url, data = null, options = {}) {
        return this.request(url, { ...options, method: 'PUT', body: data });
    }

    /**
     * DELETE 请求
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    /**
     * PATCH 请求
     * @param {string} url 请求 URL
     * @param {Object} data 请求数据
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async patch(url, data = null, options = {}) {
        return this.request(url, { ...options, method: 'PATCH', body: data });
    }

    /**
     * 上传文件
     * @param {string} url 请求 URL
     * @param {FormData} formData FormData 对象
     * @param {Object} options 请求选项
     * @returns {Promise<any>}
     */
    async upload(url, formData, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            data: formData
        });
    }

    /**
     * 流式请求（用于 SSE 或流式响应）
     * @param {string} url 请求 URL
     * @param {Object} options 请求选项
     * @param {Function} options.onMessage 消息回调
     * @param {Function} options.onError 错误回调
     * @param {Function} options.onComplete 完成回调
     * @returns {Promise<Response>}
     */
    async stream(url, options = {}) {
        const {
            method = 'POST',
            headers = {},
            body = null,
            provider = null,
            timeout = 0, // 流式请求不设置超时
            signal = null,
            onMessage = null,
            onError = null,
            onComplete = null
        } = options;

        // 处理URL，如果是相对路径则拼接基础URL
        const resolvedURL = this.resolveURL(url);

        const config = {
            url: resolvedURL,
            method: method.toUpperCase(),
            headers: this.buildHeaders(headers, provider, false),
            body: body ? (typeof body === 'object' ? JSON.stringify(body) : body) : null,
            provider
        };

        try {
            const response = await fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.body,
                signal: signal || undefined
            });

            if (!response.ok) {
                const error = await this.handleErrorResponse(response);
                if (onError) onError(error);
                throw error;
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    if (onComplete) onComplete();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() && onMessage) {
                        try {
                            onMessage(line);
                        } catch (error) {
                            if (onError) onError(error);
                        }
                    }
                }
            }

            return response;
        } catch (error) {
            if (onError) onError(error);
            throw await this.handleErrorInterceptor(error, config);
        }
    }
}

/**
 * 创建 RequestUtil 实例的工厂函数
 * @param {Object} context 上下文对象（如 app 实例）
 * @returns {RequestUtil}
 */
export function createRequestUtil(context) {
    const getAcceptLanguage = context?.getAcceptLanguage?.bind(context) || (() => 'zh');
    const setAuthHeaders = context?.setAuthHeaders?.bind(context) || (() => {});
    
    return new RequestUtil({
        getAcceptLanguage,
        setAuthHeaders,
        timeout: 30000,
        onRequest: (config) => {
            // 可以在这里添加全局请求日志
            // console.log('请求:', config.method, config.url, config);
            return config;
        },
        onResponse: (response, config) => {
            // 可以在这里添加全局响应日志
            // console.log('响应:', response.status, response.statusText, config.url);
            return response;
        },
        onError: (error, config) => {
            // 可以在这里添加全局错误处理
            console.error('请求错误:', error.message, config?.url || '未知URL');
            return error;
        }
    });
}

