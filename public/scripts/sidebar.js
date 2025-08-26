// 侧边栏功能脚本

// 初始化右侧侧边栏
function initRightSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const rightSidebar = document.querySelector('.right-sidebar');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    // 检查本地存储中的侧边栏状态
    const sidebarActive = localStorage.getItem('sidebarActive') === 'true';
    
    // 根据存储的状态设置侧边栏
    if (sidebarActive) {
        rightSidebar.classList.add('active');
        toggleIcon.style.transform = 'rotate(180deg)';
    }
    
    // 添加切换事件
    sidebarToggle.addEventListener('click', function() {
        rightSidebar.classList.toggle('active');
        const isActive = rightSidebar.classList.contains('active');
        
        // 旋转图标
        if (isActive) {
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            toggleIcon.style.transform = 'rotate(0deg)';
        }
        
        // 保存状态到本地存储
        localStorage.setItem('sidebarActive', isActive);
    });
}

// 当DOM加载完成后初始化侧边栏
document.addEventListener('DOMContentLoaded', function() {
    initRightSidebar();
});