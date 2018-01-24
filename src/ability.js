import { extend } from 'jquery';
import { Damage } from './damage';
import { Hex } from './utility/hex';
import { Creature } from './creature';
import { isTeam, Team } from './utility/team';
import * as arrayUtils from './utility/arrayUtils';

/**
 * Ability Class
 *
 * Class parsing function from creature abilities
 */
export default class Ability {
  /**
   * @param {Creature} creature
   * @param {number} abilityID
   * @param {Game} game
   */
  constructor(creature, abilityID, game) {
    this.creature = creature;
    this.game = game;
    this.used = false;
    this.id = abilityID;
    this.priority = 0; // Priority for same trigger
    this.timesUsed = 0;
    this.timesUsedThisTurn = 0;
    this.token = 0;

    const data = game.retreiveCreatureStats(creature.type);
    // Deepclone
    extend(true, this, game.abilities[data.id][abilityID], data.ability_info[abilityID]);

    if (this.requirements === undefined && this.costs !== undefined) {
      this.requirements = this.costs;
    }
  }

  hasUpgrade() {
    return this.game.abilityUpgrades >= 0 && this.upgrade;
  }

  /**
   * Whether this ability upgrades after a certain number of uses. Otherwise it
   * upgrades after a certain number of rounds.
   * By default, this applies to active (onQuery) abilities.
   */
  isUpgradedPerUse() {
    return this.trigger === 'onQuery';
  }

  usesLeftBeforeUpgrade() {
    const { game } = this;

    if (this.isUpgradedPerUse()) {
      return game.abilityUpgrades - this.timesUsed;
    }

    return game.abilityUpgrades - this.creature.turnsActive;
  }

  isUpgraded() {
    return !this.hasUpgrade() ? false : this.usesLeftBeforeUpgrade() <= 0;
  }

  getTrigger() {
    if (this.trigger !== undefined) {
      return this.trigger;
    } else if (this.triggerFunc !== undefined) {
      return this.triggerFunc();
    }

    return undefined;
  }

  /**
   * Reset ability at start of turn.
   */
  reset() {
    this.setUsed(false);
    this.token = 0;
    this.timesUsedThisTurn = 0;
  }

  /**
   * Test and use the ability
   */
  use() {
    if (this.getTrigger() !== 'onQuery' || !this.require()) {
      return false;
    }

    if (this.used === true) {
      this.game.log('Ability already used!');
      return false;
    }

    this.game.grid.clearHexViewAlterations();
    this.game.clearOncePerDamageChain();
    this.game.activeCreature.hint(this.title, 'msg_effects');

    return this.query();
  }

  /**
   * End the ability. Must be called at the end of each ability function;
   *
   * @param {boolean} disableLogMsg Disable loggin
   * @param {boolean} deferedEnding
   */
  end(disableLogMsg, deferedEnding) {
    const { game } = this.game;

    if (!disableLogMsg) {
      game.log(`%CreatureName${this.creature.id}% uses ${this.title}`);
    }

    this.applyCost();
    this.setUsed(true); // Should always be here
    game.UI.updateInfos(); // Just in case
    game.UI.btnDelay.changeState('disabled');
    game.activeCreature.delayable = false;
    game.UI.selectAbility(-1);

    if (this.getTrigger() === 'onQuery' && !deferedEnding) {
      game.activeCreature.queryMove();
    }
  }

  /**
   * @param {boolean} val set the used attriute to the desired value
   */
  setUsed(val) {
    const { UI, activeCreature } = this.game;

    if (val) {
      this.used = true;
      // Avoid dimmed passive for current creature
      if (this.creature.id === activeCreature.id) {
        UI.abilitiesButtons[this.id].changeState('disabled');
      }
    } else {
      this.used = false;
      if (this.creature.id === activeCreature.id) {
        if (this.id !== 0) { // Passive
          UI.abilitiesButtons[this.id].changeState('normal');
        }
      }
    }
  }

