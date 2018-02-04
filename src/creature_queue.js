import * as arrayUtils from './utility/arrayUtils';

export default class CreatureQueue {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.nextQueue = [];
  }

  /**
   * Add a creature to the next turn's queue by initiative
   * @param {Creature} creature The creature to add
   * @param {boolean} delayed
   */
  addByInitiative(creature, delayed = true) {
    const inFront = this.nextQueue.some(currentCreature => currentCreature.delayed === delayed
      || currentCreature.getInitiative() < creature.getInitiative());
    if (inFront) {
      this.nextQueue.unshift(creature);
    } else {
      this.nextQueue.push(creature);
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

  delay(creature) {
    const { game } = this;
    let { queue } = this;
    // Find out if the creature is in the current queue or next queue; remove
    // it from the queue and replace it at the end
    const inQueue = arrayUtils.removePos(this.queue, creature) || creature === game.activeCreature;

    if (!inQueue) {
      queue = this.nextQueue;
      arrayUtils.removePos(this.nextQueue, creature);
    }

    // Move creature to end of queue but in order w.r.t. other delayed creatures
    const infront = queue.some(currentCreature => !currentCreature.delayed
      && currentCreature.getInitiative() < creature.getInitiative());
    if (infront) {
      queue.unshift(creature);
    } else {
      queue.push(creature);
    }
  }
}
