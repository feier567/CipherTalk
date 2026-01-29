/**
 * HTML 导出生成器
 * 负责生成聊天记录的 HTML 展示页面
 * 使用外部资源引用，避免文件过大
 */

export interface HtmlExportMessage {
  timestamp: number
  sender: string
  senderName: string
  type: number
  content: string | null
  rawContent: string
  isSend: boolean
  chatRecords?: HtmlChatRecord[]
}

export interface HtmlChatRecord {
  sender: string
  senderDisplayName: string
  timestamp: number
  formattedTime: string
  type: string
  datatype: number
  content: string
  senderAvatar?: string
  fileExt?: string
  fileSize?: number
}

export interface HtmlMember {
  id: string
  name: string
  avatar?: string
}

export interface HtmlExportData {
  meta: {
    sessionId: string
    sessionName: string
    isGroup: boolean
    exportTime: number
    messageCount: number
    dateRange: { start: number; end: number } | null
  }
  members: HtmlMember[]
  messages: HtmlExportMessage[]
}

export class HtmlExportGenerator {
  /**
   * 生成 HTML 主文件（引用外部 CSS 和 JS）
   */
  static generateHtmlWithData(exportData: HtmlExportData): string {
    const escapedSessionName = this.escapeHtml(exportData.meta.sessionName)
    const dateRangeText = exportData.meta.dateRange 
      ? `${new Date(exportData.meta.dateRange.start * 1000).toLocaleDateString('zh-CN')} - ${new Date(exportData.meta.dateRange.end * 1000).toLocaleDateString('zh-CN')}`
      : ''
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedSessionName} - 聊天记录</title>
  <link rel="stylesheet" href="./styles.css">
  <style>
    /* 仅保留关键的内联样式，确保基本布局 */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapedSessionName}</h1>
      <div class="meta">
        <span>共 ${exportData.messages.length} 条消息</span>
        ${dateRangeText ? `<span> | ${dateRangeText}</span>` : ''}
      </div>
    </div>
    
    <div class="controls">
      <input type="text" id="searchInput" placeholder="搜索消息内容..." />
      <button onclick="app.searchMessages()">搜索</button>
      <button onclick="app.clearSearch()">清除</button>
      <div class="stats">
        <span id="messageStats">共 ${exportData.messages.length} 条消息</span>
        <span id="loadedStats"></span>
      </div>
    </div>
    
    <div id="scrollContainer" class="scroll-container">
      <div id="messagesContainer" class="messages">
        <div class="loading">正在加载聊天记录...</div>
      </div>
    </div>
    
    <div class="footer">
      由 CipherTalk 导出 | ${new Date(exportData.meta.exportTime).toLocaleString('zh-CN')}
    </div>
  </div>

  <script src="./data.js"></script>
  <script src="./app.js"></script>
</body>
</html>`;
  }

  /**
   * 生成外部 CSS 文件
   */
  static generateCss(): string {
    return `/* CipherTalk 聊天记录导出样式 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部样式 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 30px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: pulse 15s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.header h1 {
  font-size: 32px;
  margin-bottom: 12px;
  font-weight: 700;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.header .meta {
  font-size: 15px;
  opacity: 0.95;
  position: relative;
  z-index: 1;
}

/* 控制栏样式 */
.controls {
  position: sticky;
  top: 0;
  background: white;
  padding: 20px;
  border-bottom: 2px solid #f0f0f0;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.controls input[type="text"] {
  flex: 1;
  min-width: 250px;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.controls input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.controls button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.controls button:active {
  transform: translateY(0);
}

.controls .stats {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
  font-size: 14px;
  color: #666;
}

.controls .stats span {
  font-weight: 500;
}

/* 滚动容器 */
.scroll-container {
  height: calc(100vh - 280px);
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
}

.scroll-container::-webkit-scrollbar {
  width: 8px;
}

.scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 消息容器 */
.messages {
  padding: 20px;
  background: #fafafa;
}

.message-placeholder {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.loading,
.error,
.no-messages {
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
}

.loading {
  color: #999;
}

.error {
  color: #d32f2f;
}

.no-messages {
  color: #999;
}

/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 20px;
  opacity: 1;
  transition: opacity 0.2s;
}

.message:last-child {
  margin-bottom: 0;
}

.message.sent {
  flex-direction: row-reverse;
}

.message .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.message .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message .content-wrapper {
  max-width: 65%;
  margin: 0 10px;
}

.message.sent .content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message .sender-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
  line-height: 1.2;
}

.message .bubble {
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  position: relative;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
  max-width: 100%;
  line-height: 1.5;
}

.message .bubble:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.message.sent .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.message .time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  line-height: 1.2;
}

.message.sent .time {
  text-align: right;
}

/* 聊天记录引用 */
.chat-records {
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(0,0,0,0.04);
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.message.sent .chat-records {
  background: rgba(255,255,255,0.15);
  border-left-color: rgba(255,255,255,0.6);
}

.chat-records .title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #667eea;
  line-height: 1.2;
}

