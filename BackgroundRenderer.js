import { cubeVertices } from './EquirectangularToCubeMapRenderer.js';
import { Matrix4 } from './math.js';

const vertSource = /* glsl */ `
attribute vec3 position;

uniform mat4 projection;
uniform mat4 modelToView;

varying vec3 v_localPosition;

void main() {
  v_localPosition = position;  
  mat4 modelToViewRot = mat4(mat3(modelToView));
	// vec4 clipPos = projection * modelToViewRot * vec4(position, 1.0);
	vec4 clipPos = projection * modelToView * vec4(position, 1.0);
  gl_Position = clipPos;
}`;

const fragSource = /* glsl */ `
precision mediump float;

uniform samplerCube environmentMap;

varying vec3 v_localPosition;

void main() {       
  vec3 envColor = textureCube(environmentMap, v_localPosition).rgb;
  // HDR tonemap and gamma correct
  envColor = envColor / (envColor + vec3(1.0));
  envColor = pow(envColor, vec3(1.0/2.2));
  gl_FragColor = vec4(envColor, 1.0);
  // gl_FragColor = vec4(0,1,0, 1.0);
}`;

export class BackgroundRenderer {
  /**
   * @param {*} texture
   * @param {WebGLRenderingContext} gl
   */
  constructor(cubeTexture, gl) {
    this.gl = gl;
    this.cubeTexture = cubeTexture;
    this.compileShader();
    this.initShaderLocation();
    this.initCube();
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

  initShaderLocation() {
    const { gl, glProg } = this;
    this.positionLoc = gl.getAttribLocation(glProg, 'position');

    this.environmentMapLoc = gl.getUniformLocation(glProg, 'environmentMap');
    this.modelToViewLoc = gl.getUniformLocation(glProg, 'modelToView');
    this.projectionLoc = gl.getUniformLocation(glProg, 'projection');
  }

  initCube() {
    const { gl } = this;
    const glCubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glCubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices.buffer, gl.STATIC_DRAW);
    this.glCubeBuffer = glCubeBuffer;
  }

  setProjection(fov, aspect, near, far) {
    const projection = new Matrix4();
    projection.perspective(fov, aspect, near, far);
    this.gl.uniformMatrix4fv(this.projectionLoc, false, projection);
  }

  renderCube(modelView) {
    const { gl, cubeTexture, glProg } = this;
    gl.useProgram(glProg);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glCubeBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 3, gl.FLOAT, false, 8 * 4, 0);

    gl.uniformMatrix4fv(this.modelToViewLoc, false, modelView);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(this.environmentMapLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
