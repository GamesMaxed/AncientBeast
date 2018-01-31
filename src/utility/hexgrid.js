// TODO: fix the param reassign thing
/* eslint-disable no-param-reassign */
import jQuery from 'jquery';
import { range, inRange, times } from 'lodash';
import Hex from './hex';
import Creature from '../creature';
import { search } from './pathfinding';
import * as matrices from './matrices';
import { Team, isTeam } from './team';
import * as arrayUtils from './arrayUtils';

/**
 * HexGrid Class
 * Object containing grid and hexagons DOM element and methods concerning the whole grid
 * Should only have one instance during the game.
 */
export default class HexGrid {
  /* Attributes
   *
   * NOTE : attributes and variables starting with $ are jquery element
   * and jquery function can be called dirrectly from them.
   *
   * // Jquery attributes
   * $display :     Grid container
   * $creatureW :   Creature Wrapper container
   * $inpthexesW :   Input Hexagons container
   * $disphexesW :   Display Hexagons container
   * $overhexesW :   Overlay Hexagons container
   * $allInptHex :   Shortcut to all input hexagons DOM elements (for input events)
   * $allDispHex :   Shortcut to all display hexagons DOM elements (to change style of hexagons)
   *
   * // Normal attributes
   * hexes :         Array :   Contain all hexes in row arrays (hexes[y][x])
   * lastClickedHex :   Hex :     Last hex clicked!
   */

  /**
   * Constructor
   * Create attributes and populate JS grid with Hex objects
   */
  constructor(opts, game) {
    const defaultOpt = {
      nbrRow: 9,
      nbrhexesPerRow: 16,
      firstRowFull: false,
    };

    opts = Object.assign({}, defaultOpt, opts);

    this.game = game;
    this.hexes = []; // Hex Array
    this.traps = []; // Traps Array
    this.allhexes = []; // All hexes
    this.lastClickedHex = []; // Array of hexagons containing last calculated pathfinding

    this.display = game.Phaser.add.group(undefined, 'displayGrp');
    this.display.x = 230;
    this.display.y = 380;

    this.gridGroup = game.Phaser.add.group(this.display, 'gridGrp');
    this.gridGroup.scale.set(1, 0.75);

    this.trapGroup = game.Phaser.add.group(this.gridGroup, 'trapGrp');
    this.disphexesGroup = game.Phaser.add.group(this.gridGroup, 'disphexesGrp');
    this.overhexesGroup = game.Phaser.add.group(this.gridGroup, 'overhexesGrp');
    this.dropGroup = game.Phaser.add.group(this.display, 'dropGrp');
    this.creatureGroup = game.Phaser.add.group(this.display, 'creaturesGrp');
    // Parts of traps displayed over creatures
    this.trapOverGroup = game.Phaser.add.group(this.display, 'trapOverGrp');
    this.trapOverGroup.scale.set(1, 0.75);
    this.inpthexesGroup = game.Phaser.add.group(this.gridGroup, 'inpthexesGrp');

    // Populate grid
    /* TODO: fix this
    this.hexes = range(opts.nbrRow).map((row) => {
      if ((row % 2 === 0 && !opts.firstRowFull) || (row % 2 === 1 && opts.firstRowFull)) return [];
      return range(opts.nbrhexesPerRow)
        .filter(hex => hex === opts.nbrhexesPerRow - 1)
        .map(hex => new Hex(hex, row, this));
    }).filter(row => row.length !== 0);
    this.allhexes.concat(this.hexes);
    */

    for (let row = 0; row < opts.nbrRow; row++) {
      this.hexes.push([]);
      for (let hex = 0, len = opts.nbrhexesPerRow; hex < len; hex++) {
        if (hex === opts.nbrhexesPerRow - 1) {
          if (row % 2 === 0 && !opts.firstRowFull || row % 2 === 1 && opts.firstRowFull) {
            continue;
          }
        }

        this.hexes[row][hex] = new Hex(hex, row, this);
        this.allhexes.push(this.hexes[row][hex]);
      }
    }

    // eslint-disable-next-line prefer-destructuring
    this.selectedHex = this.hexes[0][0];
  }

