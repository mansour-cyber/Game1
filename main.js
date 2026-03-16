// main.js — Entry point
import { Game } from './src/game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  game.init();
  // Expose for debugging in dev console
  window._game = game;
});
