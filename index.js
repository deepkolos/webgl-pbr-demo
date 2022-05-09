import { BackgroundRenderer } from './renderers/SkyBoxRenderer.js';
import { EquirectangularToCubeMapRenderer } from './renderers/EquirectangularToCubeRenderer.js';
import { GLTFRenderer } from './renderers/glTFRenderer.js';
import { loadGLTF } from './loaders/glTFLoader.js';
import { RGBELoader } from './loaders/RGBELoader.js';
import { Matrix4, normalize, Quaternion, toRad } from './math.js';
import { GLContext } from './GLContext.js';
import { GLTextures } from './GLTextures.js';

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

GLContext.init(gl);
GLTextures.init(gl);

/**
 * 加载gltf
 */
Promise.all([
  loadGLTF('./glTF/MetalRoughSpheres.gltf'),
  RGBELoader.load('./textures/equirectangular/pedestrian_overpass_1k.hdr'),
]).then(([gltf, texture]) => {
  const glTFRenderer = new GLTFRenderer(gltf, gl);

  glTFRenderer.setProjection(toRad(60), innerWidth / innerHeight, 1, 100);
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

  const cubeTexture = gl.createTexture();

  {
    const CubeRenderer = new EquirectangularToCubeMapRenderer(texture, gl);
    CubeRenderer.setProjection(toRad(90), 1, 0.9, 10);

    const cubeMatrix = new Matrix4();
    const cubePosition = [0, 0, -2];
    const cubeScale = [1, 1, 1];
    const cubeQuaternion = new Quaternion();
    cubeMatrix.compose(cubePosition, cubeQuaternion, cubeScale);

    const cubeFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, cubeFBO);
    gl.viewport(0, 0, 512, 512);
    const OBS_HALF_FLOAT_EXT = gl.getExtension('OES_texture_half_float');

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    for (let i = 0; i < 6; ++i) {
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        0,
        gl.RGBA,
        512,
        512,
        0,
        gl.RGBA,
        OBS_HALF_FLOAT_EXT.HALF_FLOAT_OES,
        null,
      );
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    [
      [0, toRad(-90), 0], // 右
      [0, toRad(90), 0], // 左
      [toRad(-90), 0, 0], // 上
      [toRad(90), 0, 0], // 下
      [0, 0, 0], // 近
      [0, toRad(180), 0], // 远
    ].forEach((euler, i) => {
      cubeQuaternion.setFromEuler(euler);
      cubeMatrix.compose(cubePosition, cubeQuaternion, cubeScale);

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        cubeTexture,
        0,
      );
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      CubeRenderer.renderCube(cubeMatrix);
    });

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const bgRenderer = new BackgroundRenderer(cubeTexture, gl);
  bgRenderer.setProjection(toRad(60), innerWidth / innerHeight, 1, 100);

  let rotateZ = 0;
  // gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    rotateZ += 0.002;
    modelQuaternion.setFromEuler([rotateZ, rotateZ, rotateZ]);
    modelMatrix.compose(modelPosition, modelQuaternion, modelScale);
    glTFRenderer.renderScene(gltf.scene, modelMatrix);
    // gl.disable(gl.CULL_FACE);
    // gl.disable(gl.DEPTH_TEST);
    bgRenderer.renderCube(modelMatrix);
    // gl.enable(gl.CULL_FACE);
    // gl.enable(gl.DEPTH_TEST);

    requestAnimationFrame(render);
  };

  render();
});

/**
 * 加载HDR
 */
