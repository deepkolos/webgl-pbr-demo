import { GLContext } from './GLContext.js';
import { GLTextures } from './GLTextures.js';

export class GLShader {
  constructor(vert, frag, states) {
    this.vertSource = vert;
    this.fragSource = frag;
    this.states = states;
    this.compile();
  }

  compile() {
    const { vertSource, fragSource } = this;
    const gl = GLContext.gl;
    const glProg = gl.createProgram();
    const glVert = gl.createShader(gl.VERTEX_SHADER);
    const glFrag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(glVert, vertSource);
    gl.shaderSource(glFrag, fragSource);
    gl.compileShader(glVert);
    gl.compileShader(glFrag);
    if (!gl.getShaderParameter(glVert, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(glVert), formatShaderCode(vertSource));
    if (!gl.getShaderParameter(glFrag, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(glFrag), formatShaderCode(fragSource));
    gl.attachShader(glProg, glVert);
    gl.attachShader(glProg, glFrag);
    gl.linkProgram(glProg);
    if (!gl.getProgramParameter(glProg, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(glProg));
    gl.useProgram(glProg);

    gl.deleteShader(glVert);
    gl.deleteShader(glFrag);

    this.glProg = glProg;
    this.uniformInfo = getUniformInfo(gl, glProg);
    this.attributeInfo = getAttributeInfo(gl, glProg);
  }

  setUniform(name, data) {
    const info = this.uniformInfo[name];
    if (!info) return console.log(`setUniform ${name} fail`);

    const { type, location } = this.uniformInfo[name];
    const gl = GLContext.gl;
    let slot;

    switch (type) {
      case 0x1406: // FLOAT
        gl.uniform1f(location, data);
        break;
      case 0x8b50: // FLOAT_VEC2
        gl.uniform2fv(location, data);
        break;
      case 0x8b51: // FLOAT_VEC3
        gl.uniform3fv(location, data);
        break;
      case 0x8b52: // FLOAT_VEC4
        gl.uniform4fv(location, data);
        break;

      case 0x8b5a: // MAT2
        gl.uniformMatrix2fv(location, false, data);
        break;
      case 0x8b5b: // MAT3
        gl.uniformMatrix3fv(location, false, data);
        break;
      case 0x8b5c: // MAT4
        gl.uniformMatrix4fv(location, false, data);
        break;

      case 0x1404:
      case 0x8b56: // INT, BOOL
        gl.uniform1i(location, data);
        break;
      case 0x8b53:
      case 0x8b57: // INT_VEC2
        gl.uniform2iv(location, data);
        break;
      case 0x8b54:
      case 0x8b58: // INT_VEC3
        gl.uniform3iv(location, data);
        break;
      case 0x8b55:
      case 0x8b59: // INT_VEC4
        gl.uniform4iv(location, data);
        break;

      // WebGL2
      // case 0x1405: // UINT
      //   gl.uniform1ui(location, data); break;
      // case 0x8dc6: // UINT_VEC2
      //   gl.uniform2uiv(location, data); break;
      // case 0x8dc7: // UINT_VEC3
      //   gl.uniform3uiv(location, data); break;
      // case 0x8dc8: // UINT_VEC4
      //   gl.uniform4uiv(location, data); break;

      case 0x8b5e: // SAMPLER_2D
      case 0x8d66: // SAMPLER_EXTERNAL_OES
      case 0x8dca: // INT_SAMPLER_2D
      case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
      case 0x8b62: // SAMPLER_2D_SHADOW
        slot = GLTextures.allocUnit();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, data);
        gl.uniform1i(location, slot);
        break;

      case 0x8b5f: // SAMPLER_3D
      case 0x8dcb: // INT_SAMPLER_3D
      case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
        slot = GLTextures.allocUnit();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_3D, data);
        gl.uniform1i(location, slot);
        break;

      case 0x8b60: // SAMPLER_CUBE
      case 0x8dcc: // INT_SAMPLER_CUBE
      case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
      case 0x8dc5: // SAMPLER_CUBE_SHADOW
        slot = GLTextures.allocUnit();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, data);
        gl.uniform1i(location, slot);
        break;

      case 0x8dc1: // SAMPLER_2D_ARRAY
      case 0x8dcf: // INT_SAMPLER_2D_ARRAY
      case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
      case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
        slot = GLTextures.allocUnit();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, data);
        gl.uniform1i(location, slot);
        break;
    }
  }

  /**
   * @param {string} name
   * @param {{ size: GLint; type: GLenum; normalized: GLboolean; stride: GLsizei; offset: GLintptr; buffer: WebGLBuffer;}} cfg
   */
  setAttribute(name, cfg) {
    const info = this.attributeInfo[name];
    if (!info) return console.log(`setAttribute ${name} fail`);

    const gl = GLContext.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, cfg.buffer);
    gl.enableVertexAttribArray(info.location);
    gl.vertexAttribPointer(
      info.location,
      cfg.size,
      cfg.type,
      cfg.normalized,
      cfg.stride,
      cfg.offset,
    );
  }

  use() {
    GLContext.gl.useProgram(this.glProg);
  }
}

function formatShaderCode(code) {
  return code
    .split('\n')
    .map((v, k) => `${k}:${v}`)
    .join('\n');
}

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {{[k: string]: {name: string, type: number, size: number, location: number}}}
 */
function getAttributeInfo(gl, program) {
  const attributeLen = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  const attributeInfo = {};

  for (let i = 0; i < attributeLen; i++) {
    const info = gl.getActiveAttrib(program, i);
    attributeInfo[info.name] = {
      name: info.name,
      type: info.type,
      size: info.size,
      // location: gl.getAttribLocation(program, info.name),
      location: i,
      index: i,
    };
  }
  return attributeInfo;
}

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {{[k: string]: {name: string, type: number, size: number, location: number}}}
 */
function getUniformInfo(gl, program) {
  const uniformLen = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const uniformInfo = {};

  for (let i = 0; i < uniformLen; ++i) {
    const info = gl.getActiveUniform(program, i);
    uniformInfo[info.name] = {
      name: info.name,
      size: info.size,
      type: info.type,
      location: gl.getUniformLocation(program, info.name),
      index: i,
    };
  }
  return uniformInfo;
}
