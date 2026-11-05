import type { Body } from "@/components/diary/DiaryScreen/weekdayBody";

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

  gl.uniform1f(gl.getUniformLocation(program, "uBody"), bodyIndex[body]);
  const pixel = gl.getUniformLocation(program, "uPixel");
  const time = gl.getUniformLocation(program, "uTime");

  // The backing store follows the screen's pixels, so the body stays sharp
  // when the window moves to a display with another pixel ratio.
  const fit = () => {
    const size = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(size.width * window.devicePixelRatio));
    const height = Math.max(1, Math.round(size.height * window.devicePixelRatio));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform1f(pixel, 2 / width);
  };
  canvas.width = 0;

  return {
    draw(seconds) {
      fit();
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
 * Draws `body` on `canvas` and keeps it turning, or once and still when
 * `still` is set. Returns the function that stops it.
 *
 * When WebGL is missing or the shaders fail, the canvas stays empty and a
 * warning says why: the body only decorates the date, so the diary goes on
 * without it.
 */
export function drawBody(canvas: HTMLCanvasElement, body: Body, still: boolean): () => void {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  if (!gl) {
    console.warn(`the ${body} is not drawn: this webview gives no WebGL context`);
    return () => {};
  }

  let drawing: Drawing | null = null;
  let frame = 0;
  let last = -Infinity;

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (now - last < FRAME_MS) return;
    last = now;
    drawing?.draw(now / 1000);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    drawing?.dispose();
    drawing = null;
  };
  const start = () => {
    // A restore can arrive while a loop already runs; only one may.
    stop();
    try {
      drawing = prepare(gl, canvas, body);
    } catch (error) {
      console.warn(`the ${body} is not drawn:`, error);
      return;
    }
    if (still) drawing.draw(0);
    else frame = requestAnimationFrame(tick);
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
