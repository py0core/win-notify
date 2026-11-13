import type { Engine, Register } from 'claude-code'

type Kind = 'step' | 'attention' | 'done' | 'error' | 'toolFail' | 'agentDone'

// Default system sounds; drop `sounds/<kind>.wav` into the mod folder to override one.
const EVENTS: Record<Kind, { title: string; wav: string }> = {
  step: { title: 'Claude: step started', wav: 'Windows Ding.wav' },
  attention: { title: 'Claude: needs attention', wav: 'Windows Exclamation.wav' },
  done: { title: 'Claude: finished', wav: 'tada.wav' },
  error: { title: 'Claude: error', wav: 'Windows Critical Stop.wav' },
  toolFail: { title: 'Claude: tool failed', wav: 'Windows Foreground.wav' },
  agentDone: { title: 'Claude: background agent finished', wav: 'Windows Notify System Generic.wav' },
}

// PowerShell single-quoted literal: only ' needs escaping (doubled).
const ps = (s: string) => `'${s.replace(/'/g, "''")}'`

// Skips everything when a Claude window is in front (you're already looking).
const FOCUS_CHECK = [
  `Add-Type -Namespace W -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);'`,
  `$fp = 0; [void][W.U]::GetWindowThreadProcessId([W.U]::GetForegroundWindow(), [ref]$fp)`,
  `if ((Get-Process -Id $fp -ErrorAction SilentlyContinue).ProcessName -eq 'Claude') { exit 0 }`,
]

export const register: Register = on => {
  const alert = async ($: Engine, kind: Kind, text: string) => {
    const { title, wav } = EVENTS[kind]
    const custom = `${$.plugin.root}/sounds/${kind}.wav`
    const sound = (await $.fs.exists(custom).catch(() => false))
      ? custom.replace(/\//g, '\\')
      : `C:\\Windows\\Media\\${wav}`
    const script = [
      ...FOCUS_CHECK,
      `$t = [Security.SecurityElement]::Escape(${ps(title)})`,
      `$b = [Security.SecurityElement]::Escape(${ps(text)})`,
      `[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]`,
      `[void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime]`,
      `$x = New-Object Windows.Data.Xml.Dom.XmlDocument`,
      `$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual><audio silent='true'/></toast>")`,
      `$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'`,
      `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))`,
      `(New-Object Media.SoundPlayer ${ps(sound)}).PlaySync()`,
    ].join('; ')
    await $.process
      .run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script])
      .catch(() => {}) // never let a notification failure break the turn
  }

  // Every model request of the main loop (each step of a task).
  on('turn.step', ($, e, next) => {
    if (e.agentId === undefined) void alert($, 'step', `Step ${e.index + 1} started`)
    return next(e)
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    void alert($, 'attention', `Approval needed: ${e.tool_name}`)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && r.isError === true) void alert($, 'toolFail', `${e.tool} failed`)
    return r
  })

  on('classic.SubagentStop', async ($, e, next) => {
    void alert($, 'agentDone', `${e.agent_type} agent finished`)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined) {
      if (e.reason === 'error') void alert($, 'error', 'The turn ended on an API error.')
      else if (e.reason === 'refusal') void alert($, 'error', 'The model refused the request.')
      else if (e.reason === 'answer') void alert($, 'done', e.answer.slice(0, 200) || 'Done.')
    }
    return r
  })
}
