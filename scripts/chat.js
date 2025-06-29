/**
 * 聊天功能管理类
 */
class ChatManager {
    constructor() {
        this.chatMessages = [];
        this.messageLimit = 100; // 最大保留消息数
        this.unreadCount = 0;
        this.userId = null;
        this.userNickname = null;
        this.userType = 'user'; // 默认为普通用户
        this.isOpen = false;
        this.isInitialized = false; // 添加初始化标记
        
        // DOM元素
        this.chatBall = document.getElementById('chat-ball');
        this.chatContainer = document.querySelector('.chat-container');
        this.messagesContainer = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-message');
        this.minimizeButton = document.getElementById('minimize-chat');
        this.unreadBadge = document.querySelector('.unread-badge');
        
        // Firebase引用
        this.chatRef = null;
        
        // 初始化绑定事件
        this.bindEvents();
    }
    
    /**
     * 初始化聊天功能
     * @param {string} userId - 当前用户ID
     * @param {string} userNickname - 当前用户昵称
     * @param {string} userType - 用户类型 (user, vip, admin)
     */
    init(userId, userNickname, userType) {
        console.log("聊天管理器初始化...");
        
        // 如果已经初始化过且用户ID相同，则跳过重复初始化
        if (this.isInitialized && this.userId === userId) {
            console.log("聊天管理器已经初始化，跳过重复初始化");
            return;
        }
        
        this.userId = userId;
        this.userNickname = userNickname;
        this.userType = userType || 'user';
        
        // 清空消息容器
        this.messagesContainer.innerHTML = '';
        
        // 显示欢迎消息
        this.displaySystemMessage("欢迎来到聊天室！请友善交流。");
        this.displaySystemMessage("点击右下角蓝色聊天图标即可打开/关闭聊天窗口。");
        
        // 初始化Firebase聊天引用
        if (window.db) {
            // 先移除之前的所有监听器，避免重复监听导致消息显示两次
            if (this.chatRef) {
                this.chatRef.off();
            }
            
            this.chatRef = window.db.ref('chats');
            
            // 监听新消息
            this.chatRef.limitToLast(this.messageLimit).on('child_added', (snapshot) => {
                const message = snapshot.val();
                this.displayMessage(message);
                
                // 如果聊天窗口未打开，增加未读计数
                if (!this.isOpen) {
                    this.unreadCount++;
                    this.updateUnreadBadge();
                }
            });
            
            // 系统消息：用户加入
            this.sendSystemMessage(`${userNickname} 加入了聊天室`);
            
            // 标记为已初始化
            this.isInitialized = true;
        } else {
            console.error("Firebase数据库未初始化，聊天功能不可用");
            this.displaySystemMessage("聊天功能暂时不可用，请检查您的网络连接");
        }
        
        // 显示有新聊天功能的提示动画
        setTimeout(() => {
            // 先显示未读徽章提醒用户
            this.unreadCount = 1;
            this.updateUnreadBadge();
            
            // 短暂显示聊天窗口，然后关闭
            setTimeout(() => {
                this.toggleChat(true);
                setTimeout(() => {
                    this.toggleChat(false);
                    // 重置未读计数
                    setTimeout(() => {
                        this.unreadCount = 0;
                        this.updateUnreadBadge();
                    }, 3000);
                }, 3000);
            }, 1000);
        }, 2000);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 点击聊天球打开聊天窗口
        this.chatBall.addEventListener('click', () => {
            this.toggleChat(true);
        });
        
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // 输入框回车事件
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 最小化按钮点击事件
        this.minimizeButton.addEventListener('click', () => {
            this.toggleChat(false);
        });
        
        // 滚动到底部事件
        this.messagesContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                this.isScrolledToBottom = true;
            } else {
                this.isScrolledToBottom = false;
            }
        });
    }
    
    /**
     * 切换聊天窗口显示状态
     * @param {boolean} show - 是否显示
     */
    toggleChat(show) {
        this.isOpen = show;
        
        if (show) {
            this.chatContainer.classList.remove('hidden');
            // 重置未读计数
            this.unreadCount = 0;
            this.updateUnreadBadge();
            this.scrollToBottom();
            // 聊天窗口打开后自动聚焦输入框
            setTimeout(() => this.chatInput.focus(), 100);
        } else {
            this.chatContainer.classList.add('hidden');
        }
    }
    
    /**
     * 发送消息
     */
    sendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message || !this.userId) return;
        
        if (message.length > 100) {
            this.displaySystemMessage("消息过长，最多允许100个字符");
            return;
        }
        
        // 生成唯一消息ID
        const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const chatMessage = {
            userId: this.userId,
            sender: this.userNickname,
            userType: this.userType,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            messageId: messageId // 添加唯一消息ID
        };
        
        // 清空输入框（提前清空给用户更好的反馈）
        this.chatInput.value = '';
        
        // 确保Firebase数据库引用存在
        if (!window.db) {
            console.error("Firebase数据库未初始化");
            this.displaySystemMessage("发送失败：数据库连接异常");
            return;
        }
        
        // 确保聊天引用存在
        if (!this.chatRef) {
            this.chatRef = window.db.ref('chats');
        }
        
        // 发送到Firebase
        this.chatRef.push().set(chatMessage)
            .then(() => {
                console.log("消息发送成功");
                // 发送成功后聚焦回输入框
                this.chatInput.focus();
            })
            .catch(error => {
                console.error("发送消息失败:", error);
                this.displaySystemMessage("发送失败，请稍后重试");
                // 发送失败时恢复消息
                this.chatInput.value = message;
            });
    }
    
    /**
     * 发送系统消息
     * @param {string} message - 系统消息内容
     */
    sendSystemMessage(message) {
        // 确保Firebase数据库引用存在
        if (!window.db) {
            console.error("Firebase数据库未初始化");
            this.displaySystemMessage("系统消息发送失败：数据库连接异常");
            return;
        }
        
        // 确保聊天引用存在
        if (!this.chatRef) {
            this.chatRef = window.db.ref('chats');
        }
        
        // 生成唯一消息ID
        const messageId = 'sys-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const systemMessage = {
            isSystem: true,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            messageId: messageId // 添加唯一消息ID
        };
        
        this.chatRef.push().set(systemMessage)
            .catch(error => {
                console.error("发送系统消息失败:", error);
                this.displaySystemMessage("系统消息发送失败");
            });
    }
    
    /**
     * 显示消息
     * @param {Object} message - 消息对象
     */
    displayMessage(message) {
        // 检查是否已经显示过此消息
        if (message.messageId && this.chatMessages.includes(message.messageId)) {
            console.log("跳过重复消息:", message.messageId);
            return;
        }
        
        // 如果消息有ID，则将其添加到已显示消息列表
        if (message.messageId) {
            this.chatMessages.push(message.messageId);
            
            // 限制已处理消息的列表大小，避免内存增长过快
            if (this.chatMessages.length > this.messageLimit * 2) {
                this.chatMessages = this.chatMessages.slice(-this.messageLimit);
            }
        }
        
        const messageElement = document.createElement('div');
        const time = new Date(message.timestamp);
        const formattedTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        // 系统消息
        if (message.isSystem) {
            messageElement.className = 'system-message';
            messageElement.textContent = message.message;
        } 
        // 普通消息
        else {
            messageElement.className = 'chat-message';
            
            // 确定是自己的消息还是他人的消息
            const isOwnMessage = message.userId === this.userId;
            messageElement.classList.add(isOwnMessage ? 'message-own' : 'message-other');
            
            // 根据用户类型添加额外样式
            if (message.userType === 'vip') {
                messageElement.classList.add('message-vip');
            } else if (message.userType === 'admin') {
                messageElement.classList.add('message-admin');
            }
            
            // 添加发送者信息（非自己发送的消息）
            if (!isOwnMessage) {
                const senderElement = document.createElement('div');
                senderElement.className = 'message-sender';
                senderElement.textContent = message.sender;
                messageElement.appendChild(senderElement);
            }
            
            // 添加消息内容
            const contentElement = document.createElement('div');
            contentElement.className = 'message-content';
            contentElement.textContent = message.message;
            messageElement.appendChild(contentElement);
            
            // 添加消息时间
            const timeElement = document.createElement('div');
            timeElement.className = 'message-time';
            timeElement.textContent = formattedTime;
            messageElement.appendChild(timeElement);
        }
        
        // 添加到消息容器
        this.messagesContainer.appendChild(messageElement);
        
        // 自动滚动到底部
        this.scrollToBottom();
    }
    
    /**
     * 显示本地系统消息（不发送到服务器）
     * @param {string} message - 系统消息内容
     */
    displaySystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        messageElement.textContent = message;
        
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    /**
     * 更新未读消息徽章
     */
    updateUnreadBadge() {
        if (this.unreadCount > 0) {
            this.unreadBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.unreadBadge.classList.remove('hidden');
        } else {
            this.unreadBadge.classList.add('hidden');
        }
    }
    
    /**
     * 滚动到消息容器底部
     */
    scrollToBottom() {
        // 仅当用户已经在底部或者是自己发送的消息时才自动滚动
        if (this.isScrolledToBottom !== false) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    /**
     * 清理资源（页面关闭或用户登出时调用）
     */
    cleanup() {
        if (this.chatRef) {
            this.chatRef.off(); // 移除所有监听器
            
            // 发送用户离开消息
            if (this.userNickname) {
                this.sendSystemMessage(`${this.userNickname} 离开了聊天室`);
            }
        }
        
        // 重置初始化状态
        this.isInitialized = false;
        this.userId = null;
        this.userNickname = null;
        this.userType = 'user';
        this.unreadCount = 0;
        this.updateUnreadBadge();
        
        // 关闭聊天窗口
        this.toggleChat(false);
    }
}

// 创建全局聊天管理器实例
window.chatManager = new ChatManager(); 