uniform float time;
uniform float health;
uniform vec3 colorBase;
uniform vec3 cameraPosition;

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vec3 color = mix(vec3(1.0, 0.2, 0.4), vec3(0.0, 1.0, 0.9), health);
  float pulse = sin(time * 3.0) * 0.5 + 0.5;
  
  vec3 emission = color * pulse * 2.0;
  
  float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(cameraPosition - vPosition)), 2.0);
  emission += fresnel * color * 0.5;
  
  gl_FragColor = vec4(emission, 1.0);
}

