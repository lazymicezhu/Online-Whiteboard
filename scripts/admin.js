// 确保用全局变量定义adminPanel
window.adminPanel = null;

// 管理员面板模块
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.usersRef = null;
        
        console.log("AdminPanel实例已创建");
    }
    
    // 初始化管理员面板
    init() {
        console.log("初始化管理员面板...");
        
        try {
            // 确保全局变量已定义
            if (typeof window.db === 'undefined') {
                console.error("错误: window.db未定义，AdminPanel初始化失败");
                return;
            }
            
            // 初始化数据引用
            this.usersRef = window.db.ref('users');
            
            // 绑定事件
            const adminPanelBtn = document.getElementById('admin-panel-btn');
            if (adminPanelBtn) {
                // 先移除所有已存在的事件（防止重复绑定）
                const newAdminPanelBtn = adminPanelBtn.cloneNode(true);
                adminPanelBtn.parentNode.replaceChild(newAdminPanelBtn, adminPanelBtn);
                
                newAdminPanelBtn.addEventListener('click', () => {
                    console.log("管理员面板按钮被点击 (来自AdminPanel)");
                    this.showPanel();
                });
                console.log("AdminPanel: 管理员面板按钮事件已绑定");
            } else {
                console.warn("管理员面板按钮不存在");
            }
            
            const backToCanvasBtn = document.getElementById('back-to-canvas');
            if (backToCanvasBtn) {
                backToCanvasBtn.addEventListener('click', () => {
                    this.hidePanel();
                });
            }
            
            // 搜索功能
            const searchUserInput = document.getElementById('search-user');
            if (searchUserInput) {
                searchUserInput.addEventListener('input', (e) => {
                    this.searchUsers(e.target.value);
                });
            }
            
            console.log("管理员面板初始化完成");
        } catch (error) {
            console.error("管理员面板初始化失败:", error);
        }
    }
    
    // 显示管理员面板
    showPanel() {
        console.log("显示管理员面板 - 调用来自AdminPanel类");
        
        // 确保管理员面板HTML元素存在
        const adminPanel = document.getElementById('admin-panel');
        if (!adminPanel) {
            console.error("找不到管理员面板HTML元素!");
            return;
        }
        
        document.getElementById('main-container').classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        // 加载用户和初始化其他面板内容
        this.loadUsers();
        
        // 设置画布大小输入框初始值
        const canvasWidthInput = document.getElementById('canvas-width');
        const canvasHeightInput = document.getElementById('canvas-height');
        
        if (canvasWidthInput && canvasHeightInput && window.canvasManager) {
            canvasWidthInput.value = window.canvasManager.canvasWidth;
            canvasHeightInput.value = window.canvasManager.canvasHeight;
        }
        
        // 设置最大画笔粗细输入框初始值
        const maxBrushSizeInput = document.getElementById('max-brush-size');
        if (maxBrushSizeInput && window.canvasManager) {
            maxBrushSizeInput.value = window.canvasManager.maxBrushSize;
            this.updateBrushSizePreview(window.canvasManager.maxBrushSize);
        }
        
        // 设置画笔粗细应用按钮的点击事件
        const applyBrushSizeBtn = document.getElementById('apply-brush-size');
        if (applyBrushSizeBtn) {
            // 移除已有的事件监听
            const newApplyBtn = applyBrushSizeBtn.cloneNode(true);
            applyBrushSizeBtn.parentNode.replaceChild(newApplyBtn, applyBrushSizeBtn);
            
            // 添加新的事件监听
            newApplyBtn.addEventListener('click', () => {
                this.applyMaxBrushSize();
            });
        }
        
        // 设置粗细输入框变化时更新预览
        if (maxBrushSizeInput) {
            maxBrushSizeInput.addEventListener('input', () => {
                const size = parseInt(maxBrushSizeInput.value);
                if (!isNaN(size) && size >= 5 && size <= 20) {
                    this.updateBrushSizePreview(size);
                }
            });
        }
    }
    
    // 隐藏管理员面板
    hidePanel() {
        document.getElementById('admin-panel').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
    }
    
    // 加载所有用户
    loadUsers() {
        this.usersRef.once('value', (snapshot) => {
            const users = snapshot.val() || {};
            this.renderUsers(users);
        });
    }
    
    // 渲染用户列表
    renderUsers(users) {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        
        Object.entries(users).forEach(([userId, userData]) => {
            const row = document.createElement('tr');
            
            // ID列
            const idCell = document.createElement('td');
            idCell.textContent = userId.substring(0, 8) + '...';
            idCell.title = userId;
            row.appendChild(idCell);
            
            // 昵称列
            const nicknameCell = document.createElement('td');
            nicknameCell.textContent = userData.nickname || '未知用户';
            row.appendChild(nicknameCell);
            
            // 类型列
            const typeCell = document.createElement('td');
            typeCell.textContent = this.getUserTypeText(userData.type);
            typeCell.classList.add('user-type');
            if (userData.type === 'admin') {
                typeCell.classList.add('admin-type');
            } else if (userData.type === 'vip') {
                typeCell.classList.add('vip-type');
            }
            row.appendChild(typeCell);
            
            // 操作列
            const actionCell = document.createElement('td');
            actionCell.classList.add('user-actions');
            
            // 操作按钮容器
            const actionBtnsContainer = document.createElement('div');
            actionBtnsContainer.classList.add('action-buttons');
            
            // 设置为管理员按钮
            if (userData.type !== 'admin') {
                const adminBtn = document.createElement('button');
                adminBtn.textContent = '设为管理员';
                adminBtn.className = 'admin-btn action-btn';
                adminBtn.title = '将用户提升为管理员';
                adminBtn.addEventListener('click', () => {
                    if (confirm(`确定将用户"${userData.nickname}"提升为管理员吗？`)) {
                        this.changeUserType(userId, 'admin');
                    }
                });
                actionBtnsContainer.appendChild(adminBtn);
            }
            
            // 设置为VIP按钮
            if (userData.type !== 'vip' && userData.type !== 'admin') {
                const vipBtn = document.createElement('button');
                vipBtn.textContent = '设为VIP';
                vipBtn.className = 'vip-btn action-btn';
                vipBtn.title = '将用户提升为VIP';
                vipBtn.addEventListener('click', () => {
                    if (confirm(`确定将用户"${userData.nickname}"提升为VIP吗？`)) {
                        this.changeUserType(userId, 'vip');
                    }
                });
                actionBtnsContainer.appendChild(vipBtn);
            }
            
            // 设置为普通用户按钮
            if (userData.type !== 'normal') {
                const normalBtn = document.createElement('button');
                normalBtn.textContent = '设为普通用户';
                normalBtn.className = 'normal-btn action-btn';
                normalBtn.title = '将用户降级为普通用户';
                normalBtn.addEventListener('click', () => {
                    if (confirm(`确定将用户"${userData.nickname}"降级为普通用户吗？`)) {
                        this.changeUserType(userId, 'normal');
                    }
                });
                actionBtnsContainer.appendChild(normalBtn);
            }
            
            // 删除用户按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除用户';
            deleteBtn.className = 'delete-btn action-btn';
            deleteBtn.title = '删除此用户';
            deleteBtn.addEventListener('click', () => {
                this.confirmDeleteUser(userId, userData.nickname);
            });
            actionBtnsContainer.appendChild(deleteBtn);
            
            actionCell.appendChild(actionBtnsContainer);
            row.appendChild(actionCell);
            tableBody.appendChild(row);
        });
    }
    
    // 更改用户类型
    changeUserType(userId, newType) {
        this.usersRef.child(userId).update({
            type: newType
        }).then(() => {
            this.loadUsers(); // 重新加载用户列表
        }).catch(error => {
            console.error("更改用户类型失败:", error);
        });
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
    
    // 搜索用户
    searchUsers(query) {
        if (!query) {
            this.loadUsers();
            return;
        }
        
        query = query.toLowerCase();
        
        this.usersRef.once('value', (snapshot) => {
            const users = snapshot.val() || {};
            const filteredUsers = {};
            
            Object.entries(users).forEach(([userId, userData]) => {
                const nickname = (userData.nickname || '').toLowerCase();
                
                if (nickname.includes(query) || userId.includes(query)) {
                    filteredUsers[userId] = userData;
                }
            });
            
            this.renderUsers(filteredUsers);
        });
    }
    
    // 确认删除用户
    confirmDeleteUser(userId, nickname) {
        // 创建确认对话框
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'confirm-dialog';
        confirmDialog.innerHTML = `
            <div class="confirm-dialog-content">
                <h3>确认删除用户</h3>
                <p>您确定要删除用户"${nickname}"吗？</p>
                <p class="warning">警告：此操作无法撤销，用户的所有数据将被永久删除！</p>
                <div class="confirm-actions">
                    <button id="cancel-delete" class="cancel-btn">取消</button>
                    <button id="confirm-delete" class="danger-btn">确认删除</button>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(confirmDialog);
        
        // 绑定事件
        document.getElementById('cancel-delete').addEventListener('click', () => {
            confirmDialog.remove();
        });
        
        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteUser(userId);
            confirmDialog.remove();
        });
    }
    
    // 删除用户
    deleteUser(userId) {
        // 获取用户在线状态引用
        const onlineUserRef = window.db.ref('online_users').child(userId);
        // 获取用户绘制限制引用
        const drawLimitRef = window.db.ref('draw_limits').child(userId);
        // 获取用户像素数据
        const pixelsRef = window.db.ref('pixels');
        
        // 显示加载指示器
        this.showLoadingMessage('正在删除用户数据...');
        
        // 首先查找并删除该用户创建的所有像素
        pixelsRef.orderByChild('userId').equalTo(userId).once('value', (snapshot) => {
            const pixelsToDelete = snapshot.val() || {};
            const pixelUpdates = {};
            
            // 为每个像素创建删除操作
            Object.keys(pixelsToDelete).forEach(key => {
                pixelUpdates[key] = null;
            });
            
            // 使用事务批量删除像素数据
            const deletePixels = pixelsToDelete && Object.keys(pixelsToDelete).length > 0 
                ? pixelsRef.update(pixelUpdates) 
                : Promise.resolve();
            
            // 删除用户数据（包括用户信息、在线状态、绘制限制和像素）
            Promise.all([
                this.usersRef.child(userId).remove(),
                onlineUserRef.remove(),
                drawLimitRef.remove(),
                deletePixels
            ]).then(() => {
                this.hideLoadingMessage();
                alert(`用户删除成功！${Object.keys(pixelsToDelete).length > 0 ? `\n同时删除了该用户的 ${Object.keys(pixelsToDelete).length} 个像素数据。` : ''}`);
                this.loadUsers(); // 重新加载用户列表
            }).catch(error => {
                this.hideLoadingMessage();
                console.error('删除用户失败:', error);
                alert('删除用户失败: ' + error.message);
            });
        }).catch(error => {
            this.hideLoadingMessage();
            console.error('查询用户像素数据失败:', error);
            alert('查询用户像素数据失败: ' + error.message);
        });
    }
    
    // 显示加载消息
    showLoadingMessage(message) {
        // 创建加载中指示器
        const loadingElement = document.createElement('div');
        loadingElement.id = 'admin-loading-indicator';
        loadingElement.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message || '正在处理...'}</p>
            </div>
        `;
        document.body.appendChild(loadingElement);
    }
    
    // 隐藏加载消息
    hideLoadingMessage() {
        const loadingElement = document.getElementById('admin-loading-indicator');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
    
    // 应用最大画笔粗细设置
    applyMaxBrushSize() {
        try {
            // 检查用户权限
            if (!window.userManager || !window.userManager.currentUser || 
                window.userManager.currentUser.type !== 'admin') {
                alert('只有管理员可以调整画笔粗细设置！');
                return;
            }
            
            const maxBrushSizeInput = document.getElementById('max-brush-size');
            if (!maxBrushSizeInput) {
                console.error("找不到最大画笔粗细输入框");
                return;
            }
            
            const newMaxSize = parseInt(maxBrushSizeInput.value);
            
            // 验证输入
            if (isNaN(newMaxSize) || newMaxSize < 5 || newMaxSize > 20) {
                alert('请输入有效的画笔粗细（5-20像素）');
                return;
            }
            
            // 更新CanvasManager中的设置
            if (window.canvasManager) {
                window.canvasManager.maxBrushSize = newMaxSize;
                window.canvasManager.saveMaxBrushSizeToStorage(newMaxSize);
                window.canvasManager.updateBrushOptions();
                
                // 同时保存到Firebase配置
                if (window.db) {
                    try {
                        // 创建或更新全局配置
                        const configRef = window.db.ref('config/brushSizes');
                        configRef.update({
                            maxSize: newMaxSize,
                            updatedBy: window.userManager.currentUser.id,
                            updatedAt: Date.now()
                        }).then(() => {
                            console.log("最大画笔粗细已保存到Firebase");
                        }).catch(err => {
                            console.error("保存到Firebase失败:", err);
                        });
                    } catch (firebaseError) {
                        console.error("保存配置到Firebase失败:", firebaseError);
                    }
                }
                
                alert(`最大画笔粗细已设置为 ${newMaxSize}px`);
                console.log("最大画笔粗细已更新:", newMaxSize);
            } else {
                alert('无法更新画笔设置：画布管理器不存在');
            }
        } catch (error) {
            console.error("应用画笔粗细设置失败:", error);
            alert('应用画笔粗细设置时出错，请查看控制台');
        }
    }
    
    // 更新画笔粗细预览
    updateBrushSizePreview(maxSize) {
        try {
            const previewContainer = document.getElementById('brush-size-preview');
            if (!previewContainer) {
                console.error("找不到画笔粗细预览容器");
                return;
            }
            
            // 清空预览容器
            previewContainer.innerHTML = '';
            
            // 添加常规用户可用的粗细预览（1-2px）
            this.createBrushPreviewItem(previewContainer, 1, '普通用户');
            this.createBrushPreviewItem(previewContainer, 2, '普通用户');
            
            // 添加VIP用户可用的粗细预览（3-4px）
            this.createBrushPreviewItem(previewContainer, 3, 'VIP');
            this.createBrushPreviewItem(previewContainer, 4, 'VIP');
            
            // 添加管理员可用的粗细预览（5px起）
            for (let size = 5; size <= maxSize; size++) {
                this.createBrushPreviewItem(previewContainer, size, '管理员');
            }
        } catch (error) {
            console.error("更新画笔粗细预览失败:", error);
        }
    }
    
    // 创建画笔粗细预览项
    createBrushPreviewItem(container, size, userType) {
        const item = document.createElement('div');
        item.className = 'brush-preview-item';
        
        const dot = document.createElement('div');
        dot.className = 'brush-preview-dot';
        dot.style.width = size * 2 + 'px';
        dot.style.height = size * 2 + 'px';
        
        const sizeText = document.createElement('div');
        sizeText.className = 'brush-preview-text';
        sizeText.textContent = size + 'px';
        
        const typeText = document.createElement('div');
        typeText.className = 'brush-preview-text';
        typeText.textContent = userType;
        typeText.style.color = userType === '管理员' ? '#9b59b6' : (userType === 'VIP' ? '#f1c40f' : '#777');
        
        item.appendChild(dot);
        item.appendChild(sizeText);
        item.appendChild(typeText);
        container.appendChild(item);
    }
}

// 确保AdminPanel类可用于全局
window.AdminPanel = AdminPanel;

// 初始化函数
function initAdminPanel() {
    console.log("准备初始化AdminPanel...");
    
    if (window.adminPanel) {
        console.log("AdminPanel已存在，跳过初始化");
        return;
    }
    
    try {
        window.adminPanel = new AdminPanel();
        window.adminPanel.init();
        console.log("AdminPanel初始化完成");
    } catch (e) {
        console.error("AdminPanel初始化失败:", e);
    }
}

// 立即自动执行初始化
// 监听DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM已加载完成，准备初始化AdminPanel");
    
    // 检查是否有userManager已就绪事件
    document.addEventListener('userManagerReady', () => {
        console.log("监听到userManagerReady事件，初始化AdminPanel");
        initAdminPanel();
    });
    
    // 立即尝试初始化
    setTimeout(() => {
        console.log("立即尝试初始化AdminPanel");
        initAdminPanel();
    }, 500);
    
    // 如果立即初始化失败，延迟再次尝试
    setTimeout(() => {
        if (!window.adminPanel) {
            console.log("延迟初始化AdminPanel");
            initAdminPanel();
        }
    }, 2000);
}); 