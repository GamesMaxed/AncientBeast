import { Damage } from '../damage';
import { Team } from '../utility/team';
import * as matrices from '../utility/matrices';
import * as arrayUtils from '../utility/arrayUtils';
import { Effect } from '../effect';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  /*
	 *
	 *	Scavenger abilities
	 *
	 */
  G.abilities[44] = [

    // 	First Ability: Wing Feathers
    {
      /**
			 * Provides custom movement type given whether the ability is upgraded or not.
			 * Movement type is "hover" unless this ability is upgraded, then it's "flying"
			 * @return {string} movement type, "hover" or "flying"
			 */
      movementType() {
        return this.isUpgraded() ? 'flying' : this.creature._movementType;
      },

      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: '',

      // 	require() :
      require() {
        return true;
      },

      //	activate() :
      activate() { },
    },


    // 	Second Ability: Slicing Pounce
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.atLeastOneTarget(this.creature.getHexMap(matrices.frontnback2hex), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: this.creature.id,
          flipped: this.creature.flipped,
          hexes: this.creature.getHexMap(matrices.frontnback2hex),
        });
      },


      //	activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        // If upgraded, hits will debuff target with -1 offense
        if (this.isUpgraded()) {
          const effect = new Effect('Slicing Pounce', ability.creature, target, 'onDamage', {
            alterations: {
              offense: -1,
            },
          }, G);
          target.addEffect(effect);
          G.log(`%CreatureName${target.id}%'s offense is lowered by 1`);
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


    // 	Third Ability: Escort Service
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.both,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        const ability = this;
        const crea = this.creature;

        let hexes = crea.getHexMap(matrices.inlinefrontnback2hex);

        if (hexes.length < 2) {
          // At the border of the map
          return false;
        }

        if (hexes[0].creature && hexes[1].creature) {
          // Sandwiched
          return false;
        }

        // Cannot escort large (size > 2) creatures unless ability is upgraded
        hexes = hexes.filter((hex) => {
          if (!hex.creature) {
            return false;
          }

          return hex.creature.size < 3 || ability.isUpgraded();
        });

        if (!this.atLeastOneTarget(hexes, {
          team: this._targetTeam,
        })) {
          return false;
        }

        const trg = hexes[0].creature || hexes[1].creature;

        if (!trg.stats.moveable) {
          this.message = 'Target is not moveable.';
          return false;
        }

        if (crea.remainingMove < trg.size) {
          // Not enough move points
          this.message = 'Not enough movement points.';
          return false;
        }

        return true;
      },

      query() {
        const ability = this;
        const crea = this.creature;

        const hexes = crea.getHexMap(matrices.inlinefrontnback2hex);
        const trg = hexes[0].creature || hexes[1].creature;

        const distance = Math.floor(crea.remainingMove / trg.size);
        const size = crea.size + trg.size;

        const trgIsInfront = (G.grid.getHexMap(crea.x - matrices.inlinefront2hex.origin[0], crea.y - matrices.inlinefront2hex.origin[1], 0, false, matrices.inlinefront2hex)[0].creature == trg);

        const select = function (hex, args) {
          for (var i = 0; i < trg.hexagons.length; i++) {
            G.grid.cleanHex(trg.hexagons[i]);
            trg.hexagons[i].displayVisualState('dashed');
          }
          for (var i = 0; i < crea.hexagons.length; i++) {
            G.grid.cleanHex(crea.hexagons[i]);
            crea.hexagons[i].overlayVisualState(`hover h_player${crea.team}`);
          }
          for (var i = 0; i < size; i++) {
            if (!G.grid.hexExists(hex.y, hex.x - i)) continue;
            const h = G.grid.hexes[hex.y][hex.x - i];
            var color;
            if (trgIsInfront) {
              color = i < trg.size ? trg.team : crea.team;
            } else {
              color = i > 1 ? trg.team : crea.team;
            }
            G.grid.cleanHex(h);
            h.overlayVisualState(`active creature player${color}`);
            h.displayVisualState(`creature player${color}`);
          }
        };

        const x = (trgIsInfront ? crea.x + trg.size : crea.x);

        G.grid.queryHexes({
          fnOnConfirm() {
            ability.animation(...arguments);
          }, // fnOnConfirm
          fnOnSelect: select, // fnOnSelect,
          team: this._targetTeam,
          id: [crea.id, trg.id],
          size,
          flipped: crea.player.flipped,
          hexes: G.grid.getFlyingRange(x, crea.y, distance, size, [crea.id, trg.id]).filter(item => crea.y == item.y &&
							(trgIsInfront ?
							  item.x < x :
							  item.x > x - crea.size - trg.size + 1
							)),
          args: {
            trg: trg.id,
            trgIsInfront,
          },
          callbackAfterQueryHexes: () => {
            for (let i = 0; i < trg.hexagons.length; i++) {
              G.grid.cleanHex(trg.hexagons[i]);
              trg.hexagons[i].displayVisualState('dashed');
            }
          },
          fillHexOnHover: false,
        });
      },

      //	activate() :
      activate(hex, args) {
        const ability = this;
        ability.end();

        const crea = this.creature;

        const trg = G.creatures[args.trg];
        const size = crea.size + trg.size;

        const trgIF = args.trgIsInfront;

        const crea_dest = G.grid.hexes[hex.y][trgIF ? hex.x - trg.size : hex.x];
        const trg_dest = G.grid.hexes[hex.y][trgIF ? hex.x : hex.x - crea.size];

        // Determine distance
        let distance = 0;
        let k = 0;
        const start = G.grid.hexes[crea.y][crea.x];
        while (!distance) {
          k++;

          if (arrayUtils.findPos(start.adjacentHex(k), crea_dest)) {
            distance = k;
          }
        }

        // Substract from movement points
        crea.remainingMove -= distance * trg.size;

        crea.moveTo(crea_dest, {
          animation: 'fly',
          callback() {
            trg.updateHex();
          },
          ignoreMovementPoint: true,
        });

        trg.moveTo(trg_dest, {
          animation: 'fly',
          callback() {
            ability.creature.updateHex();
            ability.creature.queryMove();
          },
          ignoreMovementPoint: true,
          overrideSpeed: crea.animation.walk_speed,
        });
      },
    },

    // 	Fourth Ability: Deadly Toxin
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.atLeastOneTarget(this.creature.getHexMap(matrices.frontnback2hex), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: this.creature.id,
          flipped: this.creature.flipped,
          hexes: this.creature.getHexMap(matrices.frontnback2hex),
        });
      },


      //	activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        // Don't perform poison damage unless upgraded
        const damages = $j.extend({}, ability.damages);
        if (!this.isUpgraded()) {
          delete damages.poison;
        }

        const damage = new Damage(
          ability.creature, // Attacker
          damages, // Damage Type
          1, // Area
          [], // Effects
          G,
        );

        target.takeDamage(damage);

        // Add poison damage debuff
        const effect = new Effect(this.title, this.creature, target, 'onStartPhase', {
          stackable: false,
          effectFn(effect, creature) {
            G.log(`%CreatureName${creature.id}% is affected by ${ability.title}`);
            creature.takeDamage(new Damage(effect.owner, {
              poison: ability.damages.poison,
            }, 1, [], G));
          },
        }, G);
        target.replaceEffect(effect);
        G.log(`%CreatureName${target.id}% is poisoned by ${this.title}`);

        G.UI.checkAbilities();
      },
    },
  ];
};
