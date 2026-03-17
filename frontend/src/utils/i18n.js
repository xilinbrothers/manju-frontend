const translations = {
  zh: {
    welcome: "嗨！欢迎来到 漫剧订阅助手 🎬",
    welcome_desc: "这里收录了最热门的短剧、漫改作品，支持高清在线观看。",
    features: [
      "海量正版内容，每日更新",
      "灵活订阅套餐，按需选择",
      "专属观影群，抢先看新集"
    ],
    explore: "现在开始，探索你的专属片单吧！",
    view_all: "查看所有剧集",
    my_subs: "我的订阅",
    contact_support: "联系客服",
    order_confirm: "订单确认",
    sub_series: "订阅剧集",
    sub_duration: "订阅时长",
    order_amount: "订单金额",
    pay_security: "支付由官方渠道处理，安全有保障",
    select_pay_method: "选择支付方式",
    pay_success: "支付成功！",
    sub_active: "订阅已激活，开始享受专属权益",
    benefits: "会员权益",
    valid_until: "有效期至",
    vip_group: "专属观影群",
    full_unlock: "全集解锁",
    hd_no_ads: "高清无广告，更新秒推送",
    enter_group: "进入观影群",
    back_home: "返回首页"
  },
  en: {
    welcome: "Hi! Welcome to Manju Bot 🎬",
    welcome_desc: "The hottest short dramas and manga adaptations, all in HD.",
    features: [
      "Massive content, daily updates",
      "Flexible plans, choose your own",
      "Exclusive groups, watch first"
    ],
    explore: "Start exploring your playlist now!",
    view_all: "View All Series",
    my_subs: "My Subscriptions",
    contact_support: "Contact Support",
    order_confirm: "Order Confirmation",
    sub_series: "Subscribed Series",
    sub_duration: "Duration",
    order_amount: "Total Amount",
    pay_security: "Secure payments via official channels",
    select_pay_method: "Select Payment Method",
    pay_success: "Payment Successful!",
    sub_active: "Subscription active! Enjoy your benefits.",
    benefits: "Member Benefits",
    valid_until: "Valid Until",
    vip_group: "Exclusive VIP Group",
    full_unlock: "Full Access",
    hd_no_ads: "HD, No Ads, Instant Updates",
    enter_group: "Enter Group",
    back_home: "Back to Home"
  }
};

export const getTranslation = (lang) => {
  return translations[lang] || translations.zh;
};
