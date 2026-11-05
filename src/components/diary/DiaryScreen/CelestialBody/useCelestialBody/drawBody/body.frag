// One celestial body, drawn as a 3D sphere seen from the front with an
// orthographic camera. The canvas covers -1..1 on both axes; the result is
// premultiplied, with the page showing through around the body.
precision highp float;

varying vec2 vPos;

// 0 sun, 1 moon, 2 mercury, 3 venus, 4 mars, 5 jupiter, 6 saturn
uniform float uBody;
// Seconds since the body started turning.
uniform float uTime;
// The width of one canvas pixel in -1..1 units.
uniform float uPixel;

const float PI = 3.14159265;
// Light from the upper left, a little in front.
const vec3 LIGHT = vec3(-0.57, 0.49, 0.66);

bool isBody(float index) {
  return abs(uBody - index) < 0.5;
}

// --- noise -----------------------------------------------------------------

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
      mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
      f.y
    ),
    mix(
      mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
      mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

// --- the body's shape and orientation ---------------------------------------

float radius() {
  if (isBody(6.0)) return 0.46; // room for the rings
  if (isBody(0.0)) return 0.7;  // room for the glow
  return 0.9;
}

// x: tilt toward the viewer, y: roll on the screen, z: turns per second
// (negative turns the other way, as Venus does).
vec3 orientation() {
  if (isBody(0.0)) return vec3(0.1, 0.1, 1.0 / 60.0);
  if (isBody(1.0)) return vec3(0.1, 0.05, 1.0 / 45.0);
  if (isBody(2.0)) return vec3(0.0, 0.05, 1.0 / 50.0);
  if (isBody(3.0)) return vec3(0.05, -0.05, -1.0 / 80.0);
  if (isBody(4.0)) return vec3(0.3, 0.35, 1.0 / 40.0);
  if (isBody(5.0)) return vec3(0.05, 0.05, 1.0 / 25.0);
  return vec3(0.42, -0.38, 1.0 / 30.0);
}

mat3 rotateX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(1, 0, 0, 0, c, s, 0, -s, c);
}

mat3 rotateY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, 0, -s, 0, 1, 0, s, 0, c);
}

mat3 rotateZ(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, s, 0, -s, c, 0, 0, 0, 1);
}

// The body's spin axis in view space.
vec3 axis() {
  vec3 o = orientation();
  return rotateZ(o.y) * rotateX(o.x) * vec3(0, 1, 0);
}

// A point on the sphere in view space, turned into the body's own frame,
// so the surface turns with time.
vec3 toSurface(vec3 p) {
  vec3 o = orientation();
  vec3 local = rotateX(-o.x) * rotateZ(-o.y) * p;
  return rotateY(-uTime * o.z * 2.0 * PI) * local;
}

// --- surfaces --------------------------------------------------------------

vec3 moonSurface(vec3 q) {
  float maria = smoothstep(0.5, 0.62, fbm(q * 1.4 + 3.0));
  vec3 color = mix(vec3(0.66, 0.65, 0.63), vec3(0.36, 0.36, 0.37), maria);
  return color * (0.88 + 0.24 * noise(q * 9.0));
}

vec3 mercurySurface(vec3 q) {
  float shade = fbm(q * 2.6);
  vec3 color = mix(vec3(0.42, 0.39, 0.36), vec3(0.68, 0.64, 0.6), shade);
  return color * (0.85 + 0.3 * noise(q * 11.0));
}

vec3 venusSurface(vec3 q) {
  float swirl = fbm(vec3(q.x * 2.0, q.y * 6.0 + fbm(q * 2.0) * 2.0, q.z * 2.0));
  return mix(vec3(0.86, 0.74, 0.5), vec3(0.98, 0.92, 0.76), swirl);
}

vec3 marsSurface(vec3 q) {
  float dark = smoothstep(0.48, 0.6, fbm(q * 1.8 + 7.0));
  vec3 color = mix(vec3(0.8, 0.42, 0.22), vec3(0.44, 0.22, 0.14), dark);
  float cap = smoothstep(0.84, 0.9, abs(q.y));
  return mix(color, vec3(0.96, 0.94, 0.92), cap);
}

vec3 jupiterSurface(vec3 q) {
  float latitude = asin(clamp(q.y, -1.0, 1.0));
  float band = sin(latitude * 15.0 + fbm(q * 3.0) * 2.2);
  vec3 color = mix(vec3(0.68, 0.49, 0.34), vec3(0.93, 0.86, 0.73), smoothstep(-0.3, 0.3, band));
  // The Great Red Spot, south of the equator.
  vec3 spot = q - normalize(vec3(0.9, -0.36, 0.3));
  spot.y *= 2.2;
  return mix(color, vec3(0.8, 0.4, 0.27), smoothstep(0.24, 0.14, length(spot)));
}

