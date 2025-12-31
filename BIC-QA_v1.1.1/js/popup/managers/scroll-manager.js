// 滚动管理器
export function createScrollManager(popup) {
    return {
        handleScroll() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const showBackToTop = scrollTop > 300; // 滚动超过300px时显示按钮

            if (showBackToTop) {
                popup.backToTopBtn.style.display = 'flex';
            } else {
                popup.backToTopBtn.style.display = 'none';
            }
        },

        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            // 在弹出窗口模式下，滚动到提问区域
            if (popup.isPopupMode) {
                setTimeout(() => {
                    popup.questionInput.focus();
                }, 500);
            }
        }
    };
}

