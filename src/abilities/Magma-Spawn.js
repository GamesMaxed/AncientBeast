import { Damage } from '../damage';
import { Team } from '../utility/team';
import * as matrices from '../utility/matrices';
import * as arrayUtils from '../utility/arrayUtils';
import { Effect } from '../effect';
import { isTeam } from '../utility/team';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  G.abilities[4] = [

    // 	First Ability: Boiling Point
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onStartPhase',

      // 	require() :
      require() {
        return this.testRequirements();
      },

      //	activate() :
      activate() {
        // Leave two traps behind
        this._addTrap(this.creature.hexagons[1]);
        this._addTrap(this.creature.hexagons[this.creature.player.flipped ? 0 : 2]);

        // SFX
        const music = G.Phaser.add.audio('MagmaSpawn0');
        music.play();
      },

      _addTrap(hex) {
        const ability = this;

        // Traps last forever if upgraded, otherwise 1 turn
        const lifetime = this.isUpgraded() ? 0 : 1;

        hex.createTrap(
          'scorched-ground', [
            new Effect(
              this.title, this.creature, hex, 'onStepIn', {
                requireFn() {
                  if (!this.trap.hex.creature) return false;
                  // Magma Spawn immune to Scorched Ground
                  return this.trap.hex.creature.id !== ability.creature.id;
                },
                effectFn(effect, target) {
                  target.takeDamage(new Damage(effect.attacker, ability.damages, 1, [], G), {
                    isFromTrap: true,
                  });
                  this.trap.destroy();
                  effect.deleteEffect();
                },
                attacker: this.creature,
              },
              G,
            ),
          ],
          this.creature.player, {
            turnLifetime: lifetime,
            ownerCreature: this.creature,
            fullTurnLifetime: true,
          },
        );
      },
    },

    // 	Second Ability: Pulverizing Hit
    {
      trigger: 'onQuery',

      // Track the last target
      _lastTargetId: -1,

      _targetTeam: Team.enemy,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.atLeastOneTarget(this.creature.getHexMap(matrices.frontnback3hex), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;
        const magmaSpawn = this.creature;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: magmaSpawn.id,
          flipped: magmaSpawn.flipped,
          hexes: this.creature.getHexMap(matrices.frontnback3hex),
        });
      },

      activate(target, args) {
        let i;
        const ability = this;
        ability.end();

        const d = {
          burn: this.damages.burn,
          crush: this.damages.crush,
        };
        // Deal extra burn damage based on number of stacks
        let stacksExisting = 0;
        for (i = 0; i < target.effects.length; i++) {
          if (target.effects[i].name === this.title &&
						target.effects[i].owner === this.creature) {
            stacksExisting++;
          }
        }
        d.burn += stacksExisting * this.damages.burn;

        const damage = new Damage(
          ability.creature, // Attacker
          d, // Damage Type
          1, // Area
          [], // Effects
          G,
        );
        target.takeDamage(damage);

        // Add attack stacks
        let stacksToAdd = 1;
        // If upgraded, extra stacks if hitting the same target
        if (this.isUpgraded() && target.id === this._lastTargetId) {
          stacksToAdd = 2;
        }
        this._lastTargetId = target.id;

        for (i = 0; i < stacksToAdd; i++) {
          target.addEffect(new Effect(
            this.title,
            this.creature,
            target,
            '', {
              deleteTrigger: '',
              stackable: true,
            },
            G,
          ));
        }
      },
    },


    // 	Thirt Ability: Cracked Earth
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      map: [
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [1, 1, 1, 0], // origin line
        [0, 0, 1, 1],
        [0, 0, 1, 0],
      ],

      require() {
        return this.testRequirements();
      },

      // 	query() :
      query() {
        const ability = this;
        const magmaSpawn = this.creature;

        this.map.origin = [0, 2];

        G.grid.queryChoice({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: Team.both,
          requireCreature: 0,
          id: magmaSpawn.id,
          flipped: magmaSpawn.flipped,
          choices: [
            magmaSpawn.getHexMap(this.map),
            magmaSpawn.getHexMap(this.map, true),
          ],
        });
      },


      //	activate() :
      activate(hexes, args) {
        const ability = this;
        ability.end();

        // Attack all creatures in area except for self
        const targets = ability.getTargets(hexes);
        for (let i = 0; i < targets.length; i++) {
          if (targets[i].target === this.creature) {
            targets.splice(i, 1);
            break;
          }
        }
        ability.areaDamage(
          ability.creature, // Attacker
          ability.damages1, // Damage Type
          [], // Effects
          targets,
        );

        // If upgraded, leave Boiling Point traps on all hexes that don't contain
        // another creature
        if (this.isUpgraded()) {
          hexes.forEach((hex) => {
            if (!hex.creature || hex.creature === ability.creature) {
              ability.creature.abilities[0]._addTrap(hex);
            }
          });
        }
      },
    },


    // 	Fourth Ability: Molten Hurl
    {
      //	Type : Can be "onQuery","onStartPhase","onDamage"
      trigger: 'onQuery',

      directions: [0, 1, 0, 0, 1, 0],
      _targetTeam: Team.enemy,

      require() {
        if (!this.testRequirements()) return false;

        // Creature must be moveable
        if (!this.creature.stats.moveable) {
          this.message = G.msg.abilities.notmoveable;
          return false;
        }

        const magmaSpawn = this.creature;
        const x = (magmaSpawn.player.flipped) ? magmaSpawn.x - magmaSpawn.size + 1 : magmaSpawn.x;

        if (!this.testDirection({
          team: this._targetTeam,
          x,
          directions: this.directions,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;
        const magmaSpawn = this.creature;

        const x = (magmaSpawn.player.flipped) ? magmaSpawn.x - magmaSpawn.size + 1 : magmaSpawn.x;

        G.grid.queryDirection({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: magmaSpawn.id,
          requireCreature: true,
          x,
          y: magmaSpawn.y,
          directions: this.directions,
        });
      },


      //	activate() :
      activate(path, args) {
        const ability = this;
        const magmaSpawn = this.creature;

        ability.end(false, true);

        // Damage
        const damage = new Damage(
          ability.creature, // Attacker
          ability.damages, // Damage Type
          1, // Area
          [], // Effects
          G,
        );

        // Destroy traps currently under self
        for (let i = 0; i < this.creature.hexagons.length; i++) {
          if (this.creature.hexagons[i].trap) {
            this.creature.hexagons[i].destroyTrap();
          }
        }

        // Movement
        var hurl = function (_path) {
          const target = arrayUtils.last(_path).creature;

          const magmaHex = magmaSpawn.hexagons[
            args.direction === 4 ? magmaSpawn.size - 1 : 0];
          arrayUtils.filterCreature(_path, false, false);
          _path.unshift(magmaHex); // Prevent error on empty path
          let destination = arrayUtils.last(_path);
          const x = destination.x + (args.direction === 4 ? magmaSpawn.size - 1 : 0);
          destination = G.grid.hexes[destination.y][x];

          magmaSpawn.moveTo(destination, {
            ignoreMovementPoint: true,
            ignorePath: true,
            callback() {
              // Destroy traps along path
              _path.forEach((hex) => {
                if (!hex.trap) {
                  return;
                }

                hex.destroyTrap();
              });

              let targetKilled = false;
              if (target !== undefined) {
                const ret = target.takeDamage(damage, true);
                targetKilled = ret.kill;
              }

              // If upgraded and target killed, keep going in the same direction and
              // find the next target to move into
              let continueHurl = false;
              if (ability.isUpgraded() && targetKilled) {
                const nextPath = G.grid.getHexLine(target.x, target.y, args.direction, false);
                arrayUtils.filterCreature(nextPath, true, true, magmaSpawn.id);
                const nextTarget = arrayUtils.last(nextPath).creature;
                // Continue only if there's a next enemy creature
                if (nextTarget &&
									isTeam(magmaSpawn, nextTarget, ability._targetTeam)) {
                  continueHurl = true;
                  hurl(nextPath);
                }
              }
              if (!continueHurl) {
                var interval = setInterval(() => {
                  if (!G.freezedInput) {
                    clearInterval(interval);
                    G.UI.selectAbility(-1);
                    G.activeCreature.queryMove();
                  }
                }, 100);
              }
            },
          });
        };
        hurl(path);
      },
    },
  ];
};
