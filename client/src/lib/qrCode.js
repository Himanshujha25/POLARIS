// Lightweight Polar Logistics QR & Barcode Generator for Containers
// Generates clean SVG representation for container labels and customs manifests

// Simple 2D matrix encoder for robust tracking identifiers
export function generateLogisticsCodeSVG(payload, size = 180) {
  const str = String(payload || 'POLARIS');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  // 21x21 QR-like matrix with standard corner finder patterns
  const matrixSize = 21;
  const grid = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));

  // 1. Draw standard Finder Patterns (top-left, top-right, bottom-left)
  function drawFinder(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          grid[startY + r][startX + c] = 1;
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // 2. Timing patterns
  for (let i = 8; i < 13; i++) {
    grid[6][i] = i % 2 === 0 ? 1 : 0;
    grid[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 3. Deterministic data encoding based on payload
  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Don't overwrite finder patterns
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c > 12;
      const inBottomLeft = r > 12 && c < 8;
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        const charCode = str.charCodeAt(bitIndex % str.length);
        const bitVal = ((charCode ^ (r * 7 + c * 13 + hash)) >> (bitIndex % 8)) & 1;
        grid[r][c] = bitVal;
        bitIndex++;
      }
    }
  }

  // Build SVG path
  const cellSize = size / matrixSize;
  const rects = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (grid[r][c] === 1) {
        rects.push(
          `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#0f172a" />`
        );
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="bg-white p-2 rounded">
      <rect width="${size}" height="${size}" fill="#ffffff" />
      ${rects.join('')}
    </svg>
  `;
}
