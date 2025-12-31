/**
 * 导航管理器
 * 负责页面导航相关功能，如打开设置、打开全页等
 */
export function createNavigationManager(popup) {
    return {
        /**
         * 打开设置页面
         */
        openSettings(scrollToSection = null) {
            const settingsUrl = chrome.runtime.getURL('pages/settings.html');
            if (scrollToSection) {
                chrome.tabs.create({ url: `${settingsUrl}#${scrollToSection}` });
            } else {
                chrome.tabs.create({ url: settingsUrl });
            }
        },

        /**
         * 打开全页
         */
        openFullPage() {
            // 发送消息给background script来打开完整页面
            chrome.runtime.sendMessage({ action: 'openFullPage' }, (response) => {
                if (response && response.success) {
                    console.log('成功打开完整页面');
                } else {
                    console.error('打开完整页面失败:', response ? response.error : '未知错误');
                    // 如果消息发送失败，直接使用URL打开
                    const fullPageUrl = chrome.runtime.getURL('pages/bic_qa_page.html');
                    chrome.tabs.create({ url: fullPageUrl });
                }
            });
        }
    };
}

