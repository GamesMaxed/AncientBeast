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
  G.abilities[12] = [

    // 	First Ability: Bunny Hop
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onOtherCreatureMove',

      require(fromHex) {
        if (!this.testRequirements()) {
          return false;
        }

        // If enough uses, jump away when an enemy has entered our trigger area, and
        // we have a space to jump back to
        return (
          this.timesUsedThisTurn < this._getUsesPerTurn() &&
				fromHex && fromHex.creature &&
				isTeam(fromHex.creature, this.creature, Team.enemy) &&
				this._getTriggerHexId(fromHex) >= 0 &&
				this._getHopHex(fromHex) !== undefined);
      },

      //	activate() :
      activate(destHex) {
        const ability = this;
        ability.end();

        this.creature.moveTo(this._getHopHex(destHex), {
          callbackStepIn() {
            G.activeCreature.queryMove();
          },
          ignorePath: true,
          ignoreMovementPoint: true,
        });
      },

      _getUsesPerTurn() {
        // If upgraded, useable twice per turn
        return this.isUpgraded() ? 2 : 1;
      },

      _getTriggerHexId(fromHex) {
        const hexes = this.creature.getHexMap(matrices.front1hex);

        // Find which hex we are hopping from
        let id = -1;
        fromHex.creature.hexagons.forEach((hex) => {
          id = hexes.indexOf(hex) > id ? hexes.indexOf(hex) : id;
        });

        return id;
      },

      _getHopHex(fromHex) {
        const id = this._getTriggerHexId(fromHex);

        // Try to hop away
        let hex;
        switch (id) {
          case 0:
            hex = this.creature.getHexMap(matrices.backbottom1hex)[0];
            break;
          case 1:
            hex = this.creature.getHexMap(matrices.inlineback1hex)[0];
            break;
          case 2:
            hex = this.creature.getHexMap(matrices.backtop1hex)[0];
            break;
        }

        // If we can't hop away, try hopping backwards
        if (id !== 1 &&
				(hex === undefined ||
					!hex.isWalkable(this.creature.size, this.creature.id, true))) {
          hex = this.creature.getHexMap(matrices.inlineback1hex)[0];
        }

        if (hex !== undefined &&
				!hex.isWalkable(this.creature.size, this.creature.id, true)) {
          return undefined;
        }
        return hex;
      },
    },


    // 	Second Ability: Big Pliers
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.atLeastOneTarget(this.creature.adjacentHexes(1), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;
        const snowBunny = this.creature;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: snowBunny.id,
          flipped: snowBunny.player.flipped,
          hexes: snowBunny.adjacentHexes(1),
        });
      },


      //	activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        let damages = ability.damages;
        // If upgraded, do pure damage against frozen targets
        if (this.isUpgraded() && target.stats.frozen) {
          damages = {
            pure: 0,
          };
          for (const type in ability.damages) {
            damages.pure += ability.damages[type];
          }
        }

        const damage = new Damage(
          ability.creature, // Attacker
          damages, // Damage Type
          1, // Area
          [], // Effects
          G,
        );
        target.takeDamage(damage);
      },
    },


    // 	Third Ability: Blowing Wind
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      directions: [1, 1, 1, 1, 1, 1],
      _targetTeam: Team.both,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.testDirection({
          team: this._targetTeam,
          directions: this.directions,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;
        const snowBunny = this.creature;

        G.grid.queryDirection({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          flipped: snowBunny.player.flipped,
          team: this._targetTeam,
          id: snowBunny.id,
          requireCreature: true,
          x: snowBunny.x,
          y: snowBunny.y,
          directions: this.directions,
        });
      },


      //	activate() :
      activate(path, args) {
        const ability = this;
        ability.end();


        const target = arrayUtils.last(path).creature;
        // No blow size penalty if upgraded and target is frozen
        const dist = 5 - (this.isUpgraded() && target.stats.frozen ? 0 : target.size);
        let dir = [];
        switch (args.direction) {
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

        dir = dir.slice(0, dist + 1);

        let hex = target.hexagons[0];
        for (let j = 0; j < dir.length; j++) {
          if (dir[j].isWalkable(target.size, target.id, true)) {
            hex = dir[j];
          } else {
            break;
          }
        }

        target.moveTo(hex, {
          ignoreMovementPoint: true,
          ignorePath: true,
          callback() {
            G.activeCreature.queryMove();
          },
          animation: 'push',
        });

        G.Phaser.camera.shake(0.01, 500, true, G.Phaser.camera.SHAKE_VERTICAL, true);
      },
    },


    // 	Fourth Ability: Freezing Spit
    {
      //	Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      // 	require() :
      require() {
        if (!this.testRequirements()) return false;

        if (!this.testDirection({
          team: this._targetTeam,
          directions: this.directions,
        })) {
          return false;
        }
        return true;
      },

      // 	query() :
      query() {
        const ability = this;
        const snowBunny = this.creature;

        G.grid.queryDirection({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          flipped: snowBunny.player.flipped,
          team: this._targetTeam,
          id: snowBunny.id,
          requireCreature: true,
          x: snowBunny.x,
          y: snowBunny.y,
          directions: [1, 1, 1, 1, 1, 1],
        });
      },


      //	activate() :
      activate(path, args) {
        const ability = this;
        ability.end();
        const target = arrayUtils.last(path).creature;

        const projectileInstance = G.animations.projectile(this, target, 'effects_freezing-spit', path, args, 52, -20);
        const tween = projectileInstance[0];
        const sprite = projectileInstance[1];
        const dist = projectileInstance[2];

        tween.onComplete.add(function () {
          this.destroy();

          // Copy to not alter ability strength
          const dmg = $j.extend({}, ability.damages);
          dmg.crush += 3 * dist; // Add distance to crush damage

          const damage = new Damage(
            ability.creature, // Attacker
            dmg, // Damage Type
            1, // Area
            [],
            G,
          );
          const damageResult = target.takeDamage(damage);

          // If upgraded and melee range, freeze the target
          if (ability.isUpgraded() && damageResult.damageObj.melee) {
            target.stats.frozen = true;
            target.updateHealth();
            G.UI.updateFatigue();
          }
        }, sprite); // End tween.onComplete
      },
      getAnimationData(path, args) {
        const dist = arrayUtils.filterCreature(path.slice(0), false, false).length;
        return {
          duration: 500,
          delay: 0,
          activateAnimation: false,
        };
      },
    },

  ];
};
