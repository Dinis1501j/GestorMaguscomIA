// For screenshots with light gutters, snap side-by-side photos to their visible
// edges. Leave other layouts alone so approximate model boxes remain editable.
export function refinePhotoColumns({ data, width, height }, photos) {
  if (photos.length < 2 || photos.length > 6) return photos;
  const centers = photos.map((p) => p.y + p.height / 2);
  if (Math.max(...centers) - Math.min(...centers) > 0.15) return photos;
  const top = Math.max(0, Math.floor(Math.min(...photos.map((p) => p.y)) * height));
  const bottom = Math.min(
    height,
    Math.ceil(Math.max(...photos.map((p) => p.y + p.height)) * height),
  );
  if (bottom - top < height * 0.2) return photos;
  const colored = (x, y) => {
    const i = (y * width + x) * 4;
    return (
      data[i + 3] > 200 && !(data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235)
    );
  };
  const runs = (flags) => {
    const found = [];
    let start = -1;
    for (let i = 0; i <= flags.length; i++) {
      if (flags[i] && start < 0) start = i;
      if (!flags[i] && start >= 0) {
        found.push([start, i]);
        start = -1;
      }
    }
    return found;
  };
  const columns = runs(
    Array.from({ length: width }, (_, x) => {
      let count = 0;
      for (let y = top; y < bottom; y++) if (colored(x, y)) count++;
      return count / (bottom - top) > 0.65;
    }),
  ).filter(([a, b]) => b - a > width * 0.1);
  if (columns.length !== photos.length) return photos;
  const boxes = [];
  for (const [left, right] of columns) {
    const rows = runs(
      Array.from({ length: height }, (_, y) => {
        let count = 0;
        for (let x = left; x < right; x++) if (colored(x, y)) count++;
        return count / (right - left) > 0.65;
      }),
    )
      .filter(([a, b]) => b - a > height * 0.2 && b > top && a < bottom)
      .sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
    if (!rows.length) return photos;
    const [y, end] = rows[0];
    boxes.push({
      x: left / width,
      y: y / height,
      width: (right - left) / width,
      height: (end - y) / height,
    });
  }
  const order = photos.map((p, i) => ({ i, x: p.x })).sort((a, b) => a.x - b.x),
    result = photos.slice();
  order.forEach(({ i }, index) => (result[i] = boxes[index]));
  return result;
}