  /**
   * @param {object} options
   */
  querySelf(options) {
    const { game } = this;
    const defaultOpt = {
      fnOnConfirm: () => { },
      fnOnSelect: (creature) => {
        creature.hexagons.forEach((hex) => {
          hex.overlayVisualState(`creature selected player${hex.creature.team}`);
        });
      },
      fnOnCancel: () => {
        this.game.activeCreature.queryMove();
      },
      args: {},
      confirmText: 'Confirm',
      id: game.activeCreature.id,
    };

    options = Object.assign({}, defaultOpt, options);

    // o.fnOnConfirm(game.activeCreature,o.args); // Auto-confirm

    game.activeCreature.hint(options.confirmText, 'confirm');

    this.queryHexes({
      fnOnConfirm: (hex, args) => {
        args.opt.fnOnConfirm(game.activeCreature, args.opt.args);
      },
      fnOnSelect: (hex, args) => {
        args.opt.fnOnSelect(game.activeCreature, args.opt.args);
      },
      fnOnCancel: (hex, args) => {
        args.opt.fnOnCancel(game.activeCreature, args.opt.args);
      },
      args: {
        opt: options,
      },
      hexes: game.activeCreature.hexagons,
      hideNonTarget: true,
      id: options.id,
    });
  }

  /**
   * Shortcut to queryChoice with specific directions
   *
   * @param {Object} options
   * fnOnSelect : Function : Function applied when clicking on one of the available hexes.
   * fnOnConfirm : Function : Function applied when clicking again on the same hex.
   * fnOnCancel : Function : Function applied when clicking a non reachable hex
   * team : Team
   * requireCreature : Boolean : Disable a choice if it does not contain a creature matching the
   *                             team argument
   * distance : number : if defined, maximum distance of query in hexes
   * minDistance : number : if defined, minimum distance of query, 1 = 1 hex gap required
   * args : object : Object given to the events function (to easily pass variable for these
   *                 function)
   */
  queryDirection(options) {
    // This is alway true
    options.isDirectionsQuery = true;
    options = this.getDirectionChoices(options);
    this.queryChoice(options);
  }

  /**
   * Get an object that contains the choices and hexesDashed for a direction query.
   * @param {object} o
   * @returns {object}
   */
  getDirectionChoices(options) {
    const { game } = this;
    const defaultOpt = {
      team: Team.enemy,
      requireCreature: true,
      id: 0,
      flipped: false,
      x: 0,
      y: 0,
      hexesDashed: [],
      directions: [1, 1, 1, 1, 1, 1],
      includeCreature: true,
      stopOnCreature: true,
      dashedHexesAfterCreatureStop: true,
      distance: 0,
      minDistance: 0,
      sourceCreature: undefined,
    };

    options = Object.assign({}, defaultOpt, options);

    // Clean Direction
    this.hexes = this.hexes.flatMap(hex => Object.assign({}, hex, {
      direction: -1,
    }));

    options.choices = options.directions.map((_, i) => {
      let dir = [];
      let fx = 0;

      if (options.sourceCreature instanceof Creature) {
        const { flipped } = options.sourceCreature.player;
        if ((!flipped && i > 2) || (flipped && i < 3)) {
          fx = -1 * (options.sourceCreature.size - 1);
        }
      }

      dir = this.getHexLine(options.x + fx, options.y, i, options.flipped);

      // Limit hexes based on distance
      if (options.distance > 0) {
        dir = dir.slice(0, options.distance + 1);
      }

      if (options.minDistance > 0) {
        // Exclude current hex
        dir = dir.slice(options.minDistance + 1);
      }

      const hexesDashed = dir.map(item => Object.assign({}, item, {
        direction: (options.flipped) ? 5 - i : i,
      })).filter(options.stopOnCreature && options.dashedHexesAfterCreatureStop);

      arrayUtils.filterCreature(dir, options.includeCreature, options.stopOnCreature, options.id);

      if (dir.length === 0) {
        return [];
      }

      if (options.requireCreature) {
        const creaSource = game.creatures[options.id];
        // Search each hex for a creature that matches the team argument
        const validChoice = dir.map(x => x.creature)
          .filter(target => target instanceof Creature && target.id !== options.id)
          .any(target => isTeam(creaSource, target, options.team));

        if (!validChoice) {
          return [];
        }
      }

      if (options.stopOnCreature && options.includeCreature && (i === 1 || i === 4)) {
        // Only straight direction
        if (arrayUtils.last(dir).creature instanceof Creature) {
          // Add full creature
          const { creature } = arrayUtils.last(dir);
          dir.pop();
          dir = dir.concat(creature.hexagons);
        }
      }

      dir.forEach((item) => {
        arrayUtils.removePos(hexesDashed, item);
      });

      options.hexesDashed = options.hexesDashed.concat(hexesDashed);
      return dir;
    });


    return options;
  }

