import { ArcRotateCamera, Engine, EngineOptions, Nullable, PhotoDome, Scene, Texture, Vector3 } from '@babylonjs/core';
import { SimplePanoType } from './type';
import { fadeInAnimation, fadeOutAnimation } from './animation';

export class SimplePano implements SimplePanoType {
  private engine: Engine;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private images: string[] = [];
  private buttonNavigates: any[] = [];
  private currentPhotoDome: PhotoDome | null = null;

  constructor(
    canvasOrContext: HTMLCanvasElement | OffscreenCanvas | WebGLRenderingContext | WebGL2RenderingContext,
    antialias: boolean = true,
    options?: EngineOptions | undefined,
    adaptToDeviceRatio?: boolean | undefined
  ) {
    this.engine = new Engine(canvasOrContext, antialias, { preserveDrawingBuffer: true, stencil: true, ...options }, adaptToDeviceRatio);
    this.canvas = this.engine.getRenderingCanvas()!;

    this.scene = this.createScene();
    this.camera = this.createCamera();
  }

  public setImages(images: string[]): void {
    this.images = images;
  }

  public getCanvas(): Nullable<HTMLCanvasElement | OffscreenCanvas> {
    return this.engine.getRenderingCanvas();
  }

  public getEngine(): Engine {
    return this.engine;
  }

  private createCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera('camera', Math.PI, Math.PI / 2, 20, Vector3.Zero(), this.scene);
    camera.attachControl(this.canvas, true);
    camera.inputs.attached.keyboard.detachControl();
    camera.angularSensibilityX = -camera.angularSensibilityX * 5;
    camera.angularSensibilityY = -camera.angularSensibilityY * 5;
    return camera;
  }

  private createScene(): Scene {
    const scene = new Scene(this.engine);

    return scene;
  }

  private setPhotoDome(image: string): PhotoDome {
    return new PhotoDome(
      'testdome',
      image,
      {
        resolution: 64,
        size: 1000,
      },
      this.scene
    );
  }

  public createButtonNavigation(id: string, inImage: string, toImage: string, position: Vector3): void {
    const buttonElement = document.createElement('div');
    buttonElement.id = id;
    buttonElement.style.position = 'absolute';
    buttonElement.style.width = '100px';
    buttonElement.style.height = '100px';
    buttonElement.style.cursor = 'pointer';
    buttonElement.style.display = 'none';
    buttonElement.style.transform = 'translate(-50%, -50%)';
    buttonElement.innerHTML = `<img src="/src/assets/arrow.png" />`;
    buttonElement.dataset.inImage = inImage;

    buttonElement.onclick = () => {
      this.changeImagePhotoDome(toImage);
      this.buttonNavigates.forEach((buttonNavigate) => {
        if (buttonNavigate.buttonElement.dataset.inImage === toImage) {
          buttonNavigate.buttonElement.style.display = 'block';
          buttonNavigate.buttonElement.dataset.isHide = 'false';
          return;
        }

        buttonNavigate.buttonElement.style.display = 'none';
        buttonNavigate.buttonElement.dataset.isHide = 'true';
      });
    };

    this.buttonNavigates.push({
      id,
      inImage,
      toImage,
      position,
      buttonElement,
    });

    document.body.appendChild(buttonElement);
  }

  private registerBeforeRender() {
    this.scene.registerBeforeRender(() => {
      this.buttonNavigates.forEach((buttonNavigate) => {
        const projectedPosition = Vector3.Project(
          buttonNavigate.position,
          this.camera.getViewMatrix(),
          this.camera.getProjectionMatrix(),
          this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
        );
        if (projectedPosition.z > 1 || buttonNavigate.buttonElement.dataset.isHide === 'true') {
          buttonNavigate.buttonElement.style.display = 'none';
          return;
        }

        buttonNavigate.buttonElement.style.display = 'block';
        buttonNavigate.buttonElement.style.left = `${projectedPosition.x}px`;
        buttonNavigate.buttonElement.style.top = `${projectedPosition.y}px`;
      });
    });
  }

  private changeImagePhotoDome(image: string) {
    this.transitionPhotoDome(image, this.currentPhotoDome!);
  }

  private transitionPhotoDome(image: string, photoDome: PhotoDome) {
    const anim = this.scene.beginDirectAnimation(photoDome.mesh, [fadeOutAnimation()], 0, 120, false);
    anim.onAnimationEnd = () => this.loadNewTexture(image, photoDome);
  }

  private loadNewTexture(image: string, photoDome: PhotoDome) {
    const newTexture = new Texture(image, this.scene);
    newTexture.onLoadObservable.add(() => {
      photoDome.dispose();

      // Create a new dome with the new texture
      const newPhotoDome = new PhotoDome(
        'sphere',
        image,
        {
          resolution: 64,
          size: 1000,
        },
        this.scene
      );

      this.scene.beginDirectAnimation(newPhotoDome.mesh, [fadeInAnimation()], 0, 120, false);
    });
  }

  public runRenderLoop(renderFunction?: () => void): void {
    if (this.images.length > 0) {
      this.currentPhotoDome = this.setPhotoDome(this.images[0]);
      this.registerBeforeRender();
    }

    this.engine.runRenderLoop(() => {
      this.scene.render();

      renderFunction && renderFunction();
    });
  }
}
