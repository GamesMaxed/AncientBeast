import { Damage } from '../damage';
import { Team, isTeam } from '../utility/team';
import * as matrices from '../utility/matrices';
import * as arrayUtils from '../utility/arrayUtils';
import { Creature } from '../creature';
import Effect from '../effect';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  G.abilities[6] = [

    //   First Ability: Frost Bite
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onEndPhase',

      //   require() :
      require() {
        if (!this.testRequirements()) return false;
        return true;
      },

      //  activate() :
      activate() {
        const ability = this;
        this.end();

        // Check all creatures
        for (let i = 1; i < G.creatures.length; i++) {
          if (G.creatures[i] instanceof Creature) {
            const crea = G.creatures[i];

            if (isTeam(crea, ability.creature, Team.enemy) && !crea.dead &&
              crea.findEffect('Snow Storm').length === 0) {
              const effect = new Effect(
                'Snow Storm', // Name
                ability.creature, // Caster
                crea, // Target
                'onOtherCreatureDeath', // Trigger
                {
                  effectFn(effect, crea) {
                    const trg = effect.target;

                    const iceDemonArray = G.findCreature({
                      type: 'S7', // Ice Demon
                      dead: false, // Still Alive
                      team: [1 - (trg.team % 2), 1 - (trg.team % 2) + 2], // Oposite team
                    });

                    if (iceDemonArray.length == 0) {
                      this.deleteEffect();
                    }
                  },
                  alterations: ability.effects[0],
                  noLog: true,
                }, // Optional arguments
                G,
              );
              crea.addEffect(effect);
            }
          }
        }
      },
    },


    //   Second Ability: Head Bash
    {
      //  Type : Can be "onQuery","onStartPhase","onDamage"
      trigger: 'onQuery',

      distance: 1,
      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;
        if (!this.testDirection({
          team: this._targetTeam,
          distance: this.distance,
          sourceCreature: this.creature,
        })) {
          return false;
        }
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
          flipped: crea.player.flipped,
          team: this._targetTeam,
          id: this.creature.id,
          requireCreature: true,
          x: crea.x,
          y: crea.y,
          distance: this.distance,
          sourceCreature: crea,
        });
      },


      //  activate() :
      activate(path, args) {
        const ability = this;
        ability.end();

        const direction = arrayUtils.last(path).direction;
        const target = arrayUtils.last(path).creature;

        let dir = [];
        switch (direction) {
          case 0: // Upright
            dir = G.grid.getHexMap(target.x, target.y - 8, 0, target.flipped, matrices.diagonalup).reverse();
            break;
          case 1: // StraitForward
            dir = G.grid.getHexMap(target.x, target.y, 0, target.flipped, matrices.straitrow);
            break;
          case 2: // Downright
            dir = G.grid.getHexMap(target.x, target.y, 0, target.flipped, matrices.diagonaldown);
            break;
          case 3: // Downleft
            dir = G.grid.getHexMap(target.x, target.y, -4, target.flipped, matrices.diagonalup);
            break;
          case 4: // StraitBackward
            dir = G.grid.getHexMap(target.x, target.y, 0, !target.flipped, matrices.straitrow);
            break;
          case 5: // Upleft
            dir = G.grid.getHexMap(target.x, target.y - 8, -4, target.flipped, matrices.diagonaldown).reverse();
            break;
          default:
            break;
        }

        let pushed = false;

        if (dir.length > 1) {
          if (dir[1].isWalkable(target.size, target.id, true)) {
            target.moveTo(dir[1], {
              ignoreMovementPoint: true,
              ignorePath: true,
              callback() {
                G.activeCreature.queryMove();
              },
              animation: 'push',
            });
            pushed = true;
          }
        }
        const d = $j.extend({}, ability.damages);

        if (!pushed) {
          d.crush *= 2;
        }

        const damage = new Damage(
          ability.creature, // Attacker
          d, // Damage Type
          1, // Area
          [], // Effects
          G,
        );
        target.takeDamage(damage);
      },
    },


    //   Thirt Ability: Snow Storm
    {
      //  Type : Can be "onQuery","onStartPhase","onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;


        const straitrow = matrices.straitrow;
        const bellowrow = matrices.bellowrow;

        const crea = this.creature;
        const hexes = arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 2, crea.y - 2, 0, false, straitrow), true, true, crea.id, crea.team).concat(
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 1, crea.y - 2, 0, false, bellowrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x, crea.y, 0, false, straitrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 1, crea.y, 0, false, bellowrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 2, crea.y + 2, 0, false, straitrow), true, true, crea.id, crea.team),

          arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 2, crea.y - 2, 2, true, straitrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 1, crea.y - 2, 2, true, bellowrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x, crea.y, 2, true, straitrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 1, crea.y, 2, true, bellowrow), true, true, crea.id, crea.team),
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 2, crea.y + 2, 2, true, straitrow), true, true, crea.id, crea.team),
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
        const ability = this;
        const crea = this.creature;

        const choices = [
          // Front
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 2, crea.y - 2, 0, false, matrices.straitrow), true, true, crea.id, crea.team).concat(
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 1, crea.y - 2, 0, false, matrices.bellowrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x, crea.y, 0, false, matrices.straitrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 1, crea.y, 0, false, matrices.bellowrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x + 2, crea.y + 2, 0, false, matrices.straitrow), true, true, crea.id, crea.team),
          ),
          // Behind
          arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 2, crea.y - 2, 2, true, matrices.straitrow), true, true, crea.id, crea.team).concat(
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 1, crea.y - 2, 2, true, matrices.bellowrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x, crea.y, 2, true, matrices.straitrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 1, crea.y, 2, true, matrices.bellowrow), true, true, crea.id, crea.team),
            arrayUtils.filterCreature(G.grid.getHexMap(crea.x - 2, crea.y + 2, 2, true, matrices.straitrow), true, true, crea.id, crea.team),
          ),
        ];

        G.grid.queryChoice({
          fnOnConfirm() {
            ability.animation(...arguments);
          }, // fnOnConfirm
          team: this._targetTeam,
          requireCreature: 1,
          id: crea.id,
          flipped: crea.flipped,
          choices,
        });
      },


      //  activate() :
      activate(choice, args) {
        const ability = this;
        const crea = this.creature;

        const creaturesHit = [];

        for (let i = 0; i < choice.length; i++) {
          if (choice[i].creature instanceof Creature &&
            creaturesHit.indexOf(choice[i].creature) == -1) { // Prevent Multiple Hit
            choice[i].creature.takeDamage(new Damage(
              ability.creature, // Attacker
              ability.damages1, // Damage Type
              1, // Area
              [], // Effects
              G,
            ));

            creaturesHit.push(choice[i].creature);
          }
        }
      },
    },


    //   Fourth Ability: Frozen Orb
    {
      //  Type : Can be "onQuery"," onStartPhase", "onDamage"
      trigger: 'onQuery',

      directions: [0, 1, 0, 0, 1, 0],
      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;
        if (!this.testDirection({
          team: this._targetTeam,
          directions: this.directions,
          sourceCreature: this.creature,
        })) {
          return false;
        }
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const crea = this.creature;

        G.grid.queryDirection({
          fnOnSelect(path, args) {
            const trg = arrayUtils.last(path).creature;

            const hex = (ability.creature.player.flipped) ?
              G.grid.hexes[arrayUtils.last(path).y][arrayUtils.last(path).x + trg.size - 1] :
              arrayUtils.last(path);

            hex.adjacentHex(ability.radius).concat([hex]).forEach((item) => {
              if (item.creature instanceof Creature) {
                item.overlayVisualState(`creature selected player${item.creature.team}`);
              } else {
                item.overlayVisualState(`creature selected player${G.activeCreature.team}`);
              }
            });
          },
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          flipped: crea.player.flipped,
          team: this._targetTeam,
          id: this.creature.id,
          requireCreature: true,
          x: crea.x,
          y: crea.y,
          sourceCreature: crea,
        });
      },


      //  activate() :
      activate(path, args) {
        const ability = this;
        ability.end();

        const trg = arrayUtils.last(path).creature;

        const hex = (ability.creature.player.flipped) ?
          G.grid.hexes[arrayUtils.last(path).y][arrayUtils.last(path).x + trg.size - 1] :
          arrayUtils.last(path);

        const trgs = ability.getTargets(hex.adjacentHex(ability.radius)
          .concat([hex])); // Include central hex

        // var target = arrayUtils.last(path).creature;

        // var damage = new Damage(
        //   ability.creature, //Attacker
        //   ability.damages, //Damage Type
        //   1, //Area
        //   []  //Effects
        // );
        // target.takeDamage(damage);

        const effect = new Effect(
          'Frozen', // Name
          ability.creature, // Caster
          undefined, // Target
          '', // Trigger
          {
            effectFn(effect) {
              effect.target.stats.frozen = true;
              this.deleteEffect();
            },
          },
          G,
        );

        ability.areaDamage(
          ability.creature,
          ability.damages, [effect], // Effects
          trgs,
        );
      },
    },

  ];
};
