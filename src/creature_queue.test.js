import CreatureQueue from './creature_queue';
import Creature from './creature';

jest.mock('./creature');

test('AddByInitiative', () => {
  const game = {};
  const creatureQueue = new CreatureQueue();

  // Iniative: 10
  const creature10 = new Creature({}, game);
  creature10.getInitiative = jest.fn();
  creature10.getInitiative.mockReturnValue(10);
  creatureQueue.addByInitiative(creature10);
  expect(creatureQueue.nextQueue).toEqual([creature10]);

  // Iniative: 20
  const creature20 = new Creature({}, game);
  creature20.getInitiative = jest.fn();
  creature20.getInitiative.mockReturnValue(20);
  creatureQueue.addByInitiative(creature20);
  expect(creatureQueue.nextQueue).toEqual([creature20, creature10]);

  // Iniative: 15
  const creature15 = new Creature({}, game);
  creature15.getInitiative = jest.fn();
  creature15.getInitiative.mockReturnValue(15);
  creatureQueue.addByInitiative(creature15);
  expect(creatureQueue.nextQueue).toEqual([creature20, creature15, creature10]);
});
