import { InstanceBase, InstanceStatus, TCPHelper, type SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_PORT, GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { applyCommand, formatSpeed, formatView, initialState, type AssumedState } from './state.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** How long the "command error" feedback stays active after an ERR answer */
const ERROR_INDICATION_MS = 3000
/** Commands without an answer for this long mean the connection is dead */
const MIN_RESPONSE_TIMEOUT_MS = 5000

interface PendingCommand {
	command: string
	sentAt: number
	/** Sent by the module itself (keepalive), not by a button */
	internal: boolean
}

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()

	state: AssumedState = initialState()
	connected = false
	/** Timestamp until which the "command error" feedback is active */
	errorUntil = 0

	#socket: TCPHelper | undefined
	#receiveBuffer = ''
	/** The protocol answers every line in order, so answers are matched to this FIFO */
	#pending: PendingCommand[] = []
	#keepaliveTimer: NodeJS.Timeout | undefined
	#errorTimer: NodeJS.Timeout | undefined

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.publishVariables()
		this.setVariableValues({ last_command: '', last_response: '', last_error: '', latency_ms: undefined })

		this.initConnection()
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.#stopConnection()
		if (this.#errorTimer) clearTimeout(this.#errorTimer)
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updatePresets() // the instance label may have changed
		this.initConnection()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	/**
	 * Send one command line to VAR. Returns false if there is no connection.
	 */
	sendCommand(command: string, internal = false): boolean {
		const line = command.replace(/[\r\n]+/g, ' ').trim()
		if (!line) return false

		if (!this.#socket || !this.connected) {
			if (!internal) this.log('warn', `Not connected, cannot send "${line}"`)
			return false
		}

		const sent = this.#socket.send(`${line}\n`)
		if (sent) {
			this.#pending.push({ command: line, sentAt: Date.now(), internal })
			if (!internal) {
				this.log('debug', `Sent: ${line}`)
				this.setVariableValues({ last_command: line })
			}
		}
		return sent
	}

	initConnection(): void {
		this.#stopConnection()

		const host = (this.config.host ?? '').trim()
		const port = Number(this.config.port) || DEFAULT_PORT
		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the IP address of the VAR computer')
			this.#setConnected(false, 'disconnected')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.#setConnected(false, 'connecting')

		const socket = new TCPHelper(host, port, { reconnect: true, reconnect_interval: 2000 })
		this.#socket = socket

		socket.on('status_change', (status, message) => {
			if (this.#socket !== socket) return
			this.updateStatus(status, message)
			if (status === InstanceStatus.Connecting) this.#setConnected(false, 'connecting')
			else if (status !== InstanceStatus.Ok) this.#setConnected(false, 'disconnected')
		})
		socket.on('error', (err) => {
			if (this.#socket !== socket) return
			this.log('error', `Connection error: ${err.message}`)
		})
		socket.on('connect', () => {
			if (this.#socket !== socket) return
			this.log('info', `Connected to VAR at ${host}:${port}`)
			this.#receiveBuffer = ''
			this.#pending = []
			this.#setConnected(true, 'connected')
			this.sendCommand('PING', true)
		})
		socket.on('end', () => {
			if (this.#socket !== socket) return
			this.log('info', 'VAR closed the connection')
			this.#setConnected(false, 'disconnected')
		})
		socket.on('data', (data) => {
			if (this.#socket !== socket) return
			this.#onData(data)
		})

		const interval = Number(this.config.keepalive)
		if (interval > 0) {
			this.#keepaliveTimer = setInterval(() => this.#keepalive(interval * 1000), interval * 1000)
		}
	}

	#stopConnection(): void {
		if (this.#keepaliveTimer) clearInterval(this.#keepaliveTimer)
		this.#keepaliveTimer = undefined
		if (this.#socket) {
			this.#socket.destroy()
			this.#socket = undefined
		}
		this.#receiveBuffer = ''
		this.#pending = []
	}

	#keepalive(intervalMs: number): void {
		if (!this.connected) return

		const oldest = this.#pending[0]
		if (oldest && Date.now() - oldest.sentAt > Math.max(MIN_RESPONSE_TIMEOUT_MS, 2 * intervalMs)) {
			this.log('warn', `No answer to "${oldest.command}", reconnecting`)
			this.initConnection()
			return
		}
		// Avoid piling up pings while VAR is busy
		if (!this.#pending.some((p) => p.internal)) this.sendCommand('PING', true)
	}

	#setConnected(connected: boolean, label: string): void {
		const changed = this.connected !== connected
		this.connected = connected
		if (!connected) this.#pending = []
		this.setVariableValues({ connection: label })
		if (changed) this.checkFeedbacks('connected')
	}

	#onData(data: Buffer): void {
		this.#receiveBuffer += data.toString('latin1')
		const lines = this.#receiveBuffer.split(/\r?\n/)
		this.#receiveBuffer = lines.pop() ?? ''
		for (const line of lines) {
			const answer = line.trim()
			if (answer) this.#onAnswer(answer)
		}
		// Protect against a peer that never sends a newline
		if (this.#receiveBuffer.length > 4096) this.#receiveBuffer = ''
	}

	#onAnswer(answer: string): void {
		const request = this.#pending.shift()
		if (!request) {
			this.log('debug', `Unexpected answer: ${answer}`)
			return
		}

		const upper = answer.toUpperCase()
		if (upper === 'PONG') {
			this.setVariableValues({ latency_ms: Date.now() - request.sentAt })
			if (!request.internal) this.setVariableValues({ last_response: answer })
		} else if (upper === 'OK') {
			this.setVariableValues({ last_response: answer })
			this.#updateState(applyCommand(this.state, request.command))
		} else if (upper.startsWith('ERR')) {
			const reason = answer.slice(3).trim() || 'error'
			this.log('warn', `VAR rejected "${request.command}": ${reason}`)
			this.setVariableValues({ last_response: answer, last_error: `${request.command}: ${reason}` })
			this.#indicateError()
		} else {
			this.log('debug', `Unknown answer to "${request.command}": ${answer}`)
			this.setVariableValues({ last_response: answer })
		}
	}

	#indicateError(): void {
		this.errorUntil = Date.now() + ERROR_INDICATION_MS
		this.checkFeedbacks('command_error')
		if (this.#errorTimer) clearTimeout(this.#errorTimer)
		this.#errorTimer = setTimeout(() => {
			this.#errorTimer = undefined
			this.checkFeedbacks('command_error')
		}, ERROR_INDICATION_MS + 50)
	}

	#updateState(next: AssumedState): void {
		const prev = this.state
		this.state = next
		if (
			prev.mode === next.mode &&
			prev.playback === next.playback &&
			prev.speed === next.speed &&
			prev.view === next.view
		) {
			return
		}
		this.publishVariables()
		this.checkFeedbacks('mode', 'playback', 'speed', 'view')
	}

	/** Overwrite the assumed state, e.g. after the operator used the keyboard on the VAR computer */
	setAssumedState(next: Partial<AssumedState>): void {
		this.#updateState({ ...this.state, ...next })
	}

	publishVariables(): void {
		this.setVariableValues({
			mode: this.state.mode,
			playback: this.state.playback,
			speed: formatSpeed(this.state.speed),
			view: formatView(this.state.view),
			camera: this.state.view,
		})
	}
}
