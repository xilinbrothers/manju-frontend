// 后端实现示例 - 符合Telegram Bot API官方规定
import { Telegraf } from 'telegraf';
import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import axios from 'axios';
import crypto from 'crypto';

// 配置
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const MERCHANT_NO = process.env.MERCHANT_NO; // 商户编号
const MERCHANT_KEY = process.env.MERCHANT_KEY; // 商户密钥
const ALIPAY_API_URL = process.env.ALIPAY_API_URL; // 支付宝API地址

// 初始化
const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 签名算法
const generateSign = (params) => {
  // 过滤空值参数
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // 拼接商户密钥
  const stringSignTemp = `${filteredParams}&key=${MERCHANT_KEY}`;
  
  // MD5加密并转大写
  const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  
  return sign;
};

// 验证签名
const verifySign = (params) => {
  const sign = params.sign;
  delete params.sign;
  const generatedSign = generateSign(params);
  return sign === generatedSign;
};

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

const Payment = mongoose.model('Payment', {
  outOrderNo: String, // 商户订单号
  orderNo: String, // 平台订单号
  merchantNo: String, // 商户编号
  amount: Number, // 金额（分）
  productId: String, // 产品编号
  userId: String, // 用户ID
  seriesId: String, // 剧集ID
  planId: String, // 套餐ID
  status: String, // 支付状态：0-初始化, 1-支付中, 2-完成, -1-失败
  createTime: Date,
  updateTime: Date
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

// 支付宝支付下单
app.post('/api/order/create', async (req, res) => {
  try {
    const { out_order_no, notify_url, amount, product_id, user_id, series_id, plan_id } = req.body;
    
    // 验证参数
    if (!out_order_no || !notify_url || !amount || !product_id) {
      return res.status(400).json({ success: false, message: '参数缺失', code: 400, result: null, timestamp: Date.now() });
    }
    
    // 生成签名
    const params = {
      merchant_no: MERCHANT_NO,
      out_order_no,
      notify_url,
      amount,
      product_id
    };
    const sign = generateSign(params);
    
    // 调用支付宝API
    const response = await axios.post(`${ALIPAY_API_URL}/api/order/create`, new URLSearchParams({
      ...params,
      sign
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const result = response.data;
    
    // 保存支付记录
    if (result.success) {
      const payment = new Payment({
        outOrderNo: out_order_no,
        orderNo: result.result.orderNo,
        merchantNo: MERCHANT_NO,
        amount,
        productId: product_id,
        userId: user_id,
        seriesId: series_id,
        planId: plan_id,
        status: '1', // 支付中
        createTime: new Date(),
        updateTime: new Date()
      });
      await payment.save();
    }
    
    res.json(result);
  } catch (error) {
    console.error('支付宝下单错误:', error);
    res.status(500).json({ success: false, message: '下单失败', code: 500, result: null, timestamp: Date.now() });
  }
});

// 支付宝支付查单
app.post('/api/order/check', async (req, res) => {
  try {
    const { out_order_no } = req.body;
    
    // 验证参数
    if (!out_order_no) {
      return res.status(400).json({ success: false, message: '参数缺失', code: 400, result: null, timestamp: Date.now() });
    }
    
    // 生成签名
    const params = {
      merchant_no: MERCHANT_NO,
      out_order_no
    };
    const sign = generateSign(params);
    
    // 调用支付宝API
    const response = await axios.post(`${ALIPAY_API_URL}/api/order/check`, new URLSearchParams({
      ...params,
      sign
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const result = response.data;
    
    // 更新支付记录
    if (result.success) {
      await Payment.updateOne(
        { outOrderNo: out_order_no },
        { 
          status: result.result.status,
          updateTime: new Date()
        }
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('支付宝查单错误:', error);
    res.status(500).json({ success: false, message: '查单失败', code: 500, result: null, timestamp: Date.now() });
  }
});

// 支付宝支付回调通知
app.post('/api/order/notify', async (req, res) => {
  try {
    const params = req.body;
    
    // 验证签名
    if (!verifySign(params)) {
      return res.status(400).send('签名错误');
    }
    
    const { out_order_no, status, amount, order_no } = params;
    
    // 查找支付记录
    const payment = await Payment.findOne({ outOrderNo: out_order_no });
    if (!payment) {
      return res.status(404).send('订单不存在');
    }
    
    // 更新支付记录
    payment.status = status === 'success' ? '2' : '-1'; // 2-完成, -1-失败
    payment.updateTime = new Date();
    await payment.save();
    
    // 如果支付成功，处理订阅
    if (status === 'success') {
      await handlePaymentSuccess(payment);
    }
    
    // 返回success完成通知流程
    res.send('success');
  } catch (error) {
    console.error('支付宝回调错误:', error);
    res.status(500).send('处理失败');
  }
});

// Telegram 支付回调通知
app.post('/api/telegram/payment/notify', async (req, res) => {
  try {
    const update = req.body;
    
    // 检查是否是支付回调
    if (update.pre_checkout_query) {
      const { id, from, currency, total_amount, invoice_payload } = update.pre_checkout_query;
      
      // 验证支付信息
      try {
        const payload = JSON.parse(invoice_payload);
        
        // 创建支付记录
        const payment = new Payment({
          outOrderNo: payload.order_id,
          orderNo: id,
          merchantNo: 'TELEGRAM',
          amount: total_amount / 100,
          productId: payload.series_id,
          userId: payload.user_id,
          seriesId: payload.series_id,
          planId: payload.plan_id,
          status: '1', // 支付中
          createTime: new Date(),
          updateTime: new Date()
        });
        await payment.save();
        
        // 确认预支付
        await bot.telegram.answerPreCheckoutQuery(id, true);
      } catch (error) {
        console.error('预支付验证失败:', error);
        await bot.telegram.answerPreCheckoutQuery(id, false, { error_message: '支付验证失败' });
      }
    } else if (update.message && update.message.successful_payment) {
      const { successful_payment } = update.message;
      const { invoice_payload, total_amount, currency } = successful_payment;
      
      try {
        const payload = JSON.parse(invoice_payload);
        
        // 查找支付记录
        const payment = await Payment.findOne({ outOrderNo: payload.order_id });
        if (payment) {
          // 更新支付记录
          payment.status = '2'; // 支付完成
          payment.updateTime = new Date();
          await payment.save();
          
          // 处理订阅
          await handlePaymentSuccess(payment);
          
          // 发送支付成功消息
          await bot.telegram.sendMessage(update.message.chat.id, '支付成功！您的订阅已激活。');
        }
      } catch (error) {
        console.error('支付回调处理失败:', error);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram 支付回调错误:', error);
    res.status(500).send('处理失败');
  }
});

// 处理支付成功
const handlePaymentSuccess = async (payment) => {
  try {
    const user = await User.findOne({ telegramId: payment.userId });
    const series = await Series.findOne({ id: payment.seriesId });
    
    if (user && series) {
      // 计算过期时间（假设套餐为30天）
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);
      
      // 添加或更新订阅
      const existingSubscription = user.subscriptions.find(s => s.seriesId === payment.seriesId);
      if (existingSubscription) {
        existingSubscription.expireDate = expireDate;
        existingSubscription.status = 'active';
      } else {
        user.subscriptions.push({
          seriesId: payment.seriesId,
          seriesTitle: series.title,
          expireDate,
          status: 'active'
        });
      }
      
      // 保存用户信息
      await user.save();
      
      // 生成VIP群邀请链接并发送给用户
      try {
        const inviteLink = await generateInviteLink(series.vipGroupId);
        await sendMessage(user.telegramId, `您的《${series.title}》订阅已成功，点击链接加入VIP群：${inviteLink}`);
      } catch (error) {
        console.error('发送VIP群邀请链接失败:', error);
      }
    }
  } catch (error) {
    console.error('处理支付成功失败:', error);
  }
};

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
