/**
 * 设置面板里的「蓝豆助手」页 —— 未登录时是注册/登录界面,登录后是账号页。
 *
 * 外观直接用官方 primitives(`Input` / `Button`):它们在平台模块表里,
 * 插件可以 import,而且宿主会把整个包的工厂交给插件 —— 视觉与设置面板其余部分
 * 天然一致,不需要自己复刻输入框的边框、内边距和焦点环。
 *
 * 这里**看不到访问令牌**:所有调用打到宿主半边,宿主只回非机密事实。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { LandouMark } from './LandouMark.tsx'
import type { LandouLocaleKey } from './locales.ts'
import type { CallResult, RegisterInput, SessionView } from './session.ts'

// 本插件拥有自己的文案命名空间。声明合并让 `PropsLocale<'landou-assistant'>`
// 解析出带键的 `t`;DSH 仓库内的包用同一机制注册各自的命名空间。
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'landou-assistant': LandouLocaleKey
  }
}

/** 注册页发送验证码后的冷却与提示状态。 */
export interface EmailCodeState {
  sent: boolean
  expiresInSeconds: number
  resendCooldownSeconds: number
}

/** 插件通过注入面交给本页的能力。全部是纯数据与回调,不含令牌。 */
export interface LandouSettingsInjected {
  /** 读取当前会话 —— 登录状态的唯一来源。 */
  getSession: () => Promise<CallResult<SessionView>>
  login: (email: string, password: string) => Promise<CallResult<SessionView>>
  register: (input: RegisterInput) => Promise<CallResult<SessionView>>
  sendEmailCode: (email: string, purpose: 'register' | 'reset_password') => Promise<CallResult<EmailCodeState>>
  logout: () => Promise<CallResult<SessionView>>
  /** 登录状态变化后通知插件重新同步侧栏品牌。 */
  notifySessionChanged: () => void
}

/** 渲染器绑定的组合 props。 */
export type LandouSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'landou-assistant'>
  & InjectFace<LandouSettingsInjected>

const COLOR_PRIMARY = 'var(--dsw-alias-label-primary)'
const COLOR_TERTIARY = 'var(--dsw-alias-label-tertiary)'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' }
const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: COLOR_PRIMARY }
const errorStyle: React.CSSProperties = { margin: 0, fontSize: '13px', color: 'var(--dsw-alias-label-error, #d33)' }
const noticeStyle: React.CSSProperties = { margin: 0, fontSize: '13px', color: COLOR_TERTIARY }

/** 一个带标签的文本输入。 */
function Field(props: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label style={fieldStyle} htmlFor={props.id}>
      <span style={labelStyle}>{props.label}</span>
      <Input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        onChange={(event) => { props.onChange(event.target.value) }}
      />
    </label>
  )
}

/** 一个同意勾选框。 */
function Consent(props: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: COLOR_PRIMARY }} htmlFor={props.id}>
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        onChange={(event) => { props.onChange(event.target.checked) }}
      />
      {props.label}
    </label>
  )
}

/**
 * 渲染蓝豆助手的设置页。
 * @param props - 由设置外壳合成的 slot props。
 * @returns 登录/注册界面,或已登录的账号页。
 */
