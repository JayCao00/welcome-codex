"""Optional asset authoring: trace the medial graph of the licensed SVG mask.

Input: build/knot-mask.png rendered at 1024px from Bootstrap's openai.svg.
Requires Pillow, numpy, scipy and scikit-image; playback has no dependencies.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import convolve, label
from skimage.morphology import skeletonize
from skimage.measure import approximate_polygon

mask = np.array(Image.open('build/knot-mask.png'))[:, :, 3] > 128
skeleton = skeletonize(mask)
degree = convolve(skeleton.astype(int), np.ones((3, 3), int), mode='constant') - skeleton
nodes, count = label(skeleton & (degree != 2), structure=np.ones((3, 3)))
centers = [None] + [np.argwhere(nodes == i).mean(axis=0) for i in range(1, count+1)]
visited = set()
edges = []


def neighbors(pixel):
    y, x = pixel
    return [(y+dy, x+dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
            if (dy or dx) and 0 <= y+dy < mask.shape[0] and 0 <= x+dx < mask.shape[1]
            and skeleton[y+dy, x+dx]]


for node_id in range(1, count+1):
    for seed in map(tuple, np.argwhere(nodes == node_id)):
        for following in neighbors(seed):
            if nodes[following] or (seed, following) in visited:
                continue
            points = [tuple(centers[node_id]), seed]
            previous, current = seed, following
            while True:
                visited.add((previous, current))
                visited.add((current, previous))
                points.append(current)
                destination = int(nodes[current])
                if destination:
                    points.append(tuple(centers[destination]))
                    break
                options = [p for p in neighbors(current) if p != previous]
                if len(options) != 1:
                    raise RuntimeError(f'Unexpected graph degree at {current}')
                previous, current = current, options[0]
            if len(points) > 8:
                reduced = approximate_polygon(np.array(points), tolerance=1.4)
                edges.append({'from': node_id, 'to': destination,
                              'points': [[round(float(x)/64, 4), round(float(y)/64, 4)] for y, x in reduced]})

graph = {'nodes': [[round(float(x)/64, 4), round(float(y)/64, 4)] for y, x in centers[1:]], 'edges': edges}
Path('build/knot-graph.json').write_text(json.dumps(graph, indent=2))
outer = [1, 4, 11, 12, 9, 2]
inner = [5, 3, 6, 8, 10, 7]
routes = []
for i in range(6):
    route = [outer[i], outer[(i+1) % 6], inner[(i+1) % 6], inner[(i+2) % 6]]
    points = []
    for start, end in zip(route, route[1:]):
        edge = next(e for e in edges if {e['from'], e['to']} == {start, end})
        segment = edge['points'] if edge['from'] == start else list(reversed(edge['points']))
        points.extend(segment if not points else segment[1:])
    routes.append(points)
Path('knot-paths.js').write_text(
    '/* Medial paths adapted from Bootstrap Icons, MIT. See THIRD_PARTY_NOTICES.md. */\n'
    + 'window.WelcomeJayKnot = ' + json.dumps(routes, separators=(',', ':')) + ';\n')
print(json.dumps({'nodes': graph['nodes'], 'edges': [[e['from'], e['to'], len(e['points'])] for e in edges]}))
image = Image.new('RGB', (1024, 1024))
draw = ImageDraw.Draw(image)
for edge in edges:
    points = [(int(x*64), int(y*64)) for x, y in edge['points']]
    draw.line(points, fill='#96daed', width=8)
for i, center in enumerate(graph['nodes'], 1):
    x, y = [int(v*64) for v in center]
    draw.ellipse((x-7,y-7,x+7,y+7), fill='#ff7777')
    draw.text((x+8,y), str(i), fill='white')
image.save('build/knot-graph.png')
