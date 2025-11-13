uniform sampler2D tDiffuse;
uniform float time;
uniform float intensity;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  
  // Horizontal displacement
  float block = random(vec2(floor(uv.y * 20.0), floor(time * 10.0)));
  uv.x += block * intensity * 0.1 * sin(time * 10.0);
  
  // RGB shift
  vec2 offset = vec2(intensity * 0.02, 0.0);
  float r = texture2D(tDiffuse, uv + offset).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - offset).b;
  
  vec3 color = vec3(r, g, b);
  
  // Scanlines
  float scanline = sin(uv.y * 800.0) * 0.05 * intensity;
  color += scanline;
  
  gl_FragColor = vec4(color, 1.0);
}

