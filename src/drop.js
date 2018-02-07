export default class Drop {
  /**
   * Create a drop
   *
   * @param {string} name Name of the drop
   * @param {number} health How much the drop heals
   * @param {number} energy How much energy the drop gives back
   * @param {number} x The X coordinate
   * @param {number} y The Y coordinate
   * @param {Game} game Game object
   */
  constructor(name, health, energy, x, y, game) {
    this.name = name;
    this.game = game;
    game.dropId += 1;
    this.id = game.dropId;
    this.x = x;
    this.y = y;
    this.pos = {
      x,
      y,
    };
    this.health = health;
    this.energy = energy;
    this.hex = game.grid.hexes[this.y][this.x];

    this.hex.drop = this;

    this.display = game.grid.dropGroup.create(this.hex.displayPos.x + 54, this.hex.displayPos.y + 15, `drop_${this.name}`);
    this.display.alpha = 0;
    this.display.anchor.setTo(0.5, 0.5);
    this.display.scale.setTo(1.5, 1.5);
    game.Phaser.add.tween(this.display).to({
      alpha: 1,
    }, 500, Phaser.Easing.Linear.None).start();
  }

  pickup(creature) {
    const { game } = this;

    game.log(`%CreatureName${creature.id}% picks up ${this.name}`);
    creature.hint(this.name, 'msg_effects');
    creature.dropCollection.push(this);

    creature.updateAlteration();

    this.hex.drop = undefined;

    if (this.health) {
      creature.heal(this.health);
      game.log(`%CreatureName${creature.id}% gains ${this.health} health`);
    }

    if (this.energy) {
      creature.energy += this.energy;
      game.log(`%CreatureName${creature.id}% gains ${this.energy} energy`);
    }
    creature.player.score.push({
      type: 'pickupDrop',
    });

    creature.updateAlteration(); // Will cap the stats

    const drop = this;

    const tween = game.Phaser.add.tween(this.display).to({
      alpha: 0,
    }, 500, Phaser.Easing.Linear.None).start();

    tween.onComplete.add(() => {
      drop.display.destroy();
    });
  }
}
