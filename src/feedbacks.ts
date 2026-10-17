import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { CAMERA_CHOICES, SPEED_CHOICES } from './actions.js'
import { normalizeSpeed } from './state.js'

export type FeedbacksSchema = {
	connected: { type: 'boolean'; options: Record<string, never> }
	command_error: { type: 'boolean'; options: Record<string, never> }
	mode: { type: 'boolean'; options: { mode: 'live' | 'review' } }
	playback: { type: 'boolean'; options: { playback: 'forward' | 'reverse' | 'paused' | 'playing' } }
	speed: { type: 'boolean'; options: { speed: string } }
	view: { type: 'boolean'; options: { view: number } }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions<FeedbacksSchema> = {
		connected: {
			name: 'Connection: connected',
			description: 'True while the TCP connection to VAR is open',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(0, 120, 0), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.connected,
		},
		command_error: {
			name: 'Connection: command rejected',
			description: 'True for 3 seconds after VAR answered a command with ERR',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(200, 0, 0), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => Date.now() < self.errorUntil,
		},
		mode: {
			name: 'State: mode (live / review)',
			description: 'Assumed from the commands sent by Companion',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(200, 0, 0), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'live', label: 'Live' },
						{ id: 'review', label: 'Review' },
					],
					default: 'live',
				},
			],
			callback: (feedback) => self.state.mode === feedback.options.mode,
		},
		playback: {
			name: 'State: playback',
			description: 'Assumed from the commands sent by Companion',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(0, 140, 0), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'playback',
					type: 'dropdown',
					label: 'Playback',
					choices: [
						{ id: 'forward', label: 'Playing forwards' },
						{ id: 'reverse', label: 'Playing backwards' },
						{ id: 'playing', label: 'Playing (either direction)' },
						{ id: 'paused', label: 'Paused' },
					],
					default: 'forward',
				},
			],
			callback: (feedback) => {
				const playback = self.state.playback
				if (feedback.options.playback === 'playing') return playback === 'forward' || playback === 'reverse'
				return playback === feedback.options.playback
			},
		},
		speed: {
			name: 'State: speed',
			description: 'Assumed from the commands sent by Companion',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(0, 140, 0), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'speed',
					type: 'dropdown',
					label: 'Speed',
					choices: SPEED_CHOICES,
					default: '1',
				},
			],
			callback: (feedback) => self.state.speed === normalizeSpeed(String(feedback.options.speed)),
		},
		view: {
			name: 'State: view (grid / camera)',
			description: 'Assumed from the commands sent by Companion',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(0, 140, 0), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'view',
					type: 'dropdown',
					label: 'View',
					choices: [{ id: 0, label: 'Grid' }, ...CAMERA_CHOICES],
					default: 1,
				},
			],
			callback: (feedback) => self.state.view === Number(feedback.options.view),
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