  /**
   * Called after activate(); primarily to set times used so that isUpgraded is
   * correct within activate().
   */
  postActivate() {
    this.timesUsed += 1;
    this.timesUsedThisTurn += 1;
    // Update upgrade information
    this.game.UI.updateAbilityButtonsContent();
  }

  /**
   * Animate the creature
   *
   * TODO: refactor this mess.
   */
  animation(target) {
    const { game } = this;

    // Gamelog Event Registration
    if (game.triggers.onQuery.test(this.getTrigger())) {
      if (arguments[0] instanceof Hex) {
        const args = $j.extend({}, arguments);
        delete args[0];
        game.gamelog.add({
          action: 'ability',
          target: {
            type: 'hex',
            x: target.x,
            y: target.y,
          },
          id: this.id,
          args: arguments,
        });
      }

      if (arguments[0] instanceof Creature) {
        const args = $j.extend({}, arguments);
        delete args[0];
        game.gamelog.add({
          action: 'ability',
          target: {
            type: 'creature',
            crea: arguments[0].id,
          },
          id: this.id,
          args,
        });
      }

      if (arguments[0] instanceof Array) {
        const args = $j.extend({}, arguments);
        delete args[0];

        const array = arguments[0].map(item => ({
          x: item.x,
          y: item.y,
        }));

        game.gamelog.add({
          action: 'ability',
          target: {
            type: 'array',
            array,
          },
          id: this.id,
          args,
        });
      }
    } else if (this.creature.materializationSickness && this.affectedByMatSickness) {
      return false;
    }

    return this.animation2({
      arg: arguments,
    });
  }

  animation2(o) {
    const { game } = this;
    const opt = Object.assign({
      callback() { },
      arg: {},
    }, o);
    const args = opt.arg;
    const activateAbility = () => {
      this.activate(args[0], args[1]);
      this.postActivate();
    };

    game.freezedInput = true;

    // Animate
    const p0 = this.creature.sprite.x;
    let p1 = p0;
    let p2 = p0;

    p1 += (this.creature.player.flipped) ? 5 : -5;
    p2 += (this.creature.player.flipped) ? -5 : 5;

    // Force creatures to face towards their target
    if (args[0] instanceof Creature) {
      this.creature.faceHex(args[0]);
    }
    // Play animations and sounds only for active abilities
    if (this.getTrigger() === 'onQuery') {
      const animID = Math.random();

      game.animationQueue.push(animID);

      let animationData = {
        duration: 500,
        delay: 350,
        activateAnimation: true,
      };

      if (this.getAnimationData) {
        animationData = Object.assign({}, animationData, this.getAnimationData(...args));
      }

      if (animationData.activateAnimation) {
        game.Phaser.add.tween(this.creature.sprite)
          .to({
            x: p1,
          }, 250, Phaser.Easing.Linear.None)
          .to({
            x: p2,
          }, 100, Phaser.Easing.Linear.None)
          .to({
            x: p0,
          }, 150, Phaser.Easing.Linear.None)
          .start();
      }

      setTimeout(() => {
        if (!game.triggers.onUnderAttack.test(this.getTrigger())) {
          game.soundsys.playSound(game.soundLoaded[2], game.soundsys.effectsGainNode);
          activateAbility();
        }
      }, animationData.delay);

      setTimeout(() => {
        const queue = game.animationQueue.filter(item => item != animID);

        if (queue.length === 0) {
          game.freezedInput = false;
        }

        game.animationQueue = queue;
      }, animationData.duration);
    } else {
      activateAbility();
      game.freezedInput = false;
    }

    const interval = setInterval(() => {
      if (!game.freezedInput) {
        clearInterval(interval);
        opt.callback();
      }
    }, 100);
  }

  /**
   * @param {Hex[]} hexes Contains the targeted hexagons
   * @return {Array}  Contains the target units
   */
  getTargets(hexes) {
    const targets = {};
    const targetsList = [];

    hexes.forEach((item) => {
      if (item.creature instanceof Creature) {
        if (targets[item.creature.id] === undefined) {
          targets[item.creature.id] = {
            hexesHit: 0,
            target: item.creature,
          };

          targetsList.push(targets[item.creature.id]);
        }

        targets[item.creature.id].hexesHit += 1; // Unit has been found
      }
    });

    return targetsList;
  }

