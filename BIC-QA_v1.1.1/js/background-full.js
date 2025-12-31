// BIC-QA 后台服务工作者
class BicQABackground {
    constructor() {
        this.init();
    }

    init() {
        // 监听插件安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 移除扩展图标点击事件监听器，让扩展使用默认的popup行为
        // chrome.action.onClicked.addListener((tab) => {
        //     this.handleExtensionClick(tab);
        // });

        // 监听来自content script和popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // 监听标签页更新事件
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // 设置默认配置
        this.setDefaultSettings();
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('BIC-QA 插件已安装');
            this.showWelcomePage();
        } else if (details.reason === 'update') {
            console.log('BIC-QA 插件已更新');
        }
    }

    handleExtensionClick(tab) {
        // 此方法已不再使用，因为我们现在使用默认的popup行为
        console.log('扩展图标被点击，打开新标签页');
        
        try {
            // 在新标签页中打开
            const popupUrl = chrome.runtime.getURL('pages/popup.html');
            console.log('要打开的URL:', popupUrl);
            
            chrome.tabs.create({
                url: popupUrl,
                active: true
            }, (newTab) => {
                if (chrome.runtime.lastError) {
                    console.error('创建标签页失败:', chrome.runtime.lastError);
                } else {
                    console.log('成功创建新标签页:', newTab);
                }
            });
        } catch (error) {
            console.error('handleExtensionClick 错误:', error);
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'quickQuestion':
                this.handleQuickQuestion(request, sender, sendResponse);
                break;
            case 'quickTranslate':
                this.handleQuickTranslate(request, sender, sendResponse);
                break;
            case 'getSettings':
                this.getSettings(sendResponse);
                break;
            case 'saveSettings':
                this.saveSettings(request.settings, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: '未知操作' });
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // 页面加载完成后的处理
            this.processPageLoad(tabId, tab);
        }
    }

    async handleQuickQuestion(request, sender, sendResponse) {
        try {
            // 这里可以集成实际的AI API
            const answer = await this.processQuickQuestion(request.text);
            
            // 显示通知
            this.showNotification('BIC-QA 回答', answer.substring(0, 100) + '...');
            
            sendResponse({ success: true, answer: answer });
        } catch (error) {
            console.error('快速提问处理失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleQuickTranslate(request, sender, sendResponse) {
        try {
            const translation = await this.translateText(request.text);
            
            // 显示通知
            this.showNotification('BIC-QA 翻译', translation);
            
            sendResponse({ success: true, translation: translation });
        } catch (error) {
            console.error('快速翻译处理失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async processQuickQuestion(text) {
        // 模拟AI处理
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return `关于"${text}"的回答：\n\n这是一个模拟的AI回答。在实际应用中，这里会调用真实的AI API来生成回答。`;
    }

    async translateText(text) {
        // 模拟翻译
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return `[翻译] ${text}`;
    }

    showNotification(title, message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/logo.png',
            title: title,
            message: message
        });
    }

    showWelcomePage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }

    processPageLoad(tabId, tab) {
        // 页面加载完成后的处理逻辑
        console.log(`页面加载完成: ${tab.url}`);
        
        // 可以在这里添加页面分析、内容提取等功能
    }

    async setDefaultSettings() {
        const defaultSettings = {
            apiKey: '',
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            language: 'zh-CN',
            theme: 'light',
            autoTranslate: false,
            enableNotifications: true
        };

        try {
            await chrome.storage.sync.set(defaultSettings);
        } catch (error) {
            console.error('设置默认配置失败:', error);
        }
    }

    async getSettings(sendResponse) {
        try {
            const settings = await chrome.storage.sync.get([
                'apiKey',
                'apiEndpoint',
                'language',
                'theme',
                'autoTranslate',
                'enableNotifications'
            ]);
            sendResponse({ success: true, settings: settings });
        } catch (error) {
            console.error('获取设置失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async saveSettings(settings, sendResponse) {
        try {
            await chrome.storage.sync.set(settings);
            sendResponse({ success: true });
        } catch (error) {
            console.error('保存设置失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 工具方法：获取当前活动标签页
    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    // 工具方法：注入脚本到当前标签页
    async injectScript(tabId, script) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: script
            });
        } catch (error) {
            console.error('脚本注入失败:', error);
        }
    }

    // 工具方法：发送消息到content script
    async sendMessageToContent(tabId, message) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, message);
            return response;
        } catch (error) {
            console.error('发送消息到content script失败:', error);
            return null;
        }
    }
}

// 初始化后台服务工作者
new BicQABackground(); 