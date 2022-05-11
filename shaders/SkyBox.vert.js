export const vertSource = /* glsl */ `
attribute vec3 position;

uniform mat4 projection;
uniform mat4 modelToView;

varying vec3 v_localPosition;

void main() {
  v_localPosition = position;  
  mat4 modelToViewRot = mat4(mat3(modelToView));
	vec4 clipPos = projection * modelToViewRot * vec4(position, 1.0);
  gl_Position = clipPos.xyww;
}`;