vec3 saturnSurface(vec3 q) {
  float latitude = asin(clamp(q.y, -1.0, 1.0));
  float band = sin(latitude * 11.0 + noise(q * 4.0) * 0.8);
  return mix(vec3(0.78, 0.66, 0.45), vec3(0.94, 0.86, 0.64), smoothstep(-0.5, 0.5, band));
}

vec3 sunSurface(vec3 q, float facing) {
  float grain = fbm(q * 7.0 + vec3(0.0, 0.0, uTime * 0.05));
  vec3 hot = vec3(1.0, 0.86, 0.5);
  vec3 limb = vec3(0.95, 0.42, 0.1);
  return mix(limb, hot, pow(facing, 0.6)) * (0.85 + 0.3 * grain);
}

// --- Saturn's rings ----------------------------------------------------------

// How much of the light the rings stop at `r` from the center, 0..1.
float ringDensity(float r) {
  float R = radius();
  float x = r / R;
  if (x < 1.24 || x > 2.12) return 0.0;
  float density = 0.3;                              // C ring
  if (x > 1.48) density = 0.92;                     // B ring
  if (x > 1.95 && x < 2.02) density = 0.08;        // Cassini division
  if (x > 2.02) density = 0.62;                     // A ring
  return density * (0.9 + 0.1 * sin(x * 90.0));
}

// Whether the ray from `p` toward the light passes through the planet.
bool inPlanetShadow(vec3 p) {
  float R = radius();
  float b = dot(p, LIGHT);
  float c = dot(p, p) - R * R;
  return b < 0.0 && b * b - c > 0.0;
}

// --- one sample ---------------------------------------------------------------

vec4 shade(vec2 xy) {
  float R = radius();
  float d2 = dot(xy, xy);
  vec4 result = vec4(0.0);

  // The sphere, if this ray hits it.
  if (d2 < R * R) {
    vec3 p = vec3(xy, sqrt(R * R - d2));
    vec3 n = p / R;
    vec3 q = toSurface(n);
    float facing = n.z;

    if (isBody(0.0)) {
      result = vec4(sunSurface(q, facing), 1.0);
    } else {
      vec3 albedo;
      if (isBody(1.0)) albedo = moonSurface(q);
      else if (isBody(2.0)) albedo = mercurySurface(q);
      else if (isBody(3.0)) albedo = venusSurface(q);
      else if (isBody(4.0)) albedo = marsSurface(q);
      else if (isBody(5.0)) albedo = jupiterSurface(q);
      else albedo = saturnSurface(q);

      float lambert = dot(n, LIGHT);
      // Thick atmospheres carry light a little past the terminator.
      float wrap = (isBody(3.0) || isBody(5.0) || isBody(6.0)) ? 0.25 : 0.06;
      float light = clamp((lambert + wrap) / (1.0 + wrap), 0.0, 1.0);
      // Gas and cloud darken toward the edge.
      if (isBody(3.0) || isBody(5.0) || isBody(6.0)) light *= mix(0.7, 1.0, facing);

      // The rings' shadow on Saturn.
      if (isBody(6.0)) {
        vec3 N = axis();
        float s = -dot(p, N) / dot(LIGHT, N);
        if (s > 0.0) light *= 1.0 - 0.8 * ringDensity(length(p + s * LIGHT));
      }

      result = vec4(albedo * (0.05 + 0.95 * light), 1.0);
    }
  } else if (isBody(0.0)) {
    // The sun's glow around its disk.
    float glow = exp(-(sqrt(d2) - R) * 9.0) * 0.55;
    result = vec4(vec3(1.0, 0.6, 0.2) * glow, glow);
  }

  // Saturn's rings, in front of or behind the planet.
  if (isBody(6.0)) {
    vec3 N = axis();
    // The ray (xy, z) going -z meets the ring plane where dot(p, N) = 0.
    float z = -dot(xy, N.xy) / N.z;
    vec3 p = vec3(xy, z);
    float density = ringDensity(length(p));
    bool hidden = d2 < R * R && z < sqrt(R * R - d2);
    if (density > 0.0 && !hidden) {
      float lit = inPlanetShadow(p) ? 0.08 : 0.35 + 0.65 * abs(dot(N, LIGHT));
      vec3 color = vec3(0.86, 0.77, 0.6) * lit;
      result = vec4(color * density, density) + result * (1.0 - density);
    }
  }

  return result;
}

void main() {
  // Four samples on a rotated grid keep the edges smooth at text size.
  vec4 sum = vec4(0.0);
  sum += shade(vPos + uPixel * vec2(-0.125, -0.375));
  sum += shade(vPos + uPixel * vec2(0.375, -0.125));
  sum += shade(vPos + uPixel * vec2(0.125, 0.375));
  sum += shade(vPos + uPixel * vec2(-0.375, 0.125));
  gl_FragColor = sum / 4.0;
}
