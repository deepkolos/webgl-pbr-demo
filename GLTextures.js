export class GLTextures {
  static unitUsed = 0;
  static maxUnit = -1;

  /**
   * @param {WebGLRenderingContext} gl
   */
  static init(gl) {
    this.maxUnit = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  }
  static allocUnit() {
    const unit = this.unitUsed++;
    if (unit > this.maxUnit) console.error(`alloc unit exceed max uint ${this.maxUnit}`);
    return unit;
  }
  static reset() {
    this.unitUsed = 0;
  }
}
