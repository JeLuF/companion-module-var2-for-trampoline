import type { CompanionActionDefinitions, DropdownChoice } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { normalizeSpeed, SPEEDS, type Mode, type Playback, type View } from './state.js'

type NoOptions = { options: Record<string, never> }

export type ActionsSchema = {
	play: NoOptions
	reverse: NoOptions
	pause: NoOptions
	step: { options: { frames: number } }
	jump: { options: { seconds: number } }
	faster: NoOptions
	slower: NoOptions
	speed: { options: { speed: string } }
	review: NoOptions
	live: NoOptions
	marker_set: NoOptions
	marker_go: { options: { direction: 'PREV' | 'NEXT' } }
	camera: { options: { camera: number } }
	grid: NoOptions
	ping: NoOptions
	custom: { options: { command: string } }
	set_assumed_state: {
		options: { mode: Mode | 'keep'; playback: Playback | 'keep'; speed: string; view: number }
	}
}

export const SPEED_CHOICES: DropdownChoice<string>[] = [...SPEEDS].reverse().map((s) => ({ id: s, label: `${s}×` }))

export const CAMERA_CHOICES: DropdownChoice<number>[] = [1, 2, 3, 4].map((n) => ({ id: n, label: `Camera ${n}` }))

export function UpdateActions(self: ModuleInstance): void {
	const send = (command: string): void => {
		self.sendCommand(command)
	}

	const actions: CompanionActionDefinitions<ActionsSchema> = {
		play: {
			name: 'Play / pause (forwards)',
			description: 'Space. In live mode: review from 5 s before live.',
			options: [],
			callback: () => send('PLAY'),
		},
		reverse: {
			name: 'Play backwards / pause',
			description: 'Shift + Space. Plays backwards at 0.5× and slower.',
			options: [],
			callback: () => send('REVERSE'),
		},
		pause: {
			name: 'Pause',
			options: [],
			callback: () => send('PAUSE'),
		},
		step: {
			name: 'Step frames',
			description: '← / →. Negative values step backwards.',
			options: [
				{
					id: 'frames',
					type: 'number',
					label: 'Frames (-100 … 100)',
					default: 1,
					min: -100,
					max: 100,
					step: 1,
				},
			],
			callback: (event) => {
				const frames = Math.round(Number(event.options.frames))
				if (!Number.isFinite(frames) || frames === 0 || Math.abs(frames) > 100) {
					self.log('warn', `Step: invalid number of frames "${event.options.frames}" (-100 … 100, not 0)`)
					return
				}
				send(`STEP ${frames}`)
			},
		},
		jump: {
			name: 'Jump seconds',
			description: 'Shift/Ctrl/Alt + ← / →. Negative values jump backwards.',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Seconds',
					default: -10,
					min: -600,
					max: 600,
					step: 1,
				},
			],
			callback: (event) => {
				const seconds = Number(event.options.seconds)
				if (!Number.isFinite(seconds) || seconds === 0) {
					self.log('warn', `Jump: invalid number of seconds "${event.options.seconds}"`)
					return
				}
				send(`JUMP ${seconds}`)
			},
		},
		faster: {
			name: 'Speed: faster',
			description: '+ key: next faster speed',
			options: [],
			callback: () => send('FASTER'),
		},
		slower: {
			name: 'Speed: slower',
			description: '− key: next slower speed',
			options: [],
			callback: () => send('SLOWER'),
		},
		speed: {
			name: 'Speed: set',
			options: [
				{
					id: 'speed',
					type: 'dropdown',
					label: 'Speed',
					choices: SPEED_CHOICES,
					default: '1',
				},
			],
			callback: (event) => {
				const speed = normalizeSpeed(String(event.options.speed))
				if (!speed) {
					self.log('warn', `Speed: invalid speed "${event.options.speed}" (allowed: ${SPEEDS.join(', ')})`)
					return
				}
				send(`SPEED ${speed}`)
			},
		},
		review: {
			name: 'Review the recording',
			description: 'R',
			options: [],
			callback: () => send('REVIEW'),
		},
		live: {
			name: 'Back to live',
			description: 'L',
			options: [],
			callback: () => send('LIVE'),
		},
		marker_set: {
			name: 'Marker: set',
			description: 'M',
			options: [],
			callback: () => send('MARKER'),
		},
		marker_go: {
			name: 'Marker: previous / next',
			description: ', / .',
			options: [
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Direction',
					choices: [
						{ id: 'PREV', label: 'Previous marker' },
						{ id: 'NEXT', label: 'Next marker' },
					],
					default: 'PREV',
				},
			],
			callback: (event) => {
				const direction = String(event.options.direction).toUpperCase()
				if (direction !== 'PREV' && direction !== 'NEXT') {
					self.log('warn', `Marker: invalid direction "${event.options.direction}"`)
					return
				}
				send(`MARKER ${direction}`)
			},
		},
		camera: {
			name: 'Camera full screen / back',
			description: '1 – 4. Selecting the camera that is already full screen goes back to the grid.',
			options: [
				{
					id: 'camera',
					type: 'dropdown',
					label: 'Camera',
					choices: CAMERA_CHOICES,
					default: 1,
				},
			],
			callback: (event) => {
				const camera = Number(event.options.camera)
				if (!Number.isInteger(camera) || camera < 1 || camera > 4) {
					self.log('warn', `Camera: invalid camera "${event.options.camera}" (1 – 4)`)
					return
				}
				send(`CAMERA ${camera}`)
			},
		},
		grid: {
			name: 'Back to the grid',
			description: 'Esc',
			options: [],
			callback: () => send('GRID'),
		},
		ping: {
			name: 'Ping (connection check)',
			description: 'Sends PING; the round trip time is stored in the latency_ms variable.',
			options: [],
			callback: () => send('PING'),
		},
		custom: {
			name: 'Send custom command',
			description: 'Sends any command line of the remote control protocol, e.g. "STEP -3".',
			options: [
				{
					id: 'command',
					type: 'textinput',
					label: 'Command',
					default: 'PING',
					useVariables: true,
				},
			],
			callback: (event) => send(String(event.options.command ?? '')),
		},
		set_assumed_state: {
			name: 'Set assumed state (no command sent)',
			description:
				'VAR does not report its state. Use this to correct what the module assumes, e.g. after keys were pressed on the VAR computer.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'keep', label: '(unchanged)' },
						{ id: 'live', label: 'Live' },
						{ id: 'review', label: 'Review' },
						{ id: 'unknown', label: 'Unknown' },
					],
					default: 'keep',
				},
				{
					id: 'playback',
					type: 'dropdown',
					label: 'Playback',
					choices: [
						{ id: 'keep', label: '(unchanged)' },
						{ id: 'live', label: 'Live' },
						{ id: 'paused', label: 'Paused' },
						{ id: 'forward', label: 'Playing forwards' },
						{ id: 'reverse', label: 'Playing backwards' },
						{ id: 'unknown', label: 'Unknown' },
					],
					default: 'keep',
				},
				{
					id: 'speed',
					type: 'dropdown',
					label: 'Speed',
					choices: [{ id: 'keep', label: '(unchanged)' }, ...SPEED_CHOICES, { id: 'unknown', label: 'Unknown' }],
					default: 'keep',
				},
				{
					id: 'view',
					type: 'dropdown',
					label: 'View',
					choices: [
						{ id: -2, label: '(unchanged)' },
						{ id: 0, label: 'Grid' },
						...CAMERA_CHOICES,
						{ id: -1, label: 'Unknown' },
					],
					default: -2,
				},
			],
			callback: (event) => {
				const { mode, playback, speed, view } = event.options
				const next: Parameters<ModuleInstance['setAssumedState']>[0] = {}
				if (mode === 'live' || mode === 'review' || mode === 'unknown') next.mode = mode
				if (['live', 'paused', 'forward', 'reverse', 'unknown'].includes(String(playback))) {
					next.playback = playback as Playback
				}
				if (speed === 'unknown') next.speed = 'unknown'
				else if (speed !== 'keep') {
					const value = normalizeSpeed(String(speed))
					if (value) next.speed = value
				}
				const viewNum = Number(view)
				if (Number.isInteger(viewNum) && viewNum >= -1 && viewNum <= 4) next.view = viewNum as View
				self.setAssumedState(next)
			},
		},
	}

	self.setActionDefinitions(actions)
}
