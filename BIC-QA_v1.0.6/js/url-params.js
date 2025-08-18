// URL参数处理脚本
document.addEventListener('DOMContentLoaded', () => {
    // 处理URL参数，滚动到指定位置
    const urlParams = new URLSearchParams(window.location.search);
    const scrollTo = urlParams.get('scrollTo');
    if (scrollTo) {
        setTimeout(() => {
            const element = document.getElementById(scrollTo);
            if (element) {
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // 添加高亮效果
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = '#fff3cd';
                
                // 3秒后移除高亮
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 3000);
            }
        }, 500);
    }
}); 