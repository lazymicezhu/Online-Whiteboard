// 确保用全局变量定义userManager
window.userManager = null;

// 用户管理模块
class UserManager {
    constructor() {
        this.currentUser = null;
        
        // 数据引用将在初始化时设置
        this.usersRef = null;
        this.onlineUsersRef = null;
        this.drawLimitRef = null;
        
        this.remainingDraws = 60; // 默认值，将在初始化时更新
        this.timerInterval = null;
        this.selectedAvatar = null;
        
        console.log("UserManager实例已创建");
    }

    // 初始化用户事件监听
    init() {
        console.log("初始化用户管理模块...");
        
        try {
            // 确保全局变量已定义
            if (typeof window.db === 'undefined') {
                console.error("错误: window.db未定义，UserManager初始化失败");
                // 尝试初始化Firebase
                if (typeof window.initFirebase === 'function') {
                    console.log("尝试重新初始化Firebase...");
                    window.initFirebase();
                }
                return;
            }
            
            if (typeof window.CANVAS_CONFIG === 'undefined') {
                console.error("错误: window.CANVAS_CONFIG未定义，使用默认配置");
                window.CANVAS_CONFIG = {
                    width: 1000,
                    height: 1000,
                    pixelSize: 10,
                    drawLimit: 60,
                    refreshPeriod: 60
                };
            }
            
            // 初始化数据引用
            this.usersRef = window.db.ref('users');
            this.onlineUsersRef = window.db.ref('online_users');
            this.remainingDraws = window.CANVAS_CONFIG.drawLimit;
            
            // 绑定表单切换事件
            document.getElementById('switch-to-register').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.remove('hidden');
                document.getElementById('login-tab-btn').classList.remove('active');
                document.getElementById('register-tab-btn').classList.add('active');
            });
            
