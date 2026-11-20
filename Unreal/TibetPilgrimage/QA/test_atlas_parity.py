"""Detect source route movement or dropped native waystations without launching UE."""
from pathlib import Path
import re
import unittest


class AtlasParity(unittest.TestCase):
    def test_native_coordinates_and_edges_match_the_web_pilgrimage(self):
        project = Path(__file__).resolve().parents[1]
        source = (project.parents[1] / 'src/ui/worldmap.js').read_text().split('...JAPAN_MAP_IDS')[0]
        native = (project / 'Source/TibetPilgrimage/TibetAtlasNodes.inl').read_text()
        nodes = re.findall(r"id: '([^']+)'.*?nx: ([\d.]+),\s*ny: ([\d.]+),.*?connectsTo: \[([^\]]*)\]",
                           source, re.S)
        positions = re.findall(r'\{([\d.]+)f, ([\d.]+)f, TEXT\(', native)
        self.assertEqual(len(nodes), 9)
        self.assertEqual(positions, [(x, y) for _, x, y, _ in nodes])
        ids = [node[0] for node in nodes]
        edges = {tuple(sorted((i, ids.index(target)))) for i, (_, _, _, to) in enumerate(nodes)
                 for target in re.findall(r"'([^']+)'", to)}
        vertex_pairs = re.findall(r'\{(\d+),(\d+)\}', native)
        self.assertEqual(edges, {tuple(sorted(map(int, pair))) for pair in vertex_pairs})


if __name__ == '__main__':
    unittest.main()