export function LandouSettingsSection({ t, getSession, login, register, sendEmailCode, logout, notifySessionChanged }: LandouSettingsSectionProps) {
  const [session, setSession] = useState<SessionView>()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedCrossBorder, setAcceptedCrossBorder] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [cooldown, setCooldown] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  /** 拉一次会话。挂载时与每次登录状态变化后都走这里。 */
  const refresh = useCallback(async () => {
    const result = await getSession()
    if (!mounted.current) return
    setSession(result.ok ? result.value : { authenticated: false })
    setLoading(false)
  }, [getSession])

  useEffect(() => { void refresh() }, [refresh])

  // 重发冷却倒计时。
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => { setCooldown(value => Math.max(0, value - 1)) }, 1000)
    return () => { clearInterval(timer) }
  }, [cooldown])

  /** 登录/注册成功后统一收尾:写回会话并通知插件同步侧栏品牌。 */
  const accept = useCallback((next: SessionView) => {
    setSession(next)
    setPassword('')
    setVerificationCode('')
    notifySessionChanged()
  }, [notifySessionChanged])

  const submit = useCallback(async () => {
    setError(undefined)
    setNotice(undefined)
    if (email.trim() === '' || password === '' || (mode === 'signUp' && displayName.trim() === '')) {
      setError(t('requiredFields'))
      return
    }
    setBusy(true)
    const result = mode === 'signIn'
      ? await login(email.trim(), password)
      : await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        verificationCode: verificationCode.trim() === '' ? undefined : verificationCode.trim(),
        inviteCode: inviteCode.trim() === '' ? undefined : inviteCode.trim(),
        acceptedTerms,
        acceptedCrossBorderTransfer: acceptedCrossBorder,
      })
    if (!mounted.current) return
    setBusy(false)
    if (result.ok) accept(result.value)
    else setError(result.message)
  }, [accept, acceptedCrossBorder, acceptedTerms, displayName, email, inviteCode, login, mode, password, register, t, verificationCode])

  const requestCode = useCallback(async () => {
    setError(undefined)
    setNotice(undefined)
    if (email.trim() === '') { setError(t('requiredFields')); return }
    setBusy(true)
    const result = await sendEmailCode(email.trim(), 'register')
    if (!mounted.current) return
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setNotice(t('codeSent'))
    setCooldown(result.value.resendCooldownSeconds > 0 ? result.value.resendCooldownSeconds : 60)
  }, [email, sendEmailCode, t])

  const signOut = useCallback(async () => {
    setBusy(true)
    setError(undefined)
    const result = await logout()
    if (!mounted.current) return
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    accept({ authenticated: false })
    setEmail('')
    setDisplayName('')
  }, [accept, logout])

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <LandouMark size={26} />
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('title')}</h2>
    </header>
  )

  const sectionStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px', color: COLOR_PRIMARY,
  }

  if (loading) return <section style={sectionStyle}>{header}</section>

  // ── 已登录 ────────────────────────────────────────────────────────
  if (session?.authenticated === true) {
    return (
      <section style={sectionStyle}>
        {header}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
            {t('signedInAs').replace('{name}', session.displayName ?? session.userId ?? '')}
          </p>
          <p style={noticeStyle}>{t('signedInHint')}</p>
        </div>
        {error !== undefined && <p style={errorStyle}>{error}</p>}
        <div>
          <Button variant="outline" disabled={busy} onClick={() => { void signOut() }}>
            {busy ? t('working') : t('signOut')}
          </Button>
        </div>
      </section>
    )
  }

  // ── 未登录:注册 / 登录 ───────────────────────────────────────────
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    color: active ? COLOR_PRIMARY : COLOR_TERTIARY,
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${active ? 'currentColor' : 'transparent'}`,
    cursor: 'pointer',
  })

  return (
    <section style={sectionStyle}>
      {header}
      <p style={{ margin: 0, fontSize: '13px', color: COLOR_TERTIARY }}>{t('signInIntro')}</p>
      <p style={{ margin: 0, fontSize: '13px', color: COLOR_TERTIARY }}>{t('gateHint')}</p>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--dsw-alias-border-subtle, rgba(127,127,127,.24))' }}>
        <button type="button" style={tabStyle(mode === 'signIn')} onClick={() => { setMode('signIn'); setError(undefined) }}>{t('signIn')}</button>
        <button type="button" style={tabStyle(mode === 'signUp')} onClick={() => { setMode('signUp'); setError(undefined) }}>{t('signUp')}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
        <Field id="landou-email" label={t('email')} value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field id="landou-password" label={t('password')} value={password} onChange={setPassword} type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} />

        {mode === 'signUp' && (
          <>
            <Field id="landou-name" label={t('displayName')} value={displayName} onChange={setDisplayName} autoComplete="name" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Field id="landou-code" label={t('verificationCode')} value={verificationCode} onChange={setVerificationCode} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || cooldown > 0}
                  // 按钮文案在中文下会换行;固定不折行,避免它被压成两行。
                  style={{ whiteSpace: 'nowrap', flex: 'none' }}
                  onClick={() => { void requestCode() }}
                >
                  {cooldown > 0 ? t('resendIn').replace('{seconds}', String(cooldown)) : t('sendCode')}
                </Button>
              </div>
              <span style={{ fontSize: '12px', color: COLOR_TERTIARY }}>{t('verificationHint')}</span>
            </div>
            <Field id="landou-invite" label={`${t('inviteCode')} · ${t('inviteOptional')}`} value={inviteCode} onChange={setInviteCode} />
            <Consent id="landou-terms" label={t('acceptTerms')} checked={acceptedTerms} onChange={setAcceptedTerms} />
            <Consent id="landou-cross-border" label={t('acceptCrossBorder')} checked={acceptedCrossBorder} onChange={setAcceptedCrossBorder} />
          </>
        )}

        {error !== undefined && <p style={errorStyle}>{error}</p>}
        {notice !== undefined && <p style={noticeStyle}>{notice}</p>}

        <div>
          <Button variant="primary" disabled={busy} onClick={() => { void submit() }}>
            {busy ? t('working') : mode === 'signIn' ? t('submitSignIn') : t('submitSignUp')}
          </Button>
        </div>
      </div>
    </section>
  )
}
