/* Dasa Fun World — splash cursor: a colourful WebGL fluid that follows the mouse and the finger.
   Adapted from the MIT-licensed WebGL Fluid Simulation by Pavel Dobryakov (the effect behind the viral "splash cursor").
   Draws on a fixed canvas with pointer-events:none, so it never blocks taps or clicks. Falls back to a sparkle trail. */
(function () {
  'use strict';
  var canvas = document.getElementById('splash');
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var api = { mode: 'off', paused: false, frames: 0, splats: 0 };
  window.DFWSplash = api;
  if (reduce) { canvas.style.display = 'none'; api.mode = 'reduced-motion'; return; }

  var small = coarse || Math.min(screen.width, screen.height) < 700;
  var config = {
    SIM_RESOLUTION: small ? 64 : 128,
    DYE_RESOLUTION: small ? 512 : 1024,
    DENSITY_DISSIPATION: 3.5,
    VELOCITY_DISSIPATION: 2,
    PRESSURE: 0.1,
    PRESSURE_ITERATIONS: small ? 12 : 20,
    CURL: 3,
    SPLAT_RADIUS: small ? 0.28 : 0.2,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLOR_UPDATE_SPEED: 10
  };
  var DPR_CAP = small ? 1 : 1.5;
  var COLOR_GAIN = small ? 0.24 : 0.15; // fingers send fewer move events than a mouse, so each splash is a little richer

  function Pointer() { this.id = -1; this.texcoordX = 0; this.texcoordY = 0; this.prevTexcoordX = 0; this.prevTexcoordY = 0; this.deltaX = 0; this.deltaY = 0; this.down = false; this.moved = false; this.color = generateColor(); }
  var pointers = [new Pointer()];

  function scaleByPixelRatio(v) { return Math.floor(v * Math.min(window.devicePixelRatio || 1, DPR_CAP)); }

  var ctx = initWebGL(canvas);
  if (!ctx) { sparkleFallback(); return; }
  var gl = ctx.gl, ext = ctx.ext;
  if (!ext.supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

  function initWebGL(c) {
    var params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, premultipliedAlpha: true };
    var g = null, isWebGL2 = false;
    try { g = c.getContext('webgl2', params); isWebGL2 = !!g; if (!g) g = c.getContext('webgl', params) || c.getContext('experimental-webgl', params); } catch (e) { g = null; }
    if (!g) return null;
    var halfFloat, supportLinearFiltering;
    if (isWebGL2) { g.getExtension('EXT_color_buffer_float'); supportLinearFiltering = g.getExtension('OES_texture_float_linear'); }
    else { halfFloat = g.getExtension('OES_texture_half_float'); supportLinearFiltering = g.getExtension('OES_texture_half_float_linear'); }
    g.clearColor(0, 0, 0, 0);
    var halfFloatTexType = isWebGL2 ? g.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);
    if (!halfFloatTexType) return null;
    var formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(g, g.RGBA16F, g.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(g, g.RG16F, g.RG, halfFloatTexType);
      formatR = getSupportedFormat(g, g.R16F, g.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(g, g.RGBA, g.RGBA, halfFloatTexType);
      formatRG = formatRGBA; formatR = formatRGBA;
    }
    if (!formatRGBA || !formatRG || !formatR) return null;
    return { gl: g, ext: { formatRGBA: formatRGBA, formatRG: formatRG, formatR: formatR, halfFloatTexType: halfFloatTexType, supportLinearFiltering: !!supportLinearFiltering } };
  }
  function getSupportedFormat(g, internalFormat, format, type) {
    if (!supportRenderTextureFormat(g, internalFormat, format, type)) {
      switch (internalFormat) {
        case g.R16F: return getSupportedFormat(g, g.RG16F, g.RG, type);
        case g.RG16F: return getSupportedFormat(g, g.RGBA16F, g.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat: internalFormat, format: format };
  }
  function supportRenderTextureFormat(g, internalFormat, format, type) {
    var texture = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, texture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texImage2D(g.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    var fbo = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texture, 0);
    var ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.deleteFramebuffer(fbo); g.deleteTexture(texture);
    return ok;
  }

  function compileShader(type, source, keywords) {
    if (keywords) source = keywords.map(function (k) { return '#define ' + k + '\n'; }).join('') + source;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function Program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.program = p; this.uniforms = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(p, i).name; this.uniforms[name] = gl.getUniformLocation(p, name); }
  }
  Program.prototype.bind = function () { gl.useProgram(this.program); };

  var baseVertexShader = compileShader(gl.VERTEX_SHADER, [
    'precision highp float;',
    'attribute vec2 aPosition;',
    'varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
    'uniform vec2 texelSize;',
    'void main () {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);',
    '  vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'].join('\n'));
  var HEAD = 'precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;\n';
  var copyShader = compileShader(gl.FRAGMENT_SHADER, HEAD + 'uniform sampler2D uTexture;\nvoid main () { gl_FragColor = texture2D(uTexture, vUv); }');
  var clearShader = compileShader(gl.FRAGMENT_SHADER, HEAD + 'uniform sampler2D uTexture; uniform float value;\nvoid main () { gl_FragColor = value * texture2D(uTexture, vUv); }');
  var displaySource = HEAD.replace('precision mediump float; precision mediump sampler2D;', 'precision highp float; precision highp sampler2D;') + [
    'uniform sampler2D uTexture; uniform vec2 texelSize;',
    'void main () {',
    '  vec3 c = texture2D(uTexture, vUv).rgb;',
    '#ifdef SHADING',
    '  vec3 lc = texture2D(uTexture, vL).rgb; vec3 rc = texture2D(uTexture, vR).rgb;',
    '  vec3 tc = texture2D(uTexture, vT).rgb; vec3 bc = texture2D(uTexture, vB).rgb;',
    '  float dx = length(rc) - length(lc); float dy = length(tc) - length(bc);',
    '  vec3 n = normalize(vec3(dx, dy, length(texelSize)));',
    '  float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);',
    '  c *= diffuse;',
    '#endif',
    '  float a = max(c.r, max(c.g, c.b));',
    '  gl_FragColor = vec4(c, a);',
    '}'].join('\n');
  var splatShader = compileShader(gl.FRAGMENT_SHADER, 'precision highp float; precision highp sampler2D;\nvarying vec2 vUv;\n' + [
    'uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;',
    'void main () {',
    '  vec2 p = vUv - point.xy; p.x *= aspectRatio;',
    '  vec3 splat = exp(-dot(p, p) / radius) * color;',
    '  vec3 base = texture2D(uTarget, vUv).xyz;',
    '  gl_FragColor = vec4(base + splat, 1.0);',
    '}'].join('\n'));
  var advectionShader = compileShader(gl.FRAGMENT_SHADER, 'precision highp float; precision highp sampler2D;\nvarying vec2 vUv;\n' + [
    'uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;',
    'vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {',
    '  vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);',
    '  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize); vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);',
    '  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize); vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);',
    '  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);',
    '}',
    'void main () {',
    '#ifdef MANUAL_FILTERING',
    '  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;',
    '  vec4 result = bilerp(uSource, coord, dyeTexelSize);',
    '#else',
    '  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;',
    '  vec4 result = texture2D(uSource, coord);',
    '#endif',
    '  float decay = 1.0 + dissipation * dt;',
    '  gl_FragColor = result / decay;',
    '}'].join('\n'), ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);
  var divergenceShader = compileShader(gl.FRAGMENT_SHADER, HEAD + [
    'uniform sampler2D uVelocity;',
    'void main () {',
    '  float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;',
    '  float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;',
    '  vec2 C = texture2D(uVelocity, vUv).xy;',
    '  if (vL.x < 0.0) { L = -C.x; } if (vR.x > 1.0) { R = -C.x; }',
    '  if (vT.y > 1.0) { T = -C.y; } if (vB.y < 0.0) { B = -C.y; }',
    '  float div = 0.5 * (R - L + T - B);',
    '  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);',
    '}'].join('\n'));
  var curlShader = compileShader(gl.FRAGMENT_SHADER, HEAD + [
    'uniform sampler2D uVelocity;',
    'void main () {',
    '  float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;',
    '  float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;',
    '  float vorticity = R - L - T + B;',
    '  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);',
    '}'].join('\n'));
  var vorticityShader = compileShader(gl.FRAGMENT_SHADER, 'precision highp float; precision highp sampler2D;\nvarying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;\n' + [
    'uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;',
    'void main () {',
    '  float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;',
    '  float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;',
    '  float C = texture2D(uCurl, vUv).x;',
    '  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
    '  force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;',
    '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
    '  velocity += force * dt;',
    '  velocity = min(max(velocity, -1000.0), 1000.0);',
    '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
    '}'].join('\n'));
  var pressureShader = compileShader(gl.FRAGMENT_SHADER, HEAD + [
    'uniform sampler2D uPressure; uniform sampler2D uDivergence;',
    'void main () {',
    '  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;',
    '  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;',
    '  float divergence = texture2D(uDivergence, vUv).x;',
    '  float pressure = (L + R + B + T - divergence) * 0.25;',
    '  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);',
    '}'].join('\n'));
  var gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, HEAD + [
    'uniform sampler2D uPressure; uniform sampler2D uVelocity;',
    'void main () {',
    '  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;',
    '  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;',
    '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
    '  velocity.xy -= vec2(R - L, T - B);',
    '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
    '}'].join('\n'));

  var copyProgram, clearProgram, splatProgram, advectionProgram, divergenceProgram, curlProgram, vorticityProgram, pressureProgram, gradienSubtractProgram, displayProgram;
  try {
    copyProgram = new Program(baseVertexShader, copyShader);
    clearProgram = new Program(baseVertexShader, clearShader);
    splatProgram = new Program(baseVertexShader, splatShader);
    advectionProgram = new Program(baseVertexShader, advectionShader);
    divergenceProgram = new Program(baseVertexShader, divergenceShader);
    curlProgram = new Program(baseVertexShader, curlShader);
    vorticityProgram = new Program(baseVertexShader, vorticityShader);
    pressureProgram = new Program(baseVertexShader, pressureShader);
    gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    displayProgram = new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, displaySource, config.SHADING ? ['SHADING'] : null));
  } catch (e) { console.warn('splash: WebGL program failed, using sparkles', e && e.message); sparkleFallback(); return; }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  function blit(target, clear) {
    if (target == null) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    else { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    if (clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  var dye, velocity, divergence, curl, pressure;
  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture: texture, fbo: fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
  }
  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    var f1 = createFBO(w, h, internalFormat, format, type, param), f2 = createFBO(w, h, internalFormat, format, type, param);
    return { width: w, height: h, texelSizeX: f1.texelSizeX, texelSizeY: f1.texelSizeY,
      get read() { return f1; }, set read(v) { f1 = v; }, get write() { return f2; }, set write(v) { f2 = v; },
      swap: function () { var t = f1; f1 = f2; f2 = t; } };
  }
  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    var n = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind(); gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0)); blit(n);
    return n;
  }
  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w; target.height = h; target.texelSizeX = 1 / w; target.texelSizeY = 1 / h;
    return target;
  }
  function getResolution(resolution) {
    var aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
    var min = Math.round(resolution), max = Math.round(resolution * aspectRatio);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }
  function initFramebuffers() {
    var simRes = getResolution(config.SIM_RESOLUTION), dyeRes = getResolution(config.DYE_RESOLUTION);
    var texType = ext.halfFloatTexType, rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
    var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = dye ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
              : createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    velocity = velocity ? resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
                        : createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  function resizeCanvas() {
    var w = scaleByPixelRatio(canvas.clientWidth || innerWidth), h = scaleByPixelRatio(canvas.clientHeight || innerHeight);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  resizeCanvas();
  initFramebuffers();
  api.mode = 'webgl';

  var lastUpdateTime = Date.now(), colorUpdateTimer = 0, running = false, lastInput = 0, rafId = 0;
  function wake() {
    lastInput = performance.now();
    if (!running && !api.paused && !document.hidden) { running = true; lastUpdateTime = Date.now(); rafId = requestAnimationFrame(updateFrame); }
  }
  function updateFrame() {
    if (api.paused || document.hidden) { running = false; return; }
    var dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render();
    api.frames++;
    // idle: after 4 s with no input the colours have long faded; stop drawing to save battery
    if (performance.now() - lastInput > 4000) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); running = false; return; }
    rafId = requestAnimationFrame(updateFrame);
  }
  function calcDeltaTime() { var now = Date.now(); var dt = (now - lastUpdateTime) / 1000; dt = Math.min(dt, 0.016666); lastUpdateTime = now; return dt; }
  function updateColors(dt) {
    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) { colorUpdateTimer = colorUpdateTimer % 1; pointers.forEach(function (p) { p.color = generateColor(); }); }
  }
  function applyInputs() { pointers.forEach(function (p) { if (p.moved) { p.moved = false; splatPointer(p); } }); }
  function step(dt) {
    gl.disable(gl.BLEND);
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);
    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write); velocity.swap();
    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);
    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write); pressure.swap();
    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (var i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }
    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();
    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    var velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write); velocity.swap();
    if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write); dye.swap();
  }
  function render() {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    displayProgram.bind();
    if (config.SHADING) gl.uniform2f(displayProgram.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    blit(null, true);
  }
  function splatPointer(p) { splat(p.texcoordX, p.texcoordY, p.deltaX * config.SPLAT_FORCE, p.deltaY * config.SPLAT_FORCE, p.color); }
  function clickSplat(p) {
    var c = generateColor(); c.r *= 10; c.g *= 10; c.b *= 10;
    splat(p.texcoordX, p.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), c);
  }
  function splat(x, y, dx, dy, color) {
    api.splats++;
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }
  function correctRadius(r) { var a = canvas.width / canvas.height; if (a > 1) r *= a; return r; }
  function correctDeltaX(d) { var a = canvas.width / canvas.height; if (a < 1) d *= a; return d; }
  function correctDeltaY(d) { var a = canvas.width / canvas.height; if (a > 1) d /= a; return d; }
  function updatePointerDownData(p, id, x, y) {
    p.id = id; p.down = true; p.moved = false;
    p.texcoordX = x / canvas.width; p.texcoordY = 1 - y / canvas.height;
    p.prevTexcoordX = p.texcoordX; p.prevTexcoordY = p.texcoordY; p.deltaX = 0; p.deltaY = 0;
    p.color = generateColor();
  }
  function updatePointerMoveData(p, x, y, color) {
    p.prevTexcoordX = p.texcoordX; p.prevTexcoordY = p.texcoordY;
    p.texcoordX = x / canvas.width; p.texcoordY = 1 - y / canvas.height;
    p.deltaX = correctDeltaX(p.texcoordX - p.prevTexcoordX);
    p.deltaY = correctDeltaY(p.texcoordY - p.prevTexcoordY);
    p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0;
    p.color = color;
  }

  // Input: listen on window (the canvas itself never takes pointer events)
  var first = true;
  window.addEventListener('mousedown', function (e) {
    if (api.paused) return;
    var p = pointers[0]; updatePointerDownData(p, -1, scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY));
    wake(); clickSplat(p);
  });
  window.addEventListener('mousemove', function (e) {
    if (api.paused) return;
    var p = pointers[0], x = scaleByPixelRatio(e.clientX), y = scaleByPixelRatio(e.clientY);
    if (first) { updatePointerDownData(p, -1, x, y); first = false; }
    updatePointerMoveData(p, x, y, p.color); wake();
  });
  window.addEventListener('touchstart', function (e) {
    if (api.paused) return;
    var t = e.targetTouches, p = pointers[0];
    for (var i = 0; i < t.length; i++) {
      updatePointerDownData(p, t[i].identifier, scaleByPixelRatio(t[i].clientX), scaleByPixelRatio(t[i].clientY));
      wake(); clickSplat(p);
    }
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (api.paused) return;
    var t = e.targetTouches, p = pointers[0];
    for (var i = 0; i < t.length; i++) updatePointerMoveData(p, scaleByPixelRatio(t[i].clientX), scaleByPixelRatio(t[i].clientY), p.color);
    wake();
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    var t = e.changedTouches;
    for (var i = 0; i < t.length; i++) if (pointers[0].id === t[i].identifier) pointers[0].down = false;
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) lastUpdateTime = Date.now(); });

  api.pause = function () { api.paused = true; cancelAnimationFrame(rafId); running = false; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); canvas.style.visibility = 'hidden'; };
  api.resume = function () { api.paused = false; canvas.style.visibility = ''; lastUpdateTime = Date.now(); };
  api.burst = function (cx, cy) { // a welcome swirl, used once on load
    if (api.paused) return;
    var p = pointers[0]; updatePointerDownData(p, -1, scaleByPixelRatio(cx), scaleByPixelRatio(cy)); wake();
    for (var i = 0; i < 5; i++) { var c = generateColor(); c.r *= 8; c.g *= 8; c.b *= 8; splat(p.texcoordX + (Math.random() - .5) * .2, p.texcoordY + (Math.random() - .5) * .2, 900 * (Math.random() - .5), 900 * (Math.random() - .5), c); }
  };

  function generateColor() { var c = HSVtoRGB(Math.random(), 1.0, 1.0); c.r *= COLOR_GAIN; c.g *= COLOR_GAIN; c.b *= COLOR_GAIN; return c; }
  function HSVtoRGB(h, s, v) {
    var r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
    return { r: r, g: g, b: b };
  }

  // Fallback when WebGL (or float textures) is missing: a light 2D sparkle trail
  function sparkleFallback() {
    var c2 = document.createElement('canvas'); c2.id = 'splash'; c2.className = canvas.className; c2.setAttribute('aria-hidden', 'true');
    canvas.parentNode.replaceChild(c2, canvas); canvas = c2;
    var g = canvas.getContext('2d'); if (!g) { api.mode = 'none'; return; }
    api.mode = 'sparkle';
    var parts = [], run = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    size(); addEventListener('resize', size);
    function add(x, y, n) {
      for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: (Math.random() - .5) * 2.4, vy: (Math.random() - .5) * 2.4 - .6, life: 1, h: (Date.now() / 8 + Math.random() * 60) % 360, s: 2 + Math.random() * 3 });
      if (parts.length > 220) parts.splice(0, parts.length - 220);
      if (!run && !api.paused) { run = true; requestAnimationFrame(tick); }
    }
    function tick() {
      if (api.paused || document.hidden) { run = false; return; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight); g.globalCompositeOperation = 'lighter';
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += .04; p.life -= .025;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        g.fillStyle = 'hsla(' + p.h + ',100%,65%,' + p.life + ')'; g.beginPath(); g.arc(p.x, p.y, p.s * p.life, 0, 6.283); g.fill();
      }
      api.frames++;
      if (parts.length) requestAnimationFrame(tick); else { run = false; g.clearRect(0, 0, innerWidth, innerHeight); }
    }
    addEventListener('mousemove', function (e) { if (!api.paused) add(e.clientX, e.clientY, 2); });
    addEventListener('touchmove', function (e) { if (api.paused) return; for (var i = 0; i < e.touches.length; i++) add(e.touches[i].clientX, e.touches[i].clientY, 3); }, { passive: true });
    addEventListener('touchstart', function (e) { if (api.paused) return; for (var i = 0; i < e.touches.length; i++) add(e.touches[i].clientX, e.touches[i].clientY, 14); }, { passive: true });
    api.pause = function () { api.paused = true; g.clearRect(0, 0, canvas.width, canvas.height); canvas.style.visibility = 'hidden'; };
    api.resume = function () { api.paused = false; canvas.style.visibility = ''; };
    api.burst = function (x, y) { add(x, y, 30); };
  }
})();
