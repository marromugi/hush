// A square over the whole canvas; vPos runs -1..1 across it.
attribute vec2 aPos;
varying vec2 vPos;

void main() {
  vPos = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
