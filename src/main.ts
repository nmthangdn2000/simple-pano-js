import { Vector3 } from '@babylonjs/core';
import { SimplePano } from './simple-pano';
import './style.css';

const canvas = document.getElementById('renderCanvas')! as HTMLCanvasElement;
const images = [
  '/src/assets/low_quality_thumbnail.jpg',
  'https://images.unsplash.com/photo-1557971370-e7298ee473fb?q=80&w=2060&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.squarespace-cdn.com/content/v1/5568ec94e4b06c17240d5220/1443508568279-5KM5IBNCU4HDIQGMTCC3/ke17ZwdGBToddI8pDm48kBpzt4_K496Ao-aLooMTCTp7gQa3H78H3Y0txjaiv_0fDoOvxcdMmMKkDsyUqMSsMWxHk725yiiHCCLfrh8O1z4YTzHvnKhyp6Da-NYroOW3ZGjoBKy3azqku80C789l0plef_PmwB6-3GP4qDbCUv9cfxFbOETjyuzxeVcrr-Ci5fj66QIwtSm7rXFpMnU6ig/Homepage+LEI.jpg?format=2500w',
];

const simplePano = new SimplePano(canvas);
simplePano.setImages(images);

simplePano.createButtonNavigation('button1', images[0], images[1], new Vector3(0, 0, 500));
simplePano.createButtonNavigation('button2', images[1], images[2], new Vector3(0, 0, 500));
simplePano.createButtonNavigation('button3', images[2], images[0], new Vector3(0, 0, 500));

simplePano.runRenderLoop();
