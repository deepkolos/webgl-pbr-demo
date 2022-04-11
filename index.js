import { GLTFRenderer } from './glTFRenderer.js';
import { loadGLTF } from './loader.js';
import { Matrix4, normalize, Quaternion } from './math.js';

/**
 * 创建canvas
 */
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');

document.body.append(canvas);

const ambientLightColor = [1, 1, 1];
const ambientLightIntensity = 0;
const directionalLightColor = [1, 1, 1];
const directionalLightIntensity = 5;
const directionalLightDirection = normalize([1, 5, 8]);
const metallicFactor = 1;
const roughnessFactor = 1;

/**
 * 加载gltf
 */
loadGLTF('./glTF/MetalRoughSpheres.gltf').then(gltf => {
  const glTFRenderer = new GLTFRenderer(gltf, gl);

  glTFRenderer.setProjection((60 * Math.PI) / 180, innerWidth / innerHeight, 1, 100);
  glTFRenderer.setViewport(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio);
  glTFRenderer.setAmbientLight(ambientLightColor, ambientLightIntensity);
  glTFRenderer.setDirectionalLight(
    directionalLightColor,
    directionalLightDirection,
    directionalLightIntensity,
  );
  glTFRenderer.setMetallicRoughness(metallicFactor, roughnessFactor);

  const cameraMatrix = new Matrix4();
  const cameraPosition = [0, 0, 0];
  const cameraScale = [1, 1, 1];
  const cameraQuaternion = new Quaternion();
  cameraMatrix.compose(cameraPosition, cameraQuaternion, cameraScale);

  glTFRenderer.setCameraMatrix(cameraMatrix);

  const modelMatrix = new Matrix4();
  const modelPosition = [0, 0, -15];
  const modelScale = [1, 1, 1];
  const modelQuaternion = new Quaternion();
  modelMatrix.compose(modelPosition, modelQuaternion, modelScale);

  let rotateZ = 0;
  const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    rotateZ += 0.002;
    modelQuaternion.setFromEuler([rotateZ, rotateZ, rotateZ]);
    modelMatrix.compose(modelPosition, modelQuaternion, modelScale);
    glTFRenderer.renderScene(gltf.scene, modelMatrix);
    requestAnimationFrame(render);
  };

  render();
});
