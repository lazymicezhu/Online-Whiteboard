// 测试Firebase连接状态的脚本
document.addEventListener('DOMContentLoaded', function() {
    console.log("Firebase连接测试启动...");
    
    // 检查Firebase是否已加载
    if (typeof firebase === 'undefined') {
        showStatus('错误', 'Firebase SDK未加载', 'error');
        return;
    }
    
    // 检查Firebase配置
    if (typeof firebaseConfig === 'undefined') {
        showStatus('错误', 'Firebase配置未找到', 'error');
        return;
    }
    
    // 显示配置信息
    showConfig(firebaseConfig);
    
    // 测试Firebase初始化
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        showStatus('成功', 'Firebase已成功初始化', 'success');
        
        // 测试数据库连接
        testDatabase();
        
        // 测试认证
        testAuth();
        
        // 测试Analytics
        testAnalytics();
    } catch (error) {
        showStatus('错误', 'Firebase初始化失败: ' + error.message, 'error');
    }
});

// 测试数据库连接
function testDatabase() {
    try {
        const db = firebase.database();
        const testRef = db.ref('.info/connected');
        
        testRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            showStatus('数据库', connected ? '已连接到Realtime Database' : '未连接到Realtime Database', 
                      connected ? 'success' : 'warning');
        });
        
        // 测试写入权限
        const testWriteRef = db.ref('test-write');
        testWriteRef.set({
            timestamp: Date.now(),
            test: true
        }).then(() => {
            showStatus('数据库写入', '写入权限正常', 'success');
            // 删除测试数据
            testWriteRef.remove();
        }).catch(error => {
            showStatus('数据库写入', '写入权限错误: ' + error.message, 'error');
        });
    } catch (error) {
        showStatus('数据库', '数据库测试失败: ' + error.message, 'error');
    }
}

// 测试认证
function testAuth() {
    try {
        const auth = firebase.auth();
        
        // 检查当前认证状态
        auth.onAuthStateChanged(user => {
            if (user) {
                showStatus('认证', '已使用ID登录: ' + user.uid, 'success');
            } else {
                showStatus('认证', '未登录', 'warning');
                
                // 尝试匿名登录
                auth.signInAnonymously()
                    .then(result => {
                        showStatus('匿名登录', '匿名登录成功: ' + result.user.uid, 'success');
                    })
                    .catch(error => {
                        showStatus('匿名登录', '匿名登录失败: ' + error.message, 'error');
                    });
            }
        });
    } catch (error) {
        showStatus('认证', '认证测试失败: ' + error.message, 'error');
    }
}

// 测试Analytics
function testAnalytics() {
    try {
        if (typeof firebase.analytics === 'function') {
            const analytics = firebase.analytics();
            analytics.logEvent('test_event');
            showStatus('Analytics', 'Analytics已初始化并发送测试事件', 'success');
        } else {
            showStatus('Analytics', 'Analytics不可用', 'warning');
        }
    } catch (error) {
        showStatus('Analytics', 'Analytics测试失败: ' + error.message, 'error');
    }
}

// 显示配置信息
function showConfig(config) {
    const configContainer = document.createElement('div');
    configContainer.className = 'config-info';
    
    const title = document.createElement('h3');
    title.textContent = 'Firebase配置信息';
    configContainer.appendChild(title);
    
    const list = document.createElement('ul');
    
    // 安全显示信息（隐藏敏感部分）
    const safeConfig = {
        apiKey: maskString(config.apiKey),
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: maskString(config.messagingSenderId),
        appId: maskString(config.appId),
        measurementId: config.measurementId
    };
    
    Object.entries(safeConfig).forEach(([key, value]) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${key}:</strong> ${value}`;
        list.appendChild(item);
    });
    
    configContainer.appendChild(list);
    document.getElementById('test-results').appendChild(configContainer);
}

// 显示状态信息
function showStatus(type, message, status) {
    const statusElem = document.createElement('div');
    statusElem.className = `status ${status}`;
    statusElem.innerHTML = `<strong>${type}:</strong> ${message}`;
    document.getElementById('test-results').appendChild(statusElem);
    
    console.log(`[${type}] ${message}`);
}

// 掩码敏感字符串
function maskString(str) {
    if (!str) return '';
    if (str.length <= 8) return '****';
    return str.substring(0, 4) + '****' + str.substring(str.length - 4);
} 