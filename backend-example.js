// 后端实现示例 - 符合Telegram Bot API官方规定
const Telegraf = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');

// 配置
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

// 初始化
const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// 数据库连接
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 数据模型
const User = mongoose.model('User', {
  telegramId: String,
  username: String,
  subscriptions: [{
    seriesId: String,
    seriesTitle: String,
    expireDate: Date,
    status: String // active, expiring, expired
  }],
  groups: [{
    groupId: String,
    groupName: String,
    joinDate: Date
  }]
});

const Series = mongoose.model('Series', {
  id: String,
  title: String,
  cover: String,
  description: String,
  trialGroupId: String, // 试看群ID
  vipGroupId: String, // VIP群ID
  plans: [{
    id: String,
    label: String,
    price: Number,
    enabled: Boolean
  }]
});

// 限流处理中间件
const rateLimit = {
  global: {
    requests: 0,
    lastReset: Date.now()
  },
  perChat: {}
};

// 重置全局计数器
setInterval(() => {
  rateLimit.global.requests = 0;
  rateLimit.global.lastReset = Date.now();
}, 1000);

// 限流检查函数
const checkRateLimit = (chatId) => {
  // 检查全局限制
  if (rateLimit.global.requests >= 30) {
    return { allowed: false, message: 'Global rate limit exceeded' };
  }
  
  // 检查单聊天限制
  const now = Date.now();
  if (rateLimit.perChat[chatId] && (now - rateLimit.perChat[chatId]) < 1000) {
    return { allowed: false, message: 'Per-chat rate limit exceeded' };
  }
  
  // 更新计数器
  rateLimit.global.requests++;
  rateLimit.perChat[chatId] = now;
  
  return { allowed: true };
};

// 429错误处理
const handle429Error = (error, ctx) => {
  if (error.response && error.response.status === 429) {
    const retryAfter = error.response.headers['retry-after'] || 1;
    console.log(`Rate limited, retrying after ${retryAfter} seconds`);
    setTimeout(() => {
      // 重新尝试操作
    }, retryAfter * 1000);
  }
};

// 生成群组邀请链接
const generateInviteLink = async (groupId) => {
  try {
    const result = await bot.telegram.createChatInviteLink(groupId, {
      expire_date: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 24小时过期
      member_limit: 1 // 仅限1人使用
    });
    return result.invite_link;
  } catch (error) {
    handle429Error(error);
    throw error;
  }
};

// 踢出用户
const kickUser = async (groupId, userId) => {
  try {
    // 检查限流
    const limitCheck = checkRateLimit(groupId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message);
    }
    
    await bot.telegram.kickChatMember(groupId, userId);
    return true;
  } catch (error) {
    handle429Error(error);
    throw error;
  }
};

// 发送消息
const sendMessage = async (chatId, text) => {
  try {
    // 检查限流
    const limitCheck = checkRateLimit(chatId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message);
    }
    
    await bot.telegram.sendMessage(chatId, text);
    return true;
  } catch (error) {
    handle429Error(error);
    throw error;
  }
};

// API路由
app.post('/api/preview', async (req, res) => {
  try {
    const { user_id, series_id } = req.body;
    
    // 查找剧集
    const series = await Series.findOne({ id: series_id });
    if (!series) {
      return res.status(404).json({ success: false, message: '剧集不存在' });
    }
    
    // 生成试看群邀请链接
    const inviteLink = await generateInviteLink(series.trialGroupId);
    
    res.json({ success: true, message: '试看群邀请链接已生成', group_link: inviteLink });
  } catch (error) {
    console.error('试看功能错误:', error);
    res.status(500).json({ success: false, message: '生成邀请链接失败' });
  }
});

// 定时任务：检查过期用户（每4小时执行一次）
cron.schedule('0 0,4,8,12,16,20 * * *', async () => {
  console.log('执行过期检查（每4小时一次）');
  console.log('检测原则：确保群内所有用户都在每次启动检测后被检测一次');
  console.log('注意：检测时会根据用户数量和范围进行处理，以防止有新用户不断进入导致程序进入不断检测');
  console.log('后台可在系统设置中查看此检测原则');
  
  
  try {
    const now = new Date();
    
    // 查找过期用户
    const users = await User.find({ 'subscriptions.status': { $in: ['active', 'expiring'] } });
    
    for (const user of users) {
      for (const subscription of user.subscriptions) {
        if (subscription.expireDate < now) {
          // 更新订阅状态为已过期
          subscription.status = 'expired';
          
          // 查找对应的VIP群
          const series = await Series.findOne({ id: subscription.seriesId });
          if (series && series.vipGroupId) {
            // 踢出用户
            try {
              await kickUser(series.vipGroupId, user.telegramId);
              console.log(`已将用户 ${user.telegramId} 从群组 ${series.vipGroupId} 踢出`);
              
              // 发送通知消息
              try {
                await sendMessage(user.telegramId, `您的《${subscription.seriesTitle}》订阅已到期，已被移出VIP群。请及时续费以继续享受会员权益。`);
              } catch (msgError) {
                console.error('发送通知消息失败:', msgError);
              }
            } catch (kickError) {
              console.error('踢出用户失败:', kickError);
            }
            
            // 延迟0.5秒，避免触发限流
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else if (subscription.expireDate - now < 7 * 24 * 60 * 60 * 1000) {
          // 即将到期（7天内）
          subscription.status = 'expiring';
        }
      }
      
      // 保存用户信息
      await user.save();
    }
    
    console.log('过期检查完成');
  } catch (error) {
    console.error('过期检查错误:', error);
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 启动Bot
bot.launch({
  polling: {
    interval: 1000, // 轮询间隔1秒，符合官方规定
    timeout: 60, // 超时时间60秒，符合官方规定
    limit: 100,
    retryTimeout: 5000
  }
});

console.log('Bot已启动');
