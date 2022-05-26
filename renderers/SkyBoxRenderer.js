import { cubeVertices } from './EquirectangularToCubeRenderer.js';
import { Matrix4 } from '../math.js';
import { vertSource } from '../shaders/skybox.vert.js';
import { fragSource } from '../shaders/SkyBox.frag.js';
import { GLShader } from '../GLShader.js';
import { GLTextures } from '../GLTextures.js';
import { GLContext } from '../GLContext.js';

export class BackgroundRenderer {
  /**
   * @param {WebGLTexture} texture
   */
  constructor(cubeTexture) {
    this.cubeTexture = cubeTexture;
    this.skyBoxShader = new GLShader(vertSource, fragSource);
    this.initCube();
  }

  initCube() {
    const gl = GLContext.gl;
    const glCubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glCubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices.buffer, gl.STATIC_DRAW);
    this.glCubeBuffer = glCubeBuffer;
  }

  setProjection(projection) {
    this.skyBoxShader.setUniform('projection', projection);
  }

  renderCube(modelToView) {
    const { cubeTexture, glCubeBuffer } = this;
    const gl = GLContext.gl;

    GLTextures.reset();
    this.skyBoxShader.use();
    this.skyBoxShader.setAttribute('position', {
      size: 3,
      type: gl.FLOAT,
      normalized: false,
      stride: 8 * 4,
      offset: 0,
      buffer: glCubeBuffer,
    });
    this.skyBoxShader.setUniform('modelToView', modelToView);
    this.skyBoxShader.setUniform('environmentMap', cubeTexture);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