  getFormattedCosts() {
    return !this.costs ? false : this.getFormattedDamages(this.costs);
  }

  getFormattedDamages(obj = this.damages) {
    let string = '';
    const { creature } = this;

    Object.entries(obj).forEach((key, value) => {
      if (key === 'special') {
        // TODO: don't manually list all the stats and masteries when needed
        string += value.replace(/%(health|regrowth|endurance|energy|meditation|initiative|offense|defense|movement|pierce|slash|crush|shock|burn|frost|poison|sonic|mental)%/g, '<span class="$1"></span>');
        return;
      }

      if (key === 'energy') {
        value += creature.stats.reqEnergy;
      }

      if (string !== '') {
        string += ', ';
      }

      string += (`${value}<span class="${key}"></span>`);
    });

    return string;
  }

  getFormattedEffects() {
    let string = '';

    if (!this.effects) {
      return false;
    }

    this.effects.forEach((effect) => {
      if (effect.special) {
        // TODO: don't manually list all the stats and masteries when needed
        string += effect.special.replace(/%(health|regrowth|endurance|energy|meditation|initiative|offense|defense|movement|pierce|slash|crush|shock|burn|frost|poison|sonic|mental)%/g, '<span class="$1"></span>');
        return;
      }
      Object.entires(effect).forEach((key, value) => {
        if (string !== '') {
          string += ', ';
        }
        string += (`${value}<span class="${key}"></span>`);
      });
    });
    return string;
  }

  /**
   * @param {{target: Creature, hexesHit: number}[]}  targets
   */
  areaDamage(attacker, damages, effects, targets, ignoreRetaliation) {
    let multiKill = 0;
    targets.forEach((target) => {
      if (target === undefined) {
        return;
      }
      const dmg = new Damage(attacker, damages, targets[i].hexesHit, effects, this.game);
      const damageResult = target.target.takeDamage(dmg, {
        ignoreRetaliation,
      });
      multiKill += damageResult.kill + 0;
    });

    if (multiKill > 1) {
      attacker.player.score.push({
        type: 'combo',
        kills: multiKill,
      });
    }
  }

  /**
   * @param {Hex[]} hexes The hexgrid
   * @param {Object} o tests
   * @return Whether there is at least one creature in the hexes that satisfies various conditions,
   *  e.g. team.
   */
  atLeastOneTarget(hexes, o) {
    const defaultOpt = {
      team: Team.both,
      optTest() {
        return true;
      },
    };

    o = Object.assign({}, defaultOpt, o);

    const hex = hexes.filter((current) => {
      const { creature } = current;
      return !creature || !isTeam(this.creature, creature, o.team) || !o.optTest(creature);
    });
    if (hex.length >= 1) return true;

    this.message = this.game.msg.abilities.notarget;
    return false;
  }

