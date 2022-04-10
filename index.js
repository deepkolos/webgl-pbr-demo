import { loadGLTF } from './loader.js';
import { Matrix4, normalize, Quaternion } from './math.js';

/**
 * 创建canvas
 */
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');

document.body.append(canvas);

/**
 * 创建shader
 */
const vertSource = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelToWorld;
uniform mat4 modelToView;
uniform mat4 projection;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

void main() {
  vec4 clip_position = projection * modelToView * vec4(position, 1.0);
  vec4 world_position = modelToWorld * vec4(position, 1.0);
  vec3 world_normal = mat3(modelToWorld) * normal;

  v_worldPosition = world_position.xyz;
  v_worldNormal = world_normal;
  v_uv = uv;
  gl_Position = clip_position;
}
`;
const fragSource = /* glsl */ `
precision mediump float;

uniform sampler2D baseColorTexture;
uniform sampler2D metallicRoughnessTexture;
uniform float metallicFactor;
uniform float roughnessFactor;

uniform vec3 ambientLightColor;
uniform float ambientLightIntensity;

uniform vec3 directionalLightColor;
uniform float directionalLightIntensity;
uniform vec3 directionalLightDirection;

uniform vec3 cameraWorldPosition;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

#define PI 3.1416

// Normal Distribution function --------------------------------------
float D_GGX(float dotNH, float roughness) {
	highp float alpha = roughness * roughness;
	highp float alpha2 = alpha * alpha;
	highp float denom = dotNH * dotNH * (alpha2 - 1.0) + 1.0;
	return (alpha2) / (PI * denom * denom);
}

// Geometric Shadowing function --------------------------------------
float G_SchlicksmithGGX(float dotNL, float dotNV, float roughness) {
	highp float r = (roughness + 1.0);
	highp float k = (r * r) / 8.0;
	highp float GL = dotNL / (dotNL * (1.0 - k) + k);
	highp float GV = dotNV / (dotNV * (1.0 - k) + k);
	return GL * GV;
}

