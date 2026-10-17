## Video Assisted Referee for Trampoline

Controls review, playback, markers and camera views of **VAR for Trampoline** from a Stream Deck or any other Companion surface, using the application's built-in remote control (plain text over TCP).

### Setup in VAR2

1. In VAR open the **Recording menu → Remote control**.
2. Tick **Companion, TCP port** and keep the port (default **7450**) or choose another one.
3. The menu shows the address to connect to, e.g. `Listening on 192.168.1.20:7450`.
4. If Companion runs on another computer, allow `var.exe` through the Windows firewall for private networks when asked.

### Connection settings

- **VAR computer IP address** – the address shown in the Remote control menu (`127.0.0.1` if Companion runs on the VAR computer).
- **TCP port** – default 7450.
- **Connection check interval** – sends `PING` every few seconds to detect a lost connection and measure the round trip time. 0 disables it.

### Security

The remote control has no password; anyone who can reach the port can review, set markers and change the view (but cannot start/stop recording, change settings or quit). Use it only in a trusted network and disable it in VAR when it is not needed.

### Actions

| Action                            | Command                       | Key in VAR             |
| --------------------------------- | ----------------------------- | ---------------------- |
| Play / pause (forwards)           | `PLAY`                        | Space                  |
| Play backwards / pause            | `REVERSE`                     | Shift + Space          |
| Pause                             | `PAUSE`                       |                        |
| Step frames (−100 … 100)          | `STEP <n>`                    | ← / →                  |
| Jump seconds                      | `JUMP <s>`                    | Shift/Ctrl/Alt + ← / → |
| Speed: faster / slower            | `FASTER` / `SLOWER`           | + / −                  |
| Speed: set (2, 1, 0.5, 0.25, 0.1) | `SPEED <x>`                   |                        |
| Review the recording              | `REVIEW`                      | R                      |
| Back to live                      | `LIVE`                        | L                      |
| Marker: set                       | `MARKER`                      | M                      |
| Marker: previous / next           | `MARKER PREV` / `MARKER NEXT` | , / .                  |
| Camera full screen / back         | `CAMERA <n>`                  | 1 – 4                  |
| Back to the grid                  | `GRID`                        | Esc                    |
| Ping                              | `PING`                        |                        |
| Send custom command               | any line                      |                        |
| Set assumed state                 | – (nothing is sent)           |                        |

Review functions sent in live mode switch to review first, as the keys do. While a dialog is open in VAR (e.g. the PIN prompt) commands are ignored, like keys.

### Feedbacks and variables

VAR answers every command with `OK`, `PONG` or `ERR <reason>` but **does not report its state**. The module therefore keeps an _assumed_ state (mode, playback, speed, view) based on the commands Companion sent and VAR accepted. Keys pressed directly on the VAR computer are not seen, so the assumed state can be wrong until the next absolute command (`LIVE`, `GRID`, `SPEED x`, …). Use the action **Set assumed state** to correct it manually.

Feedbacks:

- **Connection: connected** – the TCP connection is open.
- **Connection: command rejected** – active for 3 s after VAR answered `ERR`.
- **State: mode** – live / review.
- **State: playback** – playing forwards / backwards / either / paused.
- **State: speed** – a given speed.
- **State: view** – grid or a camera full screen.

Variables: `connection`, `mode`, `playback`, `speed`, `view`, `camera`, `last_command`, `last_response`, `last_error`, `latency_ms`.

### Presets

- **Live & review** – REVIEW, LIVE, a live/review toggle, PLAY, REVERSE, PAUSE and "play only" (always ends up playing).
- **Step & jump** – ±1, 5, 10, 25, 50 frames; ±1, 2, 5, 10, 30 seconds.
- **Speed** – 2×, 1×, 0.5×, 0.25×, 0.1×, faster, slower and a speed display.
- **Markers** – set, previous, next, and "go to marker and play".
- **Cameras** – cameras 1 – 4 and grid, highlighted when active.
- **Replay combos** – instant replay of the last 5 s at 1×, 0.5× or 0.25×, the last 10 s, slow-motion play from the current position, and back to live + grid.
- **Dials (Stream Deck +)** – frame jog, seconds shuttle, speed dial and marker dial for rotary encoders.
- **Status** – connection (press to ping), assumed state, playback, last command/answer and last error.
