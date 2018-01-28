// Import jquery related stuff
import jQuery from 'jquery';
import 'jquery-ui/ui/widgets/button';
import 'jquery-ui/ui/widgets/slider';
import 'jquery.transit';

// Load phaser (https://github.com/photonstorm/phaser/issues/1974)
import PIXI from 'expose-loader?PIXI!phaser-ce/build/custom/pixi.js';
import p2 from 'expose-loader?p2!phaser-ce/build/custom/p2.js';
import Phaser from 'expose-loader?Phaser!phaser-ce/build/custom/phaser-split.js';

import Game from './game';

// Load the stylesheet
import './style/main.less';

// Abilities
import abolishedAbilitiesGenerator from './abilities/Abolished';
import chimeraAbilitiesGenerator from './abilities/Chimera';
import cyberHoundAbilitiesGenerator from './abilities/Cyber-Hound';
import darkPriestAbilitiesGenerator from './abilities/Dark-Priest';
import goldenWyrmAbilitiesGenerator from './abilities/Golden-Wyrm';
import gumbleAbilitiesGenerator from './abilities/Gumble';
import iceDemonAbilitiesGenerator from './abilities/Ice-Demon';
import impalerAbilitiesGenerator from './abilities/Impaler';
import lavaMolluskAbilitiesGenerator from './abilities/Lava-Mollusk';
import magmaSpawnAbilitiesGenerator from './abilities/Magma-Spawn';
import nightmareAbilitiesGenerator from './abilities/Nightmare';
import nutcaseAbilitiesGenerator from './abilities/Nutcase';
import scavengerAbilitiesGenerator from './abilities/Scavenger';
import snowBunnyAbilitiesGenerator from './abilities/Snow-Bunny';
import swineThugAbilitiesGenerator from './abilities/Swine-Thug';
import uncleFungusAbilitiesGenerator from './abilities/Uncle-Fungus';


// Export stuff that needs to be on the window object (Hack)
window.$j = jQuery;
window.Phaser = Phaser;

// Create the game
const G = new Game('0.3');

// Load the abilitreate any new language but...ies
const abilitiesGenerators = [
  abolishedAbilitiesGenerator,
  chimeraAbilitiesGenerator,
  cyberHoundAbilitiesGenerator,
  darkPriestAbilitiesGenerator,
  goldenWyrmAbilitiesGenerator,
  gumbleAbilitiesGenerator,
  iceDemonAbilitiesGenerator,
  impalerAbilitiesGenerator,
  lavaMolluskAbilitiesGenerator,
  magmaSpawnAbilitiesGenerator,
  nightmareAbilitiesGenerator,
  nutcaseAbilitiesGenerator,
  scavengerAbilitiesGenerator,
  snowBunnyAbilitiesGenerator,
  swineThugAbilitiesGenerator,
  uncleFungusAbilitiesGenerator,
];
abilitiesGenerators.forEach(generator => generator(G));

/* eslint-disable import/prefer-default-export */
/**
 * Get the game config from the user window
 *
 * TODO: refactor
 */
export function getGameConfig() {
  const defaultConfig = {
    playerMode: jQuery('input[name="playerMode"]:checked').val() - 0,
    creaLimitNbr: jQuery('input[name="activeUnits"]:checked').val() - 0, // DP counts as One
    unitDrops: jQuery('input[name="unitDrops"]:checked').val() - 0,
    abilityUpgrades: jQuery('input[name="abilityUpgrades"]:checked').val() - 0,
    plasma_amount: jQuery('input[name="plasmaPoints"]:checked').val() - 0,
    turnTimePool: jQuery('input[name="turnTime"]:checked').val() - 0,
    timePool: jQuery('input[name="timePool"]:checked').val() * 60,
    background_image: jQuery('input[name="combatLocation"]:checked').val(),
  };
  const config = G.gamelog.gameConfig || defaultConfig;

  return config;
}
/* eslint-enable import/prefer-default-export */

jQuery(document).ready(() => {
  jQuery('.typeRadio').buttonset();
  jQuery('#startButton').button();

  // Disable initial game setup until browser tab has focus
  window.addEventListener('blur', G.onBlur.bind(G), false);
  window.addEventListener('focus', G.onFocus.bind(G), false);
  jQuery('form#gameSetup').submit((e) => {
    e.preventDefault(); // Prevent submit
    const gameconfig = getGameConfig();


    if (gameconfig.background_image === 'random') {
      // nth-child indices start at 1
      const index = Math.floor(Math.random() * (jQuery('input[name="combatLocation"]').length - 1)) + 1;
      gameconfig.background_image = jQuery('input[name="combatLocation"]').slice(index, index + 1).attr('value');
    }

    G.loadGame(gameconfig);
    return false; // Prevent submit
  });
});