// Fresnel function ----------------------------------------------------
vec3 F_Schlick(float cosTheta, vec3 F0) {
	return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
vec3 F_SchlickR(float cosTheta, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

// Specular and diffuse BRDF composition --------------------------------------------
vec3 BRDF(vec3 L, vec3 V, vec3 N, vec3 F0, float metallic, float roughness, vec3 baseColor) {
	// Precalculate vectors and dot products
	vec3 H = normalize(V + L);
	float dotNV = clamp(dot(N, V), 0.0, 1.0);
	float dotNL = clamp(dot(N, L), 0.0, 1.0);
	float dotLH = clamp(dot(L, H), 0.0, 1.0);
	float dotNH = clamp(dot(N, H), 0.0, 1.0);

	vec3 color = vec3(0.0);

	float rroughness = max(0.05, roughness);
	// D = Normal distribution (Distribution of the microfacets)
	float D = D_GGX(dotNH, roughness);
	// G = Geometric shadowing term (Microfacets shadowing)
	float G = G_SchlicksmithGGX(dotNL, dotNV, rroughness);
	// F = Fresnel factor (Reflectance depending on angle of incidence)
	vec3 F = F_Schlick(dotNV, F0);

	vec3 spec = D * F * G / (4.0 * dotNL * dotNV + 0.001);
	vec3 kD = (vec3(1.0) - F) * (1.0 - metallic);

	color += (kD * baseColor / PI + (1.0 - kD) * spec);

	return color;
}

vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

void main() {
  // vec3 baseColor = texture2D(baseColorTexture, v_uv).xyz;
  vec3 baseColor = sRGBToLinear(texture2D(baseColorTexture, v_uv)).xyz;
  vec4 metallicRoughnessColor = texture2D(metallicRoughnessTexture, v_uv);
  float metallic = metallicRoughnessColor.z * metallicFactor;
	float roughness = metallicRoughnessColor.y * roughnessFactor;

  vec3 F0 = mix(vec3(0.04, 0.04, 0.04), baseColor, metallic);

  vec3 N = normalize(v_worldNormal);
  vec3 V = normalize(cameraWorldPosition - v_worldPosition);
  vec3 R = reflect(-V, N);

	vec3 La = vec3(0.0, 0.0, 0.0);
	vec3 Lo = vec3(0.0, 0.0, 0.0);

  La = baseColor * ambientLightColor * ambientLightIntensity;

  vec3 L = normalize(directionalLightDirection);
  float NoL = min(dot(N, L), 1.0);
  vec3 En = directionalLightColor * directionalLightIntensity * NoL;
  Lo = BRDF(L, V, N, F0, metallic, roughness, baseColor) * En;


  // gl_FragColor = vec4(La + Lo, 1);
  gl_FragColor = LinearTosRGB(vec4(La + Lo, 1));
}
`;

const glProg = gl.createProgram();
const glVert = gl.createShader(gl.VERTEX_SHADER);
const glFrag = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(glVert, vertSource);
gl.shaderSource(glFrag, fragSource);
gl.compileShader(glVert);
gl.compileShader(glFrag);
if (!gl.getShaderParameter(glVert, gl.COMPILE_STATUS))
  console.error(
    gl.getShaderInfoLog(glVert),
    vertSource
      .split('\n')
      .map((v, k) => `${k}:${v}`)
      .join('\n'),
  );
if (!gl.getShaderParameter(glFrag, gl.COMPILE_STATUS))
  console.error(
    gl.getShaderInfoLog(glFrag),
    fragSource
      .split('\n')
      .map((v, k) => `${k}:${v}`)
      .join('\n'),
  );
gl.attachShader(glProg, glVert);
gl.attachShader(glProg, glFrag);
gl.linkProgram(glProg);
if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(glProg));
gl.useProgram(glProg);

/**
 * 设置shader参数
 */
const positionLoc = gl.getAttribLocation(glProg, 'position');
const normalLoc = gl.getAttribLocation(glProg, 'normal');
const uvLoc = gl.getAttribLocation(glProg, 'uv');

const baseColorTextureLoc = gl.getUniformLocation(glProg, 'baseColorTexture');
const metallicRoughnessTextureLoc = gl.getUniformLocation(glProg, 'metallicRoughnessTexture');
const metallicFactorLoc = gl.getUniformLocation(glProg, 'metallicFactor');
const roughnessFactorLoc = gl.getUniformLocation(glProg, 'roughnessFactor');
const ambientLightColorLoc = gl.getUniformLocation(glProg, 'ambientLightColor');
const ambientLightIntensityLoc = gl.getUniformLocation(glProg, 'ambientLightIntensity');
const directionalLightColorLoc = gl.getUniformLocation(glProg, 'directionalLightColor');
const directionalLightIntensityLoc = gl.getUniformLocation(glProg, 'directionalLightIntensity');
const directionalLightDirectionLoc = gl.getUniformLocation(glProg, 'directionalLightDirection');
const cameraWorldPositionLoc = gl.getUniformLocation(glProg, 'cameraWorldPosition');
const modelToWorldLoc = gl.getUniformLocation(glProg, 'modelToWorld');
const modelToViewLoc = gl.getUniformLocation(glProg, 'modelToView');
const projectionLoc = gl.getUniformLocation(glProg, 'projection');

const cameraWorldMatrixInvert = new Matrix4();

const ambientLightColor = [1, 1, 1];
const ambientLightIntensity = 0;
const directionalLightColor = [1, 1, 1];
const directionalLightIntensity = 5;
const directionalLightDirection = normalize([1, 5, 8]);
const cameraWorldPosition = [0, 0, 0]; // world space
const metallicFactor = 1;
const roughnessFactor = 1;

gl.uniform3fv(ambientLightColorLoc, ambientLightColor);
gl.uniform3fv(directionalLightColorLoc, directionalLightColor);
gl.uniform3fv(directionalLightDirectionLoc, directionalLightDirection);
gl.uniform3fv(cameraWorldPositionLoc, cameraWorldPosition);
gl.uniform1f(ambientLightIntensityLoc, ambientLightIntensity);
gl.uniform1f(directionalLightIntensityLoc, directionalLightIntensity);
gl.uniform1f(metallicFactorLoc, metallicFactor);
gl.uniform1f(roughnessFactorLoc, roughnessFactor);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

const projection = new Matrix4();
projection.perspective((60 * Math.PI) / 180, innerWidth / innerHeight, 1, 100);
gl.uniformMatrix4fv(projectionLoc, false, projection);

const modelMatrix = new Matrix4();
const modelPosition = [0, 0, -15];
const modelScale = [1, 1, 1];
const modelQuaternion = new Quaternion();
modelMatrix.compose(modelPosition, modelQuaternion, modelScale);

canvas.width = innerWidth * devicePixelRatio;
canvas.height = innerHeight * devicePixelRatio;
gl.viewport(0, 0, canvas.width, canvas.height);

/**
 * 加载gltf
 */
loadGLTF('./glTF/MetalRoughSpheres.gltf').then(gltf => {
  const glBufferCache = new Map();
  const glTextureCache = new Map();

  const WEBGL_TYPE_SIZES = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
  };
  const WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array,
  };
  const uploadTexture = textureIndex => {
    const textureDef = gltf.textures[textureIndex];
    const imageDef = gltf.images[textureDef.source];

    if (glTextureCache.has(textureIndex)) {
      const glTexture = glTextureCache.get(textureIndex);
      gl.bindTexture(gl.TEXTURE_2D, glTexture);
      return glTexture;
    }

    const glTexture = gl.createTexture();
    glTextureCache.set(textureIndex, glTexture);

    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageDef.el);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    return glTexture;
  };
  const uploadBuffer = bufferViewIndex => {
    const bufferViewDef = gltf.bufferViews[bufferViewIndex];
    const bufferDef = gltf.buffers[bufferViewDef.buffer];

    if (glBufferCache.has(bufferViewIndex)) {
      const glBuffer = glBufferCache.get(bufferViewIndex);
      gl.bindBuffer(bufferViewDef.target, glBuffer);
      return glBuffer;
    }

    const data = bufferDef.data.slice(
      bufferViewDef.byteOffset,
      bufferViewDef.byteOffset + bufferViewDef.byteLength,
    );

    const glBuffer = gl.createBuffer();
    glBufferCache.set(bufferViewIndex, glBuffer);

    gl.bindBuffer(bufferViewDef.target, glBuffer);
    gl.bufferData(bufferViewDef.target, data, gl.STATIC_DRAW);

    return glBuffer;
  };
  const uploadAttribute = (accessorIndex, attributeLocation) => {
    const accessorDef = gltf.accessors[accessorIndex];
    const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
    const byteStride =
      accessorDef.bufferView !== undefined
        ? gltf.bufferViews[accessorDef.bufferView].byteStride
        : undefined;

    uploadBuffer(accessorDef.bufferView);

    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(
      attributeLocation,
      itemSize,
      accessorDef.componentType,
      !!accessorDef.normalized,
      byteStride,
      accessorDef.byteOffset,
    );
  };
  const renderMesh = (meshIndex, meshWorldMatrix) => {
    const meshDef = gltf.meshes[meshIndex];

    const modelView = new Matrix4();
    modelView.multiplyMatrices(cameraWorldMatrixInvert, meshWorldMatrix);
    gl.uniformMatrix4fv(modelToViewLoc, false, modelView);
    gl.uniformMatrix4fv(modelToWorldLoc, false, meshWorldMatrix);

    for (let i = 0; i < meshDef.primitives.length; i++) {
      const primitiveDef = meshDef.primitives[i];
      const indciesAccessorDef = gltf.accessors[primitiveDef.indices];
      uploadBuffer(indciesAccessorDef.bufferView);
      uploadAttribute(primitiveDef.attributes['POSITION'], positionLoc);
      uploadAttribute(primitiveDef.attributes['TEXCOORD_0'], uvLoc);
      uploadAttribute(primitiveDef.attributes['NORMAL'], normalLoc);
      const materialDef = gltf.materials[primitiveDef.material];

      const baseColorTexture = uploadTexture(
        materialDef.pbrMetallicRoughness.baseColorTexture.index,
      );
      const metallicRoughnessTexture = uploadTexture(
        materialDef.pbrMetallicRoughness.metallicRoughnessTexture.index,
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, baseColorTexture);
      gl.uniform1i(baseColorTextureLoc, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, metallicRoughnessTexture);
      gl.uniform1i(metallicRoughnessTextureLoc, 1);

      gl.drawElements(
        primitiveDef.mode,
        indciesAccessorDef.count,
        indciesAccessorDef.componentType,
        indciesAccessorDef.byteOffset,
      );
    }
  };
  const renderNode = (nodeIndex, parentMatrix) => {
    const nodeDef = gltf.nodes[nodeIndex];
    const localMatrix = new Matrix4();
    const worldMatrix = new Matrix4();

    if (nodeDef.matrix) localMatrix.copyFrom(nodeDef.matrix);
    else {
      const { translation = [0, 0, 0], scale = [1, 1, 1], ratation = [0, 0, 0, 1] } = nodeDef;
      localMatrix.compose(translation, ratation, scale);
    }

    worldMatrix.multiplyMatrices(parentMatrix, localMatrix);

    if (nodeDef.mesh >= 0) renderMesh(nodeDef.mesh, worldMatrix);

    if (nodeDef.children)
      for (let i = 0; i < nodeDef.children.length; i++)
        renderNode(nodeDef.children[i], worldMatrix);
  };
  const renderScene = (sceneIndex, parentMatrix) => {
    const sceneDef = gltf.scenes[sceneIndex];
    for (let i = 0; i < sceneDef.nodes.length; i++) renderNode(sceneDef.nodes[i], parentMatrix);
  };
  let rotateZ = 0;
  const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    // rotateZ += 0.002;
    modelQuaternion.setFromEuler([rotateZ, rotateZ, rotateZ]);
    modelMatrix.compose(modelPosition, modelQuaternion, modelScale);
    renderScene(gltf.scene, modelMatrix);
    requestAnimationFrame(render);
  };

  render();
});
