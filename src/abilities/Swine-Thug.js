import Damage from '../damage';
import { Team } from '../utility/team';
import * as matrices from '../utility/matrices';
import * as arrayUtils from '../utility/arrayUtils';
import Effect from '../effect';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  /*
   *
   *  Swine Thug abilities
   *
   */
  G.abilities[37] = [

    //   First Ability: Spa Goggles
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onCreatureMove',

      //   require() :
      require(hex) {
        if (!this.testRequirements()) return false;

        if (hex == undefined) hex = this.creature.hexagons[0];
        this.message = '';

        if (hex.trap) {
          if (hex.trap.type == 'mud-bath') {
            G.UI.abilitiesButtons[0].changeState('noclick');
            return true;
          }
        }

        this.message = 'Not in a mud bath.';

        this.creature.effects.forEach((effect) => {
          if (effect.trigger == 'mud-bath') {
            effect.deleteEffect();
          }
        });

        return false;
      },

      //  activate() :
      activate(hex) {
        const alterations = $j.extend({}, this.effects[0]);
        // Double effect if upgraded
        if (this.isUpgraded()) {
          for (var k in alterations) {
            alterations[k] = alterations[k] * 2;
          }
        }
        const effect = new Effect('Spa Goggles', this.creature, this.creature, 'mud-bath', {
          alterations,
        }, G);
        this.creature.addEffect(effect);

        // Log message, assume that all buffs are the same amount, and there are
        // only two buffs (otherwise the grammar doesn't make sense)
        let log = `%CreatureName${this.creature.id}%'s `;
        let first = true;
        let amount;
        for (var k in alterations) {
          if (!first) {
            log += 'and ';
          }
          log += `${k} `;
          first = false;
          amount = alterations[k];
        }
        log += `+${amount}`;
        G.log(log);
      },
    },


    //   Second Ability: Baseball Baton
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.atLeastOneTarget(this.creature.adjacentHexes(1), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const swine = this.creature;

        G.grid.queryDirection({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          flipped: swine.player.flipped,
          team: this._targetTeam,
          id: swine.id,
          requireCreature: true,
          x: swine.x,
          y: swine.y,
          sourceCreature: swine,
          stopOnCreature: false,
          distance: 1,
        });
      },

      activate(path, args) {
        const ability = this;
        ability.end();

        const target = arrayUtils.last(path).creature;
        const damage = new Damage(
          ability.creature, // Attacker
          ability.damages, // Damage Type
          1, // Area
          [], // Effects
          G,
        );
        const result = target.takeDamage(damage);
        // Knock the target back if they are still alive
        if (!result.kill) {
          // See how far we can knock the target back
          // For regular ability, this is only 1 hex
          // For upgraded, as long as the target is over a mud tile, keep sliding

          // See how far the target can be knocked back
          // Skip the first hex as it is the same hex as the target
          const hexes = G.grid.getHexLine(target.x, target.y, args.direction, target.flipped);
          hexes.splice(0, 1);
          let hex = null;
          for (let i = 0; i < hexes.length; i++) {
            // Check that the next knockback hex is valid
            if (!hexes[i].isWalkable(target.size, target.id, true)) break;

            hex = hexes[i];

            if (!this.isUpgraded()) break;
            // Check if we are over a mud bath
            // The target must be completely over mud baths to keep sliding
            let mudSlide = true;
            for (let j = 0; j < target.size; j++) {
              const mudHex = G.grid.hexes[hex.y][hex.x - j];
              if (!mudHex.trap || mudHex.trap.type !== 'mud-bath') {
                mudSlide = false;
                break;
              }
            }
            if (!mudSlide) break;
          }
          if (hex !== null) {
            target.moveTo(hex, {
              callback() {
                G.activeCreature.queryMove();
              },
              ignoreMovementPoint: true,
              ignorePath: true,
              overrideSpeed: 1200, // Custom speed for knockback
              animation: 'push',
            });
          }
        }
      },
    },


    //   Third Ability: Ground Ball
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;

        const bellowrow = matrices.bellowrow;
        const straitrow = matrices.straitrow;

        const swine = this.creature;
        const hexes = arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y - 2, 0, false, bellowrow), true, true, swine.id, swine.team).concat(
          arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y, 0, false, straitrow), true, true, swine.id, swine.team),
          arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y, 0, false, bellowrow), true, true, swine.id, swine.team),
          arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y - 2, 0, true, bellowrow), true, true, swine.id, swine.team),
          arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y, 0, true, straitrow), true, true, swine.id, swine.team),
          arrayUtils.filterCreature(G.grid.getHexMap(swine.x, swine.y, 0, true, bellowrow), true, true, swine.id, swine.team),
        );
        if (!this.atLeastOneTarget(hexes, {
          team: this._targetTeam,
        })) {
          return false;
        }

        return true;
      },

      //   query() :
      query() {
        const bellowrow = matrices.bellowrow;
        const straitrow = matrices.straitrow;


        const ability = this;
        const swine = this.creature;

        const choices = [
          // Front
          G.grid.getHexMap(swine.x, swine.y - 2, 0, false, bellowrow),
          G.grid.getHexMap(swine.x, swine.y, 0, false, straitrow),
          G.grid.getHexMap(swine.x, swine.y, 0, false, bellowrow),
          // Behind
          G.grid.getHexMap(swine.x, swine.y - 2, 0, true, bellowrow),
          G.grid.getHexMap(swine.x, swine.y, 0, true, straitrow),
          G.grid.getHexMap(swine.x, swine.y, 0, true, bellowrow),
        ];

        choices.forEach((choice) => {
          arrayUtils.filterCreature(choice, true, true, swine.id);
        });

        G.grid.queryChoice({
          fnOnConfirm() {
            ability.animation(...arguments);
          }, // fnOnConfirm
          team: this._targetTeam,
          requireCreature: 1,
          id: swine.id,
          flipped: swine.flipped,
          choices,
        });
      },


      //  activate() :
      activate(path, args) {
        const ability = this;
        ability.end();

        const target = arrayUtils.last(path).creature;

        // If upgraded, hits will debuff target with -1 meditation
        if (this.isUpgraded()) {
          const effect = new Effect('Ground Ball', ability.creature, target, 'onDamage', {
            alterations: {
              meditation: -1,
            },
          }, G);
          target.addEffect(effect);
          G.log(`%CreatureName${target.id}%'s meditation is lowered by 1`);
        }

        const damage = new Damage(
          ability.creature, // Attacker
          ability.damages, // Damage Type
          1, // Area
          [], // Effects
          G,
        );
        target.takeDamage(damage);
      },
    },


    //   Fourth Ability: Mud Bath
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _energyNormal: 30,
      _energySelfUpgraded: 10,

      require() {
        // If ability is upgraded, self cast energy cost is less
        if (this.isUpgraded()) {
          this.requirements = {
            energy: this._energySelfUpgraded,
          };
          this.costs = {
            energy: this._energySelfUpgraded,
          };
        } else {
          this.requirements = {
            energy: this._energyNormal,
          };
          this.costs = {
            energy: this._energyNormal,
          };
        }
        return this.testRequirements();
      },

      //   query() :
      query() {
        const ability = this;
        const swine = this.creature;
        const size = 1;

        // Check if the ability is upgraded because then the self cast energy cost is less
        const selfOnly = this.isUpgraded() && this.creature.energy < this._energyNormal;

        let hexes = [];
        if (!selfOnly) {
          // Gather all the reachable hexes, including the current one
          hexes = G.grid.getFlyingRange(swine.x, swine.y, 50, 1, 0);
        }
        hexes.push(G.grid.hexes[swine.y][swine.x]);

        // TODO: Filtering corpse hexes
        // TODO: Add this code back in when its actually used.
        // hexes = hexes.filter(function(hex) {
        //   return true;
        // });

        G.grid.queryHexes({
          fnOnCancel() {
            G.activeCreature.queryMove();
          },
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          hexes,
          hideNonTarget: true,
        });
      },


      //  activate() :
      activate(hex, args) {
        const ability = this;
        const swine = this.creature;

        // If upgraded and cast on self, cost is less
        const isSelf = hex.x === swine.x && hex.y === swine.y;
        if (this.isUpgraded() && isSelf) {
          this.requirements = {
            energy: this._energySelfUpgraded,
          };
          this.costs = {
            energy: this._energySelfUpgraded,
          };
        } else {
          this.requirements = {
            energy: this._energyNormal,
          };
          this.costs = {
            energy: this._energyNormal,
          };
        }

        ability.end();

        const effects = [
          new Effect(
            'Slow Down', ability.creature, hex, 'onStepIn', {
              requireFn() {
                if (!this.trap.hex.creature) return false;
                return this.trap.hex.creature.type != 'A1';
              },
              effectFn(effect, crea) {
                crea.remainingMove--;
              },
            },
            G,
          ),
        ];


        hex.createTrap('mud-bath', effects, ability.creature.player);

        // Trigger trap immediately if on self
        if (isSelf) {
          // onCreatureMove is Spa Goggles' trigger event
          G.onCreatureMove(swine, hex);
        }
      },
    },

  ];
};
