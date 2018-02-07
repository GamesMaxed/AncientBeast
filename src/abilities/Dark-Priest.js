import Damage from '../damage';
import { Team } from '../utility/team';
import * as arrayUtils from '../utility/arrayUtils';
import Creature from '../creature';

/**
 * Creates the abilities
 * @param {Object} G the game object
 */
export default (G) => {
  G.abilities[0] = [
    //   First Ability: Plasma Field
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onUnderAttack',

      //   require() :
      require(damage) {
        this.setUsed(false); // Can be triggered multiple times
        this.creature.protectedFromFatigue = this.testRequirements();
        return this.creature.protectedFromFatigue;
      },

      //  activate() :
      activate(damage) {
        if (G.activeCreature.id == this.creature.id) {
          /* only used when unit isn't active */
          return damage; // Return Damage
        }

        if (this.isUpgraded() && damage.melee && !damage.counter) {
          // counter damage
          const counter = new Damage(
            this.creature, // Attacker
            {
              pure: 5,
            }, // Damage Type
            1, // Area
            [], // Effects
            G,
          );
          counter.counter = true;
          G.activeCreature.takeDamage(counter);
        }

        this.creature.player.plasma -= 1;

        this.creature.protectedFromFatigue = this.testRequirements();


        damage.damages = {
          total: 0,
        };
        damage.status = 'Shielded';
        damage.effect = [];

        damage.noLog = true;

        this.end(true); // Disable message

        G.log(`%CreatureName${this.creature.id}% is protected by Plasma Field`);
        return damage; // Return Damage
      },
    },


    //   Second Ability: Electro Shocker
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;
        if (!this.atLeastOneTarget(this.creature.adjacentHexes(this.isUpgraded() ? 4 : 1), {
          team: this._targetTeam,
        })) {
          return false;
        }
        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const dpriest = this.creature;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          team: this._targetTeam,
          id: dpriest.id,
          flipped: dpriest.player.flipped,
          hexes: dpriest.adjacentHexes(this.isUpgraded() ? 4 : 1),
        });
      },

      //  activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        const damageAmount = {
          shock: 12 * target.size,
        };

        const damage = new Damage(
          ability.creature, // Attacker
          damageAmount, // Damage Type
          1, // Area
          [], // Effects
          G,
        );

        target.takeDamage(damage);
      },
    },


    //   Third Ability: Disruptor Beam
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      _targetTeam: Team.enemy,

      //   require() :
      require() {
        if (!this.testRequirements()) return false;

        const range = this.creature.adjacentHexes(2);

        // At least one target
        if (!this.atLeastOneTarget(range, {
          team: this._targetTeam,
        })) {
          return false;
        }

        // Search Lowest target cost
        let lowestCost = 99;
        const targets = this.getTargets(range);

        targets.forEach((item) => {
          if (item.target instanceof Creature) {
            if (lowestCost > item.target.size) {
              lowestCost = item.target.size;
            }
          }
        });

        if (this.creature.player.plasma < lowestCost) {
          this.message = G.msg.abilities.noplasma;
          return false;
        }

        return true;
      },

      //   query() :
      query() {
        const ability = this;
        const dpriest = this.creature;

        G.grid.queryCreature({
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          optTest(creature) {
            return creature.size <= dpriest.player.plasma;
          },
          team: this._targetTeam,
          id: dpriest.id,
          flipped: dpriest.player.flipped,
          hexes: dpriest.adjacentHexes(2),
        });
      },

      //  activate() :
      activate(target, args) {
        const ability = this;
        ability.end();

        const plasmaCost = target.size;
        let damage = target.baseStats.health - target.health;

        if (this.isUpgraded() && damage < 40) damage = 40;

        ability.creature.player.plasma -= plasmaCost;

        damage = new Damage(
          ability.creature, // Attacker
          {
            pure: damage,
          }, // Damage Type
          1, // Area
          [], // Effects
          G,
        );

        ability.end();

        target.takeDamage(damage);
      },
    },


    //   Fourth Ability: Godlet Printer
    {
      //  Type : Can be "onQuery", "onStartPhase", "onDamage"
      trigger: 'onQuery',

      //   require() :
      require() {
        if (!this.testRequirements()) return false;

        if (this.creature.player.plasma <= 1) {
          this.message = G.msg.abilities.noplasma;
          return false;
        }
        if (this.creature.player.getNbrOfCreatures() == G.creaLimitNbr) {
          this.message = G.msg.abilities.nopsy;
          return false;
        }
        return true;
      },

      summonRange: 4,

      //   query() :
      query() {
        const ability = this;

        if (this.isUpgraded()) this.summonRange = 6;

        // Ask the creature to summon
        G.UI.materializeToggled = true;
        G.UI.toggleDash('randomize');
      },

      fnOnSelect(hex, args) {
        const crea = G.retreiveCreatureStats(args.creature);
        G.grid.previewCreature(hex.pos, crea, this.creature.player);
      },

      // Callback function to queryCreature
      materialize(creature) {
        const crea = G.retreiveCreatureStats(creature);
        const ability = this;
        const dpriest = this.creature;

        G.grid.forEachHex((hex) => {
          hex.unsetReachable();
        });

        let spawnRange = dpriest.hexagons[0].adjacentHex(this.summonRange);

        spawnRange.forEach((item) => {
          item.setReachable();
        });

        spawnRange = spawnRange.filter(item => item.isWalkable(crea.size, 0, false));

        spawnRange = arrayUtils.extendToLeft(spawnRange, crea.size, G.grid);

        G.grid.queryHexes({
          fnOnSelect() {
            ability.fnOnSelect(...arguments);
          },
          fnOnCancel() {
            G.activeCreature.queryMove();
          },
          fnOnConfirm() {
            ability.animation(...arguments);
          },
          args: {
            creature,
            cost: (crea.size - 0) + (crea.level - 0),
          }, // OptionalArgs
          size: crea.size,
          flipped: dpriest.player.flipped,
          hexes: spawnRange,
        });
      },

      //  activate() :
      activate(hex, args) {
        const creature = args.creature;
        const ability = this;

        const creaStats = G.retreiveCreatureStats(creature);
        const dpriest = this.creature;

        const pos = {
          x: hex.x,
          y: hex.y,
        };

        ability.creature.player.plasma -= args.cost;

        // TODO: Make the UI show the updated number instantly

        ability.end();

        ability.creature.player.summon(creature, pos);
        ability.creature.queryMove();
      },
    },
  ];
};
