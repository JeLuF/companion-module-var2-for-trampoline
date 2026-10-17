import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	keepalive: number
}

export const DEFAULT_PORT = 7450

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Setup',
			width: 12,
			value:
				'In VAR for Trampoline open the Recording menu → Remote control, tick "Companion, TCP port" and enter the address shown there (e.g. 192.168.1.20:7450) below.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'VAR computer IP address',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'TCP port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
		},
		{
			type: 'number',
			id: 'keepalive',
			label: 'Connection check interval (seconds, 0 = off)',
			description: 'Sends PING periodically to detect a lost connection and measure the round trip time.',
			width: 6,
			min: 0,
			max: 300,
			default: 5,
		},
	]
}
