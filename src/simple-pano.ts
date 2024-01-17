import {
  ArcRotateCamera,
  DynamicTexture,
  Engine,
  EngineOptions,
  ISize,
  Nullable,
  PhotoDome,
  Scene,
  Texture,
  Vector2,
  Vector3,
} from '@babylonjs/core';
import { ImagePanoAssets, SimplePanoType } from './type';
import { fadeInAnimation, fadeOutAnimation } from './animation';
import { tileImages } from './assets';

export class SimplePano implements SimplePanoType {
  private engine: Engine;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private imagePanoAssets: ImagePanoAssets[] = [];
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
    this.imagePanoAssets = images.map((image) => {
      return {
        lowQualityImage: image,
        tileImages: [],
      };
    });
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
    if (inImage === this.imagePanoAssets[0].lowQualityImage) {
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

  public async runRenderLoop(renderFunction?: () => void): Promise<void> {
    if (this.imagePanoAssets.length > 0) {
      this.currentPhotoDome = await this.setPhotoDome(this.imagePanoAssets[0].lowQualityImage);
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

  private async setPhotoDome(image: string): Promise<PhotoDome> {
    const photoDome = new PhotoDome(
      'photoDome',
      image,
      {
        resolution: 64,
        size: 1000,
        autoPlay: true,
        useDirectMapping: true,
      },
      this.scene
    );

    const sizeTexture = await this.getSizeTexturePhotoDome(photoDome);

    const dynamicTexture = new DynamicTexture('dynamic texture', sizeTexture, this.scene, false);

    const context = dynamicTexture.getContext();

    photoDome.material.diffuseTexture = dynamicTexture;

    const imageTest = new Image();
    imageTest.src = image;
    imageTest.onload = async () => {
      context.drawImage(imageTest, 0, 0, sizeTexture.width, sizeTexture.height);
      dynamicTexture.update(false);

      await this.lazyLoadImage(image, dynamicTexture, sizeTexture);
    };

    const debounceLazyLoadImage = this.debounce(async () => {
      await this.lazyLoadImage(image, dynamicTexture, sizeTexture);
    }, 50);

    this.camera.onViewMatrixChangedObservable.add(async () => {
      debounceLazyLoadImage();
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
      document.getElementById('fps')!.textContent = `${this.engine.getFps().toFixed()} fps`;
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

  private async lazyLoadImage(imageLowQuality: string, dynamicTexture: DynamicTexture, sizeTexturePhotoDome: ISize) {
    const context = dynamicTexture.getContext();

    const cutWidth = sizeTexturePhotoDome.width / 40;
    const cutHeight = sizeTexturePhotoDome.height / 40;

    const screenWidth = this.engine.getRenderWidth();
    const screenHeight = this.engine.getRenderHeight();

    function getPoint(screenX: number, screenY: number, scene: Scene) {
      const sizeTexturePhotoDomeVector = new Vector2(sizeTexturePhotoDome.width, sizeTexturePhotoDome.height);
      return scene.pick(screenX, screenY).getTextureCoordinates()?.multiply(sizeTexturePhotoDomeVector);
    }

    const tiles: Record<string, { x: number; y: number }> = {};

    function updateTiles(startPoint: Vector2, endPoint: Vector2) {
      const sumTileX = Math.ceil(Math.abs(startPoint.x - endPoint.x) / cutWidth);
      const sumTileY = Math.ceil(Math.abs(startPoint.y - endPoint.y) / cutHeight);

      const beginTileX = Math.floor(Math.min(startPoint.x, endPoint.x) / cutWidth);
      const beginTileY = Math.floor(Math.min(startPoint.y, endPoint.y) / cutHeight);

      for (let x = 0; x < sumTileX; ++x) {
        for (let y = 0; y < sumTileY; ++y) {
          const tileX = (beginTileX + x + 40) % 40;
          const tileY = (beginTileY + y + 40) % 40;

          tiles[`${tileX}_${tileY}`] = { x: tileX, y: tileY };
        }
      }
    }

    const center = getPoint(screenWidth / 2, screenHeight / 2, this.scene);

    const steps = 30 + Math.round((Math.abs(this.camera.beta - Math.PI / 2) / (Math.PI / 2)) * 30);

    for (let stepX = 0; stepX <= steps; ++stepX) {
      for (let stepY = 0; stepY <= steps; ++stepY) {
        const point = getPoint((screenWidth / steps) * stepX, (screenHeight / steps) * stepY, this.scene);
        updateTiles(point!, center!);
      }
    }

    console.log(tiles); // Qua choan nan

    Object.keys(tiles).forEach((key) => {
      const { x, y } = tiles[key];

      // imageAbc.src = `${imageLowQuality.split('.')[0]}/${_tileX}_${_tileY}.jpg`;
      const url = `/src/assets/tile/cut_${y + 1}_${x + 1}.png`;
      if (this.imagePanoAssets[0].tileImages.includes(url)) return;
      const imageAbc = new Image();
      imageAbc.src = url;
      imageAbc.onload = () => {
        // console.log('load image', url);

        this.imagePanoAssets[0].tileImages.push(url);

        //Add image to dynamic texture
        context.drawImage(imageAbc, x * cutWidth, y * cutHeight, cutWidth, cutHeight);
        dynamicTexture.update(false);
      };
    });
  }

  private async getSizeTexturePhotoDome(photoDome: PhotoDome): Promise<ISize> {
    return new Promise((resolve: (iSize: ISize) => void) => {
      photoDome.texture.onLoadObservable.add(() => {
        resolve(photoDome.texture.getSize());
      });
    });
  }

  private debounce<F extends (...args: any[]) => any>(func: F, delay: number) {
    let timerId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<F>) => {
      if (timerId) {
        clearTimeout(timerId);
      }

      timerId = setTimeout(() => {
        func.apply(this, args);
        timerId = null!;
      }, delay);
    };
  }
}