  /**
   * @param {object} Options
   * fnOnSelect : Function : Function applied when clicking on one of the available hexes.
   * fnOnConfirm : Function : Function applied when clicking again on the same hex.
   * fnOnCancel : Function : Function applied when clicking a non reachable hex
   * requireCreature : Boolean : Disable a choice if it does not
   *                             contain a creature matching the team argument
   * args : Object : Object given to the events function (to easily pass variable for these
   *                 function)
   */
  queryChoice(options) {
    const { game } = this;
    const defaultOpt = {
      fnOnConfirm: () => {
        game.activeCreature.queryMove();
      },
      fnOnSelect: (choice) => {
        choice.forEach((item) => {
          if (item.creature instanceof Creature) {
            item.displayVisualState(`creature selected player${item.creature.team}`);
          } else {
            item.displayVisualState('adj');
          }
        });
      },
      fnOnCancel: () => {
        game.activeCreature.queryMove();
      },
      team: Team.enemy,
      requireCreature: 1,
      id: 0,
      args: {},
      flipped: false,
      choices: [],
      hexesDashed: [],
      isDirectionsQuery: false,
      hideNonTarget: true,
    };

    options = Object.assign({}, defaultOpt, options);

    const { choices } = options;

    let hexes = [];
    choices.forEach((choice, i) => {
      let validChoice = true;

      if (options.requireCreature) {
        validChoice = false;
        // Search each hex for a creature that matches the team argument
        for (let j = 0, len = options.choices[i].length; j < len; j++) {
          if (options.choices[i][j].creature instanceof Creature && options.choices[i][j].creature !== options.id) {
            const creaSource = game.creatures[options.id];
            const creaTarget = options.choices[i][j].creature;

            if (isTeam(creaSource, creaTarget, options.team)) {
              validChoice = true;
            }
          }
        }
      }

      if (validChoice) {
        hexes = hexes.concat(options.choices[i]);
      } else if (options.isDirectionsQuery) {
        this.hexes.flatten()
          .filter(hex => options.choices[i][0].direction === hex.direction)
          .forEach(hex => arrayUtils.removePos(options.hexesDashed, hex));
      }
    });

    this.queryHexes({
      fnOnConfirm: (hex, args) => {
        const found = args.opt.choices.flatten().find(({ pos }) => hex.pos === pos);
        if (found !== undefined) {
          args.opt.args.direction = hex.direction;
          args.opt.fnOnConfirm(found, args.opt.args);
        }
      },
      fnOnSelect: (hex, args) => {
        // Determine which set of hexes (choice) the hex is part of
        for (let i = 0, len = args.opt.choices.length; i < len; i++) {
          for (let j = 0, lenj = args.opt.choices[i].length; j < lenj; j++) {
            if (hex.pos === args.opt.choices[i][j].pos) {
              args.opt.args.direction = hex.direction;
              args.opt.args.hex = hex;
              args.opt.args.choiceIndex = i;
              args.opt.fnOnSelect(args.opt.choices[i], args.opt.args);
              return;
            }
          }
        }
      },
      fnOnCancel: options.fnOnCancel,
      args: {
        opt: options,
      },
      hexes,
      hexesDashed: options.hexesDashed,
      flipped: options.flipped,
      hideNonTarget: options.hideNonTarget,
      id: options.id,
      fillHexOnHover: false,
    });
  }

