import { BicQAPopup } from './app.js';

let appInstance = null;

function bindFullscreenListeners(instance) {
    const handler = () => {
        if (typeof instance.handleFullscreenChange === 'function') {
            instance.handleFullscreenChange();
        }
    };

    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('mozfullscreenchange', handler);
    document.addEventListener('MSFullscreenChange', handler);
}

// 更新页面favicon
function updateFavicon(isDarkMode) {
    try {
        const favicon = document.getElementById('favicon');
        if (favicon && typeof chrome !== 'undefined' && chrome.runtime) {
            const iconFileName = isDarkMode ? 'logo_dark-removebg-preview.png' : 'logo-removebg-preview.png';
            const iconPath = chrome.runtime.getURL(`icons/${iconFileName}`);
            favicon.href = iconPath;
            console.log('页面favicon已更新为:', iconPath, isDarkMode ? '(深色模式)' : '(浅色模式)');
        } else if (favicon) {
            // 备用方案：使用相对路径
            const iconPath = isDarkMode ? '../icons/logo_dark-removebg-preview.png' : '../icons/logo-removebg-preview.png';
            favicon.href = iconPath;
            console.log('页面favicon已更新为(相对路径):', iconPath);
        }
    } catch (error) {
        console.error('更新favicon失败:', error);
    }
}

// 检测系统主题并通知background更新图标
function detectAndUpdateIcon() {
    try {
        // 检测系统主题
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // 更新页面favicon
        updateFavicon(isDarkMode);
        // 更新GitHub图标主题
        if (window.bicQAPopup && window.bicQAPopup.updateGitHubIconTheme) {
            window.bicQAPopup.updateGitHubIconTheme(isDarkMode);
        }
        
        // 通知background更新扩展图标
        chrome.runtime.sendMessage({
            action: 'updateIcon',
            isDarkMode: isDarkMode
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('通知background更新图标失败:', chrome.runtime.lastError);
            } else {
                console.log('已通知background更新图标:', isDarkMode ? '深色模式' : '浅色模式');
            }
        });
        
        // 监听主题变化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const newIsDarkMode = e.matches;
            // 更新页面favicon
            updateFavicon(newIsDarkMode);
            // 更新更新图标主题
            if (window.bicQAPopup && window.bicQAPopup.updateUpdateIconTheme) {
                window.bicQAPopup.updateUpdateIconTheme();
            }
            // 更新github图标主题
            if (window.bicQAPopup && window.bicQAPopup.updateGitHubIconTheme) {
                window.bicQAPopup.updateGitHubIconTheme(newIsDarkMode);
            }
            // 通知background更新扩展图标
            chrome.runtime.sendMessage({
                action: 'updateIcon',
                isDarkMode: newIsDarkMode
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('通知background更新图标失败:', chrome.runtime.lastError);
                } else {
                    console.log('主题变化，已通知background更新图标:', newIsDarkMode ? '深色模式' : '浅色模式');
                }
            });
        });
    } catch (error) {
        console.error('检测主题失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new BicQAPopup();

    window.app = appInstance;
    window.bicQAPopup = appInstance;

    bindFullscreenListeners(appInstance);
    
    // 检测主题并更新图标（异步执行，不阻塞）
    setTimeout(() => {
        detectAndUpdateIcon();
    }, 0);

    // 初始化popup二维码加载（异步执行，不阻塞）
    setTimeout(() => {
        initPopupQRCodes();
    }, 0);
});

// 初始化popup页面的二维码加载
function initPopupQRCodes() {
    const popupQrCode = document.getElementById('popup-qr-code');
    if (!popupQrCode) {
        console.log('未找到popup二维码元素');
        return;
    }

    // 服务器二维码URL
    const serverQrUrl = 'https://res.bic-qa.com/static/publicNum-QRcode.jpg';
    // 本地备用二维码URL
    const localQrUrl = '../icons/publicNum-QRcode.jpg';

    // 检查服务器图片是否可访问
    function checkImageAccess(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            // 设置5秒超时
            setTimeout(() => resolve(false), 5000);
        });
    }

    // 加载二维码
    async function loadQrcode() {
        try {
            console.log('检查服务器二维码:', serverQrUrl);
            const isServerAccessible = await checkImageAccess(serverQrUrl);

            if (isServerAccessible) {
                console.log('服务器二维码可访问，使用服务器图片');
                popupQrCode.src = serverQrUrl;
                popupQrCode.onerror = function() {
                    console.log('服务器图片加载失败，回退到本地图片');
                    this.src = localQrUrl;
                };
            } else {
                console.log('服务器二维码不可访问，使用本地图片');
                popupQrCode.src = localQrUrl;
            }
        } catch (error) {
            console.error('加载二维码失败:', error);
            popupQrCode.src = localQrUrl;
        }
    }

    // 执行加载
    loadQrcode();
}

export { appInstance as app };


