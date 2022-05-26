import { GLContext } from '../GLContext.js';
import { GLShader } from '../GLShader.js';
import { GLTextures } from '../GLTextures.js';
import { Matrix4 } from '../math.js';
import { fragSource } from '../shaders/irradiance.frag.js';
import { vertSource } from '../shaders/irradiance.vert.js';
import { cubeVertices } from './EquirectangularToCubeRenderer.js';

export class IrradianceRenderer {
  /**
   * @param {WebGLTexture} cubeTexture
   */
  constructor(cubeTexture) {
    this.gl = GLContext.gl;
    this.cubeTexture = cubeTexture;
    this.cubeShader = new GLShader(vertSource, fragSource);
    this.initCube();
  }

  initCube() {
    const { gl, cubeTexture } = this;
    const glCubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glCubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices.buffer, gl.STATIC_DRAW);
    this.glCubeBuffer = glCubeBuffer;
    this.glCubeTexture = cubeTexture;
  }

  setProjection(projection) {
    this.cubeShader.setUniform('projection', projection);
  }

  renderCube(modelToView) {
    const { gl, glCubeTexture, cubeShader, glCubeBuffer } = this;
    GLTextures.reset();
    cubeShader.use();
    cubeShader.setAttribute('position', {
      size: 3,
      type: gl.FLOAT,
      normalized: false,
      stride: 8 * 4,
      offset: 0,
      buffer: glCubeBuffer,
    });
    cubeShader.setUniform('modelToView', modelToView);
    cubeShader.setUniform('environmentMap', glCubeTexture);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
