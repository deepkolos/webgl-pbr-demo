import { BackgroundRenderer } from './renderers/SkyBoxRenderer.js';
import { EquirectangularToCubeMapRenderer } from './renderers/EquirectangularToCubeRenderer.js';
import { GLTFRenderer } from './renderers/glTFRenderer.js';
import { loadGLTF } from './loaders/glTFLoader.js';
import { RGBELoader } from './loaders/RGBELoader.js';
import { Matrix4, normalize, Quaternion, toRad } from './math.js';
import { GLContext } from './GLContext.js';
import { IrradianceRenderer } from './renderers/irradianceRenderer.js';

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

/**
 * 加载gltf
 */
Promise.all([
  loadGLTF('./glTF/MetalRoughSpheres.gltf'),
  RGBELoader.load('./textures/equirectangular/pedestrian_overpass_1k.hdr'),
]).then(([gltf, hdrTexture]) => {
  const glTFRenderer = new GLTFRenderer(gltf, gl);

  function setViewport(w, h) {
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  setViewport(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio);
  const gltfProjection = new Matrix4().perspective(toRad(60), innerWidth / innerHeight, 1, 100);

  glTFRenderer.setProjection(gltfProjection);
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
  const irradianceMap = gl.createTexture();
  const OBS_HALF_FLOAT_EXT = gl.getExtension('OES_texture_half_float');
  const cubeProjection = new Matrix4().perspective(toRad(90), 1, 0.1, 10);

  function HDRToCubeMap() {
    const CubeRenderer = new EquirectangularToCubeMapRenderer(hdrTexture, gl);
    CubeRenderer.setProjection(cubeProjection);

    const cubeMatrix = new Matrix4();
    const cubePosition = [0, 0, 0];
    const cubeScale = [1, 1, 1];
    const cubeQuaternion = new Quaternion();
    cubeMatrix.compose(cubePosition, cubeQuaternion, cubeScale);

    const cubeFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, cubeFBO);
    gl.viewport(0, 0, 512, 512);

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
      [toRad(180), toRad(90), 0], // 右
      [toRad(180), toRad(-90), 0], // 左
      [toRad(-90), toRad(180), 0], // 上
      [toRad(90), toRad(180), 0], // 下
      [0, 0, toRad(180)], // 近
      [0, toRad(180), toRad(180)], // 远
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

  function PrefilterIrradiance() {
    const CubeRenderer = new IrradianceRenderer(cubeTexture, gl);
    CubeRenderer.setProjection(cubeProjection);

    const cubeMatrix = new Matrix4();
    const cubePosition = [0, 0, 0];
    const cubeScale = [1, 1, 1];
    const cubeQuaternion = new Quaternion();
    cubeMatrix.compose(cubePosition, cubeQuaternion, cubeScale);

    gl.viewport(0, 0, 32, 32);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, irradianceMap);
    for (let i = 0; i < 6; ++i) {
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        0,
        gl.RGBA,
        32,
        32,
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

    const captureFBO = gl.createFramebuffer();
    // const captureRBO = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, captureFBO);
    // gl.bindRenderbuffer(gl.RENDERBUFFER, captureRBO);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 32, 32);

    [
      [toRad(180), toRad(90), 0], // 右
      [toRad(180), toRad(-90), 0], // 左
      [toRad(-90), toRad(180), 0], // 上
      [toRad(90), toRad(180), 0], // 下
      [0, 0, toRad(180)], // 近
      [0, toRad(180), toRad(180)], // 远
    ].forEach((euler, i) => {
      cubeQuaternion.setFromEuler(euler);
      cubeMatrix.compose(cubePosition, cubeQuaternion, cubeScale);

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        irradianceMap,
        0,
      );
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      CubeRenderer.renderCube(cubeMatrix);
    });

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const skyboxRenderer = new BackgroundRenderer(irradianceMap, gl);
  skyboxRenderer.setProjection(gltfProjection);

  let rotateZ = 0;
  let startTime = performance.now();

  GLContext.states.setDepthTest(true);
  GLContext.states.setDepthFunc(gl.LEQUAL);
  HDRToCubeMap();
  PrefilterIrradiance();

  glTFRenderer.setIrradianceMap(irradianceMap);
  // glTFRenderer.setIrradianceMap(cubeTexture);

  const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    rotateZ += 0.004;

    modelQuaternion.setFromEuler([rotateZ * 0, rotateZ, rotateZ * 0]);
    modelMatrix.compose(modelPosition, modelQuaternion, modelScale);
    GLContext.states.setCullFace(true);
    glTFRenderer.renderScene(gltf.scene, modelMatrix);
    GLContext.states.setCullFace(false);
    // modelQuaternion.setFromEuler([0, 0, 0]);
    // modelMatrix.compose(modelPosition, modelQuaternion, modelScale);
    skyboxRenderer.renderCube(modelMatrix);

    // if (performance.now() - startTime < 10000)
    requestAnimationFrame(render);
  };

  render();
});
