export const vertSource = /* glsl */ `
attribute vec3 position;

uniform mat4 projection;
uniform mat4 modelToView;

varying vec3 v_localPosition;

void main() {
  v_localPosition = position;  
  gl_Position =  projection * modelToView * vec4(position, 1.0);
}`;
