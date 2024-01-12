import { EngineOptions } from '@babylonjs/core';

export type SimplePanoType = {
  /**
   * Get the canvas DOM element
   * @returns the canvas DOM element
   **/
  getCanvas(): HTMLCanvasElement | OffscreenCanvas | null;

  /**
   * Get the engine
   * @returns the engine
   */
  getEngine(): Engine;

  /**
   * Run a render loop
   * Description: Launch a render loop
   */
  runRenderLoop(renderFunction: () => void): void;
};