  /**
   * testRequirements()
   *
   * Test the requirement for this ability. Negative values mean maximum value of the stat.
   * For instance : energy = -5 means energy must be lower than 5.
   * If one requirement fails it returns false.
   */
  testRequirements() {
    const { game } = this;
    const def = {
      plasma: 0,
      energy: 0,
      endurance: 0,
      remainingMovement: 0,
      stats: {
        health: 0,
        regrowth: 0,
        endurance: 0,
        energy: 0,
        meditation: 0,
        initiative: 0,
        offense: 0,
        defense: 0,
        movement: 0,
        pierce: 0,
        slash: 0,
        crush: 0,
        shock: 0,
        burn: 0,
        frost: 0,
        poison: 0,
        sonic: 0,
        mental: 0,
      },
    };
    const req = Object.assign({}, def, this.requirements);
    const abilityMsgs = game.msg.abilities;

    // Plasma
    if (req.plasma > 0) {
      if (this.creature.player.plasma < req.plasma) {
        this.message = abilityMsgs.notenough.replace('%stat%', 'plasma');
        return false;
      }
    } else if (req.plasma < 0) {
      if (this.creature.player.plasma > -req.plasma) {
        this.message = abilityMsgs.toomuch.replace('%stat%', 'plasma');
        return false;
      }
    }

    // Energy
    const reqEnergy = req.energy + this.creature.stats.reqEnergy;
    if (reqEnergy > 0) {
      if (this.creature.energy < reqEnergy) {
        this.message = abilityMsgs.notenough.replace('%stat%', 'energy');
        return false;
      }
    } else if (reqEnergy < 0) {
      if (this.creature.energy > -reqEnergy) {
        this.message = abilityMsgs.toomuch.replace('%stat%', 'energy');
        return false;
      }
    }

    // Endurance
    if (req.endurance > 0) {
      if (this.creature.endurance < req.endurance) {
        this.message = abilityMsgs.notenough.replace('%stat%', 'endurance');
        return false;
      }
    } else if (req.endurance < 0) {
      if (this.creature.endurance > -req.endurance) {
        this.message = abilityMsgs.toomuch.replace('%stat%', 'endurance');
        return false;
      }
    }

    // Health
    if (req.health > 0) {
      if (this.creature.health <= req.health) {
        this.message = abilityMsgs.notenough.replace('%stat%', 'health');
        return false;
      }
    } else if (req.health < 0) {
      if (this.creature.health > -req.health) {
        this.message = abilityMsgs.toomuch.replace('%stat%', 'health');
        return false;
      }
    }

    // Return wether all stats are valid
    return Object.entries(req.stats).every((key, value) =>
      (value > 0 && this.creature.stats[key] > value)
      || (value < 0 && this.creature.stats[key] < value));
  }

  applyCost() {
    const { game, creature, costs } = this;

    if (costs === undefined) {
      return;
    }

    Object.entries(costs).forEach((key, value) => {
      if (typeof (value) === 'number') {
        if (key === 'health') {
          creature.hint(value, `damage d${value}`);
          game.log(`%CreatureName${creature.id}% loses ${value} health`);
        } else if (key === 'energy') {
          value += creature.stats.reqEnergy;
        }

        creature[key] = Math.max(creature[key] - value, 0); // Cap
      }
    });

    creature.updateHealth();
    if (creature.id === game.activeCreature.id) {
      game.UI.energyBar.animSize(creature.energy / creature.stats.energy);
    }
  }

  /**
   * Test and get directions where there are valid targets in directions, using
   * direction queries
   * o - dict of arguments for direction query
   * returns array of ints, length of total directions, 1 if direction valid else 0
   */
  testDirections(o) {
    const defaultOpt = {
      team: Team.enemy,
      id: this.creature.id,
      flipped: this.creature.player.flipped,
      x: this.creature.x,
      y: this.creature.y,
      directions: [1, 1, 1, 1, 1, 1],
      includeCreature: true,
      stopOnCreature: true,
      distance: 0,
      sourceCreature: undefined,
    };

    o = Object.merge({}, defaultOpt, o);

    const outDirections = [];

    o.directions.forEach((direction, index) => {
      if (!direction) {
        outDirections.push(0);
        return;
      }

      let fx = 0;

      if (o.sourceCreature instanceof Creature) {
        const { flipped } = o.sourceCreature.player;

        if ((!flipped && index > 2) || (flipped && index < 3)) {
          fx = -1 * (o.sourceCreature.size - 1);
        }
      }

      let dir = this.game.grid.getHexLine(o.x + fx, o.y, index, o.flipped);

      if (o.distance > 0) {
        dir = dir.slice(0, o.distance + 1);
      }

      dir = arrayUtils.filterCreature(dir, o.includeCreature, o.stopOnCreature, o.id);
      const isValid = this.atLeastOneTarget(dir, o);
      outDirections.push(isValid ? 1 : 0);
    });

    return outDirections;
  }
}

