import type { Body } from "@/components/diary/DiaryScreen/weekdayBody";
import { reducesMotion } from "@/lib/ui/reducesMotion";

import fragmentSource from "./body.frag?raw";
import vertexSource from "./body.vert?raw";

/** The numbers `body.frag` tells the bodies apart by. */
const bodyIndex: Record<Body, number> = {
  sun: 0,
  moon: 1,
  mercury: 2,
  venus: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
};

/** The body turns slowly, so 30 frames a second is as smooth as it looks. */
const FRAME_MS = 1000 / 30;

type Drawing = { draw: (seconds: number) => void; dispose: () => void };

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error(`a body shader did not compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

/** Builds the program for `body` at the canvas's current size. */
function prepare(gl: WebGLRenderingContext, canvas: HTMLCanvasElement, body: Body): Drawing {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`the body shaders did not link: ${gl.getProgramInfoLog(program)}`);
  }
  gl.useProgram(program);

  const square = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, square);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // The backing store matches the screen's pixels, so the body stays sharp.
  const size = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(size.width * window.devicePixelRatio));
  canvas.height = Math.max(1, Math.round(size.height * window.devicePixelRatio));
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.uniform1f(gl.getUniformLocation(program, "uBody"), bodyIndex[body]);
  gl.uniform1f(gl.getUniformLocation(program, "uPixel"), 2 / canvas.width);
  const time = gl.getUniformLocation(program, "uTime");

  return {
    draw(seconds) {
      gl.uniform1f(time, seconds);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteBuffer(square);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}

/**
 * Draws `body` on `canvas` and keeps it turning, or still when the person
 * asked for less motion. Returns the function that stops it.
 *
 * Without WebGL the canvas stays empty and a warning says why: the body only
 * decorates the date, so the diary goes on without it.
 */
export function drawBody(canvas: HTMLCanvasElement, body: Body): () => void {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  if (!gl) {
    console.warn(`the ${body} is not drawn: this webview gives no WebGL context`);
    return () => {};
  }

  const still = reducesMotion();
  let drawing: Drawing | null = null;
  let frame = 0;
  let last = -Infinity;

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (now - last < FRAME_MS) return;
    last = now;
    drawing?.draw(now / 1000);
  };
  const start = () => {
    drawing = prepare(gl, canvas, body);
    if (still) drawing.draw(0);
    else frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    drawing?.dispose();
    drawing = null;
  };

  // The system may take the context back, as iOS does in the background.
  // Saying the loss is handled lets the browser give it back later.
  const onLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    drawing = null;
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", start);

  start();
  return () => {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", start);
    stop();
  };
}
