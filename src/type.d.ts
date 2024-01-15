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

  /**
   * Set the images panorama
   * @param images
   */
  setImages(images: string[]): void;

  /**
   * Create button navigation
   * @param id
   * @param inImage
   * @param toImage
   * @param position
   */
  createButtonNavigation(id: string, inImage: string, toImage: string, position: Vector3): void;
};
