# Horizon mock up

An interactive, native-feeling iOS prototype for **Horizon**, a personal finance app built around one question: *when do you get where you're going?*

Everything lives in a single file, `index.html`, with no build step and no dependencies.

## Viewing it

- Open `index.html` in a browser. On desktop it shows a phone frame with a guided-tour rail on the left and notes for the current screen on the right. When the window is 600px wide or less, the app runs full screen like an installed app.
- Deep-link to any screen with a hash, for example `index.html#plan`, `#goal-home`, `#holding-NVDA` or `#welcome`.

## What's in it

| Area | Screens |
| --- | --- |
| Onboarding | Welcome carousel (the sun rises as you swipe) → Link accounts → Face ID |
| Tabs | Home · Spending · Plan · Invest · You |
| Details | Account, Goal, Holding, Ask Horizon (assistant), Notifications |

Native patterns: large titles that collapse into a blurred nav bar, a blurred tab bar, swiping from the left edge to go back, push/pop transitions with parallax, card-style bottom sheets you can drag down to close, iOS action sheets, switches and segmented controls, charts you can scrub, a custom number keypad with a Face ID confirm, pull to refresh, toasts, haptics (on Android), and light and dark appearance.

The **guided tour** (11 stops) walks through the key flows with a spotlight and works on desktop and phone. Press Esc to exit and use the arrow keys to step through.

All people, institutions, balances and prices are sample data.
