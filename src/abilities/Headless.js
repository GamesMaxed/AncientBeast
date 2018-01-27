import { Damage } from '../damage';
import { Team } from '../utility/team';
import * as matrices from '../utility/matrices';
import * as arrayUtils from '../utility/arrayUtils';
import { Creature } from '../creature';
import { Effect } from '../effect';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  G.abilities[39] = [

    //   First Ability: Larva Infest
    {
      trigger: 'onStartPhase onEndPhase',

      _targetTeam: Team.enemy,
      _getHexes() {
        return this.creature.getHexMap(matrices.inlineback2hex);
      },

      require() {
        if (!this.atLeastOneTarget(this._getHexes(), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return this.testRequirements();
      },

      //  activate() :
      activate() {
        const ability = this;
        const creature = this.creature;

        if (this.atLeastOneTarget(this._getHexes(), {
          team: this._targetTeam,
        })) {
          this.end();
          this.setUsed(false); // Infinite triggering
        } else {
          return false;
        }

        const targets = this.getTargets(this._getHexes());

        targets.forEach((item) => {
          if (!(item.target instanceof Creature)) {
            return;
          }

          const trg = item.target;

          if (ability.isUpgraded()) {
            // Upgraded ability causes fatigue - endurance set to 0
            trg.addFatigue(trg.endurance);
          }

          // Add an effect that triggers on the target's start phase and adds the
          // debuff
          const effect = new Effect(
            ability.title, // Name
            creature, // Caster
            trg, // Target
            'onStartPhase', // Trigger
            {
              effectFn() {
                // Activate debuff
                trg.addEffect(new Effect(
                  '', // No name to prevent logging
                  creature,
                  trg,
                  '', {
                    deleteTrigger: '',
                    stackable: true,
                    alterations: {
                      endurance: -5,
                    },
                  },
                  G,
                ));
                // Note: effect activate by default adds the effect on the target,
                // but target already has this effect, so remove the trigger to
                // prevent infinite addition of this effect.
                item.trigger = '';
                item.deleteEffect();
              },
            },
            G,
          );

          trg.addEffect(effect, `%CreatureName${trg.id}% has been infested`);
        });
      },
    },


    //   Second Ability: Cartilage Dagger
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        const crea = this.creature;

        if (!this.testRequirements()) return false;

        // At least one target
        if (!this.atLeastOneTarget(crea.getHexMap(matrices.frontnback2hex), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const crea = this.creature;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: crea.id,
          flipped: crea.flipped,
          hexes: crea.getHexMap(matrices.frontnback2hex),
        });
      },


      //  activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        const d = {
          pierce: 11,
        };
        // Bonus for fatigued foe
        d.pierce = target.endurance <= 0 ? d.pierce * 2 : d.pierce;
        // Extra pierce damage if upgraded
        if (this.isUpgraded()) {
          const bonus = this.creature.stats.endurance - target.stats.endurance;
          if (bonus > 0) {
            d.pierce += bonus;
          }
        }

        const damage = new Damage(
          ability.creature, // Attacker
          d, // Damage Type
          1, // Area
          [], // Effects
          G,
        );

        const dmg = target.takeDamage(damage);
      },
    },


    //   Third Ability: Whip Move
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      directions: [0, 1, 0, 0, 1, 0],

      _minDistance: 2,
      _getMaxDistance() {
        if (this.isUpgraded()) {
          return 8;
        }
        return 6;
      },
      _targetTeam: Team.both,
      _getValidDirections() {
        // Get all directions where there are no targets within min distance,
        // and a target within max distance
        const crea = this.creature;
        const x = crea.player.flipped ? crea.x - crea.size + 1 : crea.x;
        const validDirections = [0, 0, 0, 0, 0, 0];
        for (let i = 0; i < this.directions.length; i++) {
          if (this.directions[i] === 0) {
            continue;
          }
          const directions = [0, 0, 0, 0, 0, 0];
          directions[i] = 1;
          const testMin = this.testDirection({
            team: this._targetTeam,
            x,
            directions,
            distance: this._minDistance,
            sourceCreature: crea,
          });
          const testMax = this.testDirection({
            team: this._targetTeam,
            x,
            directions,
            distance: this._getMaxDistance(),
            sourceCreature: crea,
          });
          if (!testMin && testMax) {
            // Target needs to be moveable
            let fx = 0;
            if ((!this.creature.player.flipped && i > 2) ||
              (this.creature.player.flipped && i < 3)) {
              fx = -1 * (this.creature.size - 1);
            }
            let dir = G.grid.getHexLine(this.creature.x + fx, this.creature.y, i, this.creature.player.flipped);
            if (this._getMaxDistance() > 0) {
              dir = dir.slice(0, this._getMaxDistance() + 1);
            }
            dir = arrayUtils.filterCreature(dir, true, true, this.creature.id);
            const target = arrayUtils.last(dir).creature;
            if (target.stats.moveable) {
              validDirections[i] = 1;
            }
          }
        }
        return validDirections;
      },

      require() {
        if (!this.testRequirements()) return false;

        // Creature must be moveable
        if (!this.creature.stats.moveable) {
          this.message = G.msg.abilities.notmoveable;
          return false;
        }

        // There must be at least one direction where there is a target within
        // min/max range
        const validDirections = this._getValidDirections();
        if (!validDirections.some(e => e === 1)) {
          this.message = G.msg.abilities.notarget;
          return false;
        }
        this.message = '';
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const crea = this.creature;

        G.grid.queryDirection({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: crea.id,
          requireCreature: true,
          sourceCreature: crea,
          x: crea.x,
          y: crea.y,
          directions: this._getValidDirections(),
          distance: this._getMaxDistance(),
        });
      },


      //  activate() :
      activate(path, args) {
        const ability = this;
        const crea = this.creature;
        const target = arrayUtils.last(path).creature;
        path = path.filter(hex => !hex.creature); // remove creatures
        ability.end();

        // Movement
        const creature = (args.direction == 4) ? crea.hexagons[crea.size - 1] : crea.hexagons[0];
        arrayUtils.filterCreature(path, false, false);
        let destination = null;
        let destinationTarget = null;
        if (target.size === 1) {
          // Small creature, pull target towards self
          destinationTarget = path.first();
        } else if (target.size === 2) {
          // Medium creature, pull self and target towards each other half way,
          // rounding upwards for self (self move one extra hex if required)
          const midpoint = Math.floor((path.length - 1) / 2);
          destination = path[midpoint];
          if (midpoint < path.length - 1) {
            destinationTarget = path[midpoint + 1];
          }
        } else {
          // Large creature, pull self towards target
          destination = arrayUtils.last(path);
        }

        let x;
        let hex;
        if (destination !== null) {
          x = (args.direction === 4) ? destination.x + crea.size - 1 : destination.x;
          hex = G.grid.hexes[destination.y][x];
          crea.moveTo(hex, {
            ignoreMovementPoint: true,
            ignorePath: true,
            callback() {
              var interval = setInterval(() => {
                if (!G.freezedInput) {
                  clearInterval(interval);
                  G.activeCreature.queryMove();
                }
              }, 100);
            },
          });
        }
        if (destinationTarget !== null) {
          x = (args.direction === 1) ? destinationTarget.x + target.size - 1 : destinationTarget.x;
          hex = G.grid.hexes[destinationTarget.y][x];
          target.moveTo(hex, {
            ignoreMovementPoint: true,
            ignorePath: true,
            callback() {
              var interval = setInterval(() => {
                if (!G.freezedInput) {
                  clearInterval(interval);
                  G.activeCreature.queryMove();
                }
              }, 100);
            },
          });
        }
      },
    },


    //   Fourth Ability: Boomerang Tool
    {
      //  Type : Can be "onQuery","onStartPhase","onDamage"
      trigger: 'onQuery',

      damages: {
        slash: 10,
        crush: 5,
      },

      _getHexes() {
        // extra range if upgraded
        if (this.isUpgraded()) {
          return matrices.headlessBoomerangUpgraded;
        }
        return matrices.headlessBoomerang;
      },


      //   require() :
      require() {
        if (!this.testRequirements()) return false;
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const crea = this.creature;

        const hexes = this._getHexes();

        G.grid.queryChoice({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: Team.both,
          requireCreature: 0,
          id: crea.id,
          flipped: crea.player.flipped,
          choices: [
            crea.getHexMap(hexes),
            crea.getHexMap(hexes, true),
          ],
        });
      },

      activate(hexes) {
        const damages = {
          slash: 10,
        };

        const ability = this;
        ability.end();

        ability.areaDamage(
          ability.creature, // Attacker
          damages, // Damage Type
          [], // Effects
          ability.getTargets(hexes), // Targets
          true, // Notriggers avoid double retailiation
        );

        ability.areaDamage(
          ability.creature, // Attacker
          damages, // Damage Type
          [], // Effects
          ability.getTargets(hexes), // Targets
        );
      },
    },
  ];
};
