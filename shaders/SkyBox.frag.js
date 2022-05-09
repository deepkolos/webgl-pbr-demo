export const fragSource = /* glsl */ `
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
