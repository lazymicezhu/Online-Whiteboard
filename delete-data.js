// Firebase数据库临时清理脚本
// 使用方法: 
// 1. 将此文件添加到项目中
// 2. 在index.html中临时引入此脚本: <script src="delete-data.js"></script>
// 3. 在浏览器控制台中调用相应的函数: clearPixels(), clearChats()等
// 4. 完成后记得从index.html中移除此脚本

// 检查用户是否为管理员
function isAdmin() {
  try {
    // 检查userManager和当前用户是否存在
    if (!window.userManager || !window.userManager.currentUser) {
      console.error('❌ 用户未登录，请先登录');
      return false;
    }
    
    // 检查用户类型
    if (window.userManager.currentUser.type !== 'admin') {
      console.error('❌ 权限不足，只有管理员可以执行数据清理操作');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ 检查管理员权限时出错:', error);
    return false;
  }
}

// 删除所有像素数据
function clearPixels() {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm('警告：此操作将删除所有像素数据，且无法恢复！是否继续？')) {
    console.log('操作已取消');
    return;
  }
  
  try {
    console.log('正在删除像素数据...');
    
    // 使用管理员ID作为auth参数
    const adminId = window.userManager.currentUser.id;
    
    // 获取所有像素数据，然后逐个删除
    firebase.database().ref('pixels').once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 标记所有像素为null
        snapshot.forEach(child => {
          updates[child.key] = null;
          count++;
        });
        
        // 批量更新（删除）
        if (count > 0) {
          return firebase.database().ref('pixels').update(updates)
            .then(() => console.log(`✅ 已成功删除${count}个像素`))
            .catch(error => console.error('❌ 批量删除像素失败:', error));
        } else {
          console.log('没有找到像素数据');
        }
      })
      .catch(error => console.error('❌ 获取像素数据失败:', error));
  } catch (error) {
    console.error('❌ 执行删除像素数据操作时出错:', error);
  }
}

// 删除所有聊天数据
function clearChats() {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm('警告：此操作将删除所有聊天记录，且无法恢复！是否继续？')) {
    console.log('操作已取消');
    return;
  }
  
  try {
    console.log('正在删除聊天记录...');
    
    // 获取所有聊天数据，然后逐个删除
    firebase.database().ref('chats').once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 标记所有聊天记录为null
        snapshot.forEach(child => {
          updates[child.key] = null;
          count++;
        });
        
        // 批量更新（删除）
        if (count > 0) {
          return firebase.database().ref('chats').update(updates)
            .then(() => console.log(`✅ 已成功删除${count}条聊天记录`))
            .catch(error => console.error('❌ 批量删除聊天记录失败:', error));
        } else {
          console.log('没有找到聊天记录');
        }
      })
      .catch(error => console.error('❌ 获取聊天记录失败:', error));
  } catch (error) {
    console.error('❌ 执行删除聊天记录操作时出错:', error);
  }
}

// 删除所有在线用户数据
function clearOnlineUsers() {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm('警告：此操作将删除所有在线用户记录，会强制所有用户下线！是否继续？')) {
    console.log('操作已取消');
    return;
  }
  
  try {
    console.log('正在删除在线用户记录...');
    
    // 获取所有在线用户数据，然后逐个删除
    firebase.database().ref('online_users').once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 标记所有在线用户记录为null
        snapshot.forEach(child => {
          updates[child.key] = null;
          count++;
        });
        
        // 批量更新（删除）
        if (count > 0) {
          return firebase.database().ref('online_users').update(updates)
            .then(() => console.log(`✅ 已成功删除${count}个在线用户记录`))
            .catch(error => console.error('❌ 批量删除在线用户记录失败:', error));
        } else {
          console.log('没有找到在线用户记录');
        }
      })
      .catch(error => console.error('❌ 获取在线用户记录失败:', error));
  } catch (error) {
    console.error('❌ 执行删除在线用户记录操作时出错:', error);
  }
}

