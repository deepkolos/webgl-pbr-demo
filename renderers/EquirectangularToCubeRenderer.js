import { GLContext } from '../GLContext.js';
import { GLShader } from '../GLShader.js';
import { GLTextures } from '../GLTextures.js';
import { Matrix4 } from '../math.js';
import { fragSource } from '../shaders/EquirectanglurToCube.frag.js';
import { vertSource } from '../shaders/EquirectanglurToCube.vert.js';

export class EquirectangularToCubeMapRenderer {
  /**
   * @param {*} HDRTexture
   */
  constructor(HDRTexture) {
    this.gl = GLContext.gl;
    this.HDRTexture = HDRTexture;
    this.cubeShader = new GLShader(vertSource, fragSource);
    this.initCube();
  }

  initCube() {
    const { gl, HDRTexture } = this;
    const glCubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glCubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices.buffer, gl.STATIC_DRAW);
    this.glCubeBuffer = glCubeBuffer;

    const OBS_HALF_FLOAT_EXT = gl.getExtension('OES_texture_half_float');
    gl.getExtension('OES_texture_half_float_linear');

    const glCubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glCubeTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      HDRTexture.width,
      HDRTexture.height,
      0,
      gl.RGBA,
      OBS_HALF_FLOAT_EXT.HALF_FLOAT_OES,
      HDRTexture.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this.glCubeTexture = glCubeTexture;
  }

  setProjection(fov, aspect, near, far) {
    const projection = new Matrix4();
    projection.perspective(fov, aspect, near, far);
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
    cubeShader.setUniform('equirectangularMap', glCubeTexture);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

// prettier-ignore
export const cubeVertices = new Float32Array([
  // position(3)    normal(3)        uv(2)
  // back face
 -1.0, -1.0, -1.0,  0.0,  0.0, -1.0, 0.0, 0.0, // bottom-left
  1.0,  1.0, -1.0,  0.0,  0.0, -1.0, 1.0, 1.0, // top-right
  1.0, -1.0, -1.0,  0.0,  0.0, -1.0, 1.0, 0.0, // bottom-right         
  1.0,  1.0, -1.0,  0.0,  0.0, -1.0, 1.0, 1.0, // top-right
 -1.0, -1.0, -1.0,  0.0,  0.0, -1.0, 0.0, 0.0, // bottom-left
 -1.0,  1.0, -1.0,  0.0,  0.0, -1.0, 0.0, 1.0, // top-left
 // front face
 -1.0, -1.0,  1.0,  0.0,  0.0,  1.0, 0.0, 0.0, // bottom-left
  1.0, -1.0,  1.0,  0.0,  0.0,  1.0, 1.0, 0.0, // bottom-right
  1.0,  1.0,  1.0,  0.0,  0.0,  1.0, 1.0, 1.0, // top-right
  1.0,  1.0,  1.0,  0.0,  0.0,  1.0, 1.0, 1.0, // top-right
 -1.0,  1.0,  1.0,  0.0,  0.0,  1.0, 0.0, 1.0, // top-left
 -1.0, -1.0,  1.0,  0.0,  0.0,  1.0, 0.0, 0.0, // bottom-left
 // left face
 -1.0,  1.0,  1.0, -1.0,  0.0,  0.0, 1.0, 0.0, // top-right
 -1.0,  1.0, -1.0, -1.0,  0.0,  0.0, 1.0, 1.0, // top-left
 -1.0, -1.0, -1.0, -1.0,  0.0,  0.0, 0.0, 1.0, // bottom-left
 -1.0, -1.0, -1.0, -1.0,  0.0,  0.0, 0.0, 1.0, // bottom-left
 -1.0, -1.0,  1.0, -1.0,  0.0,  0.0, 0.0, 0.0, // bottom-right
 -1.0,  1.0,  1.0, -1.0,  0.0,  0.0, 1.0, 0.0, // top-right
 // right face
  1.0,  1.0,  1.0,  1.0,  0.0,  0.0, 1.0, 0.0, // top-left
  1.0, -1.0, -1.0,  1.0,  0.0,  0.0, 0.0, 1.0, // bottom-right
  1.0,  1.0, -1.0,  1.0,  0.0,  0.0, 1.0, 1.0, // top-right         
  1.0, -1.0, -1.0,  1.0,  0.0,  0.0, 0.0, 1.0, // bottom-right
  1.0,  1.0,  1.0,  1.0,  0.0,  0.0, 1.0, 0.0, // top-left
  1.0, -1.0,  1.0,  1.0,  0.0,  0.0, 0.0, 0.0, // bottom-left     
 // bottom face
 -1.0, -1.0, -1.0,  0.0, -1.0,  0.0, 0.0, 1.0, // top-right
  1.0, -1.0, -1.0,  0.0, -1.0,  0.0, 1.0, 1.0, // top-left
  1.0, -1.0,  1.0,  0.0, -1.0,  0.0, 1.0, 0.0, // bottom-left
  1.0, -1.0,  1.0,  0.0, -1.0,  0.0, 1.0, 0.0, // bottom-left
 -1.0, -1.0,  1.0,  0.0, -1.0,  0.0, 0.0, 0.0, // bottom-right
 -1.0, -1.0, -1.0,  0.0, -1.0,  0.0, 0.0, 1.0, // top-right
 // top face
 -1.0,  1.0, -1.0,  0.0,  1.0,  0.0, 0.0, 1.0, // top-left
  1.0,  1.0,  1.0,  0.0,  1.0,  0.0, 1.0, 0.0, // bottom-right
  1.0,  1.0, -1.0,  0.0,  1.0,  0.0, 1.0, 1.0, // top-right     
  1.0,  1.0,  1.0,  0.0,  1.0,  0.0, 1.0, 0.0, // bottom-right
 -1.0,  1.0, -1.0,  0.0,  1.0,  0.0, 0.0, 1.0, // top-left
 -1.0,  1.0,  1.0,  0.0,  1.0,  0.0, 0.0, 0.0  // bottom-left
]);
