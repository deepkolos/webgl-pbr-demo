export class GLStates {
  /**
   * @param {WebGLRenderingContext} gl
   */
  constructor(gl) {
    this.gl = gl;
    // common state
    this.viewport = [0, 0, 300, 150];
    this.arrayBufferBinding = null;
    this.currentProgram = null;
    this.vertexArrayBinding = null;
    this.renderBufferBinding = null;
    this.frameBufferBinding = null;
    this.activeTexture = null;

    // texture uints
    this.textureUints = [];

    // clear state
    this.colorClearValue = [0, 0, 0, 0];
    this.depthClearValue = 1;
    this.stencilClearValue = 0x00;

    // depth state
    this.depthTest = false;
    this.depthFunc = gl.LESS;
    this.depthRange = [0, 1];
    this.depthWriteMask = true;

    // blend state
    this.blend = false;
    this.blendDstRGB = gl.ZERO;
    this.blendSrcRGB = gl.ONE;
    this.blendDstAlpha = gl.ZERO;
    this.blendSrcAlpha = gl.ONE;
    this.blendColor = [0, 0, 0, 0];
    this.blendEquationRGB = gl.FUNC_ADD;
    this.blendEquationDepth = gl.FUNC_ADD;

    // misc state
    this.colorWriteMask = [true, true, true, true];
    this.scissorTest = false;
    this.scissorBox = [0, 0, 300, 150];
    this.unpackAlignment = 4;
    this.packAlignment = 4;

    // stencil state
    this.stencilTest = false;
    this.stencilFunc = gl.ALWAYS;
    this.stencilFail = gl.KEEP;
    this.stencilPassDepthFail = gl.KEEP;
    this.stencilPassDepthPass = gl.KEEP;
    this.stencilRef = 0x00;
    this.stencilValueMask = 0x7f;
    this.stencilWriteMask = 0x7f;
    this.stencilBackFunc = gl.ALWAYS;
    this.stencilBackFail = gl.KEEP;
    this.stencilBackPassDepthFail = gl.KEEP;
    this.stencilBackPassDepthPass = gl.KEEP;
    this.stencilBackRef = 0x00;
    this.stencilBackValueMask = 0x7f;
    this.stencilBackWriteMask = 0x7f;

    // polygon state
    this.cullFace = false;
    this.cullFaceMode = gl.BACK;
    this.frontFace = gl.CCW;
    this.polygonOffsetFactor = 0;
    this.polygonOffsetUnits = 0;
  }

  //#region common state
  setViewport(x, y, w, h) {
    const { gl, viewport } = this;
    if (viewport[0] !== x || viewport[1] !== y || w !== viewport[2] || h !== viewport[3]) {
      viewport[0] = x;
      viewport[1] = y;
      viewport[2] = w;
      viewport[3] = h;
      gl.viewport(w, y, w, h);
    }
  }
  setArrayBufferBinding(glBuffer) {
    const gl = this.gl;
    if (this.arrayBufferBinding !== glBuffer) {
      this.arrayBufferBinding = glBuffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
    }
  }
  setCurrentProgram(glProgram) {
    const gl = this.gl;
    if (this.currentProgram !== glProgram) {
      this.currentProgram = glProgram;
      gl.useProgram(glProgram);
    }
  }
  setVertexArrayBinding(vao) {
    const gl = this.gl;
    if (this.vertexArrayBinding !== vao) {
      this.vertexArrayBinding = vao;
      gl.vertexArrayBinding(vao);
    }
  }
  setRenderBufferBinding(glRenderBuffer) {
    const gl = this.gl;
    if (this.renderBufferBinding != glRenderBuffer) {
      this.renderBufferBinding = glRenderBuffer;
      gl.bindRenderbuffer(gl.RENDERBUFFER, glRenderBuffer);
    }
  }
  setFrameBufferBinding(glFrameBuffer) {
    const gl = this.gl;
    if (this.frameBufferBinding != glFrameBuffer) {
      this.frameBufferBinding = glFrameBuffer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, glFrameBuffer);
    }
  }
  setActiveTexture(textureUint) {
    const gl = this.gl;
    if (this.activeTexture != textureUint) {
      this.activeTexture = textureUint;
      gl.activeTexture(textureUint);
    }
  }
  //#endregion

  //#region clear state
  setColorClearValue(r, g, b, a) {
    const { gl, colorClearValue } = this;
    if (
      colorClearValue[0] !== r ||
      colorClearValue[1] !== g ||
      colorClearValue[2] !== b ||
      colorClearValue[3] !== a
    ) {
      colorClearValue[0] = r;
      colorClearValue[1] = g;
      colorClearValue[2] = b;
      colorClearValue[3] = a;
      gl.clearColor(r, g, b, a);
    }
  }
  setDepthClearValue(value) {
    const gl = this.gl;
    if (this.depthClearValue !== value) {
      this.depthClearValue = value;
      gl.clearDepth(value);
    }
  }
  setStencilClearValue(value) {
    const gl = this.gl;
    if (this.stencilClearValue !== value) {
      this.stencilClearValue = value;
      gl.clearStencil(value);
    }
  }
  //#endregion

  //#region depth state
  setDepthTest(enable) {
    const gl = this.gl;
    if (this.depthTest !== enable) {
      this.depthTest = enable;
      enable ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
    }
  }
  setDepthFunc(value) {
    const gl = this.gl;
    if (this.depthFunc !== value) {
      this.depthFunc = value;
      gl.depthFunc(value);
    }
  }
  setDepthRange(zNear, zFar) {
    const { gl, depthRange } = this;
    if (depthRange[0] !== zNear || depthRange[1] !== zFar) {
      depthRange[0] = zNear;
      depthRange[1] = zFar;
      gl.depthRange(zNear, zFar);
    }
  }
  setDepthWriteMask(value) {
    const gl = this.gl;
    if (this.depthWriteMask !== value) {
      this.depthWriteMask = value;
      gl.depthMask(value);
    }
  }
  //#endregion

  //#region blend state
  // TODO
  //#endregion

  //#region misc state
  setColorWriteMask(r, g, b, a) {
    const { gl, colorWriteMask } = this;
    if (
      colorWriteMask[0] !== r ||
      colorWriteMask[1] !== g ||
      colorWriteMask[2] !== b ||
      colorWriteMask[3] !== a
    ) {
      colorWriteMask[0] = r;
      colorWriteMask[1] = g;
      colorWriteMask[2] = b;
      colorWriteMask[3] = a;
      gl.colorMask(r, g, b, a);
    }
  }
  setScissorTest(enable) {
    const gl = this.gl;
    if (this.scissorTest != enable) {
      this.scissorTest = enable;
      enable ? gl.enable(gl.SCISSOR_TEST) : gl.disable(gl.SCISSOR_TEST);
    }
  }
  setScissorBox(x, y, w, h) {
    const { gl, scissorBox } = this;
    if (scissorBox[0] !== x || scissorBox[1] !== y || scissorBox[2] !== w || scissorBox[3] !== h) {
      scissorBox[0] = x;
      scissorBox[1] = y;
      scissorBox[2] = w;
      scissorBox[3] = h;
      gl.scissor(x, y, w, h);
    }
  }
  setUnpackAlignment(value) {
    const gl = this.gl;
    if (this.unpackAlignment != value) {
      this.unpackAlignment = value;
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, value);
    }
  }
  setPackAlignment(value) {
    const gl = this.gl;
    if (this.packAlignment != value) {
      this.packAlignment = value;
      gl.pixelStorei(gl.PACK_ALIGNMENT, value);
    }
  }
  //#endregion

  //#region stencil
  // TODO
  //#endregion

  //#region polygon
  setCullFace(value) {
    const gl = this.gl;
    if (this.cullFace !== value) {
      this.cullFace = value;
      value ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
    }
  }
  setCullFaceMode(value) {
    const gl = this.gl;
    if (this.cullFaceMode !== value) {
      this.cullFaceMode = value;
      gl.cullFace(value);
    }
  }
  setFrontFace(value) {
    const gl = this.gl;
    if (this.frontFace !== value) {
      this.frontFace = value;
      gl.frontFace(value);
    }
  }
  setPolygonOffset(factor, units) {
    const gl = this.gl;
    if (this.polygonOffsetFactor !== factor || this.polygonOffsetUnits !== units) {
      this.polygonOffsetFactor = factor;
      this.polygonOffsetUnits = units;
      gl.polygonOffset(factor, units);
    }
  }
  //#endregion
}