.message.sent .chat-records .title {
  color: rgba(255,255,255,0.95);
}

.chat-record-item {
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  line-height: 1.4;
}

.chat-record-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.chat-record-item .record-sender {
  font-weight: 600;
  color: #333;
}

.message.sent .chat-record-item .record-sender {
  color: rgba(255,255,255,0.95);
}

.chat-record-item .record-time {
  font-size: 10px;
  color: #999;
  margin-left: 8px;
}

.message.sent .chat-record-item .record-time {
  color: rgba(255,255,255,0.75);
}

.chat-record-item .record-content {
  margin-top: 2px;
  color: #666;
  line-height: 1.4;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.message.sent .chat-record-item .record-content {
  color: rgba(255,255,255,0.9);
}

/* 页脚 */
.footer {
  text-align: center;
  padding: 24px;
  color: #999;
  font-size: 13px;
  border-top: 2px solid #f0f0f0;
  background: #fafafa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }
  
  .container {
    border-radius: 12px;
  }
  
  .header {
    padding: 30px 20px;
  }
  
  .header h1 {
    font-size: 24px;
  }
  
  .controls {
    padding: 15px;
  }
  
  .controls input[type="text"] {
    min-width: 100%;
  }
  
  .controls .stats {
    width: 100%;
    justify-content: center;
    margin-left: 0;
    margin-top: 10px;
  }
  
  .scroll-container {
    height: calc(100vh - 320px);
  }
  
  .messages {
    padding: 20px 15px;
  }
  
  .message .content-wrapper {
    max-width: 75%;
  }
}

/* 打印样式 */
@media print {
  body {
    background: white;
    padding: 0;
  }
  
  .container {
    box-shadow: none;
    border-radius: 0;
  }
  
  .controls {
    display: none;
  }
  
  .message {
    page-break-inside: avoid;
  }
}`;
  }

  /**
   * 生成数据 JS 文件（作为全局变量）
   */
  static generateDataJs(exportData: HtmlExportData): string {
    return `// CipherTalk 聊天记录数据
window.CHAT_DATA = ${JSON.stringify(exportData, null, 2)};`;
  }

  /**
   * 生成外部 JavaScript 文件
   */
  static generateJs(): string {
    return `// CipherTalk 聊天记录导出应用

class ChatApp {
  constructor() {
    this.allData = window.CHAT_DATA;
    this.filteredMessages = this.allData.messages;
    
    // 无感加载配置
    this.batchSize = 30; // 每次加载30条
    this.loadedCount = 0; // 已加载数量
    this.isLoading = false; // 是否正在加载
    
    // DOM 元素
    this.scrollContainer = null;
    this.messagesContainer = null;
    this.loadMoreObserver = null;
    this.sentinel = null; // 哨兵元素
    
    this.init();
  }

  init() {
    try {
      if (!this.allData) {
        throw new Error('数据加载失败');
      }
      
      // 获取DOM元素
      this.scrollContainer = document.getElementById('scrollContainer');
      this.messagesContainer = document.getElementById('messagesContainer');
      
      // 清空容器
      this.messagesContainer.innerHTML = '';
      
      // 绑定事件
      this.bindEvents();
      
      // 设置 Intersection Observer（必须在 loadMoreMessages 之前）
      this.setupIntersectionObserver();
      
      // 初始加载
      this.loadMoreMessages();
      
      // 更新统计信息
      this.updateStats();
    } catch (error) {
      console.error('初始化失败:', error);
      document.getElementById('messagesContainer').innerHTML = 
        \`<div class="error">加载失败: \${error.message}</div>\`;
    }
  }

  bindEvents() {
    // 搜索框回车
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchMessages();
      }
    });
  }

  setupIntersectionObserver() {
    // 创建哨兵元素
    this.sentinel = document.createElement('div');
    this.sentinel.className = 'message-placeholder';
    this.sentinel.textContent = '加载中...';
    this.sentinel.style.display = 'none';
    
    // 创建 Intersection Observer
    this.loadMoreObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadMoreMessages();
        }
      });
    }, {
      root: this.scrollContainer,
      rootMargin: '200px', // 提前200px开始加载
      threshold: 0.1
    });
  }

  loadMoreMessages() {
    if (this.isLoading) return;
    if (this.loadedCount >= this.filteredMessages.length) {
      // 所有消息已加载完毕
      if (this.sentinel && this.sentinel.parentNode) {
        this.sentinel.remove();
      }
      return;
    }
    
    this.isLoading = true;
    
    // 计算本次加载的范围
    const start = this.loadedCount;
    const end = Math.min(start + this.batchSize, this.filteredMessages.length);
    const batch = this.filteredMessages.slice(start, end);
    
    // 创建文档片段
    const fragment = document.createDocumentFragment();
    
    // 渲染消息
    batch.forEach(msg => {
      const messageElement = this.createMessageElement(msg);
      fragment.appendChild(messageElement);
    });
    
    // 移除旧的哨兵
    if (this.sentinel && this.sentinel.parentNode) {
      this.sentinel.remove();
    }
    
    // 添加消息到容器
    this.messagesContainer.appendChild(fragment);
    
    // 更新已加载数量
    this.loadedCount = end;
    
    // 如果还有更多消息，添加哨兵
    if (this.loadedCount < this.filteredMessages.length) {
      this.sentinel.style.display = 'flex';
      this.messagesContainer.appendChild(this.sentinel);
      
      // 观察哨兵
      this.loadMoreObserver.observe(this.sentinel);
    }
    
    this.isLoading = false;
    this.updateStats();
  }

  createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = msg.isSend ? 'message sent' : 'message';
    div.innerHTML = this.renderMessage(msg);
    return div;
  }

  renderMessage(msg) {
    const member = this.allData.members.find(m => m.id === msg.sender);
    const senderName = member ? member.name : msg.senderName;
    const avatar = member && member.avatar ? member.avatar : null;
    const time = new Date(msg.timestamp * 1000).toLocaleString('zh-CN');
    
    // 生成头像
    let avatarHtml = '';
    if (avatar) {
      avatarHtml = \`<img src="\${this.escapeHtml(avatar)}" alt="\${this.escapeHtml(senderName)}" onerror="this.style.display='none';this.parentElement.textContent='\${senderName.charAt(0).toUpperCase()}'" />\`;
    } else {
      avatarHtml = senderName.charAt(0).toUpperCase();
    }
    
    // 生成消息内容
    let contentHtml = msg.content ? this.escapeHtml(msg.content) : '<em style="opacity:0.6">无内容</em>';
    
    // 如果有聊天记录，添加聊天记录展示
    let chatRecordsHtml = '';
    if (msg.chatRecords && msg.chatRecords.length > 0) {
      chatRecordsHtml = '<div class="chat-records">';
      chatRecordsHtml += '<div class="title">📋 聊天记录引用</div>';
      for (const record of msg.chatRecords) {
        chatRecordsHtml += \`
          <div class="chat-record-item">
            <div>
              <span class="record-sender">\${this.escapeHtml(record.senderDisplayName)}</span>
              <span class="record-time">\${this.escapeHtml(record.formattedTime)}</span>
            </div>
            <div class="record-content">\${this.escapeHtml(record.content)}</div>
          </div>
        \`;
      }
      chatRecordsHtml += '</div>';
    }
    
    return \`
      <div class="avatar">\${avatarHtml}</div>
      <div class="content-wrapper">
        <div class="sender-name">\${this.escapeHtml(senderName)}</div>
        <div class="bubble">
          \${contentHtml}
          \${chatRecordsHtml}
        </div>
        <div class="time">\${time}</div>
      </div>
    \`;
  }

  searchMessages() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) {
      this.filteredMessages = this.allData.messages;
    } else {
      this.filteredMessages = this.allData.messages.filter(msg => {
        // 搜索消息内容
        if (msg.content && msg.content.toLowerCase().includes(keyword)) {
          return true;
        }
        // 搜索发送者名称
        const member = this.allData.members.find(m => m.id === msg.sender);
        const senderName = member ? member.name : msg.senderName;
        if (senderName.toLowerCase().includes(keyword)) {
          return true;
        }
        // 搜索聊天记录内容
        if (msg.chatRecords) {
          for (const record of msg.chatRecords) {
            if (record.content.toLowerCase().includes(keyword) ||
                record.senderDisplayName.toLowerCase().includes(keyword)) {
              return true;
            }
          }
        }
        return false;
      });
    }
    
    // 重置并重新加载
    this.reset();
  }

  clearSearch() {
    document.getElementById('searchInput').value = '';
    this.filteredMessages = this.allData.messages;
    this.reset();
  }

  reset() {
    // 停止观察
    if (this.loadMoreObserver && this.sentinel && this.sentinel.parentNode) {
      this.loadMoreObserver.unobserve(this.sentinel);
    }
    
    // 清空容器
    this.messagesContainer.innerHTML = '';
    
    // 重置状态
    this.loadedCount = 0;
    this.isLoading = false;
    
    // 滚动到顶部
    this.scrollContainer.scrollTop = 0;
    
    // 重新设置观察器（必须在 loadMoreMessages 之前）
    this.setupIntersectionObserver();
    
    // 重新加载
    this.loadMoreMessages();
  }

  updateStats() {
    const totalCount = this.filteredMessages.length;
    document.getElementById('messageStats').textContent = \`共 \${totalCount} 条消息\`;
    document.getElementById('loadedStats').textContent = \`已加载 \${this.loadedCount} 条\`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化应用
const app = new ChatApp();`;
  }

  /**
   * 生成数据 JSON 文件
   */
  static generateDataJson(exportData: HtmlExportData): string {
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * HTML 转义
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }
}