// 首先定义全局配置
// 画布配置
window.CANVAS_CONFIG = {
    width: 3000,
    height: 3000,
    pixelSize: 10, // 像素点大小
    drawLimit: 30, // 每分钟允许绘制次数
    refreshPeriod: 60, // 刷新周期（秒）
};

// 管理员ID列表（用于识别管理员）
window.ADMIN_IDS = ["17ce779f-ae34-477d-b2c6-d973565c3f55"]; // 使用通配符，所有用户都可以成为管理员（测试用）

// 创建UUID工具函数 - 在全局作用域定义
window.generateUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Firebase配置
const firebaseConfig = {
    apiKey: "AIzaSyD4FhGQNWQjlg6YAW9Mh3jHn3jLenNF5U0",
    authDomain: "lazymice-web-game.firebaseapp.com",
    projectId: "lazymice-web-game",
    storageBucket: "lazymice-web-game.firebasestorage.app",
    messagingSenderId: "1028577806755",
    appId: "1:1028577806755:web:f7216cac01d9290826f216",
    measurementId: "G-E3MJJZHPPR",
    databaseURL: "https://lazymice-web-game-default-rtdb.asia-southeast1.firebasedatabase.app" // 添加数据库URL
};

// 离线模式标志 - 当API密钥无效或网络不可用时使用
window.OFFLINE_MODE = false;

// 连接尝试次数
window.connectionAttempts = 0;
window.maxConnectionAttempts = 3;

console.log("初始化Firebase...");

// 初始化状态标志
window.firebaseInitialized = false;

