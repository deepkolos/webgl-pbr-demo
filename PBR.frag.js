export const fragSource = /* glsl */ `
precision mediump float;

uniform sampler2D baseColorTexture;
uniform sampler2D metallicRoughnessTexture;
uniform float metallicFactor;
uniform float roughnessFactor;

uniform vec3 ambientLightColor;
uniform float ambientLightIntensity;

uniform vec3 directionalLightColor;
uniform float directionalLightIntensity;
uniform vec3 directionalLightDirection;

uniform vec3 cameraWorldPosition;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

#define PI 3.1416

// Normal Distribution function --------------------------------------
float D_GGX(float dotNH, float roughness) {
	highp float alpha = roughness * roughness;
	highp float alpha2 = alpha * alpha;
	highp float denom = dotNH * dotNH * (alpha2 - 1.0) + 1.0;
	return (alpha2) / (PI * denom * denom);
}

// Geometric Shadowing function --------------------------------------
float G_SchlicksmithGGX(float dotNL, float dotNV, float roughness) {
	highp float r = (roughness + 1.0);
	highp float k = (r * r) / 8.0;
	highp float GL = dotNL / (dotNL * (1.0 - k) + k);
	highp float GV = dotNV / (dotNV * (1.0 - k) + k);
	return GL * GV;
}

// Fresnel function ----------------------------------------------------
vec3 F_Schlick(float cosTheta, vec3 F0) {
	return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
vec3 F_SchlickR(float cosTheta, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

// Specular and diffuse BRDF composition --------------------------------------------
vec3 BRDF(vec3 L, vec3 V, vec3 N, vec3 F0, float metallic, float roughness, vec3 baseColor) {
	// Precalculate vectors and dot products
	vec3 H = normalize(V + L);
	float dotNV = clamp(dot(N, V), 0.0, 1.0);
	float dotNL = clamp(dot(N, L), 0.0, 1.0);
	float dotLH = clamp(dot(L, H), 0.0, 1.0);
	float dotNH = clamp(dot(N, H), 0.0, 1.0);

	vec3 color = vec3(0.0);

	float rroughness = max(0.05, roughness);
	// D = Normal distribution (Distribution of the microfacets)
	float D = D_GGX(dotNH, roughness);
	// G = Geometric shadowing term (Microfacets shadowing)
	float G = G_SchlicksmithGGX(dotNL, dotNV, rroughness);
	// F = Fresnel factor (Reflectance depending on angle of incidence)
	vec3 F = F_Schlick(dotNV, F0);

	vec3 spec = D * F * G / (4.0 * dotNL * dotNV + 0.001);
	vec3 kD = (vec3(1.0) - F) * (1.0 - metallic);

	color += (kD * baseColor / PI + (1.0 - kD) * spec);

	return color;
}

vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

void main() {
  // vec3 baseColor = texture2D(baseColorTexture, v_uv).xyz;
  vec3 baseColor = sRGBToLinear(texture2D(baseColorTexture, v_uv)).xyz;
  vec4 metallicRoughnessColor = texture2D(metallicRoughnessTexture, v_uv);
  float metallic = metallicRoughnessColor.z * metallicFactor;
	float roughness = metallicRoughnessColor.y * roughnessFactor;

  vec3 F0 = mix(vec3(0.04, 0.04, 0.04), baseColor, metallic);

  vec3 N = normalize(v_worldNormal);
  vec3 V = normalize(cameraWorldPosition - v_worldPosition);
  vec3 R = reflect(-V, N);

	vec3 La = vec3(0.0, 0.0, 0.0);
	vec3 Lo = vec3(0.0, 0.0, 0.0);

  La = baseColor * ambientLightColor * ambientLightIntensity;

  vec3 L = normalize(directionalLightDirection);
  float NoL = min(dot(N, L), 1.0);
  vec3 En = directionalLightColor * directionalLightIntensity * NoL;
  Lo = BRDF(L, V, N, F0, metallic, roughness, baseColor) * En;


  // gl_FragColor = vec4(La + Lo, 1);
  gl_FragColor = LinearTosRGB(vec4(La + Lo, 1));
}
`;
