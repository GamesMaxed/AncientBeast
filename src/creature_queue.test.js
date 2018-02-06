import CreatureQueue from './creature_queue';
import Creature from './creature';

jest.mock('./creature');

test('AddByInitiative', () => {
  const game = {};
  const creatureQueue = new CreatureQueue();
  const { nextQueue } = creatureQueue;

  const addToQueue = (iniative, delayed = false) => {
    const creature = new Creature({}, game);
    Object.assign(creature, {
      delayed,
      getInitiative: jest.fn().mockReturnValue(iniative),
    });
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
