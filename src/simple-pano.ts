import { ArcRotateCamera, DynamicTexture, Engine, EngineOptions, Nullable, PhotoDome, Scene, Texture, Vector3 } from '@babylonjs/core';
import { SimplePanoType } from './type';
import { fadeInAnimation, fadeOutAnimation } from './animation';
import { tileImages } from './assets';

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

    this.initStyle();

    this.scene = this.createScene();
    this.camera = this.createCamera();
  }

  // public methods

  public setImages(images: string[]): void {
    this.images = images;
  }

  public getCanvas(): Nullable<HTMLCanvasElement | OffscreenCanvas> {
    return this.engine.getRenderingCanvas();
  }

  public getEngine(): Engine {
    return this.engine;
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

    // show first button
    if (inImage === this.images[0]) {
      buttonElement.style.display = 'block';
      buttonElement.dataset.isHide = 'false';
    } else {
      buttonElement.style.display = 'none';
      buttonElement.dataset.isHide = 'true';
    }

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

  // private methods

  private initStyle() {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
  }

  private createCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera('camera', Math.PI, Math.PI / 2, 2000, Vector3.Zero(), this.scene);
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
    const photoDome = new PhotoDome(
      'testdome',
      image,
      {
        resolution: 64,
        size: 1000,
        autoPlay: true,
        useDirectMapping: true,
      },
      this.scene
    );

    const dynamicTexture = new DynamicTexture('dynamic texture', { width: 8000, height: 4000 }, this.scene, false);

    const context = dynamicTexture.getContext();

    photoDome.material.diffuseTexture = dynamicTexture;

    const imageTest = new Image();
    imageTest.src = image;
    imageTest.onload = function () {
      //Add image to dynamic texture
      context.drawImage(this, 0, 0, 8000, 4000, 0, 0, 8000, 4000);
      dynamicTexture.update(false);
    };

    const cutFiles = tileImages.map((url) => {
      const [_, row, col] = url.match(/cut_(\d+)_(\d+)\.png/) as string[];
      return {
        row,
        col,
        url,
      };
    });

    const cutWidth = 8000 / 40;
    const cutHeight = 4000 / 40;

    cutFiles.forEach((cutFile: any, index: number) => {
      setTimeout(() => {
        const imageAbc = new Image();
        imageAbc.src = cutFile.url;
        imageAbc.onload = function () {
          console.log('load image');

          //Add image to dynamic texture
          context.drawImage(this, (Number(cutFile.col) - 1) * cutWidth, (Number(cutFile.row) - 1) * cutHeight, cutWidth, cutHeight);
          dynamicTexture.update(false);
        };
      }, 10 * index);
    });

    return photoDome;
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
    const newTexture = new Texture(image, this.scene, { invertY: false });
    newTexture.onLoadObservable.add(() => {
      photoDome.texture = newTexture;

      this.scene.beginDirectAnimation(photoDome.mesh, [fadeInAnimation()], 0, 120, false);
    });
  }
}
