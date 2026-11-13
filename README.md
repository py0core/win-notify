# win-notify

A Claude Code mod for **Windows** that pops a native toast (bottom-right) with a sound when:

| Event | Sound |
|---|---|
| A new step starts | Windows Ding |
| Claude needs your approval | Windows Exclamation |
| Claude finishes | tada |
| A turn ends on an error | Windows Critical Stop |
| A tool fails | Windows Foreground |
| A background agent finishes | Windows Notify System Generic |

Nothing pops up while the Claude window is in front. Put `step.wav`, `attention.wav`, `done.wav`, `error.wav`, `toolFail.wav` or `agentDone.wav` in the mod's `sounds/` folder to use your own sounds.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install win-notify --marketplace py0core/win-notify
```

Answer `y` to add the marketplace, then press Enter to pick the user scope (installs it for every session).

From a shell:

```bash
claude plugin install win-notify --marketplace py0core/win-notify
```

In the Claude desktop app (where `/plugin` doesn't run): click **+** next to the prompt box → **Plugins** → **Add marketplace** with `py0core/win-notify` → **Add plugin**.

### Or ask Claude to install it

Paste this into Claude Code:

> Install the win-notify plugin for me at user scope: run `claude plugin install win-notify --marketplace py0core/win-notify`.

## Not seeing toasts?

Windows hides toast banners while **Do not disturb** or **Focus** is on. Turn it off in Settings → System → Notifications, or add **Windows PowerShell** to the priority list.
