/** 蓝豆助手的本地化文案。 */

/** 本插件渲染的文案键。 */
export type LandouLocaleKey =
  | 'nav' | 'title'
  | 'signInIntro'
  | 'signIn' | 'signUp'
  | 'email' | 'password' | 'displayName' | 'verificationCode' | 'inviteCode'
  | 'inviteOptional' | 'verificationHint'
  | 'sendCode' | 'resendIn' | 'codeSent'
  | 'acceptTerms' | 'acceptCrossBorder'
  | 'submitSignIn' | 'submitSignUp'
  | 'working'
  | 'signedInAs' | 'signedInHint' | 'signOut'
  | 'gateHint'
  | 'requiredFields'
  | 'canvas.panel' | 'canvas.badge' | 'canvas.toolbarHint' | 'canvas.empty' | 'canvas.noPreview'

/** 英文文案。 */
export const en: Record<LandouLocaleKey, string> = {
  nav: 'Landou Assistant',
  title: 'Landou Assistant',
  signInIntro: 'Sign in with your Blue Bean ERP account to use this plugin.',
  signIn: 'Sign in',
  signUp: 'Create account',
  email: 'Email',
  password: 'Password',
  displayName: 'Display name',
  verificationCode: 'Email code',
  inviteCode: 'Invite code',
  inviteOptional: 'Optional',
  verificationHint: 'Send a code to this address, then enter it here. Leave empty if the server does not require one.',
  sendCode: 'Send code',
  resendIn: 'Resend in {seconds}s',
  codeSent: 'Code sent. Check your inbox.',
  acceptTerms: 'I accept the terms of service',
  acceptCrossBorder: 'I consent to cross-border data transfer',
  submitSignIn: 'Sign in',
  submitSignUp: 'Create account',
  working: 'Working…',
  signedInAs: 'Signed in as {name}',
  signedInHint: 'This device stays signed in until you sign out. The access token is kept by the local Blue Bean service, not in this page.',
  signOut: 'Sign out',
  'canvas.panel': 'Canvas session',
  'canvas.badge': 'Canvas session',
  'canvas.toolbarHint': 'Canvas',
  'canvas.empty': 'No artifacts yet. Ask the agent to create an image, a video, or text.',
  'canvas.noPreview': 'Preview unavailable',
  gateHint: 'The sidebar shows the Blue Bean brand whether or not you are signed in. Signing in unlocks this page’s settings and features.',
  requiredFields: 'Fill in every required field',
}

/** 简体中文文案。 */
export const zh: Record<LandouLocaleKey, string> = {
  nav: '蓝豆助手',
  title: '蓝豆助手',
  signInIntro: '用你的蓝豆 ERP 账号登录后即可使用本插件。',
  signIn: '登录',
  signUp: '注册账号',
  email: '邮箱',
  password: '密码',
  displayName: '显示名称',
  verificationCode: '邮箱验证码',
  inviteCode: '邀请码',
  inviteOptional: '选填',
  verificationHint: '先向该邮箱发送验证码,再填到这里。服务端不要求时可留空。',
  sendCode: '发送验证码',
  resendIn: '{seconds} 秒后可重发',
  codeSent: '验证码已发送,请查收邮箱。',
  acceptTerms: '我已阅读并同意服务条款',
  acceptCrossBorder: '我同意数据跨境传输',
  submitSignIn: '登录',
  submitSignUp: '注册',
  working: '处理中…',
  signedInAs: '已登录:{name}',
  signedInHint: '本机在退出登录前保持登录状态。访问令牌由本机蓝豆服务保存,不在这个页面里。',
  signOut: '退出登录',
  'canvas.panel': '画布会话',
  'canvas.badge': '画布会话',
  'canvas.toolbarHint': '画布',
  'canvas.empty': '画布上还没有产物。让 agent 生成图片、视频或文字,产物会出现在这里。',
  'canvas.noPreview': '预览不可用',
  gateHint: '侧栏品牌名与登录无关,装上插件即可见。登录用于解锁本页的设置与功能。',
  requiredFields: '请填写所有必填项',
}
