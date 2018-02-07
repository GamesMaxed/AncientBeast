/**
 * Damage Class
 *
 * TODO: This documentation needs to be updated with things that are determined dynamically like
 * #melee and #counter
 */
export default class Damage {
  /**
   * @param {Creature} attacker Unit that initiated the damage
   * @param {obj} damage containing the damage by type {frost : 5} for example
   * @param {number} area Number of hexagons being hit
   * @param {Effect[]} effects Contains Effect object to apply to the target
   */
  constructor(attacker, damages, area, effects) {
    this.attacker = attacker;
    this.damages = damages;
    this.status = '';
    this.effects = effects;
    this.area = area;
    // Whether this is counter-damage
    this.counter = false;
  }

  applyDamage() {
    const targetStats = this.target.stats;
    const attackerStats = this.attacker.stats;

    const returnObj = {
      total: 0,
    };

    // Damage calculation
    Object.entries(this.damages).forEach(([key, value]) => {
      let points;

      if (key === 'pure') { // Bypass defense calculation
        points = value;
      } else {
        const factor = (1 + attackerStats.offense - (targetStats.defense / this.area) +
          attackerStats[key] - targetStats[key]) / 100;
        points = Math.round(value * factor);
      }

      returnObj[key] = points;
      returnObj.total += points;
    });

    returnObj.total = Math.max(returnObj.total, 1); // Minimum of 1 damage

    return returnObj;
  }
}