  /**
   * @param {object} options
   * fnOnSelect : Function : Function applied when clicking on one of the available hexes.
   * fnOnConfirm : Function : Function applied when clicking again on the same hex.
   * fnOnCancel : Function : Function applied when clicking a non reachable hex
   * team : Team
   * id : Integer : Creature ID
   * args : Object : Object given to the events function (to easily pass variable for these
   *                 function)
   */
  queryCreature(options) {
    const { game } = this;
    const defaultOpt = {
      fnOnConfirm: () => {
        game.activeCreature.queryMove();
      },
      fnOnSelect: (creature) => {
        creature.tracePosition({
          overlayClass: `creature selected player${creature.team}`,
        });
      },
      fnOnCancel: () => {
        game.activeCreature.queryMove();
      },
      optTest: () => true,
      args: {},
      hexes: [],
      hexesDashed: [],
      flipped: false,
      id: 0,
      team: Team.enemy,
    };

    options = Object.assign({}, defaultOpt, options);

    // Exclude everything but the creatures
    options.hexes = options.hexes.filter((hex) => {
      if (hex.creature instanceof Creature && hex.creature.id !== options.id) {
        if (!options.optTest(hex.creature)) {
          return false;
        }

        const creaSource = game.creatures[options.id];
        const creaTarget = hex.creature;

        if (isTeam(creaSource, creaTarget, options.team)) {
          return true;
        }
      }

      return false;
    });

    options.hexes = options.hexes.reduce(
      (accumulator, hex) => accumulator.concat(hex.concat(hex.creatures.hexagons)),
      [],
    );

    this.queryHexes({
      fnOnConfirm: ({ creature }, args) => {
        args.opt.fnOnConfirm(creature, args.opt.args);
      },
      fnOnSelect: ({ creature }, args) => {
        args.opt.fnOnSelect(creature, args.opt.args);
      },
      fnOnCancel: options.fnOnCancel,
      args: {
        opt: options,
      },
      hexes: options.hexes,
      hexesDashed: options.hexesDashed,
      flipped: options.flipped,
      hideNonTarget: true,
      id: options.id,
    });
  }

  redoLastQuery() {
    this.queryHexes(this.lastQueryOpt);
  }