// 删除所有绘制限制数据
function clearDrawLimits() {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm('警告：此操作将删除所有绘制限制记录，可能导致用户短时间内过度绘制！是否继续？')) {
    console.log('操作已取消');
    return;
  }
  
  try {
    console.log('正在删除绘制限制记录...');
    
    // 获取所有绘制限制数据，然后逐个删除
    firebase.database().ref('draw_limits').once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 标记所有绘制限制记录为null
        snapshot.forEach(child => {
          updates[child.key] = null;
          count++;
        });
        
        // 批量更新（删除）
        if (count > 0) {
          return firebase.database().ref('draw_limits').update(updates)
            .then(() => console.log(`✅ 已成功删除${count}个绘制限制记录`))
            .catch(error => console.error('❌ 批量删除绘制限制记录失败:', error));
        } else {
          console.log('没有找到绘制限制记录');
        }
      })
      .catch(error => console.error('❌ 获取绘制限制记录失败:', error));
  } catch (error) {
    console.error('❌ 执行删除绘制限制记录操作时出错:', error);
  }
}

// 根据时间删除旧像素数据
function clearOldPixels(daysOld = 30) {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm(`警告：此操作将删除${daysOld}天前的所有像素数据，且无法恢复！是否继续？`)) {
    console.log('操作已取消');
    return;
  }
  
  try {
    // 计算时间阈值
    const now = Date.now();
    const timeThreshold = now - (daysOld * 24 * 60 * 60 * 1000); // 转换天数为毫秒
    console.log(`开始清理${new Date(timeThreshold).toISOString()}之前的像素数据...`);
    
    // 获取所有像素
    firebase.database().ref('pixels').once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 检查每个像素的时间戳
        snapshot.forEach(childSnapshot => {
          const pixel = childSnapshot.val();
          if (pixel && pixel.timestamp && pixel.timestamp < timeThreshold) {
            updates[childSnapshot.key] = null; // 标记为删除
            count++;
          }
        });
        
        // 如果有需要删除的数据，执行批量删除
        if (count > 0) {
          return firebase.database().ref('pixels').update(updates)
            .then(() => console.log(`✅ 已成功清理${count}个旧像素数据`))
            .catch(error => console.error('❌ 批量删除旧像素数据失败:', error));
        } else {
          console.log('没有找到需要清理的旧像素数据');
          return Promise.resolve();
        }
      })
      .catch(error => console.error('❌ 清理旧像素数据失败:', error));
  } catch (error) {
    console.error('❌ 执行清理旧像素数据操作时出错:', error);
  }
}

// 根据时间删除旧聊天数据
function clearOldChats(daysOld = 7) {
  // 验证管理员权限
  if (!isAdmin()) return;
  
  if (!confirm(`警告：此操作将删除${daysOld}天前的所有聊天记录，且无法恢复！是否继续？`)) {
    console.log('操作已取消');
    return;
  }
  
  try {
    // 计算时间阈值
    const now = Date.now();
    const timeThreshold = now - (daysOld * 24 * 60 * 60 * 1000); // 转换天数为毫秒
    console.log(`开始清理${new Date(timeThreshold).toISOString()}之前的聊天记录...`);
    
    // 查询旧聊天
    firebase.database().ref('chats').orderByChild('timestamp').endAt(timeThreshold).once('value')
      .then(snapshot => {
        const updates = {};
        let count = 0;
        
        // 标记要删除的聊天
        snapshot.forEach(childSnapshot => {
          updates[childSnapshot.key] = null; // 标记为删除
          count++;
        });
        
        // 如果有需要删除的数据，执行批量删除
        if (count > 0) {
          return firebase.database().ref('chats').update(updates)
            .then(() => console.log(`✅ 已成功清理${count}个旧聊天记录`))
            .catch(error => console.error('❌ 批量删除旧聊天记录失败:', error));
        } else {
          console.log('没有找到需要清理的旧聊天记录');
          return Promise.resolve();
        }
      })
      .catch(error => console.error('❌ 清理旧聊天记录失败:', error));
  } catch (error) {
    console.error('❌ 执行清理旧聊天记录操作时出错:', error);
  }
}

// 显示可用的清理功能
console.log('Firebase数据库清理工具已加载，可使用以下函数:');
console.log('clearPixels() - 删除所有像素数据');
console.log('clearChats() - 删除所有聊天记录');
console.log('clearOnlineUsers() - 删除所有在线用户记录');
console.log('clearDrawLimits() - 删除所有绘制限制记录');
console.log('clearOldPixels(days) - 删除指定天数前的像素数据，默认30天');
console.log('clearOldChats(days) - 删除指定天数前的聊天记录，默认7天');
console.log('警告: 这些操作无法撤销，请谨慎使用！'); 