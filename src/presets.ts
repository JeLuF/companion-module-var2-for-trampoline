import {
	combineRgb,
	type CompanionButtonStyleProps,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
	type SomePresetActionEntry,
	type SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { SPEEDS, type Speed } from './state.js'

type Preset = CompanionSimplePresetDefinition<ModuleSchema>
type Action = SomePresetActionEntry<ModuleSchema>
type Feedback = SomePresetSimpleFeedbackEntry<ModuleSchema>

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

const COLOR = {
	transport: combineRgb(25, 55, 95),
	step: combineRgb(45, 45, 45),
	jump: combineRgb(30, 30, 30),
	speed: combineRgb(65, 40, 100),
	live: combineRgb(90, 0, 0),
	liveActive: combineRgb(220, 0, 0),
	review: combineRgb(90, 70, 0),
	reviewActive: combineRgb(255, 190, 0),
	marker: combineRgb(110, 60, 0),
	markerSet: combineRgb(210, 90, 0),
	camera: combineRgb(0, 60, 75),
	active: combineRgb(0, 150, 0),
	combo: combineRgb(0, 45, 45),
	status: BLACK,
	disconnected: combineRgb(100, 0, 0),
	error: combineRgb(230, 0, 0),
}

/** Short command helpers for preset steps */
const cmd = {
	play: (): Action => ({ actionId: 'play', options: {} }),
	reverse: (): Action => ({ actionId: 'reverse', options: {} }),
	pause: (): Action => ({ actionId: 'pause', options: {} }),
	step: (frames: number): Action => ({ actionId: 'step', options: { frames } }),
	jump: (seconds: number): Action => ({ actionId: 'jump', options: { seconds } }),
	faster: (): Action => ({ actionId: 'faster', options: {} }),
	slower: (): Action => ({ actionId: 'slower', options: {} }),
	speed: (speed: Speed): Action => ({ actionId: 'speed', options: { speed } }),
	review: (): Action => ({ actionId: 'review', options: {} }),
	live: (): Action => ({ actionId: 'live', options: {} }),
	marker: (): Action => ({ actionId: 'marker_set', options: {} }),
	markerGo: (direction: 'PREV' | 'NEXT'): Action => ({ actionId: 'marker_go', options: { direction } }),
	camera: (camera: number): Action => ({ actionId: 'camera', options: { camera } }),
	grid: (): Action => ({ actionId: 'grid', options: {} }),
	ping: (): Action => ({ actionId: 'ping', options: {} }),
}

/** Short feedback helpers for presets */
const fb = {
	mode: (mode: 'live' | 'review', bgcolor: number, color = WHITE): Feedback => ({
		feedbackId: 'mode',
		options: { mode },
		style: { bgcolor, color },
	}),
	playback: (playback: 'forward' | 'reverse' | 'paused' | 'playing', bgcolor = COLOR.active): Feedback => ({
		feedbackId: 'playback',
		options: { playback },
		style: { bgcolor, color: WHITE },
	}),
	speed: (speed: Speed): Feedback => ({
		feedbackId: 'speed',
		options: { speed },
		style: { bgcolor: COLOR.active, color: WHITE },
	}),
	view: (view: number): Feedback => ({
		feedbackId: 'view',
		options: { view },
		style: { bgcolor: COLOR.active, color: WHITE },
	}),
	disconnected: (): Feedback => ({
		feedbackId: 'connected',
		options: {},
		isInverted: true,
		style: { bgcolor: COLOR.disconnected, color: WHITE },
	}),
	connected: (): Feedback => ({
		feedbackId: 'connected',
		options: {},
		style: { bgcolor: COLOR.active, color: WHITE },
	}),
	error: (): Feedback => ({
		feedbackId: 'command_error',
		options: {},
		style: { bgcolor: COLOR.error, color: WHITE },
	}),
}

function style(
	text: string,
	bgcolor: number,
	extra: Partial<CompanionButtonStyleProps> = {},
): CompanionButtonStyleProps {
	return { text, size: 'auto', color: WHITE, bgcolor, show_topbar: false, ...extra }
}

function button(
	name: string,
	buttonStyle: CompanionButtonStyleProps,
	down: Action[],
	feedbacks: Feedback[] = [],
	keywords: string[] = [],
): Preset {
	return {
		type: 'simple',
		name,
		keywords,
		style: buttonStyle,
		steps: [{ down, up: [] }],
		feedbacks,
	}
}

function signed(n: number): string {
	return n > 0 ? `+${n}` : `${n}`
}

export function UpdatePresets(self: ModuleInstance): void {
	const v = (variable: string): string => `$(${self.label}:${variable})`

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const add = (id: string, preset: Preset): string => {
		presets[id] = preset
		return id
	}

	// --- Transport -------------------------------------------------------
	const transport = [
		add(
			'play',
			button(
				'Play / pause (forwards). In live: review from 5 s before live',
				style('▶ ❚❚\nPLAY', COLOR.transport),
				[cmd.play()],
				[fb.playback('forward')],
				['space', 'play', 'pause'],
			),
		),
		add(
			'reverse',
			button(
				'Play backwards / pause',
				style('◀ ❚❚\nREVERSE', COLOR.transport),
				[cmd.reverse()],
				[fb.playback('reverse')],
				['backwards', 'rewind'],
			),
		),
		add(
			'pause',
			button('Pause', style('❚❚\nPAUSE', COLOR.transport), [cmd.pause()], [fb.playback('paused', COLOR.reviewActive)]),
		),
		add(
			'play_forward',
			button(
				'Pause, then play forwards (always ends up playing)',
				style('▶\nPLAY ONLY', COLOR.transport, { size: '14' }),
				[cmd.pause(), cmd.play()],
				[fb.playback('forward')],
			),
		),
	]

	// --- Frame stepping --------------------------------------------------
	const stepButtons = [-1, 1, -5, 5, -10, 10, -25, 25, -50, 50].map((frames) =>
		add(
			`step_${frames < 0 ? 'back' : 'fwd'}_${Math.abs(frames)}`,
			button(
				`Step ${signed(frames)} frame${Math.abs(frames) === 1 ? '' : 's'}`,
				style(frames < 0 ? `◀|\n${frames} fr` : `|▶\n${signed(frames)} fr`, COLOR.step),
				[cmd.step(frames)],
				[],
				['frame', 'step'],
			),
		),
	)

	// --- Jumping ---------------------------------------------------------
	const jumpButtons = [-1, 1, -2, 2, -5, 5, -10, 10, -30, 30].map((seconds) =>
		add(
			`jump_${seconds < 0 ? 'back' : 'fwd'}_${Math.abs(seconds)}`,
			button(
				`Jump ${signed(seconds)} seconds`,
				style(seconds < 0 ? `◀◀\n${seconds} s` : `▶▶\n${signed(seconds)} s`, COLOR.jump),
				[cmd.jump(seconds)],
				[],
				['seek', 'skip', 'jump'],
			),
		),
	)

	// --- Speed -----------------------------------------------------------
	const speedButtons = [
		...[...SPEEDS]
			.reverse()
			.map((speed) =>
				add(
					`speed_${speed.replace('.', '_')}`,
					button(
						`Speed ${speed}×`,
						style(`SPEED\n${speed}×`, COLOR.speed),
						[cmd.speed(speed)],
						[fb.speed(speed)],
						['slow motion', 'slowmo'],
					),
				),
			),
		add('faster', button('Next faster speed', style('FASTER\n+', COLOR.speed), [cmd.faster()])),
		add('slower', button('Next slower speed', style('SLOWER\n−', COLOR.speed), [cmd.slower()])),
		add(
			'speed_display',
			button('Shows the current speed, press for 1×', style(`SPEED\n${v('speed')}`, BLACK, { size: '18' }), [
				cmd.speed('1'),
			]),
		),
	]

	// --- Live / review ---------------------------------------------------
	const modeButtons = [
		add(
			'review',
			button(
				'Review the recording',
				style('REVIEW', COLOR.review),
				[cmd.review()],
				[fb.mode('review', COLOR.reviewActive, BLACK)],
				['replay'],
			),
		),
		add('live', button('Back to live', style('LIVE', COLOR.live), [cmd.live()], [fb.mode('live', COLOR.liveActive)])),
		add('toggle_live_review', {
			type: 'simple',
			name: 'Toggle between live and review',
			keywords: ['toggle'],
			style: style(`LIVE ⇄\nREVIEW\n${v('mode')}`, BLACK, { size: '14' }),
			steps: [
				{
					down: [
						{
							actionId: 'internal:logicIf',
							options: {},
							children: {
								condition: [{ feedbackId: 'mode', options: { mode: 'live' } }],
								actions: [cmd.review()],
								elseActions: [cmd.live()],
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [fb.mode('live', COLOR.liveActive), fb.mode('review', COLOR.reviewActive, BLACK)],
		}),
	]

	// --- Markers ---------------------------------------------------------
	const markerButtons = [
		add(
			'marker_set',
			button('Set a marker', style('◆\nMARKER', COLOR.markerSet), [cmd.marker()], [], ['mark', 'bookmark']),
		),
		add('marker_prev', button('Previous marker', style('◀ ◆\nPREV', COLOR.marker), [cmd.markerGo('PREV')])),
		add('marker_next', button('Next marker', style('◆ ▶\nNEXT', COLOR.marker), [cmd.markerGo('NEXT')])),
		add(
			'marker_prev_play',
			button('Go to the previous marker and play from there', style('◀ ◆ ▶\nPLAY PREV', COLOR.marker, { size: '14' }), [
				cmd.markerGo('PREV'),
				cmd.pause(),
				cmd.play(),
			]),
		),
		add(
			'marker_next_play',
			button('Go to the next marker and play from there', style('◆ ▶ ▶\nPLAY NEXT', COLOR.marker, { size: '14' }), [
				cmd.markerGo('NEXT'),
				cmd.pause(),
				cmd.play(),
			]),
		),
	]

	// --- Cameras ---------------------------------------------------------
	const cameraButtons = [
		...[1, 2, 3, 4].map((camera) =>
			add(
				`camera_${camera}`,
				button(
					`Camera ${camera} full screen / back to grid`,
					style(`CAM\n${camera}`, COLOR.camera, { size: '24' }),
					[cmd.camera(camera)],
					[fb.view(camera)],
					['camera', 'view', 'fullscreen'],
				),
			),
		),
		add('grid', button('Back to the grid', style('▦\nGRID', COLOR.camera), [cmd.grid()], [fb.view(0)], ['esc'])),
	]

	// --- Replay combos ---------------------------------------------------
	const replay = (speed: Speed): string =>
		add(
			`replay_5s_${speed.replace('.', '_')}`,
			button(
				`Replay the last 5 seconds at ${speed}× (LIVE, PLAY, SPEED ${speed})`,
				style(`REPLAY\n5 s\n${speed}×`, COLOR.combo, { size: '14' }),
				[cmd.live(), cmd.play(), cmd.speed(speed)],
				[],
				['instant replay', 'slow motion'],
			),
		)
	const slowmo = (speed: Speed): string =>
		add(
			`play_at_${speed.replace('.', '_')}`,
			button(
				`Play forwards at ${speed}× from the current position`,
				style(`▶ ${speed}×`, COLOR.combo),
				[cmd.speed(speed), cmd.pause(), cmd.play()],
				[],
				['slow motion'],
			),
		)
	const comboButtons = [
		replay('1'),
		replay('0.5'),
		replay('0.25'),
		add(
			'replay_10s',
			button(
				'Replay the last 10 seconds at 1× (LIVE, PLAY, SPEED 1, JUMP -5)',
				style('REPLAY\n10 s\n1×', COLOR.combo, { size: '14' }),
				[cmd.live(), cmd.play(), cmd.speed('1'), cmd.jump(-5)],
				[],
				['instant replay'],
			),
		),
		slowmo('0.5'),
		slowmo('0.25'),
		slowmo('0.1'),
		add(
			'reset_live_grid',
			button(
				'Back to live and to the grid',
				style('LIVE\n+ GRID', COLOR.live),
				[cmd.grid(), cmd.live()],
				[fb.mode('live', COLOR.liveActive)],
				['reset', 'home'],
			),
		),
	]

	// --- Jog / shuttle for rotary encoders (e.g. Stream Deck +) ----------
	const rotary = (id: string, name: string, text: string, press: Action[], left: Action[], right: Action[]): string =>
		add(id, {
			type: 'simple',
			name,
			keywords: ['encoder', 'dial', 'knob', 'rotary', 'jog', 'shuttle'],
			style: style(text, COLOR.transport, { size: '14' }),
			steps: [{ down: press, up: [], rotate_left: left, rotate_right: right }],
			feedbacks: [fb.playback('playing')],
		})
	const rotaryButtons = [
		rotary(
			'dial_frames',
			'Dial: turn = 1 frame, press = play / pause',
			'JOG\n±1 frame\n▶ ❚❚',
			[cmd.play()],
			[cmd.step(-1)],
			[cmd.step(1)],
		),
		rotary(
			'dial_frames_5',
			'Dial: turn = 5 frames, press = play / pause',
			'JOG\n±5 frames\n▶ ❚❚',
			[cmd.play()],
			[cmd.step(-5)],
			[cmd.step(5)],
		),
		rotary(
			'dial_seconds',
			'Dial: turn = 1 second, press = play / pause',
			'SHUTTLE\n±1 s\n▶ ❚❚',
			[cmd.play()],
			[cmd.jump(-1)],
			[cmd.jump(1)],
		),
		rotary(
			'dial_speed',
			'Dial: turn = slower / faster, press = 1×',
			`SPEED\n${v('speed')}\npress 1×`,
			[cmd.speed('1')],
			[cmd.slower()],
			[cmd.faster()],
		),
		rotary(
			'dial_markers',
			'Dial: turn = previous / next marker, press = set marker',
			'MARKERS\n◀ ◆ ▶\npress = set',
			[cmd.marker()],
			[cmd.markerGo('PREV')],
			[cmd.markerGo('NEXT')],
		),
	]

	// --- Status ----------------------------------------------------------
	const statusButtons = [
		add(
			'status_connection',
			button(
				'Connection status, press to ping',
				style(`VAR\n${v('connection')}\n${v('latency_ms')} ms`, COLOR.status, { size: '14' }),
				[cmd.ping()],
				[fb.connected(), fb.disconnected(), fb.error()],
				['status', 'ping', 'connection'],
			),
		),
		add(
			'status_state',
			button(
				'Assumed state: mode, speed, view',
				style(`${v('mode')}\n${v('speed')}\n${v('view')}`, COLOR.status, { size: '14' }),
				[],
				[fb.mode('live', COLOR.liveActive), fb.mode('review', COLOR.reviewActive, BLACK)],
				['status', 'state'],
			),
		),
		add(
			'status_playback',
			button(
				'Assumed playback state',
				style(`PLAYBACK\n${v('playback')}`, COLOR.status, { size: '14' }),
				[],
				[fb.playback('playing'), fb.mode('live', COLOR.liveActive)],
				['status'],
			),
		),
		add(
			'status_last_command',
			button(
				'Last command and answer',
				style(`${v('last_command')}\n→ ${v('last_response')}`, COLOR.status, { size: '14' }),
				[],
				[fb.error()],
				['status', 'debug'],
			),
		),
		add(
			'status_last_error',
			button(
				'Last error (flashes red when a command is rejected)',
				style(`ERROR\n${v('last_error')}`, COLOR.status, { size: '7' }),
				[],
				[fb.error()],
				['status', 'debug', 'error'],
			),
		),
	]

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'review',
			name: 'Live & review',
			description: 'Switch between the live picture and reviewing the recording',
			definitions: [
				{ id: 'mode', type: 'simple', name: 'Mode', presets: modeButtons },
				{
					id: 'transport',
					type: 'simple',
					name: 'Play / pause',
					description: 'PLAY and REVERSE toggle between playing and pause, like Space and Shift + Space',
					presets: transport,
				},
			],
		},
		{
			id: 'navigate',
			name: 'Step & jump',
			definitions: [
				{
					id: 'step',
					type: 'simple',
					name: 'Step frames',
					description: 'Like ← / →; review functions sent in live mode switch to review first',
					presets: stepButtons,
				},
				{
					id: 'jump',
					type: 'simple',
					name: 'Jump seconds',
					description: 'Like Shift/Ctrl/Alt + ← / →',
					presets: jumpButtons,
				},
			],
		},
		{
			id: 'speed',
			name: 'Speed',
			description: 'Highlighted buttons show the speed last set from Companion',
			definitions: speedButtons,
		},
		{
			id: 'markers',
			name: 'Markers',
			definitions: markerButtons,
		},
		{
			id: 'cameras',
			name: 'Cameras',
			description: 'Pressing the camera that is already full screen goes back to the grid',
			definitions: cameraButtons,
		},
		{
			id: 'combos',
			name: 'Replay combos',
			description: 'Several commands on one button, e.g. an instant slow-motion replay of the last skill',
			definitions: comboButtons,
		},
		{
			id: 'rotary',
			name: 'Dials (Stream Deck +)',
			description: 'For rotary encoders: turn to step, jump or change speed, press for the action shown',
			definitions: rotaryButtons,
		},
		{
			id: 'status',
			name: 'Status',
			description:
				'VAR does not report its state; mode, speed, view and playback are assumed from the commands Companion sent',
			definitions: statusButtons,
		},
	]

	self.setPresetDefinitions(structure, presets)
}
