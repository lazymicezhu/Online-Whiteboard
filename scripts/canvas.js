// 确保用全局变量定义canvasManager
window.canvasManager = null;

// 像素画布管理模块
class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        
        try {
            // 确保db已经定义
            if (typeof window.db === 'undefined') {
                console.error("错误: window.db未定义，尝试初始化Firebase");
                if (typeof window.initFirebase === 'function') {
                    window.initFirebase();
                }
                // 即使初始化失败，依然继续尝试创建
                if (typeof window.db === 'undefined') {
                    console.warn("Firebase初始化后仍然无法获取db，将在init中重试");
                }
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
            
            // 检查本地存储中的画布尺寸
            try {
                const savedSize = localStorage.getItem('canvasSize');
                if (savedSize) {
                    const sizeData = JSON.parse(savedSize);
                    // 先更新全局配置
                    if (sizeData.width && sizeData.height) {
                        window.CANVAS_CONFIG.width = sizeData.width;
                        window.CANVAS_CONFIG.height = sizeData.height;
                        console.log("从本地存储恢复画布尺寸配置:", sizeData.width, "x", sizeData.height);
                    }
                }
            } catch (e) {
                console.error("读取本地画布尺寸失败:", e);
            }
            
            // 只有在db存在时才设置引用
            if (window.db) {
                this.pixelsRef = window.db.ref('pixels');
            } else {
                this.pixelsRef = null;
            }
            
            this.pixelSize = window.CANVAS_CONFIG.pixelSize;
            this.canvasWidth = window.CANVAS_CONFIG.width;
            this.canvasHeight = window.CANVAS_CONFIG.height;
            this.isDrawing = false;
            this.currentColor = '#000000';
            this.currentTool = 'draw';
            this.currentBrushSize = 1; // 默认画笔粗细为1
            this.maxBrushSize = 5; // 默认最大画笔粗细为5像素
            this.lastPixel = null;
            this.pixelBuffer = {}; // 用于批量更新像素
            this.bufferTimer = null;
            this.drawCount = 0; // 当前操作计数（连续操作为1次）
            this.isPanelMinimized = false; // 面板是否最小化
            this.zoomLevel = 1; // 默认缩放级别为1倍
            
            // 存储监听器引用，用于清理
            this.pixelListeners = {
                added: null,
                changed: null,
                removed: null
            };
            
            console.log("CanvasManager实例已创建");
        } catch (e) {
            console.error("创建CanvasManager实例时发生错误:", e);
        }
    }

    // 初始化画布
    init() {
        try {
            console.log("初始化画布...");
            
            // 从本地存储加载画布尺寸
            this.loadCanvasSizeFromStorage();
            
            // 从本地存储加载最大画笔粗细设置
            this.loadMaxBrushSizeFromStorage();
            
            // 检查是否处于离线模式
            if (window.OFFLINE_MODE) {
                console.log("系统处于离线模式，画布将以本地模式运行");
                this.pixelsRef = null; // 确保没有Firebase引用
            } else {
                // 再次检查数据库引用是否存在，如果不存在则尝试创建
                if (!this.pixelsRef && window.db) {
                    try {
                        this.pixelsRef = window.db.ref('pixels');
                        console.log("已创建pixels引用");
                    } catch (dbError) {
                        console.error("创建pixels引用失败:", dbError);
                        this.pixelsRef = null;
                    }
                }
            }
            
            // 确保userManager已经定义
            if (typeof window.userManager === 'undefined' || window.userManager === null) {
                console.error("userManager未定义，无法初始化画布");
                setTimeout(() => this.init(), 1000); // 1秒后重试
                return;
            }
            
            this.canvas = document.getElementById('pixel-canvas');
            if (!this.canvas) {
                console.error("找不到画布元素!");
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            
            // 设置canvas尺寸
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            
            // 绘制空白画布
            this.clearCanvas();
            
            // 从本地存储加载缩放级别
            try {
                const savedZoom = localStorage.getItem('canvasZoom');
                if (savedZoom) {
                    this.zoomLevel = parseFloat(savedZoom);
                    // 确保缩放级别在合法范围（50%-300%）
                    this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel));
                    console.log("从本地存储加载缩放级别:", this.zoomLevel);
                    
                    // 立即应用缩放 - 需要等待canvas元素完全加载
                    setTimeout(() => {
                        if (this.canvas) {
                            this.canvas.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
                            console.log("初始化应用缩放:", this.zoomLevel, this.canvas.style.transform);
                            // 绘制画布边框
                            this.drawCanvasBorder();
                        }
                    }, 100);
                }
            } catch (e) {
                console.error("加载缩放级别失败:", e);
            }
            
            // 添加滚动提示
            this.setupScrollIndicators();
            
            // 监听用户登录完成事件
            document.addEventListener('userLoginComplete', (event) => {
                console.log("收到用户登录完成事件，重新初始化画布交互", event.detail);
                // 重新设置画布事件
                this.setupEventListeners();
                // 重新加载像素数据
                if (this.pixelsRef && !window.OFFLINE_MODE) {
                    this.loadPixels();
                } else {
                    this.loadLocalPixels();
                }
                // 更新工具权限
                if (window.userManager) {
                    window.userManager.updateBrushSizePermissions();
                }
                // 确保画布边框显示
                this.drawCanvasBorder();
            });
            
            // 检查用户是否已登录
            const isUserLoggedIn = window.userManager && window.userManager.currentUser;
            
            // 监听画布点击和拖动
            if (isUserLoggedIn) {
                console.log("用户已登录，设置画布事件监听");
                this.setupEventListeners();
            } else {
                console.log("用户未登录，暂不设置画布事件监听");
                // 添加一个覆盖层，显示"请先登录"
                this.showLoginOverlay();
            }
            
            // 本地像素存储，用于离线模式
            this.localPixels = {};
            
            // 只有当pixelsRef存在并且不在离线模式时才设置Firebase监听
            if (this.pixelsRef && !window.OFFLINE_MODE) {
                try {
                    // 监听Firebase中的像素变化
                    this.listenToPixelChanges();
                } catch (firebaseError) {
                    console.error("设置Firebase监听失败:", firebaseError);
                    // 切换到本地模式
                    window.OFFLINE_MODE = true;
                }
                
                if (isUserLoggedIn) {
                    try {
                        // 加载已有像素
                        this.loadPixels();
                    } catch (loadError) {
                        console.error("加载像素数据失败:", loadError);
                        // 切换到本地模式
                        window.OFFLINE_MODE = true;
                    }
                }
            } else {
                // 在离线模式下，尝试从本地存储加载像素
                this.loadLocalPixels();
            }
            
            // 设置颜色选择器
            this.setupColorPicker();
            
            // 设置工具选择器
            this.setupToolPicker();
            
            // 设置画笔大小选择器
            this.setupBrushSizePicker();
            
            // 设置面板交互
            this.setupPanelInteractions();
            
            // 设置画布尺寸管理
            this.setupCanvasSizeManager();
            
            // 设置缩放控制
            this.setupZoomControls();
            
            console.log("画布初始化完成");
            
            // 强制刷新缩放，确保画布缩放正确应用
            this.forceRefreshZoom();
            
            // 确保画笔选项已更新
            this.updateBrushOptions();
        } catch (error) {
            console.error("画布初始化失败:", error);
        }
    }

    // 清除画布
    clearCanvas() {
        if (!this.ctx || !this.canvas) {
            console.error("无法清除画布：上下文或画布不存在");
            return;
        }
        
        // 填充白色背景
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线以便于定位（可选）
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        // 水平网格线
        for (let y = 0; y <= this.canvas.height; y += this.pixelSize * 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 垂直网格线
        for (let x = 0; x <= this.canvas.width; x += this.pixelSize * 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
    }

    // 设置事件监听
    setupEventListeners() {
        // 首先移除登录提示（如果有）
        this.removeLoginOverlay();
        
        // 确保用户已登录
        if (!window.userManager || !window.userManager.currentUser) {
            console.error("用户未登录，无法设置画布事件");
            this.showLoginOverlay();
            return;
        }
        
        console.log("为画布设置事件监听器...");
        
        // 移除可能存在的旧事件监听器
        this.canvas.removeEventListener('mousedown', this._mouseDownHandler);
        this.canvas.removeEventListener('mousemove', this._mouseMoveHandler);
        window.removeEventListener('mouseup', this._mouseUpHandler);
        this.canvas.removeEventListener('touchstart', this._touchStartHandler);
        this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
        this.canvas.removeEventListener('touchend', this._touchEndHandler);
        
        // 定义事件处理函数并保存引用，便于移除
        this._mouseDownHandler = (e) => {
            this.isDrawing = true;
            this.drawPixel(e);
        };
        
        this._mouseMoveHandler = (e) => {
            if (this.isDrawing) {
                this.drawPixel(e);
            }
        };
        
        this._mouseUpHandler = () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.lastPixel = null;
                this.flushPixelBuffer(); // 确保所有像素都被保存
                this.drawCount = 0; // 重置操作计数
            }
        };
        
        this._touchStartHandler = (e) => {
            e.preventDefault();
            this.isDrawing = true;
            this.drawPixel(this.getTouchPos(e));
        };
        
        this._touchMoveHandler = (e) => {
            e.preventDefault();
            if (this.isDrawing) {
                this.drawPixel(this.getTouchPos(e));
            }
        };
        
        this._touchEndHandler = () => {
            this.isDrawing = false;
            this.lastPixel = null;
            this.flushPixelBuffer(); // 确保所有像素都被保存
            this.drawCount = 0; // 重置操作计数
        };
        
        // 添加新的事件监听器
        this.canvas.addEventListener('mousedown', this._mouseDownHandler);
        this.canvas.addEventListener('mousemove', this._mouseMoveHandler);
        window.addEventListener('mouseup', this._mouseUpHandler);
        this.canvas.addEventListener('touchstart', this._touchStartHandler);
        this.canvas.addEventListener('touchmove', this._touchMoveHandler);
        this.canvas.addEventListener('touchend', this._touchEndHandler);
        
        console.log("画布事件监听器设置完成");
    }

    // 获取触摸位置
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        
        // 计算相对于canvas中心的偏移
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 计算触摸点相对于canvas中心的偏移，并考虑缩放因素
        const relativeX = (touch.clientX - centerX) / this.zoomLevel;
        const relativeY = (touch.clientY - centerY) / this.zoomLevel;
        
        // 创建一个模拟事件对象，包含必要的信息
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            // 添加计算好的canvas相对位置，便于直接使用
            canvasX: this.canvas.width / 2 + relativeX,
            canvasY: this.canvas.height / 2 + relativeY
        };
    }

    // 设置颜色选择器
    setupColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // 移除之前的选中效果
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                
                // 添加选中效果
                e.target.classList.add('selected');
                
                // 设置当前颜色
                this.currentColor = e.target.dataset.color;
                
                // 更新颜色预览
                document.getElementById('current-color').style.backgroundColor = this.currentColor;
                
                // 更新最小化面板中的颜色
                const miniColor = document.getElementById('mini-color');
                if (miniColor) {
                    miniColor.style.backgroundColor = this.currentColor;
                }
            });
        });
        
        // 默认选中第一个颜色
        if (colorOptions.length > 0) {
            colorOptions[0].click();
        }
    }

    // 设置工具选择器
    setupToolPicker() {
        const tools = document.querySelectorAll('.tool');
        
        tools.forEach(tool => {
            tool.addEventListener('click', (e) => {
                // 移除之前的选中效果
                tools.forEach(t => t.classList.remove('active'));
                
                // 添加选中效果
                e.target.classList.add('active');
                
                // 设置当前工具
                this.currentTool = e.target.dataset.tool;
                
                // 检查权限
                if (this.currentTool === 'erase') {
                    // 安全获取用户权限
                    let canErase = false;
                    
                    try {
                        if (window.userManager && typeof window.userManager.canErasePixels === 'function') {
                            canErase = window.userManager.canErasePixels();
                        }
                    } catch (error) {
                        console.error("检查擦除权限时出错:", error);
                        canErase = false;
                    }
                    
                    if (!canErase) {
                        alert('只有VIP用户和管理员可以使用擦除工具！');
                        // 切换回绘制工具
                        document.getElementById('draw-tool').click();
                    }
                }
            });
        });
    }

    // 绘制像素
    drawPixel(e) {
        try {
            // 获取鼠标位置
            const rect = this.canvas.getBoundingClientRect();
            
            // 计算相对于canvas中心的偏移
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // 计算鼠标相对于canvas中心的偏移，考虑缩放因素
            const relativeX = (e.clientX - centerX) / this.zoomLevel;
            const relativeY = (e.clientY - centerY) / this.zoomLevel;
            
            // 计算像素坐标（加上canvas尺寸的一半，将原点移到左上角）
            const x = Math.floor((this.canvas.width / 2 + relativeX) / this.pixelSize);
            const y = Math.floor((this.canvas.height / 2 + relativeY) / this.pixelSize);
            
            // 检查范围
            if (x < 0 || y < 0 || x >= this.canvasWidth / this.pixelSize || y >= this.canvasHeight / this.pixelSize) {
                return;
            }
            
            // 检查是否和上次绘制的像素相同
            const pixelKey = `${x},${y}`;
            if (this.lastPixel === pixelKey) {
                return;
            }
            
            // 如果是新的操作（不是连续的拖动）
            if (this.drawCount === 0) {
                // 安全获取用户管理器并检查绘制次数
                if (window.userManager && typeof window.userManager.consumeDraw === 'function') {
                    // 检查用户是否有足够的绘制次数
                    if (!window.userManager.consumeDraw()) {
                        this.isDrawing = false;
                        alert('你的绘制次数已用完，请等待刷新！');
                        return;
                    }
                } else {
                    console.warn("无法检查用户绘制次数限制，继续绘制");
                }
                
                this.drawCount++;
            }
            
            // 记录当前像素
            this.lastPixel = pixelKey;
            
            // 根据画笔粗细绘制像素
            const color = this.currentTool === 'draw' ? this.currentColor : '#FFFFFF';
            this.drawPixelWithSize(x, y, this.currentBrushSize, color);
            
        } catch (error) {
            console.error("绘制像素时发生错误:", error, error.stack);
            this.isDrawing = false;
        }
    }
    
    // 根据画笔粗细绘制像素
    drawPixelWithSize(centerX, centerY, size, color) {
        // 计算画笔覆盖范围
        const startX = centerX - Math.floor(size / 2);
        const startY = centerY - Math.floor(size / 2);
        
        // 遍历覆盖范围内的所有像素
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const pixelX = startX + x;
                const pixelY = startY + y;
                
                // 检查范围
                if (pixelX < 0 || pixelY < 0 || pixelX >= this.canvasWidth / this.pixelSize || pixelY >= this.canvasHeight / this.pixelSize) {
                    continue;
                }
                
                // 绘制像素
                this.ctx.fillStyle = color;
                this.ctx.fillRect(pixelX * this.pixelSize, pixelY * this.pixelSize, this.pixelSize, this.pixelSize);
                
                // 将像素添加到缓冲区
                this.addToPixelBuffer(pixelX, pixelY, color);
            }
        }
    }

    // 添加像素到缓冲区
    addToPixelBuffer(x, y, color) {
        // 使用坐标作为键
        const key = `${x},${y}`;
        
        try {
            // 检查用户是否存在
            if (!window.userManager || !window.userManager.currentUser) {
                console.error("添加像素失败: 用户未登录");
                return;
            }
            
            // 添加到缓冲区
            this.pixelBuffer[key] = {
                x: x,
                y: y,
                color: color,
                userId: window.userManager.currentUser.id,
                timestamp: Date.now()
            };
            
            // 设置一个延迟保存，以避免频繁更新数据库
            if (this.bufferTimer) {
                clearTimeout(this.bufferTimer);
            }
            
            this.bufferTimer = setTimeout(() => {
                this.flushPixelBuffer();
            }, 500); // 500毫秒后保存
        } catch (error) {
            console.error("添加像素到缓冲区失败:", error);
        }
    }

    // 将缓冲区的像素保存到Firebase
    flushPixelBuffer() {
        // 检查是否有像素需要保存
        if (Object.keys(this.pixelBuffer).length === 0) {
            return;
        }
        
        // 检查是否处于离线模式
        if (window.OFFLINE_MODE) {
            try {
                // 更新本地像素存储
                Object.keys(this.pixelBuffer).forEach(key => {
                    const pixel = this.pixelBuffer[key];
                    if (pixel.color) {
                        this.localPixels[key] = pixel;
                    } else {
                        delete this.localPixels[key]; // 擦除像素
                    }
                });
                
                // 保存到本地存储
                this.saveLocalPixels();
                
                // 清空缓冲区
                this.pixelBuffer = {};
                return;
            } catch (error) {
                console.error("保存像素到本地存储失败:", error);
                this.pixelBuffer = {}; // 清空缓冲区
                return;
            }
        }
        
        // 检查Firebase引用是否存在
        if (!this.pixelsRef) {
            console.error("保存像素失败: Firebase引用不存在");
            this.pixelBuffer = {}; // 清空缓冲区
            return;
        }
        
        try {
            // 批量更新
            const updates = {};
            
            Object.keys(this.pixelBuffer).forEach(key => {
                const pixel = this.pixelBuffer[key];
                updates[key] = pixel.color ? pixel : null; // 如果color为null，则擦除该像素（设为null）
            });
            
            // 保存到Firebase
            this.pixelsRef.update(updates)
                .catch(error => {
                    console.error("保存像素到Firebase失败:", error);
                    // 切换到本地模式并保存
                    window.OFFLINE_MODE = true;
                    this.flushPixelBuffer();
                });
            
            // 清空缓冲区
            this.pixelBuffer = {};
        } catch (error) {
            console.error("保存像素数据时发生错误:", error);
            this.pixelBuffer = {}; // 清空缓冲区
            
            // 切换到本地模式
            window.OFFLINE_MODE = true;
        }
    }

    // 监听Firebase中的像素变化
    listenToPixelChanges() {
        // 移除任何现有的监听器
        this.removePixelListeners();
        
        // 监听添加的像素
        this.pixelListeners.added = this.pixelsRef.on('child_added', (snapshot) => {
            const key = snapshot.key;
            const pixel = snapshot.val();
            
            // 绘制像素
            if (pixel && pixel.color) {
                const [x, y] = key.split(',').map(Number);
                this.ctx.fillStyle = pixel.color;
                this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
            }
        });
        
        // 监听更改的像素
        this.pixelListeners.changed = this.pixelsRef.on('child_changed', (snapshot) => {
            const key = snapshot.key;
            const pixel = snapshot.val();
            const [x, y] = key.split(',').map(Number);
            
            // 绘制像素
            this.ctx.fillStyle = pixel.color;
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        });
        
        // 监听删除的像素（擦除）
        this.pixelListeners.removed = this.pixelsRef.on('child_removed', (snapshot) => {
            const key = snapshot.key;
            const [x, y] = key.split(',').map(Number);
            
            // 使用白色填充（擦除）
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        });
    }

    // 移除像素监听器
    removePixelListeners() {
        try {
            if (this.pixelsRef) {
                if (this.pixelListeners.added) {
                    this.pixelsRef.off('child_added', this.pixelListeners.added);
                }
                if (this.pixelListeners.changed) {
                    this.pixelsRef.off('child_changed', this.pixelListeners.changed);
                }
                if (this.pixelListeners.removed) {
                    this.pixelsRef.off('child_removed', this.pixelListeners.removed);
                }
            }
            
            // 重置监听器引用
            this.pixelListeners = {
                added: null,
                changed: null,
                removed: null
            };
        } catch (error) {
            console.error("移除像素监听器时出错:", error);
        }
    }

    // 加载已有像素
    loadPixels() {
        // 使用once而不是on，避免持续监听
        this.pixelsRef.once('value', (snapshot) => {
            try {
                // 获取所有像素数据
                const pixels = snapshot.val() || {};
                
                // 绘制所有像素
                Object.keys(pixels).forEach(key => {
                    const pixel = pixels[key];
                    const [x, y] = key.split(',').map(Number);
                    
                    if (pixel && pixel.color) {
                        this.ctx.fillStyle = pixel.color;
                        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
                    }
                });
            } catch (error) {
                console.error("处理像素数据时出错:", error);
            }
        }).catch(error => {
            console.error("加载像素数据失败:", error);
        });
    }

    // 加载本地保存的像素
    loadLocalPixels() {
        try {
            const savedPixels = localStorage.getItem('localPixels');
            if (savedPixels) {
                this.localPixels = JSON.parse(savedPixels);
                console.log("从本地存储加载了像素数据");
                
                // 绘制所有本地像素
                Object.keys(this.localPixels).forEach(key => {
                    const pixel = this.localPixels[key];
                    const [x, y] = key.split(',').map(Number);
                    
                    if (pixel && pixel.color) {
                        this.ctx.fillStyle = pixel.color;
                        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
                    }
                });
            } else {
                console.log("没有找到本地保存的像素数据");
            }
        } catch (error) {
            console.error("加载本地像素数据失败:", error);
        }
    }
    
    // 保存像素到本地存储
    saveLocalPixels() {
        try {
            localStorage.setItem('localPixels', JSON.stringify(this.localPixels));
            console.log("像素数据已保存到本地存储");
        } catch (error) {
            console.error("保存像素数据到本地存储失败:", error);
        }
    }

    // 添加一个方法显示登录提示覆盖层
    showLoginOverlay() {
        // 检查是否已存在覆盖层
        if (document.getElementById('login-overlay')) {
            return;
        }
        
        // 创建一个覆盖层
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 18px;
            z-index: 1000;
        `;
        overlay.innerHTML = `
            <div style="text-align: center; background: #333; padding: 20px; border-radius: 10px;">
                <p>请先登录或注册后再开始绘画</p>
                <button id="goto-login-btn" style="margin-top: 10px; padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">返回登录页面</button>
            </div>
        `;
        
        // 添加到画布容器
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(overlay);
            
            // 添加按钮点击事件
            document.getElementById('goto-login-btn').addEventListener('click', () => {
                document.getElementById('main-container').classList.add('hidden');
                document.getElementById('auth-container').classList.remove('hidden');
                // 确保显示登录表单
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-tab-btn').classList.add('active');
                document.getElementById('register-tab-btn').classList.remove('active');
                overlay.remove();
            });
        }
    }

    // 移除登录提示覆盖层
    removeLoginOverlay() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // 设置画笔粗细选择
    setupBrushSizePicker() {
        const brushOptions = document.querySelectorAll('.brush-option');
        
        // 更新画笔选项
        this.updateBrushOptions();
        
        // 已有的事件监听不需要再添加了，因为我们在updateBrushOptions中创建选项时已经添加了事件
    }
    
    // 添加从本地存储加载最大画笔粗细的方法
    loadMaxBrushSizeFromStorage() {
        try {
            // 首先尝试从Firebase加载全局设置
            if (window.db && !window.OFFLINE_MODE) {
                const configRef = window.db.ref('config/brushSizes');
                configRef.once('value')
                    .then(snapshot => {
                        const config = snapshot.val();
                        if (config && config.maxSize) {
                            const maxSize = parseInt(config.maxSize);
                            if (!isNaN(maxSize) && maxSize >= 5 && maxSize <= 20) {
                                this.maxBrushSize = maxSize;
                                console.log("从Firebase加载最大画笔粗细:", this.maxBrushSize);
                                
                                // 同步保存到本地存储以便离线使用
                                this.saveMaxBrushSizeToStorage(maxSize);
                                
                                // 更新画笔选项
                                this.updateBrushOptions();
                                return;
                            }
                        }
                        
                        // 如果Firebase中没有设置或加载失败，尝试从本地存储加载
                        this.loadMaxBrushSizeFromLocalStorage();
                    })
                    .catch(error => {
                        console.error("从Firebase加载画笔设置失败:", error);
                        // 回退到本地存储
                        this.loadMaxBrushSizeFromLocalStorage();
                    });
            } else {
                // 离线模式下直接从本地存储加载
                this.loadMaxBrushSizeFromLocalStorage();
            }
        } catch (error) {
            console.error("加载最大画笔粗细失败:", error);
            // 确保有默认值
            this.maxBrushSize = 5;
        }
    }
    
    // 从本地存储加载最大画笔粗细
    loadMaxBrushSizeFromLocalStorage() {
        try {
            const savedMaxBrushSize = localStorage.getItem('maxBrushSize');
            if (savedMaxBrushSize) {
                const maxSize = parseInt(savedMaxBrushSize);
                if (!isNaN(maxSize) && maxSize >= 5 && maxSize <= 20) {
                    this.maxBrushSize = maxSize;
                    console.log("从本地存储加载最大画笔粗细:", this.maxBrushSize);
                }
            }
        } catch (error) {
            console.error("从本地存储加载最大画笔粗细失败:", error);
        }
    }
    
    // 保存最大画笔粗细到本地存储
    saveMaxBrushSizeToStorage(maxSize) {
        try {
            localStorage.setItem('maxBrushSize', maxSize.toString());
            console.log("最大画笔粗细已保存到本地存储:", maxSize);
        } catch (error) {
            console.error("保存最大画笔粗细到本地存储失败:", error);
        }
    }
    
    // 根据最大粗细更新画笔选项
    updateBrushOptions() {
        try {
            // 清除现有的画笔选项
            const brushOptionsContainer = document.querySelector('.brush-options');
            if (!brushOptionsContainer) {
                console.error("找不到画笔选项容器");
                return;
            }
            
            brushOptionsContainer.innerHTML = '';
            
            // 创建画笔选项（1px始终可用）
            this.createBrushOption(brushOptionsContainer, 1, false, false);
            this.createBrushOption(brushOptionsContainer, 2, false, false);
            
            // 3-4px为VIP选项
            this.createBrushOption(brushOptionsContainer, 3, true, false);
            this.createBrushOption(brushOptionsContainer, 4, true, false);
            
            // 5px及以上为管理员选项
            for (let size = 5; size <= this.maxBrushSize; size++) {
                this.createBrushOption(brushOptionsContainer, size, false, true);
            }
            
            // 默认选中1px
            const defaultOption = brushOptionsContainer.querySelector('[data-size="1"]');
            if (defaultOption) {
                defaultOption.classList.add('active');
            }
            
            // 更新权限
            if (window.userManager) {
                window.userManager.updateBrushSizePermissions();
            }
            
            console.log("画笔选项已更新，最大粗细:", this.maxBrushSize);
        } catch (error) {
            console.error("更新画笔选项失败:", error);
        }
    }
    
    // 创建画笔选项元素
    createBrushOption(container, size, isVipOnly, isAdminOnly) {
        const option = document.createElement('button');
        option.className = 'brush-option';
        option.dataset.size = size;
        
        // 添加权限类
        if (isVipOnly) {
            option.classList.add('vip-only');
        } else if (isAdminOnly) {
            option.classList.add('admin-only');
        }
        
        // 添加内部元素
        const preview = document.createElement('div');
        preview.className = 'brush-preview';
        preview.style.width = size + 'px';
        preview.style.height = size + 'px';
        
        const sizeText = document.createElement('span');
        sizeText.textContent = size + 'px';
        
        // 添加权限标签
        if (isVipOnly || isAdminOnly) {
            const badge = document.createElement('span');
            badge.className = 'restriction-badge';
            badge.textContent = isVipOnly ? 'VIP' : '管理员';
            option.appendChild(badge);
        }
        
        option.appendChild(preview);
        option.appendChild(sizeText);
        container.appendChild(option);
        
        // 添加点击事件
        option.addEventListener('click', () => {
            if (this.currentBrushSize !== size) {
                const isEnabled = option.classList.contains('enabled');
                
                if ((isVipOnly || isAdminOnly) && !isEnabled) {
                    if (isVipOnly) {
                        alert('只有VIP用户和管理员可以使用该画笔粗细！');
                    } else if (isAdminOnly) {
                        alert('只有管理员可以使用该画笔粗细！');
                    }
                    return;
                }
                
                // 移除其他选项的选中状态
                const allOptions = container.querySelectorAll('.brush-option');
                allOptions.forEach(opt => opt.classList.remove('active'));
                
                // 设置当前选项为选中状态
                option.classList.add('active');
                
                // 更新当前画笔粗细
                this.currentBrushSize = size;
                
                // 更新最小化面板中的显示
                const miniBrush = document.getElementById('mini-brush');
                if (miniBrush) {
                    miniBrush.textContent = size;
                }
                
                console.log(`画笔粗细设置为: ${size}px`);
            }
        });
    }
    
    // 设置浮动面板交互
    setupPanelInteractions() {
        // 最小化按钮点击事件
        const minimizeBtn = document.getElementById('minimize-panel');
        const expandBtn = document.getElementById('expand-panel');
        const panelContent = document.querySelector('.panel-content');
        const minimizedPanel = document.querySelector('.minimized-panel');
        const floatingPanel = document.querySelector('.floating-tools-panel');
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                panelContent.classList.add('hidden');
                minimizedPanel.classList.remove('hidden');
                floatingPanel.style.width = 'auto';
                this.isPanelMinimized = true;
            });
        }
        
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                minimizedPanel.classList.add('hidden');
                panelContent.classList.remove('hidden');
                floatingPanel.style.width = '260px';
                this.isPanelMinimized = false;
            });
        }
        
        // 最小化面板中的工具点击
        const miniColor = document.getElementById('mini-color');
        const miniBrush = document.getElementById('mini-brush');
        
        if (miniColor) {
            miniColor.addEventListener('click', () => {
                // 展开面板
                minimizedPanel.classList.add('hidden');
                panelContent.classList.remove('hidden');
                floatingPanel.style.width = '260px';
                this.isPanelMinimized = false;
                
                // 滚动到颜色选择部分
                const colorPicker = document.querySelector('.color-picker');
                if (colorPicker) {
                    setTimeout(() => {
                        colorPicker.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            });
        }
        
        if (miniBrush) {
            miniBrush.addEventListener('click', () => {
                // 展开面板
                minimizedPanel.classList.add('hidden');
                panelContent.classList.remove('hidden');
                floatingPanel.style.width = '260px';
                this.isPanelMinimized = false;
                
                // 滚动到画笔粗细部分
                const brushSize = document.querySelector('.brush-size');
                if (brushSize) {
                    setTimeout(() => {
                        brushSize.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            });
        }
        
        // 初始化最小化面板中的状态
        if (miniColor) {
            miniColor.style.backgroundColor = this.currentColor;
        }
        
        if (miniBrush) {
            miniBrush.textContent = this.currentBrushSize;
        }
    }
    
    // 设置画布大小管理功能
    setupCanvasSizeManager() {
        const canvasWidthInput = document.getElementById('canvas-width');
        const canvasHeightInput = document.getElementById('canvas-height');
        const applyButton = document.getElementById('apply-canvas-size');
        
        if (!canvasWidthInput || !canvasHeightInput || !applyButton) {
            return;
        }
        
        // 从本地存储加载保存的画布尺寸
        this.loadCanvasSizeFromStorage();
        
        // 初始化输入框的值
        canvasWidthInput.value = this.canvasWidth;
        canvasHeightInput.value = this.canvasHeight;
        
        // 绑定应用按钮的点击事件
        applyButton.addEventListener('click', () => {
            // 检查用户权限
            if (!window.userManager || !window.userManager.currentUser || 
                window.userManager.currentUser.type !== 'admin') {
                alert('只有管理员可以调整画布大小！');
                return;
            }
            
            const newWidth = parseInt(canvasWidthInput.value);
            const newHeight = parseInt(canvasHeightInput.value);
            
            // 验证输入
            if (isNaN(newWidth) || isNaN(newHeight) || 
                newWidth < 500 || newWidth > 3000 || 
                newHeight < 500 || newHeight > 3000) {
                alert('请输入有效的画布尺寸（宽高均在500-3000像素之间）');
                return;
            }
            
            // 确认是否要缩小画布
            const isShrinking = newWidth < this.canvasWidth || newHeight < this.canvasHeight;
            if (isShrinking) {
                if (!confirm('缩小画布可能会导致边缘像素丢失，确定要继续吗？')) {
                    return;
                }
            }
            
            // 保存当前画布内容
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0);
            
            // 调整画布大小
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.canvasWidth = newWidth;
            this.canvasHeight = newHeight;
            
            // 清空画布
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 将原内容绘制到新画布上（居中）
            const offsetX = Math.floor((newWidth - tempCanvas.width) / 2);
            const offsetY = Math.floor((newHeight - tempCanvas.height) / 2);
            this.ctx.drawImage(tempCanvas, 
                               Math.max(0, offsetX), 
                               Math.max(0, offsetY));
            
            // 更新Firebase/本地存储中的像素数据
            this.resizePixelData(tempCanvas.width, tempCanvas.height, offsetX, offsetY);
            
            // 更新配置
            window.CANVAS_CONFIG.width = newWidth;
            window.CANVAS_CONFIG.height = newHeight;
            
            // 保存尺寸到本地存储
            this.saveCanvasSizeToStorage(newWidth, newHeight);
            
            alert(`画布大小已调整为 ${newWidth}x${newHeight} 像素`);
        });
    }
    
    // 保存画布尺寸到本地存储
    saveCanvasSizeToStorage(width, height) {
        try {
            localStorage.setItem('canvasSize', JSON.stringify({
                width: width,
                height: height,
                timestamp: Date.now()
            }));
            console.log("画布尺寸已保存到本地存储:", width, "x", height);
        } catch (error) {
            console.error("保存画布尺寸到本地存储失败:", error);
        }
    }
    
    // 从本地存储加载画布尺寸
    loadCanvasSizeFromStorage() {
        try {
            const savedSize = localStorage.getItem('canvasSize');
            if (savedSize) {
                const sizeData = JSON.parse(savedSize);
                console.log("从本地存储加载画布尺寸:", sizeData.width, "x", sizeData.height);
                
                if (sizeData.width && sizeData.height) {
                    this.canvasWidth = sizeData.width;
                    this.canvasHeight = sizeData.height;
                    
                    // 更新全局配置
                    window.CANVAS_CONFIG.width = sizeData.width;
                    window.CANVAS_CONFIG.height = sizeData.height;
                    
                    // 如果画布已创建，则立即调整尺寸
                    if (this.canvas) {
                        this.canvas.width = sizeData.width;
                        this.canvas.height = sizeData.height;
                        // 重新绘制白色背景
                        this.clearCanvas();
                    }
                }
            }
        } catch (error) {
            console.error("加载画布尺寸失败:", error);
        }
    }
    
    // 在调整画布大小后更新像素数据
    resizePixelData(oldWidth, oldHeight, offsetX, offsetY) {
        if (window.OFFLINE_MODE) {
            // 本地模式下更新本地存储
            const newLocalPixels = {};
            
            // 将原有像素移动到新位置
            Object.entries(this.localPixels).forEach(([key, pixel]) => {
                const [x, y] = key.split(',').map(Number);
                
                // 计算新坐标
                const newX = x + offsetX;
                const newY = y + offsetY;
                
                // 检查是否在新画布范围内
                if (newX >= 0 && newX < this.canvasWidth / this.pixelSize && 
                    newY >= 0 && newY < this.canvasHeight / this.pixelSize) {
                    // 更新像素坐标
                    const newKey = `${newX},${newY}`;
                    newLocalPixels[newKey] = {
                        ...pixel,
                        x: newX,
                        y: newY
                    };
                }
            });
            
            // 保存新的像素数据
            this.localPixels = newLocalPixels;
            this.saveLocalPixels();
        } else if (this.pixelsRef) {
            // Firebase模式下更新数据库
            // 先获取所有像素
            this.pixelsRef.once('value', snapshot => {
                const pixels = snapshot.val() || {};
                const updates = {};
                
                // 为移除范围外的像素做准备
                Object.keys(pixels).forEach(key => {
                    updates[key] = null; // 标记为删除
                });
                
                // 将像素移动到新位置
                Object.entries(pixels).forEach(([key, pixel]) => {
                    const [x, y] = key.split(',').map(Number);
                    
                    // 计算新坐标
                    const newX = x + offsetX;
                    const newY = y + offsetY;
                    
                    // 检查是否在新画布范围内
                    if (newX >= 0 && newX < this.canvasWidth / this.pixelSize && 
                        newY >= 0 && newY < this.canvasHeight / this.pixelSize) {
                        // 创建新像素数据
                        const newKey = `${newX},${newY}`;
                        updates[newKey] = {
                            ...pixel,
                            x: newX,
                            y: newY
                        };
                    }
                });
                
                // 批量更新数据库
                this.pixelsRef.update(updates).catch(error => {
                    console.error("更新像素数据失败:", error);
                });
            });
        }
    }

    // 设置画布缩放控制
    setupZoomControls() {
        // 获取缩放控制元素
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');
        const zoomReset = document.getElementById('zoom-reset');
        const zoomLevel = document.getElementById('zoom-level');
        const canvasContainer = document.querySelector('.canvas-container');
        
        if (!zoomIn || !zoomOut || !zoomReset || !zoomLevel || !canvasContainer) {
            console.error("找不到缩放控制元素");
            return;
        }
        
        // 应用缩放
        const applyZoom = () => {
            try {
                // 更新显示
                zoomLevel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
                
                // 应用缩放 - 直接修改DOM元素的transform属性
                this.canvas.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
                console.log("应用缩放级别:", this.zoomLevel, "transform:", this.canvas.style.transform);
                
                // 更新边框
                this.drawCanvasBorder();
                
                // 保存当前缩放级别到本地存储
                localStorage.setItem('canvasZoom', this.zoomLevel.toString());
            } catch (e) {
                console.error("应用缩放时出错:", e);
            }
        };
        
        // 从本地存储加载缩放级别
        try {
            const savedZoom = localStorage.getItem('canvasZoom');
            if (savedZoom) {
                this.zoomLevel = parseFloat(savedZoom);
                // 确保缩放级别在合法范围（50%-300%）
                this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel));
                console.log("从本地存储加载缩放级别:", this.zoomLevel);
            }
        } catch (e) {
            console.error("加载缩放级别失败:", e);
        }
        
        // 放大按钮点击事件
        zoomIn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("缩放按钮点击 - 放大");
            try {
                // 直接获取当前缩放并修改
                if (window.canvasManager) {
                    if (window.canvasManager.zoomLevel < 3) {
                        window.canvasManager.zoomLevel = Math.min(3, parseFloat((window.canvasManager.zoomLevel + 0.1).toFixed(1)));
                        console.log("缩放级别更新为:", window.canvasManager.zoomLevel);
                        
                        // 直接更新DOM
                        const canvas = document.getElementById('pixel-canvas');
                        if (canvas) {
                            canvas.style.transform = `translate(-50%, -50%) scale(${window.canvasManager.zoomLevel})`;
                            console.log("画布transform已设置为:", canvas.style.transform);
                        }
                        
                        // 更新边框和显示
                        window.canvasManager.drawCanvasBorder();
                        zoomLevel.textContent = `${Math.round(window.canvasManager.zoomLevel * 100)}%`;
                        
                        // 保存缩放级别
                        localStorage.setItem('canvasZoom', window.canvasManager.zoomLevel.toString());
                    }
                }
            } catch (err) {
                console.error("放大按钮处理错误:", err);
            }
        });
        
        // 缩小按钮点击事件
        zoomOut.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("缩放按钮点击 - 缩小");
            try {
                // 直接获取当前缩放并修改
                if (window.canvasManager) {
                    if (window.canvasManager.zoomLevel > 0.5) {
                        window.canvasManager.zoomLevel = Math.max(0.5, parseFloat((window.canvasManager.zoomLevel - 0.1).toFixed(1)));
                        console.log("缩放级别更新为:", window.canvasManager.zoomLevel);
                        
                        // 直接更新DOM
                        const canvas = document.getElementById('pixel-canvas');
                        if (canvas) {
                            canvas.style.transform = `translate(-50%, -50%) scale(${window.canvasManager.zoomLevel})`;
                            console.log("画布transform已设置为:", canvas.style.transform);
                        }
                        
                        // 更新边框和显示
                        window.canvasManager.drawCanvasBorder();
                        zoomLevel.textContent = `${Math.round(window.canvasManager.zoomLevel * 100)}%`;
                        
                        // 保存缩放级别
                        localStorage.setItem('canvasZoom', window.canvasManager.zoomLevel.toString());
                    }
                }
            } catch (err) {
                console.error("缩小按钮处理错误:", err);
            }
        });
        
        // 重置按钮点击事件
        zoomReset.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("缩放按钮点击 - 重置");
            try {
                // 直接重置缩放
                if (window.canvasManager) {
                    window.canvasManager.zoomLevel = 1;
                    console.log("缩放级别重置为:", window.canvasManager.zoomLevel);
                    
                    // 直接更新DOM
                    const canvas = document.getElementById('pixel-canvas');
                    if (canvas) {
                        canvas.style.transform = `translate(-50%, -50%) scale(${window.canvasManager.zoomLevel})`;
                        console.log("画布transform已设置为:", canvas.style.transform);
                    }
                    
                    // 更新边框和显示
                    window.canvasManager.drawCanvasBorder();
                    zoomLevel.textContent = `${Math.round(window.canvasManager.zoomLevel * 100)}%`;
                    
                    // 保存缩放级别
                    localStorage.setItem('canvasZoom', window.canvasManager.zoomLevel.toString());
                }
            } catch (err) {
                console.error("重置按钮处理错误:", err);
            }
        });
        
        // 也支持滚轮缩放
        canvasContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey) { // 仅当按下Ctrl键时才进行缩放
                e.preventDefault();
                console.log("滚轮缩放 - 前:", this.zoomLevel);
                
                if (e.deltaY < 0 && this.zoomLevel < 3) { // 向上滚动，放大
                    this.zoomLevel = Math.min(3, parseFloat((this.zoomLevel + 0.1).toFixed(1)));
                } else if (e.deltaY > 0 && this.zoomLevel > 0.5) { // 向下滚动，缩小
                    this.zoomLevel = Math.max(0.5, parseFloat((this.zoomLevel - 0.1).toFixed(1)));
                }
                
                console.log("滚轮缩放 - 后:", this.zoomLevel);
                applyZoom();
            }
        });
        
        // 初始化应用缩放
        applyZoom();
        console.log("缩放控制初始化完成");
    }

    // 设置滚动提示指示器
    setupScrollIndicators() {
        const canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) return;
        
        // 创建滚动提示元素
        const indicators = {
            right: this.createScrollIndicator('scroll-right', '向右滚动 →'),
            left: this.createScrollIndicator('scroll-left', '← 向左滚动'),
            down: this.createScrollIndicator('scroll-down', '向下滚动 ↓'),
            up: this.createScrollIndicator('scroll-up', '↑ 向上滚动')
        };
        
        // 添加到容器
        Object.values(indicators).forEach(indicator => {
            canvasContainer.appendChild(indicator);
        });
        
        // 监听滚动事件
        canvasContainer.addEventListener('scroll', () => {
            this.updateScrollIndicators(canvasContainer, indicators);
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.updateScrollIndicators(canvasContainer, indicators);
        });
        
        // 在画布大小变化时也更新
        this.canvas.addEventListener('load', () => {
            this.updateScrollIndicators(canvasContainer, indicators);
        });
        
        // 初始调用一次
        setTimeout(() => {
            this.updateScrollIndicators(canvasContainer, indicators);
        }, 500);
    }
    
    // 创建滚动提示元素
    createScrollIndicator(className, text) {
        const indicator = document.createElement('div');
        indicator.className = `scroll-indicator ${className}`;
        indicator.textContent = text;
        return indicator;
    }
    
    // 更新滚动提示显示状态
    updateScrollIndicators(container, indicators) {
        // 计算是否需要滚动
        const needsHorizontalScroll = container.scrollWidth > container.clientWidth;
        const needsVerticalScroll = container.scrollHeight > container.clientHeight;
        
        // 根据当前滚动位置确定哪个方向可以滚动
        const canScrollRight = needsHorizontalScroll && container.scrollLeft < container.scrollWidth - container.clientWidth - 10;
        const canScrollLeft = needsHorizontalScroll && container.scrollLeft > 10;
        const canScrollDown = needsVerticalScroll && container.scrollTop < container.scrollHeight - container.clientHeight - 10;
        const canScrollUp = needsVerticalScroll && container.scrollTop > 10;
        
        // 更新指示器显示状态
        indicators.right.classList.toggle('visible', canScrollRight);
        indicators.left.classList.toggle('visible', canScrollLeft);
        indicators.down.classList.toggle('visible', canScrollDown);
        indicators.up.classList.toggle('visible', canScrollUp);
        
        // 3秒后自动隐藏
        if (this._hideIndicatorsTimeout) {
            clearTimeout(this._hideIndicatorsTimeout);
        }
        
        this._hideIndicatorsTimeout = setTimeout(() => {
            Object.values(indicators).forEach(indicator => {
                indicator.classList.remove('visible');
            });
        }, 3000);
    }

    // 绘制画布边框
    drawCanvasBorder() {
        try {
            // 创建一个边框容器元素
            let borderContainer = document.getElementById('canvas-border-container');
            
            if (!borderContainer) {
                borderContainer = document.createElement('div');
                borderContainer.id = 'canvas-border-container';
                borderContainer.style.position = 'absolute';
                borderContainer.style.top = '50%';
                borderContainer.style.left = '50%';
                borderContainer.style.pointerEvents = 'none'; // 不阻挡鼠标事件
                
                const canvasContainer = document.querySelector('.canvas-container');
                if (canvasContainer) {
                    canvasContainer.style.position = 'relative';
                    canvasContainer.appendChild(borderContainer);
                }
            }
            
            // 调整边框容器大小
            borderContainer.style.width = `${this.canvas.width}px`;
            borderContainer.style.height = `${this.canvas.height}px`;
            borderContainer.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
            
            console.log("绘制边框，缩放级别:", this.zoomLevel, "transform:", borderContainer.style.transform);
            
            // 设置边框样式
            borderContainer.style.boxShadow = '0 0 0 2px rgba(65, 105, 225, 0.8), 0 0 0 4px rgba(255, 255, 255, 0.6), 0 0 10px rgba(0, 0, 0, 0.3)';
            borderContainer.style.borderRadius = '4px';
            
            // 添加网格背景，使画布边界更明显
            borderContainer.style.background = 'linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.05) 75%), linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.05) 75%)';
            borderContainer.style.backgroundSize = '20px 20px';
            borderContainer.style.backgroundPosition = '0 0, 10px 10px';
            borderContainer.style.boxSizing = 'border-box';
            
            // 监听窗口大小变化，更新边框位置
            if (!window._canvasBorderResizeListenerAdded) {
                window.addEventListener('resize', () => {
                    this.updateCanvasBorder();
                });
                window._canvasBorderResizeListenerAdded = true;
            }
        } catch (e) {
            console.error("绘制边框时出错:", e);
        }
    }
    
    // 更新画布边框
    updateCanvasBorder() {
        // 延迟执行以确保DOM已更新
        setTimeout(() => {
            const borderContainer = document.getElementById('canvas-border-container');
            if (borderContainer && this.canvas) {
                // 更新边框容器大小和位置
                borderContainer.style.width = `${this.canvas.width}px`;
                borderContainer.style.height = `${this.canvas.height}px`;
                borderContainer.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
            }
        }, 100);
    }

    // 设置完所有控件后添加这个函数调用
    forceRefreshZoom() {
        setTimeout(() => {
            try {
                console.log("强制刷新缩放，当前级别:", this.zoomLevel);
                // 应用缩放
                if (this.canvas) {
                    this.canvas.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel})`;
                    console.log("画布transform已设置为:", this.canvas.style.transform);
                    this.drawCanvasBorder();
                }
                
                // 更新显示
                const zoomLevel = document.getElementById('zoom-level');
                if (zoomLevel) {
                    zoomLevel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
                }
            } catch (e) {
                console.error("强制刷新缩放失败:", e);
            }
        }, 300);
    }
}

