import { Matrix4 } from './math.js';
import { vertSource } from './PBR.vert.js';
import { fragSource } from './PBR.frag.js';

const WEBGL_TYPE_SIZES = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export class GLTFRenderer {
  glBufferCache = new Map();
  glTextureCache = new Map();

  /**
   * @param {*} gltf
   * @param {WebGLRenderingContext} gl
   */
  constructor(gltf, gl) {
    this.gltf = gltf;
    this.gl = gl;
    this.compileShader();
    this.initUniformLocation();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  compileShader() {
    const { gl } = this;
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
    if (!gl.getProgramParameter(glProg, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(glProg));
    gl.useProgram(glProg);

    gl.deleteShader(glVert);
    gl.deleteShader(glFrag);

    this.glProg = glProg;
  }

  initUniformLocation() {
    const { gl, glProg } = this;
    this.positionLoc = gl.getAttribLocation(glProg, 'position');
    this.normalLoc = gl.getAttribLocation(glProg, 'normal');
    this.uvLoc = gl.getAttribLocation(glProg, 'uv');

    this.baseColorTextureLoc = gl.getUniformLocation(glProg, 'baseColorTexture');
    this.metallicRoughnessTextureLoc = gl.getUniformLocation(glProg, 'metallicRoughnessTexture');
    this.metallicFactorLoc = gl.getUniformLocation(glProg, 'metallicFactor');
    this.roughnessFactorLoc = gl.getUniformLocation(glProg, 'roughnessFactor');
    this.ambientLightColorLoc = gl.getUniformLocation(glProg, 'ambientLightColor');
    this.ambientLightIntensityLoc = gl.getUniformLocation(glProg, 'ambientLightIntensity');
    this.directionalLightColorLoc = gl.getUniformLocation(glProg, 'directionalLightColor');
    this.directionalLightIntensityLoc = gl.getUniformLocation(glProg, 'directionalLightIntensity');
    this.directionalLightDirectionLoc = gl.getUniformLocation(glProg, 'directionalLightDirection');
    this.cameraWorldPositionLoc = gl.getUniformLocation(glProg, 'cameraWorldPosition');
    this.modelToWorldLoc = gl.getUniformLocation(glProg, 'modelToWorld');
    this.modelToViewLoc = gl.getUniformLocation(glProg, 'modelToView');
    this.projectionLoc = gl.getUniformLocation(glProg, 'projection');
  }

  setProjection(fov, aspect, near, far) {
    const projection = new Matrix4();
    projection.perspective(fov, aspect, near, far);
    this.gl.uniformMatrix4fv(this.projectionLoc, false, projection);
  }

  setAmbientLight(ambientLightColor, ambientLightIntensity) {
    const { gl, ambientLightColorLoc, ambientLightIntensityLoc } = this;
    gl.uniform3fv(ambientLightColorLoc, ambientLightColor);
    gl.uniform1f(ambientLightIntensityLoc, ambientLightIntensity);
  }

  setDirectionalLight(directionalLightColor, directionalLightDirection, directionalLightIntensity) {
    this.gl.uniform3fv(this.directionalLightColorLoc, directionalLightColor);
    this.gl.uniform3fv(this.directionalLightDirectionLoc, directionalLightDirection);
    this.gl.uniform1f(this.directionalLightIntensityLoc, directionalLightIntensity);
  }

  setViewport(w, h) {
    const { gl } = this;
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  setMetallicRoughness(metallicFactor, roughnessFactor) {
    this.gl.uniform1f(this.metallicFactorLoc, metallicFactor);
    this.gl.uniform1f(this.roughnessFactorLoc, roughnessFactor);
  }

  /**
   * @param {Matrix4} matrix
   */
  setCameraMatrix(matrix) {
    this.cameraWorldMatrixInvert = new Matrix4().copyFrom(matrix).invert();
    const cameraWorldPosition = [matrix[12], matrix[13], matrix[14]];
    this.gl.uniform3fv(this.cameraWorldPositionLoc, cameraWorldPosition);
  }

  uploadTexture(textureIndex) {
    const { gltf, gl, glTextureCache } = this;
    const textureDef = gltf.textures[textureIndex];
    const imageDef = gltf.images[textureDef.source];
    const samplerDef = gltf.samplers[textureDef.sampler];
    const {
      magFilter = gl.NEAREST,
      minFilter = gl.NEAREST,
      wrapS = gl.REPEAT,
      wrapT = gl.REPEAT,
    } = samplerDef;

    if (glTextureCache.has(textureIndex)) {
      const glTexture = glTextureCache.get(textureIndex);
      gl.bindTexture(gl.TEXTURE_2D, glTexture);
      return glTexture;
    }

    const glTexture = gl.createTexture();
    glTextureCache.set(textureIndex, glTexture);

    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageDef.el);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

    // TODO texture不是2的幂次方在webgl1的报错
    gl.generateMipmap(gl.TEXTURE_2D);

    return glTexture;
  }
  uploadBuffer(bufferViewIndex) {
    const { gltf, gl, glBufferCache } = this;

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
  }
  uploadAttribute(accessorIndex, attributeLocation) {
    const { gltf, gl } = this;
    const accessorDef = gltf.accessors[accessorIndex];
    const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
    const byteStride =
      accessorDef.bufferView !== undefined
        ? gltf.bufferViews[accessorDef.bufferView].byteStride
        : undefined;

    this.uploadBuffer(accessorDef.bufferView);

    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(
      attributeLocation,
      itemSize,
      accessorDef.componentType,
      !!accessorDef.normalized,
      byteStride,
      accessorDef.byteOffset,
    );
  }
  renderMesh(meshIndex, meshWorldMatrix) {
    const { gltf, gl, modelToViewLoc, modelToWorldLoc, positionLoc, uvLoc, normalLoc } = this;
    const meshDef = gltf.meshes[meshIndex];

    const modelView = new Matrix4();
    modelView.multiplyMatrices(this.cameraWorldMatrixInvert, meshWorldMatrix);
    gl.uniformMatrix4fv(modelToViewLoc, false, modelView);
    gl.uniformMatrix4fv(modelToWorldLoc, false, meshWorldMatrix);

    for (let i = 0; i < meshDef.primitives.length; i++) {
      const primitiveDef = meshDef.primitives[i];
      const indciesAccessorDef = gltf.accessors[primitiveDef.indices];
      this.uploadBuffer(indciesAccessorDef.bufferView);
      this.uploadAttribute(primitiveDef.attributes['POSITION'], positionLoc);
      this.uploadAttribute(primitiveDef.attributes['TEXCOORD_0'], uvLoc);
      this.uploadAttribute(primitiveDef.attributes['NORMAL'], normalLoc);
      const materialDef = gltf.materials[primitiveDef.material];

      const baseColorTexture = this.uploadTexture(
        materialDef.pbrMetallicRoughness.baseColorTexture.index,
      );
      const metallicRoughnessTexture = this.uploadTexture(
        materialDef.pbrMetallicRoughness.metallicRoughnessTexture.index,
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, baseColorTexture);
      gl.uniform1i(this.baseColorTextureLoc, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, metallicRoughnessTexture);
      gl.uniform1i(this.metallicRoughnessTextureLoc, 1);

      gl.drawElements(
        primitiveDef.mode,
        indciesAccessorDef.count,
        indciesAccessorDef.componentType,
        indciesAccessorDef.byteOffset,
      );
    }
  }
  renderNode(nodeIndex, parentMatrix) {
    const { gltf, gl } = this;
    const nodeDef = gltf.nodes[nodeIndex];
    const localMatrix = new Matrix4();
    const worldMatrix = new Matrix4();

    if (nodeDef.matrix) localMatrix.copyFrom(nodeDef.matrix);
    else {
      const { translation = [0, 0, 0], scale = [1, 1, 1], ratation = [0, 0, 0, 1] } = nodeDef;
      localMatrix.compose(translation, ratation, scale);
    }

    worldMatrix.multiplyMatrices(parentMatrix, localMatrix);

    if (nodeDef.mesh >= 0) this.renderMesh(nodeDef.mesh, worldMatrix);

    if (nodeDef.children)
      for (let i = 0; i < nodeDef.children.length; i++)
        this.renderNode(nodeDef.children[i], worldMatrix);
  }
  renderScene(sceneIndex, parentMatrix) {
    const { gltf, gl } = this;
    const sceneDef = gltf.scenes[sceneIndex];
    for (let i = 0; i < sceneDef.nodes.length; i++)
      this.renderNode(sceneDef.nodes[i], parentMatrix);
  }
}
