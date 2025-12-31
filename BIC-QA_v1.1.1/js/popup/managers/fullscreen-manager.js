// 全屏管理器
export function createFullscreenManager(popup) {
    return {
        initFullscreenMode() {
            // 检查是否支持全屏API
            popup.supportsFullscreen = document.fullscreenEnabled ||
                document.webkitFullscreenEnabled ||
                document.mozFullScreenEnabled ||
                document.msFullscreenEnabled;

            // 检查是否已经是全屏模式
            if (window.location.search.includes('fullscreen=true')) {
                popup.isFullscreenMode = true;
                document.body.classList.add('fullscreen-mode');
            }
        },

        async toggleFullscreen() {
            try {
                // 检查是否已经在全屏模式
                if (popup.isFullscreenMode) {
                    // 退出全屏模式
                    popup.isFullscreenMode = false;
                    document.body.classList.remove('fullscreen-mode');
                    return;
                }

                // 进入全屏模式
                popup.isFullscreenMode = true;
                document.body.classList.add('fullscreen-mode');

                // 如果是popup模式，尝试打开新窗口
                if (popup.isPopupMode) {
                    try {
                        // 获取当前popup的URL
                        const currentUrl = window.location.href;
                        const fullscreenUrl = currentUrl.replace('pages/popup.html', 'pages/popup.html?fullscreen=true');

                        // 打开新窗口
                        const newWindow = window.open(fullscreenUrl, 'bic-qa-fullscreen',
                            'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes');

                        if (newWindow) {
                            // 关闭当前popup
                            window.close();
                        } else {
                            // 如果无法打开新窗口，使用CSS全屏
                            popup.showMessage(popup.t('popup.message.openFullscreenFallback'), 'info');
                        }
                    } catch (error) {
                        console.error('打开全屏窗口失败:', error);
                        popup.showMessage(popup.t('popup.message.openFullscreenFailed'), 'error');
                    }
                } else {
                    // 非popup模式，使用浏览器全屏API
                    if (popup.supportsFullscreen) {
                        if (document.documentElement.requestFullscreen) {
                            await document.documentElement.requestFullscreen();
                        } else if (document.documentElement.webkitRequestFullscreen) {
                            await document.documentElement.webkitRequestFullscreen();
                        } else if (document.documentElement.mozRequestFullScreen) {
                            await document.documentElement.mozRequestFullScreen();
                        } else if (document.documentElement.msRequestFullscreen) {
                            await document.documentElement.msRequestFullscreen();
                        }
                    }
                }
            } catch (error) {
                console.error('切换全屏模式失败:', error);
                popup.showMessage(popup.t('popup.message.toggleFullscreenFailed'), 'error');
            }
        },

        handleFullscreenChange() {
            if (!document.fullscreenElement &&
                !document.webkitFullscreenElement &&
                !document.mozFullScreenElement &&
                !document.msFullscreenElement) {
                document.body.classList.remove('fullscreen-mode');
            }
        }
    };
}

