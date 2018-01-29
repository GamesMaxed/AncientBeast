import { Trap } from './trap';
import Creature from '../creature';

/**
 * Hex Class
 *
 * Object containing hex informations, positions and DOM elements
 */
export default class Hex {
  /* Attributes
   *
   * NOTE : attributes and variables starting with $ are jquery element
   * and jquery function can be called dirrectly from them.
   *
   * //Jquery attributes
   * $display :     Hex display element
   * $overlay :     Hex overlay element
   * $input :     Hex input element (bind controls on it)
   *
   * //Normal attributes
   * x :       Integer :   Hex coordinates
   * y :       Integer :   Hex coordinates
   * pos :       Object :   Pos object for hex comparison {x,y}
   *
   * f :       Integer :   Pathfinding score f = g + h
   * g :       Integer :   Pathfinding distance from start
   * h :       Integer :   Pathfinding distance to finish
   * pathparent :   Hex :     Pathfinding parent hex (the one you came from)
   *
   * blocked :     Boolean :   Set to true if an obstacle it on it. Restrict movement.
   * creature :     Creature :   Creature object , undefined if empty
   * reachable :   Boolean :   Set to true if accessible by current action
   *
   * displayPos :   Object :   Pos object to position creature with absolute coordinates {left,top}
   */

  /**
   *
   * @param {number} x X-coordinate
   * @param {number} y Y-coordinate
   * @param {Object} grid
   * @param {Game} g
   */
  constructor(x, y, grid, g) {
    this.game = (grid && grid.game) || g;
    this.grid = grid;
    this.x = x;
    this.y = y;
    this.pos = {
      x,
      y,
    };
    this.coord = String.fromCharCode(64 + this.y + 1) + (this.x + 1);
    const { game } = this;

    // Pathfinding
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.pathparent = null;

    this.blocked = false;
    this.creature = undefined;
    this.reachable = true;
    this.direction = -1; // Used for queryDirection
    this.drop = undefined; // Drop items
    this.displayClasses = '';
    this.overlayClasses = '';

    // Horizontal hex grid, width is distance between opposite sides
    this.width = 90;
    this.height = (this.width / Math.sqrt(3)) * 2 * 0.75;
    this.displayPos = {
      x: ((y % 2 === 0) ? x + 0.5 : x) * this.width,
      y: y * this.height,
    };

    this.originalDisplayPos = Object.assign({}, this.displayPos);

    this.tween = null;

    if (grid) {
      // 10px is the offset from the old version

      this.display = grid.disphexesGroup.create(this.displayPos.x - 10, this.displayPos.y, 'hex');
      this.display.alpha = 0;

      this.overlay = grid.overhexesGroup.create(this.displayPos.x - 10, this.displayPos.y, 'hex');
      this.overlay.alpha = 0;

      this.input = grid.inpthexesGroup.create(this.displayPos.x - 10, this.displayPos.y, 'input');
      this.input.inputEnabled = true;
      this.input.input.pixelPerfect = true;
      this.input.input.pixelPerfectAlpha = 1;
      this.input.input.useHandCursor = false;

      // Binding Events
      this.input.events.onInputOver.add(() => {
        if (game.freezedInput || game.UI.dashopen) {
          return;
        }

        grid.selectedHex = this;
        this.onSelectFn(this);
      }, this);

      this.input.events.onInputOut.add(() => {
        if (game.freezedInput || game.UI.dashopen) {
          return;
        }

        grid.redoLastQuery();
        grid.xray(new Hex(-1, -1, null, game)); // Clear Xray
        game.UI.xrayQueue(-1); // Clear Xray Queue
        this.onHoverOffFn(this);
      }, this);

      this.input.events.onInputUp.add((Sprite, Pointer) => {
        if (game.freezedInput || game.UI.dashopen) {
          return;
        }

        /* eslint-disable default-case */
        switch (Pointer.button) {
          case 0:
            // Left mouse button pressed
            this.onConfirmFn(this);
            break;
          case 1:
            // Middle mouse button pressed
            break;
          case 2:
            // Right mouse button pressed
            this.onRightClickFn(this);
            break;
        }
        /* eslint-enable */
      }, this);
    }

    this.displayPos.y = (this.displayPos.y * 0.75) + 30;

    this.onSelectFn = () => { };
    this.onHoverOffFn = () => { };
    this.onConfirmFn = () => { };
    this.onRightClickFn = () => { };

    this.trap = undefined;
  }