            document.getElementById('switch-to-login').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-tab-btn').classList.remove('active');
                document.getElementById('login-tab-btn').classList.add('active');
            });
            
            document.getElementById('login-tab-btn').addEventListener('click', (e) => {
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-tab-btn').classList.remove('active');
                document.getElementById('login-tab-btn').classList.add('active');
            });
            
            document.getElementById('register-tab-btn').addEventListener('click', (e) => {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.remove('hidden');
                document.getElementById('login-tab-btn').classList.remove('active');
                document.getElementById('register-tab-btn').classList.add('active');
            });
            
            // 登录按钮绑定事件处理程序
            const loginBtn = document.getElementById('login-submit-btn');
            if (!loginBtn) {
                console.error("找不到登录按钮元素!");
                document.getElementById('login-status').textContent = "错误: 找不到登录按钮";
                return;
            }
            
            loginBtn.addEventListener('click', (e) => {
                console.log("登录按钮被点击");
                document.getElementById('login-status').textContent = "正在登录...";
                e.preventDefault();
                this.loginExistingUser();
            });
            
            // 注册按钮绑定事件处理程序
            const registerBtn = document.getElementById('register-submit-btn');
            if (!registerBtn) {
                console.error("找不到注册按钮元素!");
                document.getElementById('register-status').textContent = "错误: 找不到注册按钮";
                return;
            }
            
            registerBtn.addEventListener('click', (e) => {
                console.log("注册按钮被点击");
                document.getElementById('register-status').textContent = "正在注册...";
                e.preventDefault();
                this.registerNewUser();
            });
            
            // 登出按钮点击事件
            document.getElementById('logout-btn').addEventListener('click', () => this.logoutUser());
            
            // 头像选择事件
            const avatarOptions = document.querySelectorAll('.avatar-option');
            avatarOptions.forEach(avatar => {
                avatar.addEventListener('click', (e) => {
                    avatarOptions.forEach(a => a.classList.remove('selected'));
                    e.target.classList.add('selected');
                    this.selectedAvatar = e.target.dataset.avatar;
                    console.log("选择了头像:", this.selectedAvatar);
                });
            });

            // 默认选中第一个头像
            if (avatarOptions.length > 0) {
                avatarOptions[0].click();
            }

            // 监听在线用户
            this.onlineUsersListener = this.onlineUsersRef.on('value', (snapshot) => {
                this.renderOnlineUsers(snapshot.val() || {});
            }, (error) => {
                console.error("监听在线用户时出错:", error);
            });

            // 从本地存储检查用户ID
            const savedUserId = localStorage.getItem('pixelArtUserId');
            if (savedUserId) {
                this.checkAndLoginSavedUser(savedUserId);
            }
            
            // 设置调试按钮事件
            this.setupDebugEvents();
            
            console.log("用户管理模块初始化完成");
            
            // 触发自定义事件通知其他模块userManager已准备好
            try {
                const event = new CustomEvent('userManagerReady');
                document.dispatchEvent(event);
                console.log("已触发userManagerReady事件");
            } catch (eventError) {
                console.error("触发userManagerReady事件失败:", eventError);
            }
        } catch (error) {
            console.error("用户管理模块初始化失败:", error);
            document.getElementById('login-status').textContent = "错误: " + error.message;
        }
    }
    
    // 设置调试面板按钮事件
    setupDebugEvents() {
        // 由于调试面板已删除，不再需要绑定这些事件
        console.log("调试面板已移除，跳过事件绑定");
        
        /*
        // 以下代码已不再需要，因为调试面板已被移除
        document.getElementById('debug-login').addEventListener('click', () => {
            // 填充测试数据
            document.getElementById('login-nickname').value = "测试用户" + Math.floor(Math.random() * 1000);
            document.getElementById('login-password').value = "test123";
            
            // 确保选择头像（即使在登录界面）
            const avatar = document.querySelector('.avatar-option');
            if (avatar) {
                avatar.click();
            }
            
            // 根据当前界面决定使用哪个按钮
            if (!document.getElementById('login-form').classList.contains('hidden')) {
                // 如果当前是登录界面，点击登录按钮
                document.getElementById('login-submit-btn').click();
            } else {
                // 如果当前是注册界面，自动填充注册表单
                document.getElementById('register-nickname').value = document.getElementById('login-nickname').value;
                document.getElementById('register-password').value = document.getElementById('login-password').value;
                document.getElementById('register-submit-btn').click();
            }
        });
        
        // Firebase状态按钮
        document.getElementById('debug-firebase').addEventListener('click', () => {
            if (typeof window.db !== 'undefined') {
                alert("Firebase状态: 已连接");
            } else {
                alert("Firebase状态: 未连接");
                if (typeof window.initFirebase === 'function') {
                    if (window.initFirebase()) {
                        alert("Firebase重新初始化成功");
                    }
                }
            }
        });
        
        // 清除本地存储按钮
        document.getElementById('debug-clear').addEventListener('click', () => {
            localStorage.removeItem('pixelArtUserId');
            localStorage.removeItem('pixelArtLoginSession');
            alert("本地存储已清除");
        });
        
        // 修复初始化按钮
        document.getElementById('debug-fix').addEventListener('click', () => {
            // 重新初始化Firebase
            if (typeof window.initFirebase === 'function') {
                window.initFirebase();
            }
            
            // 重新创建userManager
            window.userManager = new UserManager();
            window.userManager.init();
            
            alert("已尝试修复初始化");
        });
        */
    }

    // 检查保存的用户并登录
    checkAndLoginSavedUser(userId) {
        this.usersRef.child(userId).once('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                // 修改自动登录逻辑，避免每次刷新都要求输入密码
                // 先查询localStorage中是否存有登录会话
                const loginSession = localStorage.getItem('pixelArtLoginSession');
                
                if (loginSession) {
                    try {
                        const session = JSON.parse(loginSession);
                        // 检查会话是否有效（24小时内）
                        const now = Date.now();
                        if (session && session.userId === userId && (now - session.timestamp < 24 * 60 * 60 * 1000)) {
                            console.log("找到有效登录会话，自动登录");
                            this.currentUser = {
                                id: userId,
                                ...userData
                            };
                            this.completeLogin();
                            return;
                        }
                    } catch (e) {
                        console.error("解析登录会话失败", e);
                        localStorage.removeItem('pixelArtLoginSession');
                    }
                }
                
                // 如果没有有效会话，请求输入密码
                const savedPassword = prompt("请输入密码以继续登录：");
                if (savedPassword && this.verifyPassword(savedPassword, userData.password)) {
                    this.currentUser = {
                        id: userId,
                        ...userData
                    };
                    
                    // 创建新的登录会话
                    localStorage.setItem('pixelArtLoginSession', JSON.stringify({
                        userId: userId,
                        timestamp: Date.now()
                    }));
                    
                    this.completeLogin();
                } else if (savedPassword) { // 密码错误但用户输入了内容
                    alert("密码错误，请重新登录！");
                    localStorage.removeItem('pixelArtUserId');
                    localStorage.removeItem('pixelArtLoginSession');
                } else { // 用户取消了输入
                    // 清除存储的ID，防止再次出现密码提示
                    localStorage.removeItem('pixelArtUserId');
                    localStorage.removeItem('pixelArtLoginSession');
                }
            } else {
                // 用户ID无效，清除本地存储
                localStorage.removeItem('pixelArtUserId');
                localStorage.removeItem('pixelArtLoginSession');
            }
        }).catch(error => {
            console.error("获取用户数据失败:", error);
            // 出错时清除本地存储
            localStorage.removeItem('pixelArtUserId');
            localStorage.removeItem('pixelArtLoginSession');
        });
    }
    
    // 验证密码
    verifyPassword(inputPassword, storedPassword) {
        // 增加错误处理，确保两个参数都存在
        if (!inputPassword || !storedPassword) {
            console.error("密码验证失败: 参数不完整", { 
                hasInput: !!inputPassword, 
                hasStored: !!storedPassword 
            });
            return false;
        }
        
        // 防止类型不匹配导致的比较错误
        const hashedInput = this.hashPassword(inputPassword);
        console.log("密码验证:", { 
            inputHashed: hashedInput.substring(0, 3) + "...", 
            storedHashed: storedPassword.substring(0, 3) + "..." 
        });
        
        return hashedInput === storedPassword;
    }
    
    // 简单的密码哈希函数
    hashPassword(password) {
        // 注意：这只是一个简单示例，实际应用中应使用更安全的哈希算法
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(16);
    }

    // 登录已有用户
    loginExistingUser() {
        console.log("执行登录流程...");
        document.getElementById('login-status').textContent = "处理登录请求...";
        
        try {
            const nickname = document.getElementById('login-nickname').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!nickname) {
                document.getElementById('login-status').textContent = "错误: 请输入昵称!";
                alert('请输入昵称！');
                return;
            }
            
            if (!password) {
                document.getElementById('login-status').textContent = "错误: 请输入密码!";
                alert('请输入密码！');
                return;
            }
            
            // 检查是否处于离线模式
            if (window.OFFLINE_MODE) {
                console.log("系统处于离线模式，无法登录");
                document.getElementById('login-status').textContent = "系统处于离线模式，无法登录";
                alert('系统处于离线模式，无法登录！');
                return;
            }
            
            document.getElementById('login-status').textContent = "正在连接Firebase...";
            
            // 确保Firebase已初始化
            if (!firebase.apps.length) {
                document.getElementById('login-status').textContent = "错误: Firebase未初始化，尝试重新初始化!";
                console.error("Firebase未初始化，尝试重新初始化!");
                
                if (typeof window.initFirebase === 'function') {
                    if (!window.initFirebase()) {
                        // 如果初始化失败
                        document.getElementById('login-status').textContent = "错误: 无法初始化Firebase!";
                        return;
                    }
                } else {
                    document.getElementById('login-status').textContent = "错误: 无法初始化Firebase!";
                    return;
                }
            }
            
            // 检查并设置引用
            this.ensureDatabaseReferences();
            
            // 首先检查昵称是否已存在
            this.checkNicknameExists(nickname).then(existingUserId => {
                if (existingUserId) {
                    // 昵称已存在，尝试进行登录
                    document.getElementById('login-status').textContent = "查找用户...";
                    
                    this.usersRef.child(existingUserId).once('value', snapshot => {
                        const userData = snapshot.val();
                        
                        if (userData && this.verifyPassword(password, userData.password)) {
                            // 密码正确，更新登录时间
                            this.usersRef.child(existingUserId).update({
                                lastLogin: Date.now()
                            }).then(() => {
                                // 登录成功
                                this.currentUser = {
                                    id: existingUserId,
                                    ...userData
                                };
                                
                                // 保存用户ID
                                localStorage.setItem('pixelArtUserId', existingUserId);
                                
                                // 完成登录流程
                                this.completeLogin();
                            });
                        } else {
                            // 密码错误
                            document.getElementById('login-status').textContent = "密码错误，请重试！";
                            alert("密码错误，请重试！");
                        }
                    });
                } else {
                    // 昵称不存在
                    document.getElementById('login-status').textContent = "用户不存在，请先注册！";
                    // 切换到注册界面
                    document.getElementById('login-form').classList.add('hidden');
                    document.getElementById('register-form').classList.remove('hidden');
                    document.getElementById('login-tab-btn').classList.remove('active');
                    document.getElementById('register-tab-btn').classList.add('active');
                    // 自动填充注册表单
                    document.getElementById('register-nickname').value = nickname;
                    document.getElementById('register-password').value = password;
                }
            }).catch(error => {
                console.error("检查昵称时出错:", error);
                document.getElementById('login-status').textContent = "检查昵称时出错: " + error.message;
            });
            
        } catch (error) {
            console.error("登录过程发生错误:", error);
            document.getElementById('login-status').textContent = "登录过程发生错误: " + error.message;
        }
    }
    
    // 注册新用户
    registerNewUser() {
        console.log("执行注册流程...");
        document.getElementById('register-status').textContent = "处理注册请求...";
        
        try {
            const nickname = document.getElementById('register-nickname').value.trim();
            const password = document.getElementById('register-password').value.trim();
            
            if (!nickname) {
                document.getElementById('register-status').textContent = "错误: 请输入昵称!";
                alert('请输入昵称！');
                return;
            }
            
            if (!password) {
                document.getElementById('register-status').textContent = "错误: 请输入密码!";
                alert('请输入密码！');
                return;
            }
            
            if (!this.selectedAvatar) {
                document.getElementById('register-status').textContent = "错误: 请选择头像!";
                alert('请选择头像！');
                return;
            }
            
            // 检查是否处于离线模式
            if (window.OFFLINE_MODE) {
                console.log("系统处于离线模式，创建本地用户");
                document.getElementById('register-status').textContent = "系统处于离线模式，创建本地用户...";
                
                // 创建临时用户
                const userId = localStorage.getItem('pixelArtUserId') || window.generateUUID();
                const tempUserData = {
                    id: userId,
                    nickname: nickname,
                    password: this.hashPassword(password),
                    avatar: this.selectedAvatar,
                    type: 'normal',
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    isOffline: true // 标记为离线用户
                };
                
                this.currentUser = tempUserData;
                localStorage.setItem('pixelArtUserId', userId);
                
                // 显示离线状态
                document.getElementById('register-status').textContent = "已创建离线用户，部分功能可能不可用";
                setTimeout(() => {
                    this.completeLogin();
                }, 1000);
                return;
            }
            
            document.getElementById('register-status').textContent = "正在连接Firebase...";
            
            // 确保Firebase已初始化
            if (!firebase.apps.length) {
                document.getElementById('register-status').textContent = "错误: Firebase未初始化，尝试重新初始化!";
                console.error("Firebase未初始化，尝试重新初始化!");
                
                if (typeof window.initFirebase === 'function') {
                    if (!window.initFirebase()) {
                        // 如果初始化失败，提示错误
                        document.getElementById('register-status').textContent = "错误: 无法初始化Firebase!";
                        return;
                    }
                } else {
                    document.getElementById('register-status').textContent = "错误: 无法初始化Firebase!";
                    return;
                }
            }
            
            // 检查并设置引用
            this.ensureDatabaseReferences();
            
            // 检查昵称是否已存在
            this.checkNicknameExists(nickname).then(existingUserId => {
                if (existingUserId) {
                    // 昵称已存在，提示用户
                    document.getElementById('register-status').textContent = "昵称已存在，请使用其他昵称或直接登录！";
                    alert("昵称已存在，请使用其他昵称或直接登录！");
                    return;
                }
                
                // 昵称不存在，创建新用户
                const userId = window.generateUUID();
                document.getElementById('register-status').textContent = "创建新用户...";
                
                // 对密码进行哈希处理
                const hashedPassword = this.hashPassword(password);
                console.log("密码已加密存储");
                
                // 创建新用户，确保密码以加密形式存储
                const userData = {
                    nickname: nickname,
                    password: hashedPassword, // 存储哈希后的密码
                    avatar: this.selectedAvatar,
                    type: 'normal', // 默认普通用户
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                
                console.log("创建新用户", {
                    ...userData, 
                    password: "已加密" // 日志中不显示密码
                });
                
                this.usersRef.child(userId).set(userData)
                    .then(() => {
                        console.log("用户创建成功");
                        document.getElementById('register-status').textContent = "用户创建成功";
                        
                        this.currentUser = {
                            id: userId,
                            ...userData
                        };
                        
                        // 保存用户ID
                        localStorage.setItem('pixelArtUserId', userId);
                        
                        // 完成登录流程
                        this.completeLogin();
                    })
                    .catch(error => {
                        console.error("创建用户失败:", error);
                        document.getElementById('register-status').textContent = "创建用户失败: " + error.message;
                    });
            }).catch(error => {
                console.error("检查昵称时出错:", error);
                document.getElementById('register-status').textContent = "检查昵称时出错: " + error.message;
            });
            
        } catch (error) {
            console.error("注册过程发生错误:", error);
            document.getElementById('register-status').textContent = "注册过程发生错误: " + error.message;
        }
    }
    
    // 确保数据库引用已设置
    ensureDatabaseReferences() {
        if (!window.db) {
            console.error("数据库实例未创建，尝试重新初始化!");
            
            if (typeof window.initFirebase === 'function') {
                window.initFirebase();
            }
            
            // 检查是否初始化成功
            if (!window.db) {
                throw new Error("无法初始化数据库!");
            }
        }
        
        // 如果引用未设置，尝试设置
        if (!this.usersRef || !this.onlineUsersRef) {
            try {
                this.usersRef = window.db.ref('users');
                this.onlineUsersRef = window.db.ref('online_users');
            } catch (refError) {
                console.error("创建数据库引用失败:", refError);
                throw new Error("无法创建数据库引用!");
            }
        }
    }

    // 检查昵称是否存在
    async checkNicknameExists(nickname) {
        return new Promise((resolve, reject) => {
            this.usersRef.orderByChild('nickname').equalTo(nickname).once('value', snapshot => {
                const users = snapshot.val();
                if (users) {
                    // 昵称已存在，返回第一个匹配的用户ID
                    resolve(Object.keys(users)[0]);
                } else {
                    // 昵称不存在
                    resolve(null);
                }
            }).catch(error => {
                console.error("检查昵称失败:", error);
                reject(error);
            });
        });
    }

    // 完成登录流程
    completeLogin() {
        console.log("完成登录，切换到主界面");
        
        // 更新用户UI
        this.updateUserUI();
        
        // 切换界面
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        
        // 保存登录会话，有效期24小时
        localStorage.setItem('pixelArtLoginSession', JSON.stringify({
            userId: this.currentUser.id,
            timestamp: Date.now()
        }));
        
        // 检查是否离线模式
        if (window.OFFLINE_MODE || this.currentUser.isOffline) {
            console.log("用户以离线模式登录，不同步在线状态");
            
            // 添加离线标记
            if (!document.getElementById('user-offline-badge')) {
                const offlineBadge = document.createElement('span');
                offlineBadge.textContent = '(离线)';
                offlineBadge.id = 'user-offline-badge';
                offlineBadge.style.cssText = 'margin-left:5px;color:#ff9800;font-style:italic;';
                document.getElementById('user-nickname').appendChild(offlineBadge);
            }
        } else {
            try {
                // 将用户添加到在线用户列表
                if (!this.onlineUsersRef) {
                    this.onlineUsersRef = window.db.ref('online_users');
                }
                
                this.onlineUsersRef.child(this.currentUser.id).set({
                    nickname: this.currentUser.nickname,
                    avatar: this.currentUser.avatar,
                    type: this.currentUser.type,
                    lastActive: Date.now()
                }).catch(err => {
                    console.warn("更新在线用户状态失败:", err);
                });
                
                // 在用户关闭页面时自动从在线列表移除
                window.addEventListener('beforeunload', () => {
                    if (this.currentUser) {
                        try {
                            this.onlineUsersRef.child(this.currentUser.id).remove();
                        } catch (e) {
                            console.warn("移除在线状态失败:", e);
                        }
                    }
                });
            } catch (error) {
                console.error("处理在线状态时出错:", error);
            }
        }
        
        // 设置用户绘制限制
        this.setupDrawLimit();
        
        // 检查管理员权限
        this.checkAdminPrivileges();
        
        // 更新画笔粗细权限
        this.updateBrushSizePermissions();
        
        // 初始化聊天功能
        if (window.chatManager) {
            window.chatManager.init(
                this.currentUser.id,
                this.currentUser.nickname,
                this.currentUser.type
            );
        }
        
        // 触发用户登录完成事件
        const loginCompleteEvent = new CustomEvent('userLoginComplete', {
            detail: { userId: this.currentUser.id }
        });
        document.dispatchEvent(loginCompleteEvent);
        console.log("已触发userLoginComplete事件");
    }

    // 更新用户UI
    updateUserUI() {
        // 获取头像URL
        const avatarUrls = {
            '1': 'assets/avatar1.png',
            '2': 'assets/avatar2.png',
            '3': 'assets/avatar3.png'
        };
        
        const avatarUrl = avatarUrls[this.currentUser.avatar] || avatarUrls['1'];
        document.getElementById('user-avatar').src = avatarUrl;
        document.getElementById('user-nickname').textContent = this.currentUser.nickname;
        
        const userTypeElement = document.getElementById('user-type');
        userTypeElement.textContent = this.getUserTypeText(this.currentUser.type);
        userTypeElement.className = ''; // 清除之前的类
        userTypeElement.classList.add(this.currentUser.type);
    }

    // 获取用户类型文本
    getUserTypeText(type) {
        switch (type) {
            case 'admin':
                return '管理员';
            case 'vip':
                return 'VIP用户';
            default:
                return '普通用户';
        }
    }

    // 检查管理员权限
    checkAdminPrivileges() {
        if (!window.ADMIN_IDS) {
            console.error("ADMIN_IDS未定义");
            return;
        }
        
        console.log("检查管理员权限，当前用户ID:", this.currentUser.id);
        console.log("管理员ID列表:", window.ADMIN_IDS);
        
        // 检查是否存在通配符'*'或用户ID在管理员列表中
        if (window.ADMIN_IDS.includes('*') || window.ADMIN_IDS.includes(this.currentUser.id)) {
            // 设置为管理员
            this.usersRef.child(this.currentUser.id).update({ type: 'admin' });
            this.currentUser.type = 'admin';
            
            // 显示管理员面板按钮
            const adminPanelBtn = document.getElementById('admin-panel-btn');
            if (adminPanelBtn) {
                adminPanelBtn.classList.remove('hidden');
                
                // 移除所有现有事件监听器
                const newAdminPanelBtn = adminPanelBtn.cloneNode(true);
                adminPanelBtn.parentNode.replaceChild(newAdminPanelBtn, adminPanelBtn);
                
                // 添加新的事件监听器
                newAdminPanelBtn.addEventListener('click', () => {
                    console.log("管理员面板按钮被点击 (来自UserManager)");
                    if (window.adminPanel) {
                        window.adminPanel.showPanel();
                    } else {
                        console.error("adminPanel未定义，尝试初始化AdminPanel");
                        this.initAdminPanel();
                    }
                });
            } else {
                console.error("找不到管理员面板按钮元素");
            }
            
            // 更新用户界面
            this.updateUserUI();
            
            console.log("用户已被设置为管理员");
        }
    }
    
    // 初始化管理员面板
    initAdminPanel() {
        if (typeof AdminPanel === 'undefined') {
            console.error("AdminPanel类未定义，检查admin.js是否正确加载");
            
            // 尝试重新加载admin.js脚本
            const script = document.createElement('script');
            script.src = 'scripts/admin.js?' + new Date().getTime(); // 添加时间戳防止缓存
            script.onload = () => {
                console.log("AdminPanel脚本已重新加载");
                if (typeof AdminPanel !== 'undefined') {
                    window.adminPanel = new AdminPanel();
                    window.adminPanel.init();
                    window.adminPanel.showPanel();
                    console.log("AdminPanel已成功初始化");
                } else {
                    console.error("即使重新加载脚本后，AdminPanel类仍未定义");
                    alert("无法加载管理员面板，请刷新页面重试");
                }
            };
            document.head.appendChild(script);
        } else {
            window.adminPanel = new AdminPanel();
            window.adminPanel.init();
            window.adminPanel.showPanel();
            console.log("AdminPanel已成功初始化");
        }
    }

    // 渲染在线用户列表
    renderOnlineUsers(users) {
        // 更新传统用户列表（保留兼容）
        /*
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            // 创建用户列表项...（保留旧代码以防需要）
        }
        */
        
        // 更新用户滚动条
        const scrollContainer = document.getElementById('online-users-scroll');
        if (!scrollContainer) return;
        
        let scrollHTML = '';
        let usersArray = Object.entries(users).map(([userId, userData]) => {
            return {
                userId: userId,
                ...userData
            };
        });
        
        // 至少显示5个用户，如果不足则重复
        if (usersArray.length > 0 && usersArray.length < 5) {
            const originalLength = usersArray.length;
            for (let i = 0; i < 5 - originalLength; i++) {
                usersArray.push(usersArray[i % originalLength]);
            }
        }
        
        // 生成HTML
        usersArray.forEach(user => {
            let userClass = '';
            if (user.type === 'vip') userClass = 'vip';
            if (user.type === 'admin') userClass = 'admin';
            
            scrollHTML += `<span class="ticker-user ${userClass}">${user.nickname}</span>`;
        });
        
        // 再次重复一遍，确保滚动平滑
        scrollHTML += scrollHTML;
        
        // 更新DOM
        scrollContainer.innerHTML = scrollHTML;
        
        // 如果是当前用户，应用对应的样式限制
        this.updateBrushSizePermissions();
    }
    
    // 更新画笔粗细权限
    updateBrushSizePermissions() {
        if (!this.currentUser) return;
        
        const vipOptions = document.querySelectorAll('.brush-option.vip-only');
        const adminOptions = document.querySelectorAll('.brush-option.admin-only');
        
        // 清除之前的启用状态
        vipOptions.forEach(option => option.classList.remove('enabled'));
        adminOptions.forEach(option => option.classList.remove('enabled'));
        
        // 根据用户类型启用相应选项
        if (this.currentUser.type === 'vip' || this.currentUser.type === 'admin') {
            vipOptions.forEach(option => option.classList.add('enabled'));
        }
        
        if (this.currentUser.type === 'admin') {
            adminOptions.forEach(option => option.classList.add('enabled'));
        }
    }

    // 登出用户
    logoutUser() {
        if (this.currentUser) {
            // 从在线用户列表移除
            this.onlineUsersRef.child(this.currentUser.id).remove();
            
            // 清理监听器
            this.removeListeners();
            
            // 清理聊天管理器
            if (window.chatManager) {
                window.chatManager.cleanup();
            }
            
            // 重置当前用户
            this.currentUser = null;
            
            // 清除绘制限制计时器
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            // 移除本地存储的用户ID和会话
            localStorage.removeItem('pixelArtUserId');
            localStorage.removeItem('pixelArtLoginSession');
            
            // 返回登录界面
            document.getElementById('main-container').classList.add('hidden');
            document.getElementById('admin-panel').classList.add('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
        }
    }

    // 移除所有监听器
    removeListeners() {
        try {
            // 移除在线用户监听器
            if (this.onlineUsersRef && this.onlineUsersListener) {
                this.onlineUsersRef.off('value', this.onlineUsersListener);
                this.onlineUsersListener = null;
            }
            
            // 移除绘制限制监听器
            if (this.drawLimitRef) {
                this.drawLimitRef.off();
            }
        } catch (error) {
            console.error("移除监听器时出错:", error);
        }
    }

    // 检查用户是否可以擦除像素
    canErasePixels() {
        return this.currentUser && (this.currentUser.type === 'vip' || this.currentUser.type === 'admin');
    }

    // 设置用户绘制限制
    setupDrawLimit() {
        // 检查是否离线模式
        if (window.OFFLINE_MODE || this.currentUser.isOffline) {
            console.log("离线模式下使用本地绘制限制");
            this.setupLocalDrawLimit();
            return;
        }
        
        try {
            // 创建用户的绘制限制引用
            if (!window.db) {
                console.error("Firebase数据库未初始化，切换到本地模式");
                window.OFFLINE_MODE = true;
                this.setupLocalDrawLimit();
                return;
            }
            
            this.drawLimitRef = window.db.ref(`draw_limits/${this.currentUser.id}`);
            
            // 获取用户当前的绘制次数
            this.drawLimitRef.once('value')
                .then((snapshot) => {
                    const limitData = snapshot.val();
                    
                    if (limitData && limitData.timestamp) {
                        const now = Date.now();
                        const elapsed = Math.floor((now - limitData.timestamp) / 1000);
                        
                        // 如果距离上次刷新不到1分钟
                        if (elapsed < window.CANVAS_CONFIG.refreshPeriod) {
                            this.remainingDraws = limitData.remainingDraws;
                            this.startTimer(window.CANVAS_CONFIG.refreshPeriod - elapsed);
                        } else {
                            // 超过1分钟，重置计数
                            this.resetDrawLimit();
                        }
                    } else {
                        // 初次使用，创建记录
                        this.resetDrawLimit();
                    }
                    
                    // 更新UI
                    this.updateDrawLimitUI();
                })
                .catch(error => {
                    console.error("获取绘制限制失败，切换到本地模式:", error);
                    
                    // 切换到本地模式
                    window.OFFLINE_MODE = true;
                    this.setupLocalDrawLimit();
                });
        } catch (error) {
            console.error("设置绘制限制时出错，切换到本地模式:", error);
            window.OFFLINE_MODE = true;
            this.setupLocalDrawLimit();
        }
    }
    
    // 设置本地绘制限制
    setupLocalDrawLimit() {
        console.log("使用本地绘制限制...");
        
        // 使用默认绘制限制
        this.remainingDraws = window.CANVAS_CONFIG.drawLimit;
        
        // 从本地存储获取之前的绘制限制信息
        const savedLimitData = localStorage.getItem('drawLimit');
        if (savedLimitData) {
            try {
                const limitData = JSON.parse(savedLimitData);
                const now = Date.now();
                const elapsed = Math.floor((now - limitData.timestamp) / 1000);
                
                // 如果距离上次刷新不到规定时间
                if (elapsed < window.CANVAS_CONFIG.refreshPeriod) {
                    this.remainingDraws = limitData.remainingDraws;
                    this.startTimer(window.CANVAS_CONFIG.refreshPeriod - elapsed);
                } else {
                    // 超过规定时间，重置计数
                    this.resetDrawLimitLocal();
                }
            } catch (error) {
                console.error("解析本地绘制限制数据失败:", error);
                this.resetDrawLimitLocal();
            }
        } else {
            // 初次使用，创建记录
            this.resetDrawLimitLocal();
        }
        
        // 更新UI
        this.updateDrawLimitUI();
    }

    // 重置本地绘制限制
    resetDrawLimitLocal() {
        this.remainingDraws = window.CANVAS_CONFIG.drawLimit;
        
        // 保存到本地存储
        try {
            localStorage.setItem('drawLimit', JSON.stringify({
                remainingDraws: this.remainingDraws,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error("保存绘制限制到本地存储失败:", error);
        }
        
        // 开始新的倒计时
        this.startTimer(window.CANVAS_CONFIG.refreshPeriod);
    }

    // 重置绘制限制
    resetDrawLimit() {
        this.remainingDraws = window.CANVAS_CONFIG.drawLimit;
        
        // 更新数据库 - 使用set而不是update，确保只有一条记录
        this.drawLimitRef.set({
            remainingDraws: this.remainingDraws,
            timestamp: Date.now()
        });
        
        // 开始新的倒计时
        this.startTimer(window.CANVAS_CONFIG.refreshPeriod);
    }

    // 开始倒计时计时器
    startTimer(seconds) {
        // 清除之前的定时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        let remainingSeconds = seconds;
        
        // 更新UI
        document.getElementById('timer').textContent = `刷新时间: ${remainingSeconds}秒`;
        
        this.timerInterval = setInterval(() => {
            remainingSeconds--;
            
            // 更新UI
            document.getElementById('timer').textContent = `刷新时间: ${remainingSeconds}秒`;
            
            if (remainingSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.resetDrawLimit();
                this.updateDrawLimitUI();
            }
        }, 1000);
    }

    // 更新绘制限制UI
    updateDrawLimitUI() {
        document.getElementById('remaining-draws').textContent = `剩余操作次数: ${this.remainingDraws}`;
    }

    // 消耗绘制次数
    consumeDraw() {
        if (this.remainingDraws > 0) {
            this.remainingDraws--;
            
            // 离线模式下保存到本地存储
            if (window.OFFLINE_MODE || this.currentUser.isOffline) {
                try {
                    localStorage.setItem('drawLimit', JSON.stringify({
                        remainingDraws: this.remainingDraws,
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    console.error("保存绘制限制到本地存储失败:", error);
                }
            } else if (this.drawLimitRef) {
                // 更新数据库 - 使用set而非update避免创建多条记录
                this.drawLimitRef.set({
                    remainingDraws: this.remainingDraws,
                    timestamp: Date.now()
                }).catch(error => {
                    console.error("更新绘制限制失败:", error);
                    // 可能需要切换到离线模式
                    window.OFFLINE_MODE = true;
                });
            }
            
            // 更新UI
            this.updateDrawLimitUI();
            
            return true;
        }
        
        return false;
    }
}

// 立即创建实例并保存到全局变量
// 等待页面和firebase加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 添加页面卸载事件清理监听器
    window.addEventListener('beforeunload', function() {
        if (window.userManager) {
            try {
                window.userManager.removeListeners();
                
                // 如果用户已登录，从在线用户列表中移除
                if (window.userManager.currentUser) {
                    const userId = window.userManager.currentUser.id;
                    if (window.db) {
                        window.db.ref('online_users').child(userId).remove();
                    }
                }
            } catch (error) {
                console.error("页面卸载时清理用户监听器失败:", error);
            }
        }
    });
    
    console.log("DOMContentLoaded: 准备初始化userManager");
    
    // 初始化函数
    function initUserManager() {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && 
                typeof window.db !== 'undefined' && typeof window.CANVAS_CONFIG !== 'undefined') {
                console.log("Firebase已准备好，创建userManager");
                window.userManager = new UserManager();
                console.log("userManager已创建:", window.userManager);
                window.userManager.init();
            } else {
                console.log("Firebase尚未准备好，尝试初始化Firebase");
                
                // 尝试初始化Firebase
                if (typeof window.initFirebase === 'function') {
                    window.initFirebase();
                    console.log("已尝试初始化Firebase，将在稍后重试初始化userManager");
                }
                
                console.log("等待后再初始化userManager");
                setTimeout(initUserManager, 500);
            }
        } catch (e) {
            console.error("初始化userManager失败:", e);
            setTimeout(initUserManager, 1000);
        }
    }
    
    // 监听Firebase就绪事件
    document.addEventListener('firebaseReady', function() {
        console.log("收到Firebase就绪事件，初始化userManager");
        window.userManager = new UserManager();
        window.userManager.init();
    });
    
    // 开始初始化，如果Firebase已就绪则直接创建
    if (window.firebaseInitialized && window.db) {
        console.log("Firebase已就绪，直接创建userManager");
        window.userManager = new UserManager();
        window.userManager.init();
    } else {
        // 启动初始化流程
        initUserManager();
    }
}); 