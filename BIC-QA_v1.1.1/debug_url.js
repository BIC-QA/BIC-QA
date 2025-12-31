// 调试URL处理逻辑
function processServiceUrl(serviceUrl) {
    let processedUrl = serviceUrl;

    // 如果URL不包含路径（只有协议、主机和端口），添加默认API路径
    if (serviceUrl && typeof serviceUrl === 'string') {
        // 规范化URL格式（处理不完整的协议）
        let normalizedUrl = serviceUrl.trim();
        if (normalizedUrl.startsWith('http:') && !normalizedUrl.startsWith('http://')) {
            normalizedUrl = normalizedUrl.replace('http:', 'http://');
        } else if (normalizedUrl.startsWith('https:') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = normalizedUrl.replace('https:', 'https://');
        }

        try {
            const urlObj = new URL(normalizedUrl);
            // 如果pathname是/或空，说明用户只输入了基础URL，需要添加默认路径
            if (!urlObj.pathname || urlObj.pathname === '/' || urlObj.pathname.trim() === '') {
                processedUrl = normalizedUrl.replace(/\/+$/, '') + '/api/chat/message';
                console.log('自动添加默认API路径:', serviceUrl, '->', processedUrl);
            } else {
                processedUrl = normalizedUrl;
                console.log('URL已经包含路径，保持不变:', serviceUrl);
            }
        } catch (e) {
            // 如果URL解析失败，尝试简单处理
            console.warn('URL解析失败，尝试简单处理:', e);
            if (!normalizedUrl.includes('/api/chat/message') && !normalizedUrl.includes('/knowledge')) {
                const trimmedUrl = normalizedUrl.replace(/\/+$/, '');
                processedUrl = trimmedUrl + '/api/chat/message';
                console.log('自动添加默认API路径（异常处理）:', serviceUrl, '->', processedUrl);
            } else {
                processedUrl = normalizedUrl;
                console.log('URL已经包含API路径，保持不变:', serviceUrl);
            }
        }
    }

    return processedUrl;
}

// 测试用例
console.log('测试URL处理:');
console.log('输入: http://192.168.32.98:8180');
console.log('输出:', processServiceUrl('http://192.168.32.98:8180'));
console.log('');

console.log('输入: http:192.168.32.98:8180');
console.log('输出:', processServiceUrl('http:192.168.32.98:8180'));
console.log('');

console.log('输入: 192.168.32.98:8180');
console.log('输出:', processServiceUrl('192.168.32.98:8180'));
console.log('');

console.log('输入: http://192.168.32.98:8180/api/chat/message');
console.log('输出:', processServiceUrl('http://192.168.32.98:8180/api/chat/message'));
