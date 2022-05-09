export class GLContext {
  /**
   * @type {WebGLRenderingContext}
   */
  static gl;

  /**
   * @param {WebGLRenderingContext} gl
   */
  static init(gl) {
    this.gl = gl;
  }
}
