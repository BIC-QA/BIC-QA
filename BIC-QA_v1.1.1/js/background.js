// BIC-QA 简化版后台服务工作者
class BicQABackgroundSimple {
    constructor() {
        this.init();
    }

    init() {
        console.log('BIC-QA 简化版后台服务工作者初始化');
        
        // 监听插件安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 监听扩展图标点击事件
        chrome.action.onClicked.addListener((tab) => {
            this.handleExtensionClick(tab);
        });

        // 监听来自content script和popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // 设置默认配置
        this.setDefaultSettings();
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('BIC-QA 插件已安装');
        } else if (details.reason === 'update') {
            console.log('BIC-QA 插件已更新');
        }
    }

    handleExtensionClick(tab) {
        console.log('扩展图标被点击，在新标签页中打开BIC-QA popup页面');
        
        try {
            // 在新标签页中打开 pages/popup.html 页面
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
        console.log('收到消息:', request);
        
        switch (request.action) {
            case 'getSettings':
                this.getSettings(sendResponse);
                break;
            case 'saveSettings':
                this.saveSettings(request.settings, sendResponse);
                break;
            case 'openFullPage':
                this.openFullPage(sendResponse);
                break;
            case 'test':
                sendResponse({ success: true, message: '后台服务工作者正常运行' });
                break;
            default:
                sendResponse({ success: false, error: '未知操作' });
        }
    }

    openFullPage(sendResponse) {
        try {
            const bicQaUrl = chrome.runtime.getURL('pages/bic_qa_page.html');
            chrome.tabs.create({
                url: bicQaUrl,
                active: true
            }, (newTab) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: true, tabId: newTab.id });
                }
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
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
            console.log('默认设置已保存');
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
}

// 初始化后台服务工作者
new BicQABackgroundSimple(); 