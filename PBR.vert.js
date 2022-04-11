export const vertSource = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelToWorld;
uniform mat4 modelToView;
uniform mat4 projection;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

void main() {
  vec4 clip_position = projection * modelToView * vec4(position, 1.0);
  vec4 world_position = modelToWorld * vec4(position, 1.0);
  vec3 world_normal = mat3(modelToWorld) * normal;

  v_worldPosition = world_position.xyz;
  v_worldNormal = world_normal;
  v_uv = uv;
  gl_Position = clip_position;
}`;
