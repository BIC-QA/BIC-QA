// BIC-QA 简化版后台服务工作者
class BicQABackgroundSimple {
    constructor() {
        // 预计算 popup URL，避免在点击时计算
        this.popupUrl = chrome.runtime.getURL('pages/popup.html');
        this.init();
    }

    init() {
        // 最优先注册点击事件监听器，确保快速响应
        // 必须在任何其他操作之前注册
        chrome.action.onClicked.addListener((tab) => {
            this.handleExtensionClick(tab);
        });

        // 监听插件安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 监听来自content script和popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // 监听主题变化（通过storage变化来触发）
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync') {
                if (changes.theme || changes.systemTheme) {
                    this.updateIconBasedOnTheme();
                }
            }
        });
        
        // 监听标签页更新，当有新标签页打开时重新检测主题
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
                // 延迟检测，避免频繁更新
                setTimeout(() => {
                    this.detectSystemThemeAndUpdateIcon();
                }, 1000);
            }
        });

        // 将非关键初始化操作推迟，使用更长的延迟确保不阻塞点击事件
        // 使用 requestIdleCallback 或更长的延迟
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => {
                this.setDefaultSettings();
                this.detectAndSetIconOnStartup();
            }, { timeout: 2000 });
        } else {
            // 延迟更长时间，确保点击事件优先处理
            setTimeout(() => {
                this.setDefaultSettings();
                this.detectAndSetIconOnStartup();
            }, 100);
        }
        
        // 保持 Service Worker 活跃，通过定期发送消息
        // 这可以减少 Service Worker 唤醒延迟
        this.keepAlive();
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('BIC-QA 插件已安装');
        } else if (details.reason === 'update') {
            console.log('BIC-QA 插件已更新');
        }
    }

    handleExtensionClick(tab) {
        // 立即响应点击事件，使用预计算的 URL，避免任何计算
        // 直接创建标签页，不执行任何其他操作
        chrome.tabs.create({
            url: this.popupUrl,
            active: true
        });
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
            case 'updateIcon':
                // 从popup接收主题信息并更新图标
                const isDarkMode = request.isDarkMode;
                // 保存系统主题到storage
                chrome.storage.sync.set({ systemTheme: isDarkMode ? 'dark' : 'light' });
                this.updateIconFromTheme(isDarkMode);
                sendResponse({ success: true });
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
        // 检查设置是否已存在，避免不必要的存储操作
        try {
            const existing = await chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'language', 'theme']);
            // 如果关键设置已存在，跳过设置默认值
            if (existing.apiKey !== undefined || existing.apiEndpoint !== undefined) {
                return;
            }
        } catch (error) {
            console.error('检查现有设置失败:', error);
        }

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
            // 如果主题设置改变，更新图标
            if (settings.theme) {
                this.updateIconBasedOnTheme();
            }
            sendResponse({ success: true });
        } catch (error) {
            console.error('保存设置失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 启动时检测并设置图标
     */
    async detectAndSetIconOnStartup() {
        try {
            // 首先尝试从storage获取保存的系统主题
            const result = await chrome.storage.sync.get(['systemTheme', 'theme']);
            
            if (result.systemTheme !== undefined) {
                // 如果有保存的系统主题，直接使用（快速路径）
                await this.updateIconFromTheme(result.systemTheme === 'dark');
                console.log('使用保存的系统主题:', result.systemTheme);
            } else {
                // 如果没有保存的主题，延迟检测，避免阻塞启动
                setTimeout(async () => {
                    await this.detectSystemThemeAndUpdateIcon();
                }, 100);
            }
        } catch (error) {
            console.error('启动时检测主题失败:', error);
            // 失败时使用默认浅色图标
            await this.updateIconFromTheme(false);
        }
    }

    /**
     * 检测系统主题并更新图标
     */
    async detectSystemThemeAndUpdateIcon() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            let isDarkMode = false;
            
            if (tabs.length > 0) {
                try {
                    // 尝试注入脚本检测系统主题
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {
                            return window.matchMedia('(prefers-color-scheme: dark)').matches;
                        }
                    });
                    if (results && results[0] && results[0].result !== undefined) {
                        isDarkMode = results[0].result;
                        // 保存检测到的系统主题到storage
                        chrome.storage.sync.set({ systemTheme: isDarkMode ? 'dark' : 'light' });
                        console.log('检测到系统主题:', isDarkMode ? '深色' : '浅色');
                    }
                } catch (error) {
                    // 如果无法注入脚本，尝试查询其他标签页
                    console.log('无法在当前标签页检测主题，尝试查询其他标签页');
                    const allTabs = await chrome.tabs.query({});
                    for (const tab of allTabs) {
                        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                            try {
                                const results = await chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    func: () => {
                                        return window.matchMedia('(prefers-color-scheme: dark)').matches;
                                    }
                                });
                                if (results && results[0] && results[0].result !== undefined) {
                                    isDarkMode = results[0].result;
                                    chrome.storage.sync.set({ systemTheme: isDarkMode ? 'dark' : 'light' });
                                    console.log('从其他标签页检测到系统主题:', isDarkMode ? '深色' : '浅色');
                                    break;
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                }
            }
            
            await this.updateIconFromTheme(isDarkMode);
        } catch (error) {
            // 静默处理错误，不阻塞功能
            if (error.message && !error.message.includes('Icon invalid')) {
                console.warn('检测系统主题失败:', error.message);
            }
        }
    }

    /**
     * 根据系统主题更新扩展图标
     */
    async updateIconBasedOnTheme() {
        try {
            // 首先尝试从storage获取用户设置的主题
            const result = await chrome.storage.sync.get(['theme', 'systemTheme']);
            let isDarkMode = false;
            
            if (result.theme === 'dark') {
                isDarkMode = true;
            } else if (result.theme === 'light') {
                isDarkMode = false;
            } else if (result.systemTheme === 'dark') {
                isDarkMode = true;
            } else if (result.systemTheme === 'light') {
                isDarkMode = false;
            } else {
                // 如果没有设置主题，尝试检测系统主题
                await this.detectSystemThemeAndUpdateIcon();
                return;
            }
            
            await this.updateIconFromTheme(isDarkMode);
        } catch (error) {
            console.error('更新扩展图标失败:', error);
            // 失败时使用默认浅色图标
            await this.updateIconFromTheme(false);
        }
    }

    /**
     * 根据主题模式更新图标
     * @param {boolean} isDarkMode - 是否为深色模式
     */
    async updateIconFromTheme(isDarkMode) {
        // 使用回调方式设置图标，以便检查 chrome.runtime.lastError
        return new Promise((resolve) => {
            const iconPath = 'icons/logo_dark-removebg-preview.png';
            
            chrome.action.setIcon({
                path: {
                    16: iconPath,
                    32: iconPath,
                    48: iconPath,
                    128: iconPath
                }
            }, () => {
                // 检查是否有错误
                if (chrome.runtime.lastError) {
                    // 静默处理 "Icon invalid" 错误，这是 Chrome 的已知问题
                    // 当图标已经在 manifest.json 中定义时，有时会出现此错误
                    if (chrome.runtime.lastError.message !== 'Icon invalid.') {
                        console.warn('设置图标时出现错误:', chrome.runtime.lastError.message);
                    }
                    resolve();
                    return;
                }
                
                console.log(`扩展图标已更新为: ${iconPath} (${isDarkMode ? '深色' : '浅色'}模式)`);
                resolve();
            });
        });
    }

    /**
     * 保持 Service Worker 活跃，减少唤醒延迟
     */
    keepAlive() {
        // 每 20 秒发送一次消息给自己，保持 Service Worker 活跃
        // 注意：这只是一个轻量级操作，不会显著影响性能
        setInterval(() => {
            // 使用 chrome.storage 的轻量级操作来保持活跃
            chrome.storage.local.get(['keepAlive'], () => {
                // 忽略结果，只是为了保持 Service Worker 活跃
            });
        }, 20000);
    }
}

// 初始化后台服务工作者
new BicQABackgroundSimple(); 