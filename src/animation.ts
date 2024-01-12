import { Animation } from '@babylonjs/core';

export const fadeOutAnimation = (): Animation => {
  const fadeOutAnimation = new Animation(
    'fadeOut',
    'material.alpha',
    120,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  fadeOutAnimation.setKeys([
    { frame: 0, value: 1 },
    { frame: 120, value: 0 },
  ]);

  return fadeOutAnimation;
};

export const fadeInAnimation = (): Animation => {
  const fadeInAnimation = new Animation(
    'fadeIn',
    'material.alpha',
    120,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  fadeInAnimation.setKeys([
    { frame: 0, value: 0 },
    { frame: 120, value: 1 },
  ]);

  return fadeInAnimation;
};
