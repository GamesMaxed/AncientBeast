import CreatureQueue from './creature_queue';
import Creature from './creature';

jest.mock('./creature');

/**
 * Create a mocker creature
 * @param {number} iniainitiative
 * @param {boolean} delayed
 */
function createCreature(initiative, delayed) {
  const creature = new Creature();
  Object.assign(creature, {
    delayed,
    getInitiative: jest.fn().mockReturnValue(initiative),
  });
  return creature;
}

test('AddByInitiative', () => {
  const creatureQueue = new CreatureQueue();
  const { nextQueue } = creatureQueue;

  const addToQueue = (iniative, delayed = false) => {
    const creature = createCreature(iniative, delayed);
    creatureQueue.addByInitiative(creature);
    return creature;
  };

  // Iniative: 10
  const creature10 = addToQueue(10);
  expect(nextQueue).toEqual([creature10]);

  // Iniative: 20
  const creature20 = addToQueue(20);
  expect(nextQueue).toEqual([creature20, creature10]);

  // Iniative: 15
  const creature15 = addToQueue(15);
  expect(nextQueue).toEqual([creature20, creature15, creature10]);

  // delayed
  const creatureDelayed = addToQueue(0, true);
  expect(nextQueue).toEqual([creature20, creature15, creature10, creatureDelayed]);

  // Iniative: 5
  const creature5 = addToQueue(5);
  expect(nextQueue).toEqual([creature20, creature15, creature10, creature5, creatureDelayed]);
});

describe('Delay', () => {
  test('Can delay a creature', () => {
    const game = {};
    const creatureQueue = new CreatureQueue(game);

    const creature1 = createCreature(1, false);
    const creature5 = createCreature(5, false);
    const creature10 = createCreature(10, false);
    creatureQueue.queue = [creature1, creature5, creature10];

    // creature5.delayed = true;
    creatureQueue.delay(creature5);

    expect(creatureQueue.queue).toEqual([creature1, creature10, creature5]);
  });

  test('If creature is in none of the queues, throw an error', () => {
    const game = {};
    const creatureQueue = new CreatureQueue(game);
    const creature = createCreature(1);
    expect(() => creatureQueue.delay(creature)).toThrow();
  });
});
