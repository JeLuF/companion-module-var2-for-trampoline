# companion-module-var2-for-trampoline

Bitfocus Companion module for **Video Assisted Referee for Trampoline** (VAR). It drives review, playback, markers and camera views over VAR's plain text TCP remote control (default port 7450).

See [HELP.md](./companion/HELP.md) for the user documentation and [LICENSE](./LICENSE).

## Structure

- `src/main.ts` – module instance, TCP connection, answer matching (`OK` / `PONG` / `ERR`) and keepalive
- `src/state.ts` – the assumed VAR state, derived from accepted commands
- `src/actions.ts`, `src/feedbacks.ts`, `src/variables.ts`, `src/presets.ts`

## Development

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

Quick protocol test without Companion:

```sh
printf 'PING\nREVIEW\nSTEP -1\n' | nc 192.168.1.20 7450
```