  /* queryHexes(x, y, distance, size)
   *
   * fnOnSelect : Function : Function applied when clicking on one of the available hexes.
   * fnOnConfirm : Function : Function applied when clicking again on the same hex.
   * fnOnCancel : Function : Function applied when clicking a non reachable hex
   * args : Object : Object given to the events function (to easily pass variable for these
   *                 function)
   * hexes : Array : Reachable hexes
   * callbackAfterQueryHexes : Function : empty function to be overridden with custom logic to
   *                                      execute after queryHexes
   */
  queryHexes(o) {
    const { game } = this;
    const defaultOpt = {
      fnOnConfirm: () => {
        game.activeCreature.queryMove();
      },
      fnOnSelect: (hex) => {
        game.activeCreature.faceHex(hex, undefined, true);
        hex.overlayVisualState(`creature selected player${game.activeCreature.team}`);
      },
      fnOnCancel: () => {
        game.activeCreature.queryMove();
      },
      callbackAfterQueryHexes: () => {
        // empty function to be overridden with custom logic to execute after queryHexes
      },
      args: {},
      hexes: [],
      hexesDashed: [],
      size: 1,
      id: 0,
      flipped: false,
      hideNonTarget: false,
      ownCreatureHexShade: false,
      targeting: true,
      fillHexOnHover: true,
    };

    o = Object.assign({}, defaultOpt, o);

    this.lastClickedHex = [];

    // Save the last Query
    this.lastQueryOpt = Object.assign({}, o); // Copy Obj

    this.updateDisplay();
    // Block all hexes
    this.forEachHex((hex) => {
      hex.unsetReachable();
      if (o.hideNonTarget) {
        hex.setNotTarget();
      } else {
        hex.unsetNotTarget();
      }

      if (o.hexesDashed.indexOf(hex) !== -1) {
        hex.displayVisualState('dashed');
      } else {
        hex.cleanDisplayVisualState('dashed');
      }
    });

    // Cleanup
    if (this.materialize_overlay) {
      this.materialize_overlay.alpha = 0;
    }

    if (!o.ownCreatureHexShade) {
      if (o.id instanceof Array) {
        o.id.forEach((id) => {
          game.creatures[id].hexagons.forEach((hex) => {
            hex.overlayVisualState('ownCreatureHexShade');
          });
        });
      } else if (o.id !== 0) {
        game.creatures[o.id].hexagons.forEach((hex) => {
          hex.overlayVisualState('ownCreatureHexShade');
        });
      }
    }

    // Set reachable the given hexes
    o.hexes.forEach((hex) => {
      hex.setReachable();
      if (o.hideNonTarget) {
        hex.unsetNotTarget();
      }
      if (o.targeting) {
        if (hex.creature instanceof Creature) {
          if (hex.creature.id !== this.game.activeCreature.id) {
            hex.overlayVisualState(`hover h_player${hex.creature.team}`);
          }
        } else {
          hex.overlayVisualState(`hover h_player${this.game.activeCreature.team}`);
        }
      }
    });

    if (o.callbackAfterQueryHexes) {
      o.callbackAfterQueryHexes();
    }

    // ONCLICK
    const onConfirmFn = (hex) => {
      let { x } = hex;
      const { y } = hex;

      // Clear display and overlay
      jQuery('canvas').css('cursor', 'pointer');

      // Not reachable hex
      if (!hex.reachable) {
        this.lastClickedHex = [];
        if (hex.creature instanceof Creature) { // If creature
          onCreatureHover(hex.creature, (game.activeCreature !== hex.creature) ? game.UI.bouncexrayQueue.bind(game.UI) : game.UI.xrayQueue.bind(game.UI), hex);
        } else { // If nothing
          o.fnOnCancel(hex, o.args); // ON CANCEL
        }
      } else {
        // Reachable hex
        // Offset Pos
        const offset = (o.flipped) ? o.size - 1 : 0;
        const mult = (o.flipped) ? 1 : -1; // For flipped player

        const current = this.hexes[y];
        x = range(o.size).reduce((accumulator, i) => {
          if (inRange(x + offset - (i * mult), 0, current.length)
            && current[x + offset - (i * mult)].isWalkable(o.size, o.id)) {
            return accumulator + offset - (i * mult);
          }
          return accumulator;
        }, 0);
      }

      hex = this.hexes[y][x]; // New coords
      const clickedtHex = hex;

      game.activeCreature.faceHex(clickedtHex, undefined, true, true);

      if (clickedtHex !== this.lastClickedHex) {
        this.lastClickedHex = clickedtHex;
        // ONCLICK
        o.fnOnConfirm(clickedtHex, o.args);
      } else {
        // ONCONFIRM
        o.fnOnConfirm(clickedtHex, o.args);
      }
    };

    const onHoverOffFn = (hex) => {
      if (hex.creature instanceof Creature) { // toggle hover off event
        const { creature } = hex;
        if (creature.type === '--') { // the plasma would have been displayed so now display the health again
          creature.updateHealth();
        }
      }
    };

    // ONMOUSEOVER
    const onSelectFn = (hex) => {
      let { x } = hex;
      const { y } = hex;

      // Xray
      this.xray(hex);

      // Clear display and overlay
      game.UI.xrayQueue(-1);
      jQuery('canvas').css('cursor', 'pointer');

      if (hex.creature instanceof Creature) { // If creature
        onCreatureHover(hex.creature, game.UI.xrayQueue.bind(game.UI), hex);
      } else if (o.fillHexOnHover && hex.reachable) {
        this.cleanHex(hex);
        hex.displayVisualState(`creature player${this.game.activeCreature.team}`);
      }

      // Not reachable hex
      if (!hex.reachable) {
        if (hex.materialize_overlay) {
          hex.materialize_overlay.alpha = 0;
        }
        hex.overlayVisualState('hover');
      } else {
        // Reachable hex
        // Offset Pos
        const offset = (o.flipped) ? o.size - 1 : 0;
        const mult = (o.flipped) ? 1 : -1; // For flipped player

        const current = this.hexes[y];
        x = range(o.size).reduce((accumulator, i) => {
          if (inRange(x + offset - (i * mult), 0, current.length)
            && current[x + offset - (i * mult)].isWalkable(o.size, o.id)) {
            return accumulator + offset - (i * mult);
          }
          return accumulator;
        }, 0);

        hex = this.hexes[y][x]; // New coords
        o.fnOnSelect(hex, o.args);
      }
    };

    // ONRIGHTCLICK
    const onRightClickFn = () => {
      if (this.creature instanceof Creature) {
        game.UI.showCreature(this.creature.type, this.creature.player.id);
      } else {
        game.UI.showCreature(game.activeCreature.type, game.activeCreature.player.id);
      }
    };

    let onCreatureHover = (creature, queueEffect, hex) => {
      if (creature.type === '--') {
        if (creature === game.activeCreature) {
          if (creature.hasCreaturePlayerGotPlasma()) {
            creature.displayPlasmaShield();
          }
        } else {
          creature.displayHealthStats();
        }
      }
      creature.hexagons.forEach((currentHex) => { // Flashing outline
        currentHex.overlayVisualState(`hover h_player${creature.team}`);
      });
      if (creature !== game.activeCreature) {
        if (!hex.reachable) {
          jQuery('canvas').css('cursor', 'n-resize');
        } else { // Filled hex with color
          hex.displayVisualState(`creature player${hex.creature.team}`);
        }
      }
      queueEffect(creature.id);
    };


    this.forEachHex((hex) => {
      hex.onSelectFn = onSelectFn;
      hex.onHoverOffFn = onHoverOffFn;
      hex.onConfirmFn = onConfirmFn;
      hex.onRightClickFn = onRightClickFn;
    });
  }

