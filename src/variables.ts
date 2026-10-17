import type ModuleInstance from './main.js'

export type VariablesSchema = {
	connection: string
	mode: string
	playback: string
	speed: string
	view: string
	camera: number
	last_command: string
	last_response: string
	last_error: string
	latency_ms: number | undefined
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		connection: { name: 'Connection state (connected / connecting / disconnected)' },
		mode: { name: 'Mode, assumed from sent commands (live / review / unknown)' },
		playback: { name: 'Playback, assumed (live / paused / forward / reverse / unknown)' },
		speed: { name: 'Playback speed, assumed (e.g. 0.25×)' },
		view: { name: 'View, assumed (Grid / Cam 1 … Cam 4)' },
		camera: { name: 'Full screen camera number, assumed (0 = grid, -1 = unknown)' },
		last_command: { name: 'Last command sent' },
		last_response: { name: 'Last response received (OK / PONG / ERR …)' },
		last_error: { name: 'Last error message (command: reason)' },
		latency_ms: { name: 'Round trip time of the last PING in ms' },
	})
}
