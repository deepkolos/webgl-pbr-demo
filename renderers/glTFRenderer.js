import { Matrix4 } from '../math.js';
import { vertSource } from '../shaders/PBR.vert.js';
import { fragSource } from '../shaders/PBR.frag.js';
import { GLContext } from '../GLContext.js';
import { GLShader } from '../GLShader.js';
import { GLTextures } from '../GLTextures.js';

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
   */
  constructor(gltf) {
    this.gltf = gltf;
    this.gl = GLContext.gl;
    this.PBRShader = new GLShader(vertSource, fragSource);
  }

  setProjection(fov, aspect, near, far) {
    const projection = new Matrix4();
    projection.perspective(fov, aspect, near, far);
    this.PBRShader.setUniform('projection', projection);
  }

  setAmbientLight(ambientLightColor, ambientLightIntensity) {
    this.PBRShader.setUniform('ambientLightColor', ambientLightColor);
    this.PBRShader.setUniform('ambientLightIntensity', ambientLightIntensity);
  }

  setDirectionalLight(directionalLightColor, directionalLightDirection, directionalLightIntensity) {
    this.PBRShader.setUniform('directionalLightIntensity', directionalLightIntensity);
    this.PBRShader.setUniform('directionalLightDirection', directionalLightDirection);
    this.PBRShader.setUniform('directionalLightColor', directionalLightColor);
  }

  setMetallicRoughness(metallicFactor, roughnessFactor) {
    this.PBRShader.setUniform('roughnessFactor', roughnessFactor);
    this.PBRShader.setUniform('metallicFactor', metallicFactor);
  }

  /**
   * @param {Matrix4} matrix
   */
  setCameraMatrix(matrix) {
    this.cameraWorldMatrixInvert = new Matrix4().copyFrom(matrix).invert();
    const cameraWorldPosition = [matrix[12], matrix[13], matrix[14]];
    this.PBRShader.setUniform('cameraWorldPosition', cameraWorldPosition);
  }

  setViewport(w, h) {
    const { gl } = this;
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  uploadTexture(textureIndex, uniformName) {
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
      // this.PBRShader.setUniform(uniformName, glTexture);
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

    // this.PBRShader.setUniform(uniformName, glTexture);

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
  uploadAttribute(accessorIndex, attributeName) {
    const { gltf } = this;
    const accessorDef = gltf.accessors[accessorIndex];
    const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
    const byteStride =
      accessorDef.bufferView !== undefined
        ? gltf.bufferViews[accessorDef.bufferView].byteStride
        : undefined;

    const glBuffer = this.uploadBuffer(accessorDef.bufferView);

    this.PBRShader.setAttribute(attributeName, {
      size: itemSize,
      type: accessorDef.componentType,
      normalized: !!accessorDef.normalized,
      stride: byteStride,
      offset: accessorDef.byteOffset,
      buffer: glBuffer,
    });
  }
  renderMesh(meshIndex, meshWorldMatrix) {
    const { gltf, gl } = this;
    const meshDef = gltf.meshes[meshIndex];

    const modelView = new Matrix4();
    modelView.multiplyMatrices(this.cameraWorldMatrixInvert, meshWorldMatrix);
    this.PBRShader.setUniform('modelToView', modelView);
    this.PBRShader.setUniform('modelToWorld', meshWorldMatrix);

    for (let i = 0; i < meshDef.primitives.length; i++) {
      const primitiveDef = meshDef.primitives[i];
      const indciesAccessorDef = gltf.accessors[primitiveDef.indices];
      this.uploadBuffer(indciesAccessorDef.bufferView);
      this.uploadAttribute(primitiveDef.attributes['POSITION'], 'position');
      this.uploadAttribute(primitiveDef.attributes['TEXCOORD_0'], 'uv');
      this.uploadAttribute(primitiveDef.attributes['NORMAL'], 'normal');
      const materialDef = gltf.materials[primitiveDef.material];

      GLTextures.reset();
      const baseColorTexture = this.uploadTexture(
        materialDef.pbrMetallicRoughness.baseColorTexture.index,
        'baseColorTexture',
      );
      const metallicRoughnessTexture = this.uploadTexture(
        materialDef.pbrMetallicRoughness.metallicRoughnessTexture.index,
        'metallicRoughnessTexture',
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, baseColorTexture);
      gl.uniform1i(this.PBRShader.uniformInfo.baseColorTexture.location, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, metallicRoughnessTexture);
      gl.uniform1i(this.PBRShader.uniformInfo.metallicRoughnessTexture.location, 1);

      gl.drawElements(
        primitiveDef.mode,
        indciesAccessorDef.count,
        indciesAccessorDef.componentType,
        indciesAccessorDef.byteOffset,
      );
    }
  }
  renderNode(nodeIndex, parentMatrix) {
    const { gltf } = this;
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
    const { gltf } = this;
    this.PBRShader.use();
    const sceneDef = gltf.scenes[sceneIndex];
    for (let i = 0; i < sceneDef.nodes.length; i++)
      this.renderNode(sceneDef.nodes[i], parentMatrix);
  }
}