  /**
   * This function return an array containing all hexes of the grid
   * at the distance given of the current hex.
   *
   * @param {number} distance Distance from the current hex
   * @return {Hex[]} Array containing hexes
   */
  adjacentHex(distance) {
    const adjHex = [];

    for (let i = -distance; i <= distance; i++) {
      const deltaY = i;
      let startX;
      let endX;

      if (this.y % 2 === 0) {
        // Evenrow
        startX = Math.ceil(Math.abs(i) / 2) - distance;
        endX = distance - Math.floor(Math.abs(i) / 2);
      } else {
        // Oddrow
        startX = Math.floor(Math.abs(i) / 2) - distance;
        endX = distance - Math.ceil(Math.abs(i) / 2);
      }

      for (let deltaX = startX; deltaX <= endX; deltaX++) {
        const x = this.x + deltaX;
        const y = this.y + deltaY;

        // Exclude current and inexisting hexes
        if (!(deltaY === 0 && deltaX === 0)
          && y < this.grid.hexes.length && y >= 0 && x < this.grid.hexes[y].length && x >= 0) {
          adjHex.push(this.grid.hexes[y][x]);
        }
      }
    }

    return adjHex;
  }

  /**
   * Add ghosted class to creature on hexes behind this hex
   * TODO: try to refactor this to not use for loops
   */
  ghostOverlap() {
    const grid = this.grid || this.game.grid;
    let ghostedCreature;

    for (let i = 1; i <= 3; i++) {
      if (this.y % 2 === 0) {
        if (i === 1) {
          for (let j = 0; j <= 1; j++) {
            if (grid.hexExists(this.y + i, this.x + j)) {
              if (grid.hexes[this.y + i][this.x + j].creature instanceof Creature) {
                ghostedCreature = grid.hexes[this.y + i][this.x + j].creature;
              }
            }
          }
        } else if (grid.hexExists(this.y + i, this.x)) {
          if (grid.hexes[this.y + i][this.x].creature instanceof Creature) {
            ghostedCreature = grid.hexes[this.y + i][this.x].creature;
          }
        }
      } else if (i === 1) {
        for (let j = 0; j <= 1; j++) {
          if (grid.hexExists(this.y + i, this.x - j)) {
            if (grid.hexes[this.y + i][this.x - j].creature instanceof Creature) {
              ghostedCreature = grid.hexes[this.y + i][this.x - j].creature;
            }
          }
        }
      } else if (grid.hexExists(this.y + i, this.x)) {
        if (grid.hexes[this.y + i][this.x].creature instanceof Creature) {
          ghostedCreature = grid.hexes[this.y + i][this.x].creature;
        }
      }

      if (ghostedCreature instanceof Creature) {
        ghostedCreature.xray(true);
      }
    }
  }

  /**
   * This function reset all the pathfinding attribute to 0 to calculate new path to another hex.
   * @param {boolean} includeG Set to true if you change the start of the calculated path.
   */
  cleanPathAttr(includeG) {
    this.f = 0;
    this.g = (includeG) ? 0 : this.g;
    this.h = 0;
    this.pathparent = null;
  }

  /**
   *
   * @param {number} size Size of the creature
   * @param {number} id  ID of the creature
   * @param {boolean} ignoreReachable Take into account the reachable property
   * @return {boolean}  True if this hex is walkable
   */
  isWalkable(size, id, ignoreReachable) {
    let blocked = false;

    for (let i = 0; i < size; i++) {
      // For each Hex of the creature
      if ((this.x - i) >= 0 && (this.x - i) < this.grid.hexes[this.y].length) { // if hex exists
        const hex = this.grid.hexes[this.y][this.x - i];
        // Verify if blocked. If it's blocked by one attribute, OR statement will keep it status
        blocked = blocked || hex.blocked;

        if (!ignoreReachable) {
          blocked = blocked || !hex.reachable;
        }

        let isNotMovingCreature;
        if (hex.creature instanceof Creature) {
          if (id instanceof Array) {
            isNotMovingCreature = (id.indexOf(hex.creature.id) === -1);
          } else {
            isNotMovingCreature = (hex.creature.id !== id);
          }

          // Not blocked if this block contains the moving creature
          blocked = blocked || isNotMovingCreature;
        }
      } else {
        // Blocked by grid boundaries
        blocked = true;
      }
    }

    return !blocked; // Its walkable if it's NOT blocked
  }

  /**
   * Change the appearance of the overlay hex
   */
  overlayVisualState(classes = '') {
    this.overlayClasses += ` ${classes} `;
    this.updateStyle();
  }

  /**
   * Change the appearance of the display hex
   */
  displayVisualState(classes = '') {
    this.displayClasses += ` ${classes} `;
    this.updateStyle();
  }

  /* cleanOverlayVisualState
   *
   * Clear the appearance of the overlay hex
   */
  cleanOverlayVisualState(classes = 'creature weakDmg active moveto selected hover h_player0 h_player1 h_player2 h_player3 player0 player1 player2 player3') {
    classes.split(' ').forEach((cssClass) => {
      const regex = new RegExp(`\\b${cssClass}\\b`, 'g');
      this.overlayClasses = this.overlayClasses.replace(regex, '');
    });
    this.updateStyle();
  }

  /* cleanDisplayVisualState
   *
   * Clear the appearance of the display hex
   */
  cleanDisplayVisualState(classes = 'adj hover creature player0 player1 player2 player3') {
    classes.split(' ').forEach((cssClass) => {
      const regex = new RegExp(`\\b${cssClass}\\b`, 'g');
      this.overlayClasses = this.overlayClasses.replace(regex, '');
    });
    this.updateStyle();
  }

