export const fragSource = /* glsl */ `
precision mediump float;

uniform sampler2D equirectangularMap;

varying vec3 v_localPosition;

const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphericalMap(vec3 v) {
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    return uv * invAtan + 0.5;
}

void main() {       
    vec2 uv      = SampleSphericalMap(normalize(v_localPosition)); // make sure to normalize localPos
    vec3 color   = texture2D(equirectangularMap, uv).rgb;

    gl_FragColor = vec4(color, 1.0);
}`;
