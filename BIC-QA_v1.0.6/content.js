// BIC-QA 内容脚本
class BicQAContent {
    constructor() {
        this.init();
    }

    init() {
        console.log('BIC-QA Content Script 已加载');
        
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('收到消息:', request);
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 添加右键菜单功能
        this.addContextMenu();
        
        // 添加快捷键支持
        this.addKeyboardShortcuts();
    }

    handleMessage(request, sender, sendResponse) {
        console.log('处理消息:', request.action);
        
        switch (request.action) {
            case 'test':
                console.log('收到测试消息');
                sendResponse({ success: true, message: 'Content script正常工作' });
                break;
            case 'getPageContent':
                this.getPageContent(request.question, sendResponse);
                break;
            case 'getPageSummary':
                this.getPageSummary(sendResponse);
                break;
            case 'translateSelection':
                this.getSelectedText(sendResponse);
                break;
            default:
                console.log('未知操作:', request.action);
                sendResponse({ success: false, error: '未知操作' });
        }
    }

    getPageContent(question, sendResponse) {
        try {
            const pageContent = this.extractPageContent();
            sendResponse({
                success: true,
                pageContent: pageContent,
                question: question
            });
        } catch (error) {
            console.error('获取页面内容失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    getPageSummary(sendResponse) {
        try {
            const pageContent = this.extractPageContent();
            sendResponse({
                success: true,
                pageContent: pageContent
            });
        } catch (error) {
            console.error('获取页面摘要失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    getSelectedText(sendResponse) {
        const selectedText = window.getSelection().toString().trim();
        sendResponse({
            success: true,
            selectedText: selectedText
        });
    }

    extractPageContent() {
        // 提取页面主要内容
        const content = {
            title: this.getPageTitle(),
            text: this.getMainText(),
            links: this.getLinks(),
            images: this.getImages(),
            metadata: this.getMetadata()
        };

        return JSON.stringify(content);
    }

    getPageTitle() {
        return document.title || '';
    }

    getMainText() {
        // 尝试获取主要内容区域的文本
        const selectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            '.post-content',
            '.entry-content'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return this.cleanText(element.textContent);
            }
        }

        // 如果没有找到主要内容区域，获取body文本
        return this.cleanText(document.body.textContent);
    }

    getLinks() {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links.slice(0, 10).map(link => ({
            text: link.textContent.trim(),
            href: link.href
        }));
    }

    getImages() {
        const images = Array.from(document.querySelectorAll('img[src]'));
        return images.slice(0, 5).map(img => ({
            alt: img.alt || '',
            src: img.src
        }));
    }

    getMetadata() {
        const metadata = {};
        
        // 获取meta标签信息
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
                metadata[name] = content;
            }
        });

        return metadata;
    }

    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')  // 合并多个空白字符
            .replace(/\n+/g, '\n') // 合并多个换行符
            .trim()
            .substring(0, 5000);   // 限制长度
    }

    addContextMenu() {
        // 添加自定义右键菜单
        document.addEventListener('contextmenu', (e) => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                // 可以在这里添加自定义右键菜单项
                // 目前只是记录选中的文本
                console.log('选中文本:', selectedText);
            }
        });
    }

    addKeyboardShortcuts() {
        // 添加快捷键支持
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+Q: 快速提问
            if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
                e.preventDefault();
                this.quickQuestion();
            }
            
            // Ctrl+Shift+T: 翻译选中文本
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.quickTranslate();
            }
        });
    }

    quickQuestion() {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            // 发送消息到background script处理
            chrome.runtime.sendMessage({
                action: 'quickQuestion',
                text: selectedText
            });
        }
    }

    quickTranslate() {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            // 发送消息到background script处理
            chrome.runtime.sendMessage({
                action: 'quickTranslate',
                text: selectedText
            });
        }
    }

    // 高亮显示文本
    highlightText(text, color = '#ffff00') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.backgroundColor = color;
            span.style.color = '#000';
            range.surroundContents(span);
        }
    }

    // 移除高亮
    removeHighlights() {
        const highlights = document.querySelectorAll('span[style*="background-color"]');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }
}

// 初始化内容脚本
new BicQAContent(); 