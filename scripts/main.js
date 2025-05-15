// 应用程序入口
document.addEventListener('DOMContentLoaded', () => {
    console.log("应用程序初始化...");
    
    // 添加全局错误处理
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("全局错误:", { message, source, lineno, colno, error });
        return false;
    };
    
    // 处理未捕获的Promise错误
    window.addEventListener('unhandledrejection', function(event) {
        console.error("未处理的Promise错误:", event.reason);
        
        // 尝试处理"消息通道关闭"错误
        if (event.reason && event.reason.message && 
            event.reason.message.includes('message channel closed')) {
            console.log("捕获到消息通道关闭错误，尝试处理...");
            
            // 重新初始化Firebase连接
            if (typeof window.initFirebase === 'function') {
                setTimeout(() => {
                    console.log("尝试重新初始化Firebase连接...");
                    window.initFirebase();
                }, 1000);
            }
            
            // 防止错误传播
            event.preventDefault();
            event.stopPropagation();
        }
    });
    
    // 创建默认头像
    createDefaultAvatars();
    
    // 检查应用程序状态
    checkApplicationStatus();
    
    // 显示应用程序信息
    console.log('多人在线像素涂鸦白板 v1.0.0');
    if (window.CANVAS_CONFIG) {
        console.log('画布大小: ' + CANVAS_CONFIG.width + 'x' + CANVAS_CONFIG.height);
        console.log('像素大小: ' + CANVAS_CONFIG.pixelSize + 'px');
        console.log('绘制限制: 每' + CANVAS_CONFIG.refreshPeriod + '秒' + CANVAS_CONFIG.drawLimit + '次操作');
    } else {
        console.warn('CANVAS_CONFIG未定义，无法显示画布信息');
    }
});

// 检查应用程序状态
function checkApplicationStatus() {
    // 延迟执行以确保所有初始化完成
    setTimeout(() => {
        console.log("检查应用程序状态...");
        
        // 检查Firebase状态
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error("Firebase未初始化!");
            
            // 尝试初始化Firebase
            if (typeof window.initFirebase === 'function') {
                console.log("尝试初始化Firebase...");
                window.initFirebase();
            } else {
                // 切换到离线模式
                window.OFFLINE_MODE = true;
            }
        }
        
        // 检查用户管理器
        if (typeof window.userManager === 'undefined' || window.userManager === null) {
            console.error("userManager未初始化!");
        }
        
        // 检查画布管理器
        if (typeof window.canvasManager === 'undefined' || window.canvasManager === null) {
            console.warn("canvasManager未初始化");
        }
        
        // 如果离线模式已激活，显示全局提示
        if (window.OFFLINE_MODE && !document.getElementById('global-offline-notice')) {
            const offlineNotice = document.createElement('div');
            offlineNotice.id = 'global-offline-notice';
            offlineNotice.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#ff9800;color:white;text-align:center;padding:5px;z-index:9999;font-size:14px;';
            offlineNotice.textContent = '应用程序处于离线模式 - 您的更改不会同步到服务器';
            document.body.appendChild(offlineNotice);
            
            // 添加重试按钮
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '重试连接';
            retryBtn.style.cssText = 'margin-left:10px;padding:2px 8px;border:none;border-radius:3px;background:white;color:#ff9800;cursor:pointer;';
            retryBtn.onclick = function() {
                if (typeof window.initFirebase === 'function') {
                    offlineNotice.textContent = '正在尝试重新连接...';
                    setTimeout(() => {
                        window.OFFLINE_MODE = false; // 重置离线模式
                        window.initFirebase(); // 重新初始化
                        location.reload(); // 重新加载页面
                    }, 1000);
                }
            };
            offlineNotice.appendChild(retryBtn);
        }
        
        // 检查登录按钮是否正常
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn && !loginBtn._hasClickEvent) {
            console.log("检测到登录按钮未绑定事件，尝试修复");
            
            // 手动绑定点击事件
            loginBtn.addEventListener('click', function(e) {
                console.log("登录按钮被点击（手动绑定）");
                
                const nickname = document.getElementById('nickname').value.trim();
                if (!nickname) {
                    alert('请输入昵称!');
                    return;
                }
                
                const selectedAvatar = document.querySelector('.avatar-option.selected');
                if (!selectedAvatar) {
                    alert('请选择头像!');
                    return;
                }
                
                if (window.userManager) {
                    window.userManager.loginUser();
                } else {
                    alert('系统初始化中，请稍后再试');
                }
            });
            
            // 标记按钮已绑定事件
            loginBtn._hasClickEvent = true;
            console.log("已手动为登录按钮绑定事件");
        } else if (loginBtn && loginBtn._hasClickEvent) {
            console.log("登录按钮已有事件绑定，无需修复");
        }
    }, 2000);
}

// 创建默认头像
function createDefaultAvatars() {
    // 不再替换头像，使用真实的PNG图片
    console.log("使用真实PNG头像图片，不再创建SVG默认头像");
    
    // 旧的SVG头像代码已注释掉
    /*
    const avatarUrls = {
        'avatar1.png': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff5252"/><circle cx="40" cy="40" r="5" fill="white"/><circle cx="60" cy="40" r="5" fill="white"/><path d="M 35 65 A 15 10 0 0 0 65 65" stroke="white" fill="transparent" stroke-width="3"/></svg>',
        'avatar2.png': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234caf50"/><circle cx="40" cy="40" r="5" fill="white"/><circle cx="60" cy="40" r="5" fill="white"/><path d="M 35 65 A 15 10 0 0 0 65 65" stroke="white" fill="transparent" stroke-width="3"/></svg>',
        'avatar3.png': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%232196f3"/><circle cx="40" cy="40" r="5" fill="white"/><circle cx="60" cy="40" r="5" fill="white"/><path d="M 35 65 A 15 10 0 0 0 65 65" stroke="white" fill="transparent" stroke-width="3"/></svg>'
    };
    
    try {
        // 替换头像图片的src属性
        document.querySelectorAll('.avatar-option').forEach(avatar => {
            const avatarFile = avatar.getAttribute('src').split('/').pop();
            if (avatarUrls[avatarFile]) {
                avatar.src = avatarUrls[avatarFile];
            }
        });
        
        console.log("默认头像已创建");
    } catch (error) {
        console.error("创建默认头像失败:", error);
    }
    */
} 