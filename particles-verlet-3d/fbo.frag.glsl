precision highp float;

uniform sampler2D data;

varying vec2 uv;

void main() {
    // gl_FragColor = vec4(texture2D(data, uv).rgb, 1);
    vec4 rgba = texture2D(data, uv);
    vec4 blit = vec4(equal(ivec4(0, 1, 2, 3), ivec4(floor(uv.x*4.0))));

    gl_FragColor = vec4(vec3(dot(rgba, blit)), 1.0);
}
