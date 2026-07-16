import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  // ── Simplex 2-D noise ──
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
     -0.577350269189626,
      0.024390243902439
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x_) - 0.5;
    vec3 ox = floor(x_ + 0.5);
    vec3 a0 = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // ── Fractional Brownian Motion (4 octaves) ──
  float fbm(vec2 p) {
    float value = 0.0;
    float amp   = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * snoise(p);
      p    *= 2.0;
      amp  *= 0.5;
    }
    return value;
  }

  // ── Film grain / glitter hash ──
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 st = vec2(uv.x * aspect, uv.y);
    float t = u_time * 0.08;

    // ── Domain warping (Inigo Quilez) for organic morphing ──
    vec2 q = vec2(
      fbm(st * 1.8 + vec2(0.0, 0.0) + t * 0.35),
      fbm(st * 1.8 + vec2(5.2, 1.3) + t * 0.4)
    );
    vec2 r = vec2(
      fbm(st * 1.8 + 3.5 * q + vec2(1.7, 9.2) + t * 0.15),
      fbm(st * 1.8 + 3.5 * q + vec2(8.3, 2.8) + t * 0.18)
    );
    float f = fbm(st * 1.8 + 3.5 * r);

    // ── Munim brand palette (light theme) ──
    vec3 c1 = vec3(0.961, 0.984, 0.969); // #f5fbf7 light mint
    vec3 c2 = vec3(0.878, 0.961, 0.918); // #e0f5ea soft sage
    vec3 c3 = vec3(0.773, 0.922, 0.835); // #c5ebd5 light emerald
    vec3 c4 = vec3(0.616, 0.863, 0.722); // #9ddcb8 medium mint
    vec3 c5 = vec3(0.478, 0.812, 0.667); // #7acfaa soft teal

    // ── Rich color blending driven by warp field ──
    vec3 color = mix(c1, c2, clamp(f * f * 2.0, 0.0, 1.0));
    color = mix(color, c3, clamp(length(q) * 1.2, 0.0, 1.0));
    color = mix(color, c4, clamp(length(r.x) * 0.9, 0.0, 1.0));
    color = mix(color, c5, clamp(r.y * r.y * 1.5, 0.0, 1.0));

    // ── 3-D specular / glossy highlight ──
    float highlight = smoothstep(0.2, 0.6, f) * smoothstep(0.85, 0.4, f);
    color += vec3(highlight * 0.07);

    // ── Iridescent shimmer ──
    float shimmer = snoise(uv * 14.0 + t * 2.5) * 0.018;
    color += shimmer;

    // ── Animated film grain / glitter ──
    float grain = hash(gl_FragCoord.xy + fract(u_time) * 137.0);
    color += (grain - 0.5) * 0.03;

    // ── Soft vignette ──
    float vig = 1.0 - 0.12 * length(uv - 0.5);
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

interface ShaderGradientProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ShaderGradient({ className = "", style }: ShaderGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) {
      console.warn("WebGL not available");
      return;
    }

    // Compile shaders
    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      let w = canvas.clientWidth * dpr;
      let h = canvas.clientHeight * dpr;

      if (w <= 0) w = window.innerWidth * dpr;
      if (h <= 0) h = (canvas.parentElement?.clientHeight || window.innerHeight) * dpr;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const handleResize = () => {
      resize();
    };
    window.addEventListener("resize", handleResize);

    const render = (time: number) => {
      if (isVisible) {
        resize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(uTime, time * 0.001);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        ...style,
      }}
    />
  );
}
