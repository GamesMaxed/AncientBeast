import { Creature } from './creature';
import Game from './game';

// TODO: find real type
type Effect = any;

type Status = '' | 'Dodged' | 'Shielded' | 'Disintegrated';

/**
 * Damage Class
 *
 * TODO: This documentation needs to be updated with things that are determined dynamically like #melee and #counter
 */
export class Damage {
	public status: Status = '';
	public counter = false;
	public melee = false;
	public isFromTrap = false;
	public noLog = false;

	/**
	 * @param attacker Unit that initiated the damage
	 * @param damages Object containing the damage by type {frost : 5} for example
	 * @param area Number of hexagons being hit
	 * @param effects Contains Effect object to apply to the target
	 * @param game Game object
	 */
	constructor(
		public attacker: Creature,
		public damages: Record<string, number>,
		public area: number,
		public effects: Effect[],
		public game: Game,
	) {}

	applyDamage(target: Creature): Record<string | 'total', number> {
		const stats = target.stats;
		const atk = this.attacker.stats;
		let returnObj = {
			total: 0,
		};

		// Damage calculation
		Object.entries(this.damages).forEach(([key, value]) => {
			let points;

			if (key == 'pure') {
				// Bypass defense calculation
				points = value;
			} else {
				points = Math.round(
					value * (1 + (atk.offense - stats.defense / this.area + atk[key] - stats[key]) / 100),
				);
				// For debugging purposes
				if (this.game.debugMode) {
					console.log(
						`damage = ${value}${key}dmg * (1 + (${atk.offense}atkoffense - ${stats.defense}trgdefense / ${this.area}area + ${atk[key]}atk${key} - ${stats[key]}trg${key} )/100)`,
					);
				}
			}

			returnObj[key] = points;
			returnObj.total += points;
		});

		returnObj.total = Math.max(returnObj.total, 1); // Minimum of 1 damage

		return returnObj;
	}
}