  /**
   * @param {Hex} Hexagon to emphase
   * If hex contain creature call ghostOverlap for each creature hexes
   */
  xray(hex) {
    // Clear previous ghost
    this.game.creatures.forEach((creature) => {
      if (creature instanceof Creature) {
        creature.xray(false);
      }
    });

    if (hex.creature instanceof Creature) {
      hex.creature.hexagons.forEach((item) => {
        item.ghostOverlap();
      });
    } else {
      hex.ghostOverlap();
    }
  }

  /**
   * Gets a line of hexes given a start point and a direction
   * The result is an array of hexes, starting from the start point's hex, and
   * extending out in a straight line.
   * If the coordinate is erroneous, returns an empty array.
   *
   * @param {x} x x coordinate of start hex
   * @param {y} y y coordinate of start hex
   * @param {number} dir direction number (0 = upright, continues clockwise to 5 = upleft)
   * @param {boolean} flipped
   * @returns {Hex[]} Line from start to finish
   */
  getHexLine(x, y, dir, flipped) {
    switch (dir) {
      case 0: // Upright
        return this.getHexMap(x, y - 8, 0, flipped, matrices.diagonalup).reverse();
      case 1: // StraitForward
        return this.getHexMap(x, y, 0, flipped, matrices.straitrow);
      case 2: // Downright
        return this.getHexMap(x, y, 0, flipped, matrices.diagonaldown);
      case 3: // Downleft
        return this.getHexMap(x, y, -4, flipped, matrices.diagonalup);
      case 4: // StraitBackward
        return this.getHexMap(x, y, 0, !flipped, matrices.straitrow);
      case 5: // Upleft
        return this.getHexMap(x, y - 8, -4, flipped, matrices.diagonaldown).reverse();
      default:
        return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  cleanHex(hex) {
    hex.cleanDisplayVisualState();
    hex.cleanOverlayVisualState();
  }

  /**
   * updateDisplay()
   * Update overlay hexes with creature positions
   */
  updateDisplay() {
    this.cleanDisplay();
    this.cleanOverlay();
    this.hexes.forEach((hex) => {
      hex.forEach((item) => {
        if (item.creature instanceof Creature) {
          if (item.creature.id === this.game.activeCreature.id) {
            item.overlayVisualState(`active creature player${item.creature.team}`);
            item.displayVisualState(`creature player${item.creature.team}`);
          }
        }
      });
    });
  }

  /**
   * Test if hex exists
   * @param {number} number Coordinates to test.
   * @param {number} number Coordinates to test.
   * @returns {boolean} True if the hex exists, false otherwise.
   */
  hexExists(y, x) {
    if ((y >= 0) && (y < this.hexes.length)) {
      if ((x >= 0) && (x < this.hexes[y].length)) {
        return true;
      }
    }

    return false;
  }


  /**
   * Test if hex exists inside array of hexes
   *
   * @param {Hex} hex to look for
   * @param {Hex[]} hexarray Array of hexes to look for hex in
   */
  // eslint-disable-next-line class-methods-use-this
  isHexIn(hex, hexArray) {
    return hexArray.some(({ x, y }) => x === hex.x && y === hex.y);
  }

  /**
   * @param {Creature} creature Create to calculate the movement range for
   * @returns {Hex[]} Set of the reachable hexes
   */
  getMovementRange(creature) {
    const {
      x,
      y,
      stats: { movement: distance },
      size,
      id,
    } = creature;
    //  Populate distance (hex.g) in hexes by asking an impossible
    //  destination to test all hexagons
    this.cleanReachable(); // If not pathfinding will bug
    this.cleanPathAttr(true); // Erase all pathfinding data
    search(this.hexes[y][x], new Hex(-2, -2, null, this.game), size, id, this.game.grid);

    // Gather all the reachable hexes
    const hexes = this.hexes.flatten().filter(({ g }) => g <= distance && g !== 0);

    return arrayUtils.extendToLeft(hexes, size, this.game.grid);
  }

  /**
   * @param {Creature} creature Creature to calculate the flying range for
   * @return {Hex[]} Set of the reachable hexes
   */
  getFlyingRange(creature) {
    const {
      x,
      y,
      stats: { movement: distance },
      size,
      id,
    } = creature;
    // Gather all the reachable hexes
    let hexes = this.hexes[y][x].adjacentHex(distance);

    hexes = hexes.filter(hex => hex.isWalkable(size, id, true));

    return arrayUtils.extendToLeft(hexes, size, this.game.grid);
  }

  /**
   * @param {number} originx Position of the array on the grid
   * @param {number} originy Position of the array on the grid
   * @param {number} offsetx Offset flipped for flipped players
   * @param {boolean} flipped If player is flipped or not
   * @param {boolean[][]} array :   Array :   2-dimentions Array containing 0 or 1 (boolean)
   * @return {Hex[]} Set of corresponding hexes
   */
  getHexMap(originx, originy, offsetx, flipped, array) { // Heavy logic in here
    const hexes = [];

    array = array.slice(0); // Copy to not modify original
    originx += (flipped) ? 1 - array[0].length - offsetx : -1 + offsetx;

    array.forEach((row, y) => {
      // Translating to flipped patern
      if (flipped && y % 2 !== 0) { // Odd rows
        row.push(0);
      }
      // Translating even to odd row patern
      row.unshift(0);

      // Even rows
      if (originy % 2 !== 0 && y % 2 !== 0) {
        if (flipped) {
          row.pop(); // Remove last element as the array will be parse backward
        } else {
          row.shift(); // Remove first element
        }
      }

      row.forEach((hex, x) => {
        // Parse the array backward for flipped player
        const xfinal = (flipped) ? row.length - 1 - x : x;
        if (this.hexExists(originy + y, originx + xfinal)) {
          hexes.push(this.hexes[originy + y][originx + xfinal]);
        }
      });
    });

    return hexes;
  }

  showGrid(val) {
    this.hexes.flatten().forEach((hex) => {
      if (hex.creature) {
        hex.creature.xray(val);
      }

      if (hex.drop) {
        return;
      }

      if (val) {
        hex.displayVisualState('showGrid');
      } else {
        hex.cleanDisplayVisualState('showGrid');
      }
    });
  }

  showMovementRange(id) {
    const creature = this.game.creatures[id];
    let hexes;

    if (creature.movementType === 'flying') {
      hexes = this.getFlyingRange(creature);
    } else {
      hexes = this.getMovementRange(creature);
    }

    // Block all hexes
    this.forEachHex((hex) => {
      hex.unsetReachable();
    });

    // Set reachable the given hexes
    hexes.forEach((hex) => {
      hex.setReachable();
    });
  }

  selectHexUp() {
    if (this.hexExists(this.selectedHex.y - 1, this.selectedHex.x)) {
      const hex = this.hexes[this.selectedHex.y - 1][this.selectedHex.x];
      this.selectedHex = hex;
      hex.onSelectFn();
    }
  }

  selectHexDown() {
    if (this.hexExists(this.selectedHex.y + 1, this.selectedHex.x)) {
      const hex = this.hexes[this.selectedHex.y + 1][this.selectedHex.x];
      this.selectedHex = hex;
      hex.onSelectFn();
    }
  }

  selectHexLeft() {
    if (this.hexExists(this.selectedHex.y, this.selectedHex.x - 1)) {
      const hex = this.hexes[this.selectedHex.y][this.selectedHex.x - 1];
      this.selectedHex = hex;
      hex.onSelectFn();
    }
  }

  selectHexRight() {
    if (this.hexExists(this.selectedHex.y, this.selectedHex.x + 1)) {
      const hex = this.hexes[this.selectedHex.y][this.selectedHex.x + 1];
      this.selectedHex = hex;
      hex.onSelectFn();
    }
  }

  confirmHex(hex) {
    if (this.game.freezedInput) {
      return;
    }

    this.selectedHex.onConfirmFn(hex);
  }

  /**
   * Reorder each creature based on its Y coordinate
   * TODO: make this actually use the Z coordinate
   */
  orderCreatureZ() {
    let index = 0;
    const { hexes, game: { creatures } } = this;

    hexes.forEach((hex, y) => {
      creatures
        .filter(creature => creature.y === y)
        .forEach((creature) => {
          this.creatureGroup.remove(creature.grp);
          this.creatureGroup.addAt(creature.grp, index);
          index += 1;
        });

      if (this.materialize_overlay && this.materialize_overlay.posy === y) {
        this.creatureGroup.remove(this.materialize_overlay);
        this.creatureGroup.addAt(this.materialize_overlay, index);
        index += 1;
      }
    });
  }

  //* *****************//
  // Shortcut functions//
  //* *****************//

  /* forEachHex(f)
   *
   * f : Function :   Function to execute
   *
   * Execute f for each hexes
   */
  forEachHex(func) {
    this.hexes.forEach((hex) => {
      hex.forEach(func);
    });
  }

  /* cleanPathAttr(includeG)
   *
   * includeG :   Boolean :   Include hex.g attribute
   *
   * Execute hex.cleanPathAttr() function for all the grid. Refer to the Hex class for more info
   */
  cleanPathAttr(includeG) {
    this.hexes.forEach((hex) => {
      hex.forEach((item) => {
        item.cleanPathAttr(includeG);
      });
    });
  }

  /* cleanReachable()
   *
   * Execute hex.setReachable() function for all the grid. Refer to the Hex class for more info
   */
  cleanReachable() {
    this.hexes.forEach((hex) => {
      hex.forEach((item) => {
        item.setReachable();
      });
    });
  }

  /* cleanDisplay(cssClass)
   *
   * cssClass :   String :   Class(es) name(s) to remove with jQuery removeClass function
   *
   * Shorcut for $allDispHex.removeClass()
   */
  cleanDisplay(cssClass) {
    this.forEachHex((hex) => {
      hex.cleanDisplayVisualState(cssClass);
    });
  }

  cleanOverlay(cssClass) {
    this.forEachHex((hex) => {
      hex.cleanOverlayVisualState(cssClass);
    });
  }

  /**
   * Draw a preview of the creature at the given coordinates
   *
   * @param {{x: number, y:number}} pos Coordinates {x,y}
   * @param {Object} creatureData Object containing info from the database
   *                              (game.retreiveCreatureStats)
   * @param {Playter} player
   */
  previewCreature(pos, creatureData, player) {
    const { game } = this;
    const hex = this.hexes[pos.y][pos.x - (creatureData.size - 1)];

    if (!this.materialize_overlay) { // If sprite does not exists
      // Adding sprite
      this.materialize_overlay = this.creatureGroup.create(0, 0, `${creatureData.name}_cardboard`);
      this.materialize_overlay.anchor.setTo(0.5, 1);
      this.materialize_overlay.posy = pos.y;
    } else {
      this.materialize_overlay.loadTexture(`${creatureData.name}_cardboard`);
      if (this.materialize_overlay.posy !== pos.y) {
        this.materialize_overlay.posy = pos.y;
        this.orderCreatureZ();
      }
    }

    // Placing sprite
    this.materialize_overlay.x = hex.displayPos.x + ((!player.flipped) ? creatureData.display['offset-x'] : 90 * creatureData.size - this.materialize_overlay.texture.width - creatureData.display['offset-x']) + this.materialize_overlay.texture.width / 2;
    this.materialize_overlay.y = hex.displayPos.y + creatureData.display['offset-y'] + this.materialize_overlay.texture.height;
    this.materialize_overlay.alpha = 0.5;

    if (player.flipped) {
      this.materialize_overlay.scale.setTo(-1, 1);
    } else {
      this.materialize_overlay.scale.setTo(1, 1);
    }

    times(creatureData.size, (i) => {
      const hexInstance = this.hexes[pos.y][pos.x - i];
      this.cleanHex(hexInstance);
      hexInstance.overlayVisualState(`creature selected player${game.activeCreature.team}`);
    });
  }

  debugHex(hexes) {
    jQuery('.debug').remove();
    hexes.forEach((hex, i) => {
      const a = this.$creatureW.append(`<div class=".debug" id="debug${i}"></div>`)
        .children(`#debug${i}`);
      a.css({
        position: 'absolute',
        width: 20,
        height: 20,
        'background-color': 'yellow',
      });
      a.css(hex.displayPos);
    });
  }
}
