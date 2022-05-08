import { Matrix4 } from './math.js';

const vertSource = /* glsl */ `
attribute vec3 position;

uniform mat4 projection;
uniform mat4 modelToView;

varying vec3 v_localPosition;

void main() {
  v_localPosition = position;  
  gl_Position =  projection * modelToView * vec4(position, 1.0);
}`;

const fragSource = /* glsl */ `
precision mediump float;

uniform sampler2D equirectangularMap;

varying vec3 v_localPosition;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphericalMap(vec3 v) {
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
}

void main() {       
    vec2 uv = SampleSphericalMap(normalize(v_localPosition)); // make sure to normalize localPos
    vec3 color = texture2D(equirectangularMap, uv).rgb;

    gl_FragColor = vec4(color, 1.0);
}`;

export class EquirectangularToCubeMapRenderer {
  /**
   * @param {*} texture
   * @param {WebGLRenderingContext} gl
   */
  constructor(texture, gl) {
    this.gl = gl;
    this.texture = texture;
    this.compileShader();
    this.initShaderLocation();
    this.initCube();
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

  initShaderLocation() {
    const { gl, glProg } = this;
    this.positionLoc = gl.getAttribLocation(glProg, 'position');

    this.equirectangularMapLoc = gl.getUniformLocation(glProg, 'equirectangularMap');
    this.modelToViewLoc = gl.getUniformLocation(glProg, 'modelToView');
    this.projectionLoc = gl.getUniformLocation(glProg, 'projection');
  }

  initCube() {
    const { gl, texture } = this;
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
      texture.width,
      texture.height,
      0,
      gl.RGBA,
      OBS_HALF_FLOAT_EXT.HALF_FLOAT_OES,
      texture.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.glCubeTexture = glCubeTexture;
  }

  setProjection(fov, aspect, near, far) {
    const projection = new Matrix4();
    projection.perspective(fov, aspect, near, far);
    this.gl.uniformMatrix4fv(this.projectionLoc, false, projection);
  }

  renderCube(modelView) {
    const { gl, glProg, glCubeTexture } = this;
    gl.useProgram(glProg);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glCubeBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 3, gl.FLOAT, false, 8 * 4, 0);

    gl.uniformMatrix4fv(this.modelToViewLoc, false, modelView);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glCubeTexture);
    gl.uniform1i(this.equirectangularMapLoc, 0);

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
