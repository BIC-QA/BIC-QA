// 使用说明按钮事件处理
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            try {
                const userGuideUrl = chrome.runtime.getURL('user-guide.html');
                chrome.tabs.create({
                    url: userGuideUrl,
                    active: true
                });
            } catch (error) {
                console.error('打开使用说明页面失败:', error);
                window.open('user-guide.html', '_blank');
            }
        });
    }
    
    // 移除全屏按钮事件处理，因为fullscreenBtn元素已从HTML中删除
    // const fullscreenBtn = document.getElementById('fullscreenBtn');
    // if (fullscreenBtn) {
    //     // 移除可能存在的旧事件监听器
    //     const newFullscreenBtn = fullscreenBtn.cloneNode(true);
    //     fullscreenBtn.parentNode.replaceChild(newFullscreenBtn, fullscreenBtn);
    //     
    //     newFullscreenBtn.addEventListener('click', async () => {
    //         try {
    //             // 检查是否已经在全屏模式
    //             const isFullscreen = !!(document.fullscreenElement || 
    //                                   document.webkitFullscreenElement || 
    //                                   document.mozFullScreenElement || 
    //                                   document.msFullscreenElement);
    //             
    //             if (isFullscreen) {
    //                 // 退出全屏
    //                 if (document.exitFullscreen) {
    //                     await document.exitFullscreen();
    //                 } else if (document.webkitExitFullscreen) {
    //                     await document.webkitExitFullscreen();
    //                 } else if (document.mozCancelFullScreen) {
    //                     await document.mozCancelFullScreen();
    //                 } else if (document.msExitFullscreen) {
    //                     await document.msExitFullscreen();
    //                 }
    //             } else {
    //                 // 进入全屏 - 优先使用浏览器全屏API（F11效果）
    //                 if (document.documentElement.requestFullscreen) {
    //                     await document.documentElement.requestFullscreen();
    //                 } else if (document.documentElement.webkitRequestFullscreen) {
    //                     await document.documentElement.webkitRequestFullscreen();
    //                 } else if (document.documentElement.mozRequestFullScreen) {
    //                     await document.documentElement.mozRequestFullScreen();
    //                 } else if (document.documentElement.msRequestFullscreen) {
    //                     await document.documentElement.msRequestFullscreen();
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('全屏切换失败:', error);
    //             // 如果浏览器全屏失败，显示错误信息
    //             alert('全屏切换失败: ' + error.message);
    //         }
    //     });
    // }
}); 