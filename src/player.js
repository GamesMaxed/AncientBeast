import { getUrl } from './assetLoader';
import { Creature } from './creature';

/**
 * Player Class
 * Player object with attributes
 */
export default class Player {
  /**
   *
   * @param {Integer} id Id of the player (Can be either: 1, 2, 3 or 4)
   * @param {Game} gam The game object
   */
  constructor(id, game) {
    /* Attributes
     * creature : Array : Array containing players creatures
     * plasma : Integer : Plasma amount for the player
     * flipped : Boolean : Player side of the battlefield (affects displayed creature)
     */
    this.id = id;
    this.game = game;
    this.creatures = [];
    this.name = `Player${id + 1}`;
    switch (id) {
      case 0:
        this.color = 'red';
        break;
      case 1:
        this.color = 'blue';
        break;
      case 2:
        this.color = 'orange';
        break;
      default:
        this.color = 'green';
        break;
    }
    this.avatar = getUrl(`units/avatars/Dark Priest ${this.color}`);
    this.score = [];
    this.plasma = game.plasma_amount;
    this.flipped = !!(id % 2); // Convert odd/even to true/false
    this.availableCreatures = game.availableCreatures;
    this.hasLost = false;
    this.hasFled = false;
    this.bonusTimePool = 0;
    this.totalTimePool = game.timePool * 1000;
    this.startTime = new Date();

    this.score = [{
      type: 'timebonus',
    }];
  }

  // TODO: Is this even right? it should be off by 1 based on this code...
  getNbrOfCreatures() {
    return this.creatures.filter(creature => !creature.dead && !creature.undead).length - 1;
  }

  /**
   *
   * @param {String} type Creature type (ex: "0" for Dark Priest and "L2" for Magma Spawn)
   * @param {Object} pos Position {x,y}
   */
  summon(type, pos) {
    const { game } = this;
    const data = Object.assign({}, game.retreiveCreatureStats(type), pos, { team: this.id });

    // Avoid dark priest shout at the beginning of the match
    game.creatureJSON
      .filter(({ creatureJSON }, index) => creatureJSON.type === type && index !== 0)
      .forEach((_, index) =>
        game.soundsys.playSound(game.soundLoaded[1000 + index], game.soundsys.announcerGainNode));

    const creature = new Creature(data, game);
    this.creatures.push(creature);
    creature.summon();
    game.onCreatureSummon(creature);
  }

  /**
	 * Ask if the player wants to flee the match
   * @param {any} o
   */
  flee(o) {
    this.hasFled = true;
    this.deactivate();
    this.game.skipTurn(o);
  }


  /**
   *  Return the total of the score events.
   *
   * @return {number} The current score of the player
   */
  getScore() {
    const totalScore = {
      firstKill: 0,
      kill: 0,
      deny: 0,
      humiliation: 0,
      annihilation: 0,
      timebonus: 0,
      nofleeing: 0,
      creaturebonus: 0,
      darkpriestbonus: 0,
      immortal: 0,
      total: 0,
    };

    this.score.forEach((score) => {
      let points = 0;

      switch (score.type) {
        case 'firstKill':
          points += 20;
          break;
        case 'kill':
          points += score.creature.level * 5;
          break;
        case 'combo':
          points += score.kills * 5;
          break;
        case 'humiliation':
          points += 50;
          break;
        case 'annihilation':
          points += 100;
          break;
        case 'deny':
          points += -1 * score.creature.size * 5;
          break;
        case 'timebonus':
          points += Math.round(this.bonusTimePool * 0.5);
          break;
        case 'nofleeing':
          points += 25;
          break;
        case 'creaturebonus':
          points += score.creature.level * 5;
          break;
        case 'darkpriestbonus':
          points += 50;
          break;
        case 'immortal':
          points += 100;
          break;
        case 'pickupDrop':
          points += 2;
          break;
        default:
          throw new Error(`Unkown type ${score.type}`);
      }

      totalScore[score.type] += points;
      totalScore.total += points;
    });

    return totalScore;
  }

  /**
   * Test if the player has the greater score.
   *
   * @return {boolean} true if in lead, false if not.
   * TODO: This is also wrong, because it allows for ties to result in a "leader".
   */
  isLeader() {
    // Get the score of each player excluding the current player and check if all the scores
    // are smaller or equal to the current one
    return this.game.players
      .filter(player => player !== this)
      .map(player => player.getScore().total)
      .all(score => score <= this.getScore().total);
  }


  /**
   *
   * A player is considered annihilated if all his creatures are dead DP included
   */
  isAnnihilated() {
    // annihilated is false if only one creature is not dead
    let annihilated = (this.creatures.length > 1);
    const count = this.creatures.length;

    for (let i = 0; i < count; i++) {
      annihilated = annihilated && this.creatures[i].dead;
    }

    return annihilated;
  }

  /* deactivate()
   *
   * Remove all player's creature from the queue
   */
  deactivate() {
    const { game } = this.game;

    this.hasLost = true;

    // Remove all player creatures from queues
    game.creature.forEach((creature) => {
      if (creature.player.id === this.id) {
        game.queue.remove(creature);
      }
    });

    game.updateQueueDisplay();

    // Test if allie Dark Priest is dead
    if (game.playerMode > 2) {
      // 2 vs 2
      if (game.players[(this.id + 2) % 4].hasLost) { game.endGame(); }
    } else {
      // 1 vs 1
      game.endGame();
    }
  }
}
