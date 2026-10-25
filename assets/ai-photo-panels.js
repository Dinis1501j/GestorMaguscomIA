// Only clear, continuous light gutters split an enclosing collage rectangle.
export function splitPhotoPanels({ data, width, height }, region) {
  function split(box, axis) {
    const horizontal = axis === 'x',
      size = horizontal ? width : height;
    const crossSize = horizontal ? height : width;
    const start = Math.max(0, Math.floor(box[axis] * size));
    const length = Math.floor(box[horizontal ? 'width' : 'height'] * size);
    const crossAxis = horizontal ? 'y' : 'x',
      crossLength = horizontal ? 'height' : 'width';
    const crossStart = Math.ceil((box[crossAxis] + box[crossLength] * 0.06) * crossSize);
    const crossEnd = Math.floor((box[crossAxis] + box[crossLength] * 0.94) * crossSize);
    if (length < 100 || crossEnd - crossStart < 50) return [box];
    const runs = [];
    let run = null;
    for (let position = start; position <= start + length; position++) {
      let light = 0,
        total = 0;
      for (let cross = crossStart; cross < crossEnd; cross += 3) {
        const x = horizontal ? position : cross,
          y = horizontal ? cross : position;
        if (x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        total++;
        if (data[i + 3] > 200 && data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240)
          light++;
      }
      const gutter = total > 0 && light / total > 0.985;
      if (gutter && run === null) run = position;
      if ((!gutter || position === start + length) && run !== null) {
        runs.push([run, position]);
        run = null;
      }
    }
    const gaps = runs.filter(
      ([a, b]) =>
        a > start + length * 0.1 &&
        b < start + length * 0.9 &&
        b - a >= Math.max(4, length * 0.012),
    );
    if (!gaps.length || gaps.length > 5) return [box];
    const spans = [];
    let begin = start;
    for (const [a, b] of gaps) {
      spans.push([begin, a]);
      begin = b;
    }
    spans.push([begin, start + length]);
    if (spans.some(([a, b]) => b - a < length * 0.15)) return [box];
    return spans.map(([a, b]) => ({
      ...box,
      [axis]: a / size,
      [horizontal ? 'width' : 'height']: (b - a) / size,
    }));
  }
  return split(region, 'x').flatMap((box) => split(box, 'y'));
}
