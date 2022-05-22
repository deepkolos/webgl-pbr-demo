import { GLStates } from "./GLStates.js";
import { GLTextures } from "./GLTextures.js";

export class GLContext {
  /**
   * @type {WebGLRenderingContext}
   */
  static gl;

  /**
   * @type {GLStates}
   */
  static states;

  /**
   * @param {WebGLRenderingContext} gl
   */
  static init(gl) {
    this.gl = gl;
    this.states = new GLStates(gl);
    GLTextures.init(gl);
  }
}
