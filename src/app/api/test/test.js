const cv = require('@u4/opencv4nodejs');
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');

class DobotVectorizer {
  constructor(config) {
    this.config = config;
    this.originalImage = null;
    this.vectorContours = [];
    this.currentMode = 'image';
    this.textCanvasWidth = 10000;
    this.textCanvasHeight = 5000;
    this.maxFontSize = 3000;
  }

  async loadImage(filePath) {
    const img = await cv.imreadAsync(filePath, cv.IMREAD_GRAYSCALE);
    if (img.empty) throw new Error(`Cannot read image: ${filePath}`);
    this.originalImage = img;
    this.currentMode = 'image';
  }

  async generateText(text, fontPath, scalePercent = 100) {
    registerFont(fontPath, { family: 'CustomFont' });
    const scale = scalePercent / 100;
    const canvas = createCanvas(this.textCanvasWidth, this.textCanvasHeight);
    const ctx = canvas.getContext('2d');

    const bestSize = this.findBestFontSize(ctx, text, fontPath, scale);
    const actualSize = Math.max(1, Math.round(bestSize * scale));

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${actualSize}px "CustomFont"`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = actualSize * 1.2;
    const x = (canvas.width - textWidth) / 2;
    const y = (canvas.height - textHeight) / 2;
    ctx.fillText(text, x, y);

    // Crop
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let row = 0; row < canvas.height; row++) {
      for (let col = 0; col < canvas.width; col++) {
        const idx = (row * canvas.width + col) * 4;
        if (data[idx] < 128) {
          if (col < minX) minX = col;
          if (col > maxX) maxX = col;
          if (row < minY) minY = row;
          if (row > maxY) maxY = row;
        }
      }
    }
    if (maxX < minX || maxY < minY) throw new Error('No text rendered');

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding);
    maxY = Math.min(canvas.height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const croppedBuffer = Buffer.alloc(cropWidth * cropHeight);
    for (let row = 0; row < cropHeight; row++) {
      for (let col = 0; col < cropWidth; col++) {
        const srcIdx = ((minY + row) * canvas.width + (minX + col)) * 4;
        croppedBuffer[row * cropWidth + col] = data[srcIdx];
      }
    }
    const mat = new cv.Mat(cropHeight, cropWidth, cv.CV_8UC1, croppedBuffer);
    this.originalImage = mat;
    this.currentMode = 'text';
  }

  findBestFontSize(ctx, text, fontPath, scale) {
    const targetW = this.textCanvasWidth * 0.90;
    const targetH = this.textCanvasHeight * 0.80;
    let low = 10, high = this.maxFontSize, best = 10;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const size = Math.max(1, Math.round(mid * scale));
      ctx.font = `${size}px "CustomFont"`;
      const metrics = ctx.measureText(text);
      const w = metrics.width;
      const h = size * 1.2;
      if (w <= targetW && h <= targetH) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  morphologicalSkeleton(binary) {
    const kernel = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(3, 3));
    let img = binary.copy();
    const skeleton = cv.Mat.zeros(img.rows, img.cols, img.type);
    while (true) {
      const eroded = img.erode(kernel);
      const opened = eroded.dilate(kernel);
      const temp = img.subtract(opened);
      cv.bitwiseOr(skeleton, temp, skeleton);
      img = eroded;
      if (cv.countNonZero(img) === 0) break;
    }
    return skeleton;
  }

  generateVector(simplify = 1.0, minLength = 3) {
    if (!this.originalImage) throw new Error('No image loaded.');

    let contourMats;
    if (this.currentMode === 'text') {
      const binary = this.originalImage.threshold(127, 255, cv.THRESH_BINARY_INV);
      const result = binary.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_NONE);
      contourMats = result.contours;
    } else {
      const binary = this.originalImage.threshold(127, 255, cv.THRESH_BINARY_INV);
      const skeleton = this.morphologicalSkeleton(binary);
      const result = skeleton.findContours(cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
      contourMats = result.contours;
    }

    const closed = this.currentMode === 'text';
    const valid = [];
    for (const c of contourMats) {
      const length = cv.arcLength(c, closed);
      if (length < minLength) continue;
      const epsilon = (simplify / 100.0) * length;
      const approx = cv.approxPolyDP(c, epsilon, closed);
      if (approx.rows >= 2) {
        const pts = this.matToPoints(approx);
        valid.push(pts);
      }
    }
    this.vectorContours = this.optimizeContourOrder(valid);
  }

  matToPoints(mat) {
    const data = mat.getDataAsArray(); // [[x, y], [x, y], ...]
    return data.map(row => ({ x: row[0], y: row[1] }));
  }

  optimizeContourOrder(contours) {
    if (contours.length === 0) return [];
    const remaining = contours.map(c => c.slice());
    const ordered = [];
    let currentPoint = null;
    while (remaining.length > 0) {
      if (currentPoint === null) {
        const c = remaining.shift();
        ordered.push(c);
        currentPoint = c[c.length - 1];
      } else {
        let bestIdx = 0, bestDist = Infinity, reverse = false;
        for (let i = 0; i < remaining.length; i++) {
          const c = remaining[i];
          const d1 = this.dist(c[0], currentPoint);
          const d2 = this.dist(c[c.length - 1], currentPoint);
          if (d1 < bestDist) { bestDist = d1; bestIdx = i; reverse = false; }
          if (d2 < bestDist) { bestDist = d2; bestIdx = i; reverse = true; }
        }
        let chosen = remaining.splice(bestIdx, 1)[0];
        if (reverse) chosen = chosen.reverse();
        ordered.push(chosen);
        currentPoint = chosen[chosen.length - 1];
      }
    }
    return ordered;
  }

  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  pixelToRobot(x, y, imgW, imgH) {
    const { maxWidthMM, maxHeightMM, robotXMin, robotXMax, robotYMin, robotYMax, scaleFactor, mirrorY } = this.config;
    if (mirrorY) x = imgW - x;

    const baseScale = Math.min(maxWidthMM / imgW, maxHeightMM / imgH);
    let px = x * baseScale;
    let py = (imgH - y) * baseScale;
    px *= scaleFactor;
    py *= scaleFactor;
    const scaledW = imgW * baseScale * scaleFactor;
    const scaledH = imgH * baseScale * scaleFactor;
    const offsetX = (maxWidthMM - scaledW) / 2;
    const offsetY = (maxHeightMM - scaledH) / 2;
    px += offsetX;
    py += offsetY;

    const rx = robotXMin + (py / maxHeightMM) * (robotXMax - robotXMin);
    const ry = robotYMin + (px / maxWidthMM) * (robotYMax - robotYMin);
    return [
      Math.max(robotXMin, Math.min(robotXMax, rx)),
      Math.max(robotYMin, Math.min(robotYMax, ry))
    ];
  }

  saveCoordinates(outputPath) {
    if (this.vectorContours.length === 0) throw new Error('No vector data.');
    if (!this.originalImage) throw new Error('No image.');

    const imgH = this.originalImage.rows;
    const imgW = this.originalImage.cols;
    const lines = [];
    const { zHover, zDraw } = this.config;

    for (const contour of this.vectorContours) {
      if (contour.length < 2) continue;
      let lastX, lastY;
      for (let i = 0; i < contour.length; i++) {
        const pt = contour[i];
        const [rx, ry] = this.pixelToRobot(pt.x, pt.y, imgW, imgH);
        lastX = rx; lastY = ry;
        if (i === 0) {
          lines.push(`[${rx.toFixed(1)}, ${ry.toFixed(1)}, ${zHover}, 0, 0]`);
          lines.push(`[${rx.toFixed(1)}, ${ry.toFixed(1)}, ${zDraw}, 1, 1]`);
        } else {
          lines.push(`[${rx.toFixed(1)}, ${ry.toFixed(1)}, ${zDraw}, 0, 0]`);
        }
      }
      lines.push(`[${lastX.toFixed(1)}, ${lastY.toFixed(1)}, ${zHover}, 1, 0]`);
    }
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  }
}

module.exports = { DobotVectorizer };