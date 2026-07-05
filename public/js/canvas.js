// Handles capturing pointer input as normalized stroke data, and rendering
// strokes (local or remote) onto the shared canvas.

const CanvasEngine = (() => {
  let canvas, ctx;
  let drawingEnabled = false;
  let currentStroke = null;
  let onStrokeCompleteCb = null;

  const STROKE_COLOR = "#1B1B1F";
  const STROKE_WIDTH = 3;

  function init(canvasEl, { onStrokeComplete }) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    onStrokeCompleteCb = onStrokeComplete;

    // Keep the internal pixel size fixed; CSS scales it visually, so we
    // convert to normalized (0-1) coords for network transport.
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function setDrawingEnabled(enabled) {
    drawingEnabled = enabled;
  }

  function getRelativePoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    return { x, y };
  }

  function handlePointerDown(evt) {
    if (!drawingEnabled) return;
    currentStroke = { points: [getRelativePoint(evt)], color: STROKE_COLOR, width: STROKE_WIDTH };
  }

  function handlePointerMove(evt) {
    if (!drawingEnabled || !currentStroke) return;
    currentStroke.points.push(getRelativePoint(evt));
    renderStroke(currentStroke);
  }

  function handlePointerUp() {
    if (!currentStroke) return;
    if (currentStroke.points.length > 1 && onStrokeCompleteCb) {
      onStrokeCompleteCb(currentStroke);
    }
    currentStroke = null;
  }

  // Draws only the newest segment for cheap live rendering.
  function renderStroke(strokeData) {
    const pts = strokeData.points;
    if (pts.length < 2) return;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    ctx.strokeStyle = strokeData.color || STROKE_COLOR;
    ctx.lineWidth = strokeData.width || STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
  }

  // Draws a complete stroke in one go (used when a remote stroke arrives).
  function renderFullStroke(strokeData) {
    const pts = strokeData.points;
    if (pts.length < 2) return;
    ctx.strokeStyle = strokeData.color || STROKE_COLOR;
    ctx.lineWidth = strokeData.width || STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
    }
    ctx.stroke();
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { init, setDrawingEnabled, renderFullStroke, clear };
})();