// 初始化Firebase函数
window.initFirebase = function() {
    if (window.firebaseInitialized) {
        console.log("Firebase已经初始化，跳过");
        return true;
    }
    
    try {
        // 检查Firebase是否已经初始化
        if (!firebase.apps.length) {
            // 初始化Firebase
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase已初始化");
            
            // 初始化Analytics（如果存在）
            if (typeof firebase.analytics === 'function') {
                window.analytics = firebase.analytics();
                console.log("Firebase Analytics已初始化");
            }
        } else {
            console.log("Firebase已经初始化，跳过");
        }
        
        // 导出Firebase实例到全局变量
        window.db = firebase.database();
        window.auth = firebase.auth();
        
        console.log("Firebase数据库和认证服务已就绪");
        
        // 即使匿名身份验证失败也继续初始化其他部分
        window.firebaseInitialized = true;

        // 设置数据库持久性，防止消息通道关闭错误
        try {
            window.db.goOnline();
            // 设置数据库保持连接
            window.keepAliveRef = window.db.ref('.info/connected');
            window.db.ref('.info/connected').on('value', function(snap) {
                if (snap.val() === true) {
                    console.log("已连接到Firebase");
                    // 重置连接尝试次数
                    window.connectionAttempts = 0;
                    window.OFFLINE_MODE = false;
                    
                    // 显示连接恢复通知
                    if (document.getElementById('offline-status')) {
                        document.getElementById('offline-status').remove();
                    }
                    
                    // 如果存在全局离线通知，则移除
                    if (document.getElementById('global-offline-notice')) {
                        document.getElementById('global-offline-notice').remove();
                    }
                    
                    // 触发连接恢复事件
                    document.dispatchEvent(new CustomEvent('firebaseConnectionRestored'));
                } else {
                    console.log("已断开与Firebase的连接");
                    
                    // 增加连接尝试次数
                    window.connectionAttempts++;
                    
                    // 如果尝试次数小于最大值，则尝试重新连接
                    if (window.connectionAttempts < window.maxConnectionAttempts) {
                        console.log(`尝试重新连接Firebase (${window.connectionAttempts}/${window.maxConnectionAttempts})...`);
                        setTimeout(() => {
                            try {
                                window.db.goOnline();
                            } catch (e) {
                                console.error("重新连接失败:", e);
                            }
                        }, 2000);
                    } else {
                        console.log("已达到最大连接尝试次数，切换到离线模式");
                        // 标记为离线模式
                        window.OFFLINE_MODE = true;
                        
                        // 显示离线状态
                        if (!document.getElementById('global-offline-notice')) {
                            const offlineNotice = document.createElement('div');
                            offlineNotice.id = 'global-offline-notice';
                            offlineNotice.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#ff9800;color:white;text-align:center;padding:5px;z-index:9999;font-size:14px;';
                            offlineNotice.textContent = '应用程序处于离线模式 - 您的更改不会同步到服务器';
                            
                            // 添加重试按钮
                            const retryBtn = document.createElement('button');
                            retryBtn.textContent = '重试连接';
                            retryBtn.style.cssText = 'margin-left:10px;padding:2px 8px;border:none;border-radius:3px;background:white;color:#ff9800;cursor:pointer;';
                            retryBtn.onclick = function() {
                                offlineNotice.textContent = '正在尝试重新连接...';
                                window.connectionAttempts = 0;
                                window.OFFLINE_MODE = false;
                                window.db.goOnline();
                                setTimeout(() => {
                                    if (window.OFFLINE_MODE) {
                                        offlineNotice.textContent = '重新连接失败，应用程序仍处于离线模式 - 您的更改不会同步到服务器';
                                        offlineNotice.appendChild(retryBtn);
                                    } else {
                                        offlineNotice.remove();
                                    }
                                }, 3000);
                            };
                            offlineNotice.appendChild(retryBtn);
                            document.body.appendChild(offlineNotice);
                        }
                    }
                }
            }, function(error) {
                console.error("监听连接状态时出错:", error);
                // 标记为离线模式
                window.OFFLINE_MODE = true;
            });
        } catch (dbError) {
            console.error("设置数据库持久性时出错:", dbError);
            // 标记为离线模式
            window.OFFLINE_MODE = true;
        }
        
        // 使用匿名身份验证（不需要用户注册），简化开发测试
        auth.signInAnonymously()
            .then(() => {
                console.log("已使用匿名身份登录Firebase");
                window.OFFLINE_MODE = false; // 确保离线模式被关闭
            })
            .catch((error) => {
                console.error("匿名身份验证失败:", error);
                console.log("尽管匿名身份验证失败，但应用程序将以未验证状态继续运行");
                // 标记为离线模式
                window.OFFLINE_MODE = true;
            })
            .finally(() => {
                // 通知其他模块Firebase已准备好
                try {
                    const event = new CustomEvent('firebaseReady');
                    document.dispatchEvent(event);
                    console.log("已触发firebaseReady事件");
                } catch (eventError) {
                    console.error("触发firebaseReady事件失败:", eventError);
                }
            });
        
        return true;
    } catch (error) {
        console.error("Firebase初始化失败:", error);
        // 创建一个错误提示元素
        setTimeout(() => {
            const errorElement = document.createElement('div');
            errorElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:10px;text-align:center;z-index:9999;';
            errorElement.textContent = 'Firebase初始化失败: ' + error.message;
            
            // 添加关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = 'position:absolute;right:10px;top:10px;background:none;border:none;color:white;font-size:20px;cursor:pointer;';
            closeBtn.onclick = function() {
                errorElement.remove();
            };
            errorElement.appendChild(closeBtn);
            document.body.appendChild(errorElement);
        }, 1000);
        // 标记为离线模式
        window.OFFLINE_MODE = true;
        return false;
    }
};

// 立即执行初始化
window.initFirebase();

// 当页面加载完成时再次检查初始化状态
document.addEventListener('DOMContentLoaded', function() {
    if (!window.firebaseInitialized) {
        console.log("DOMContentLoaded事件中尝试再次初始化Firebase");
        window.initFirebase();
    }
    
    // 添加在线状态监听
    window.addEventListener('online', function() {
        console.log("设备网络连接已恢复");
        if (window.OFFLINE_MODE && window.db) {
            console.log("尝试重新连接Firebase...");
            window.connectionAttempts = 0;
            window.OFFLINE_MODE = false;
            window.db.goOnline();
        }
    });
    
    window.addEventListener('offline', function() {
        console.log("设备网络连接已断开");
        window.OFFLINE_MODE = true;
        
        if (!document.getElementById('global-offline-notice')) {
            const offlineNotice = document.createElement('div');
            offlineNotice.id = 'global-offline-notice';
            offlineNotice.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#ff9800;color:white;text-align:center;padding:5px;z-index:9999;font-size:14px;';
            offlineNotice.textContent = '网络连接已断开 - 应用程序处于离线模式';
            document.body.appendChild(offlineNotice);
        }
    });
}); 