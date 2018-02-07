import * as arrayUtils from './utility/arrayUtils';

export default class CreatureQueue {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.nextQueue = [];
  }

  /**
   * Add a creature to the next turn's queue by initiative.
   * Higher iniatives appear first
   * @param {Creature} creature The creature to add
   */
  addByInitiative(creature, queue = this.nextQueue) {
    if (creature.delayed) {
      queue.push(creature);
      return;
    }

    // Find the index of the first creature with a lower initiative or that is delayed
    const index = queue.findIndex(currentCreature =>
      currentCreature.getInitiative() < creature.getInitiative()
      || currentCreature.delayed);

    // If we found it at a given index
    if (index !== -1) {
      // Insert at the given index
      queue.splice(index, 0, creature);
    } else {
      queue.push(creature);
    }
  }

  /**
   * Remove the first element in the queue and return that element
   * @returns {Creature} first element in the queue
   */
  dequeue() {
    return this.queue.shift();
  }

  remove(creature) {
    arrayUtils.removePos(this.queue, creature);
    arrayUtils.removePos(this.nextQueue, creature);
  }

  nextRound() {
    // Copy next queue into current queue
    this.queue = this.nextQueue.slice(0);
    // Sort next queue by initiative (current queue may be reordered) descending
    this.nextQueue = this.nextQueue.sort((a, b) => b.getInitiative() - a.getInitiative());
  }

  isCurrentEmpty() {
    return this.queue.length === 0;
  }

  isNextEmpty() {
    return this.nextQueue.length === 0;
  }

  /**
   * Delay a creature
   *
   * @param {Creature} creature
   */
  delay(creature) {
    const { game } = this;
    let { queue } = this;

    // Find out if the creature is in the current queue or next queue; remove
    // it from the queue and replace it at the end
    const inQueue = queue.includes(creature) || creature === game.activeCreature;

    if (!inQueue) {
      queue = this.nextQueue;
    }

    const index = queue.indexOf(creature);
    if (index === -1) {
      if (creature !== game.activeCreature) {
        throw new Error('Cannot delay creature that is not in a queue');
      }
    } else {
      queue.splice(queue.indexOf(creature), 1);
      // Move creature to end of queue but in order w.r.t. other delayed creatures
      // eslint-disable-next-line no-param-reassign
      creature.delayed = true;
      this.addByInitiative(creature, queue);
    }
  }
}
