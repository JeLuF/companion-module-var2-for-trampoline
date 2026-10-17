/*
 * The VAR remote protocol is fire-and-forget: it answers OK / PONG / ERR but never reports
 * the application state. The module therefore keeps an *assumed* state, derived from the
 * commands Companion sent and the application accepted. Keys pressed directly on the VAR
 * computer are not seen, so this state can drift until the next command that sets it
 * absolutely (LIVE, GRID, SPEED <x>, CAMERA <n>, ...).
 */

export const SPEEDS = ['0.1', '0.25', '0.5', '1', '2'] as const
export type Speed = (typeof SPEEDS)[number]

export type Mode = 'unknown' | 'live' | 'review'
export type Playback = 'unknown' | 'live' | 'paused' | 'forward' | 'reverse'
/** 0 = grid, 1-4 = camera full screen, -1 = unknown */
export type View = -1 | 0 | 1 | 2 | 3 | 4

export interface AssumedState {
	mode: Mode
	playback: Playback
	speed: Speed | 'unknown'
	view: View
}

export function initialState(): AssumedState {
	return { mode: 'unknown', playback: 'unknown', speed: 'unknown', view: -1 }
}

export function isSpeed(value: string): value is Speed {
	return (SPEEDS as readonly string[]).includes(value)
}

/** Format a speed for display, e.g. `0.25×` */
export function formatSpeed(speed: Speed | 'unknown'): string {
	return speed === 'unknown' ? '?' : `${speed}×`
}

export function formatView(view: View): string {
	if (view === -1) return '?'
	if (view === 0) return 'Grid'
	return `Cam ${view}`
}

/**
 * Apply a command that the application acknowledged with OK.
 * Returns a new state object (the old one is not modified).
 */
export function applyCommand(prev: AssumedState, command: string): AssumedState {
	const state = { ...prev }
	const [verb, arg] = command.trim().toUpperCase().split(/\s+/, 2)

	// Review functions sent in live mode switch to review first
	const enterReview = (): void => {
		if (state.mode !== 'review') {
			state.mode = 'review'
			if (state.playback === 'live' || state.playback === 'unknown') state.playback = 'paused'
		}
	}

	switch (verb) {
		case 'LIVE':
			state.mode = 'live'
			state.playback = 'live'
			break
		case 'REVIEW':
			enterReview()
			break
		case 'PLAY':
			if (state.mode !== 'review') {
				// In live mode: review from 5 s before live, playing forwards
				state.mode = 'review'
				state.playback = 'forward'
			} else {
				state.playback = state.playback === 'forward' ? 'paused' : 'forward'
			}
			break
		case 'REVERSE':
			enterReview()
			state.playback = state.playback === 'reverse' ? 'paused' : 'reverse'
			break
		case 'PAUSE':
			enterReview()
			state.playback = 'paused'
			break
		case 'STEP':
		case 'JUMP':
			enterReview()
			break
		case 'MARKER':
			// Setting a marker works in both modes; navigating markers is a review function
			if (arg === 'PREV' || arg === 'NEXT') enterReview()
			break
		case 'SPEED': {
			const value = normalizeSpeed(arg ?? '')
			if (value) {
				enterReview()
				state.speed = value
			}
			break
		}
		case 'FASTER':
		case 'SLOWER': {
			enterReview()
			if (state.speed !== 'unknown') {
				const index = SPEEDS.indexOf(state.speed) + (verb === 'FASTER' ? 1 : -1)
				state.speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, index))]
			}
			break
		}
		case 'CAMERA': {
			const camera = Number(arg)
			if (camera >= 1 && camera <= 4) {
				// Pressing the camera that is already full screen goes back to the grid
				state.view = state.view === camera ? 0 : (camera as View)
			}
			break
		}
		case 'GRID':
			state.view = 0
			break
	}

	return state
}

/** Accepts `0.5`, `0.5x`, `.5` etc. and returns the canonical speed, or undefined */
export function normalizeSpeed(value: string): Speed | undefined {
	const num = Number(value.trim().replace(/[x×]$/i, ''))
	if (!Number.isFinite(num)) return undefined
	return SPEEDS.find((s) => Number(s) === num)
}