// 等待页面和firebase加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化函数之前，先设置页面卸载事件，确保清理所有监听器
    window.addEventListener('beforeunload', function() {
        // 清理所有Firebase监听器
        if (window.canvasManager) {
            try {
                window.canvasManager.removePixelListeners();
            } catch (error) {
                console.error("页面卸载时清理监听器失败:", error);
            }
        }
        
        // 离线处理
        if (window.db) {
            try {
                window.db.goOffline();
            } catch (error) {
                console.error("设置数据库离线时出错:", error);
            }
        }
    });
    
    console.log("DOMContentLoaded: 准备初始化canvasManager");
    
    // 初始化函数
    function initCanvasManager() {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && 
                typeof window.db !== 'undefined' && typeof window.CANVAS_CONFIG !== 'undefined' && 
                typeof window.userManager !== 'undefined') {
                console.log("Firebase和userManager已准备好，创建canvasManager");
                window.canvasManager = new CanvasManager();
                console.log("canvasManager已创建:", window.canvasManager);
                window.canvasManager.init();
            } else {
                console.log("依赖尚未准备好，尝试初始化Firebase");
                
                // 尝试初始化Firebase
                if (typeof window.initFirebase === 'function') {
                    window.initFirebase();
                    console.log("已尝试初始化Firebase，等待userManager就绪");
                }
                
                console.log("等待后再初始化canvasManager");
                setTimeout(initCanvasManager, 1000);
            }
        } catch (e) {
            console.error("初始化canvasManager失败:", e);
            setTimeout(initCanvasManager, 1500);
        }
    }
    
    // 创建一个自定义事件，用于userManager就绪时通知
    document.addEventListener('userManagerReady', function() {
        console.log("收到userManager就绪事件，初始化canvasManager");
        window.canvasManager = new CanvasManager();
        window.canvasManager.init();
    });
    
    // 如果userManager已就绪，则直接创建canvasManager
    if (window.userManager && window.db) {
        console.log("userManager已就绪，直接创建canvasManager");
        window.canvasManager = new CanvasManager();
        window.canvasManager.init();
    } else {
        // 否则启动初始化流程
        setTimeout(initCanvasManager, 1500);
    }
}); 