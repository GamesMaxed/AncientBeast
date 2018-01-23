import { Creature } from './creature';


/*
 * Effect Class
 */
export default class Effect {
  /**
   * @param {string} name name of the effect
   * @param {Creature} owner Creature that casted the effect
   * @param {Creature|Hex} target the object that possess the effect
   * @param {string} trigger Event that trigger the effect
   * @param {*} optArgs dictionary of optional arguments
   * @param {Game} game Game object
   */
  constructor(name, owner, target, trigger, optArgs, game) {
    this.id = game.effectId + 1;
    this.game = game;

    this.name = name;
    this.owner = owner;
    this.target = target;
    this.trigger = trigger;
    this.creationTurn = game.turn;

    const args = Object.assign({}, {
      // Default Arguments
      requireFn() {
        return true;
      },
      effectFn() { },
      alterations: {},
      turnLifetime: 0,
      deleteTrigger: 'onStartOfRound',
      stackable: true,
      noLog: false,
      specialHint: undefined, // Special hint for log
      deleteOnOwnerDeath: false,
    }, optArgs);

    Object.assign(this, args);

    game.effects.push(this);
  }

  animation() {
    this.activate.apply(this, ...arguments);
  }

  activate(arg) {
    if (!this.requireFn(arg)) {
      return false;
    }

    if (!this.noLog) {
      console.log(`Effect ${this.name} triggered`);
    }

    if (arg instanceof Creature) {
      arg.addEffect(this);
    }

    this.effectFn(this, arg);

    return true;
  }

  deleteEffect() {
    let i = this.target.effects.indexOf(this);

    this.target.effects.splice(i, 1);
    i = this.game.effects.indexOf(this);
    this.game.effects.splice(i, 1);
    this.target.updateAlteration();
    console.log(`Effect ${this.name} deleted`);
  }
}