  /**
   * Set Hex.reachable to true for this hex and change $display class
   */
  setReachable() {
    this.reachable = true;
    this.input.input.useHandCursor = true;
    this.updateStyle();
  }

  /**
   * Set Hex.reachable to False for this hex and change $display class
   */
  unsetReachable() {
    this.reachable = false;
    this.input.input.useHandCursor = false;
    this.updateStyle();
  }

  unsetNotTarget() {
    this.displayClasses = this.displayClasses.replace(/\bhidden\b/g, '');
    this.updateStyle();
  }

  setNotTarget() {
    this.displayClasses += ' hidden ';
    this.updateStyle();
  }

  updateStyle() {
    // Display Hex
    let targetAlpha = this.reachable || !!this.displayClasses.match(/creature/g);

    targetAlpha = !this.displayClasses.match(/hidden/g) && targetAlpha;
    targetAlpha = !!this.displayClasses.match(/showGrid/g) || targetAlpha;
    targetAlpha = !!this.displayClasses.match(/dashed/g) || targetAlpha;

    if (this.displayClasses.match(/0|1|2|3/)) {
      const p = this.displayClasses.match(/0|1|2|3/);
      this.display.loadTexture(`hex_p${p}`);
      this.grid.disphexesGroup.bringToTop(this.display);
    } else if (this.displayClasses.match(/adj/)) {
      this.display.loadTexture('hex_path');
    } else if (this.displayClasses.match(/dashed/)) {
      this.display.loadTexture('hex_dashed');
    } else {
      this.display.loadTexture('hex');
    }

    this.display.alpha = targetAlpha;
    // Too slow
    // if(this.display.alpha != targetAlpha) {
    //   if(this.tween) this.tween.stop();
    //   this.tween = G.Phaser.add.tween(this.display)
    //     .to({alpha:targetAlpha-0}, 250, Phaser.Easing.Linear.None)
    //     .start();
    // }

    // Display Coord
    if (this.displayClasses.match(/showGrid/g)) {
      if (!(this.coordText && this.coordText.exists)) {
        this.coordText = this.game.Phaser.add.text(
          this.originalDisplayPos.x + 45,
          this.originalDisplayPos.y + 63,
          this.coord, {
            font: '30pt Play',
            fill: '#000000',
            align: 'center',
          },
        );
        this.coordText.anchor.setTo(0.5, 0.5);
        this.grid.overhexesGroup.add(this.coordText);
      }
    } else if (this.coordText && this.coordText.exists) {
      this.coordText.destroy();
    }

    // Overlay Hex
    targetAlpha = !!this.overlayClasses.match(/hover|creature/g);

    if (this.overlayClasses.match(/0|1|2|3/)) {
      const p = this.overlayClasses.match(/0|1|2|3/);

      if (this.overlayClasses.match(/hover/)) {
        this.overlay.loadTexture(`hex_hover_p${p}`);
      } else {
        this.overlay.loadTexture(`hex_p${p}`);
      }

      this.grid.overhexesGroup.bringToTop(this.overlay);
    } else {
      this.overlay.loadTexture('cancel');
    }

    this.overlay.alpha = targetAlpha;
  }

  /**
   * Add a trap to a hex.
   *
   * Examples:
   * - turnLifetime
   * - fullTurnLifetime
   * - ownerCreature
   * - destroyOnActivate
   * - typeOver
   *
   * @param {*} type name of sprite to use; see Phaser.load.image usage
   * @param {*} effects effects to activate when trap triggered
   * @param {*} owner owner of the trap
   * @param {object} optional arguments merged into the Trap object
   * @returns {Trap}
   */
  createTrap(type, effects, owner, opt) {
    if (this.trap) {
      this.destroyTrap();
    }

    this.trap = new Trap(this.x, this.y, type, effects, owner, opt, this.game);
    return this.trap;
  }

  activateTrap(trigger, target) {
    if (!this.trap) {
      return;
    }

    this.trap.effects.forEach((effect) => {
      if (trigger.test(effect.trigger) && effect.requireFn()) {
        this.game.log('Trap triggered');
        effect.activate(target);
      }
    });

    if (this.trap && this.trap.destroyOnActivate) {
      this.destroyTrap();
    }
  }

  destroyTrap() {
    if (!this.trap) {
      return;
    }

    delete this.grid.traps[this.trap.id];
    this.trap.destroy();
    delete this.trap;
  }

  /**
   * Drop function
   * @param {Creature} creature
   */
  pickupDrop(creature) {
    if (!this.drop) {
      return;
    }

    this.drop.pickup(creature);
  }

  /**
   * Override toJSON to avoid circular references when outputting to game log
   * Used by game log only
   */
  toJSON() {
    return {
      x: this.x,
      y: this.y,
    };
  }
}
