import * as arrayUtils from './utility/arrayUtils';

export default class Animations {
  constructor(game) {
    this.game = game;
    this.movementPoints = 0;
  }

  walk(creature, path, opts) {
    const { game } = this;

    if (opts.customMovementPoint > 0) {
      path = path.slice(0, opts.customMovementPoint);
      // For compatibility
      this.movementPoints = creature.remainingMove;
      creature.remainingMove = opts.customMovementPoint;
    }

    game.freezedInput = true;

    const animationId = Math.random();
    game.animationQueue.push(animationId);

    let hexId = 0;

    creature.healthHide();

    const anim = () => {
      const hex = path[hexId];

      if (hexId < path.length && (creature.remainingMove > 0 || opts.ignoreMovementPoint)) {
        this.leaveHex(creature, hex, opts);
      } else {
        this.movementComplete(creature, path[path.length - 1], animationId, opts);
        return;
      }

      const nextPos = game.grid.hexes[hex.y][hex.x - creature.size + 1];
      const speed = !opts.overrideSpeed ? creature.animation.walk_speed : opts.overrideSpeed;

      const tween = game.Phaser.add.tween(creature.grp)
        .to(nextPos.displayPos, parseInt(speed, 10), Phaser.Easing.Linear.None)
        .start();

      // Ignore traps for hover creatures, unless this is the last hex
      const enterHexOpts = Object.assign({}, {
        ignoreTraps: creature.getMovementType() !== 'normal' && hexId < path.length - 1,
      }, opts);

      tween.onComplete.add(() => {
        if (creature.dead) {
          // Stop moving if creature has died while moving
          this.movementComplete(creature, hex, animationId, opts);
          return;
        }

        // Sound Effect
        game.soundsys.playSound(game.soundLoaded[0], game.soundsys.effectsGainNode);

        if (!opts.ignoreMovementPoint) {
          creature.remainingMove -= 1;

          if (opts.customMovementPoint === 0) {
            creature.travelDist += 1;
          }
        }

        this.enterHex(creature, hex, enterHexOpts);

        anim(); // Next tween
      });

      hexId += 1;
    };

    anim();
  }


  fly(creature, path, opts) {
    const { game } = this;

    if (opts.customMovementPoint > 0) {
      path = path.slice(0, opts.customMovementPoint);
      // For compatibility
      this.movementPoints = creature.remainingMove;
      creature.remainingMove = opts.customMovementPoint;
    }

    game.freezedInput = true;

    const animationId = Math.random();
    game.animationQueue.push(animationId);

    creature.healthHide();

    const hex = path[0];

    const start = game.grid.hexes[creature.y][creature.x - creature.size + 1];
    const currentHex = game.grid.hexes[hex.y][hex.x - creature.size + 1];

    this.leaveHex(creature, start, opts);

    const speed = !opts.overrideSpeed ? creature.animation.walk_speed : opts.overrideSpeed;

    const tween = game.Phaser.add.tween(creature.grp)
      .to(currentHex.displayPos, parseInt(speed, 10), Phaser.Easing.Linear.None)
      .start();

    tween.onComplete.add(() => {
      // Sound Effect
      game.soundsys.playSound(game.soundLoaded[0], game.soundsys.effectsGainNode);

      if (!opts.ignoreMovementPoint) {
        // Determine distance
        let distance = 0;
        let k = 0;
        while (!distance && start !== currentHex) {
          k += 1;

          if (arrayUtils.findPos(start.adjacentHex(k), currentHex)) {
            distance = k;
          }
        }

        creature.remainingMove -= distance;
        if (opts.customMovementPoint === 0) {
          creature.travelDist += distance;
        }
      }

      this.enterHex(creature, hex, opts);
      this.movementComplete(creature, hex, animationId, opts);
    });
  }

  teleport(creature, path, opts) {
    const { game } = this;
    const hex = path[0];
    const currentHex = game.grid.hexes[hex.y][hex.x - creature.size + 1];

    this.leaveHex(creature, currentHex, opts);

    const animationId = Math.random();
    game.animationQueue.push(animationId);

    // FadeOut
    const tween = game.Phaser.add.tween(creature.grp)
      .to({
        alpha: 0,
      }, 500, Phaser.Easing.Linear.None)
      .start();

    tween.onComplete.add(() => {
      // Sound Effect
      game.soundsys.playSound(game.soundLoaded[0], game.soundsys.effectsGainNode);

      // position
      creature.grp.x = currentHex.displayPos.x;
      creature.grp.y = currentHex.displayPos.y;

      // FadeIn
      game.Phaser.add.tween(creature.grp)
        .to({
          alpha: 1,
        }, 500, Phaser.Easing.Linear.None)
        .start();

      this.enterHex(creature, hex, opts);
      this.movementComplete(creature, hex, animationId, opts);
    });
  }

  push(creature, path, opts) {
    opts.pushed = true;
    this.walk(creature, path, opts);
  }

  // --------Special Functions---------//

  enterHex(creature, hex, opts) {
    const { game } = this;

    creature.cleanHex();
    creature.x = hex.x - 0;
    creature.y = hex.y - 0;
    creature.pos = hex.pos;
    creature.updateHex();

    game.onStepIn(creature, hex, opts);

    creature.pickupDrop();

    opts.callbackStepIn(hex);

    game.grid.orderCreatureZ();
  }

  leaveHex(creature, hex, opts) {
    const { game } = this;

    if (!opts.pushed) {
      creature.faceHex(hex, creature.hexagons[0]); // Determine facing
    }

    game.onStepOut(creature, creature.hexagons[0]); // Trigger
    game.grid.orderCreatureZ();
  }

  movementComplete(creature, hex, animationId, opts) {
    const { game } = this;

    if (opts.customMovementPoint > 0) {
      creature.remainingMove = this.movementPoints;
    }

    // TODO: Turn around animation
    if (opts.turnAroundOnComplete) {
      creature.facePlayerDefault();
    }

    // TODO: Reveal health indicator
    creature.healthShow();

    game.onCreatureMove(creature, hex); // Trigger

    creature.hexagons.forEach((currentHex) => {
      currentHex.pickupDrop(creature);
    });

    game.grid.orderCreatureZ();

    const queue = game.animationQueue.filter(item => item !== animationId);

    if (queue.length === 0) {
      game.freezedInput = false;
    }

    game.animationQueue = queue;
  }

  projectile(this2, target, spriteId, path, args, startX, startY) {
    const { game } = this;
    const dist = arrayUtils.filterCreature(path.slice(0), false, false).length;
    const emissionPoint = {
      x: this2.creature.grp.x + startX,
      y: this2.creature.grp.y + startY,
    };
    const targetPoint = {
      x: target.grp.x + 52,
      y: target.grp.y - 20,
    };
    // Sprite id here
    const sprite = game.grid.creatureGroup.create(emissionPoint.x, emissionPoint.y, spriteId);
    const duration = dist * 75;

    sprite.anchor.setTo(0.5);
    sprite.rotation = -Math.PI / 3 + args.direction * Math.PI / 3;
    const tween = game.Phaser.add.tween(sprite)
      .to({
        x: targetPoint.x,
        y: targetPoint.y,
      }, duration, Phaser.Easing.Linear.None)
      .start();

    return [tween, sprite, dist];
  }
}
