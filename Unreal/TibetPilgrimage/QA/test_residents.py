"""Check resident casting against authored quests and, optionally, a real packaged journey."""
import argparse
import json
import re
import sys
from tempfile import TemporaryDirectory
import unittest
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CPP = ROOT / 'Source/TibetPilgrimage'
PLACEMENTS = defaultdict(dict)
for area, person, mesh, x, y in re.findall(
        r'\{TEXT\("(.*?)"\), TEXT\("(.*?)"\), TEXT\("(.*?)"\), \{(-?\d+), (-?\d+), 0\}(?:, TEXT\("\w+"\))?\}',
        (CPP/'TibetResidents.inl').read_text()):
    assert person not in PLACEMENTS[area], (area, person)
    PLACEMENTS[area][person] = (mesh, int(x), int(y))

ROUTES = {}
for line in (CPP/'TibetRoute.inl').read_text().splitlines():
    if match := re.search(r'^    \{TEXT\("(\w+)"\), \{',line):
        route = match[1]
        ROUTES[route] = []
    if line.startswith('        {EObjective::'):
        kind = re.search(r'EObjective::(\w+)',line)[1]
        person = re.search(r', TEXT\("([\w.]+)"\)\},$',line) if kind in ('Talk','Escort') else None
        ROUTES[route].append((kind,person[1] if person else None))


class CastTests(unittest.TestCase):
    def test_every_dialogue_has_a_resident(self):
        for route,steps in ROUTES.items():
            area = {'return':'chimphu','ending':'stupa'}.get(route,route)
            for kind,person in steps:
                if kind in ('Talk','Escort'):
                    self.assertIn(person, PLACEMENTS[area], (route,kind))

    def test_costumes_anchors_and_assets(self):
        manifest=json.loads((ROOT/'Assets/Figures/triangle-counts.json').read_text())
        self.assertEqual({p.stem for p in (ROOT/'Assets/Figures').glob('*.fbx')}, set(manifest))
        for area,cast in PLACEMENTS.items():
            positions=set()
            for person,(model,x,y) in cast.items():
                self.assertGreater(manifest[model],1000)
                self.assertNotIn((x,y),positions,(area,person))
                positions.add((x,y))
                if person in ('oldLama','palaceKeeper','shantarakshita'):
                    self.assertEqual(model,'Guide')
                else:
                    self.assertNotEqual(model,'Guide')

    def test_visible_actor_must_survive_the_next_objective(self):
        initial = """TIBET_RESIDENT_LEVEL map=stupa route=stupa
TIBET_RESIDENT_READY id=oldLama model=Guide actor=8
TIBET_RESIDENT_ACTIVE id=oldLama actor=8 step=0
TIBET_CAST_SNAPSHOT step=0
TIBET_CAST_VISIBLE actor=8 model=Guide
TIBET_CAST_SNAPSHOT step=1
"""
        with TemporaryDirectory() as out:
            path=Path(out)/'game.log'
            path.write_text(initial+'TIBET_CAST_VISIBLE actor=8 model=Guide')
            self.assertEqual(check_log(path), ['stupa'])
            path.write_text(initial)
            with self.assertRaises(AssertionError): check_log(path)
            path.write_text(initial+'TIBET_CAST_VISIBLE actor=9 model=Guide')
            with self.assertRaises((KeyError, AssertionError)): check_log(path)


def check_log(path, require_delivery=False):
    ready, shown = {}, None
    areas, delivery, observed = [], False, False
    def finish_snapshot():
        if shown is not None:
            assert shown == ready, f'{path}, {area} step {step}: visible {shown}, loaded {ready}'
    for line in path.read_text(errors='replace').splitlines():
        if m := re.search(r'TIBET_RESIDENT_LEVEL map=(\w+) route=(\w+)',line):
            finish_snapshot()
            area, route = m.groups()
            areas.append(area)
            ready, shown = {}, None
        elif m := re.search(r'TIBET_RESIDENT_READY id=(\S+) model=(\w+) actor=(\d+)',line):
            person, model, actor = m.groups()
            assert shown is None and actor not in ready and person not in [x[0] for x in ready.values()]
            assert PLACEMENTS[area][person][0] == model
            ready[actor]=(person,model)
        elif m := re.search(r'TIBET_RESIDENT_ACTIVE id=(\S+) actor=(\d+) step=(\d+)',line):
            person, actor, current = m.groups()
            assert ready[actor][0] == person == ROUTES[route][int(current)][1]
        elif m := re.search(r'TIBET_CAST_SNAPSHOT step=(\d+)',line):
            finish_snapshot()
            observed = True
            step = int(m[1])
            assert {p for p,_ in ready.values()} == set(PLACEMENTS[area]), (area,step)
            shown={}
        elif m := re.search(r'TIBET_CAST_VISIBLE actor=(\d+) model=(\w+)',line):
            actor,model=m.groups()
            assert actor not in shown and ready[actor][1] == model, (area,actor,model)
            shown[actor] = ready[actor]
        elif m := re.search(r'TIBET_RESIDENT_DELIVERED actor=(\d+)',line):
            assert ready[m[1]][0] == 'messenger'
            delivery=True
    assert areas and observed, path
    finish_snapshot()
    assert delivery or not require_delivery, 'Missing delivery of the original messenger actor'
    return areas


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--journey', type=Path, help='Output from test_package.py play')
    args,remaining=parser.parse_known_args()
    tests=unittest.main(argv=[sys.argv[0],*remaining],exit=False)
    if not tests.result.wasSuccessful(): sys.exit(1)
    if args.journey:
        for probe in ('checkpoint','first-lamp','campaign','grove'):
            areas=check_log(args.journey/probe/'game.log',require_delivery=probe=='campaign')
            if probe=='campaign':
                expected=['stupa','wild','pharping','mangyul','yarlung','samye','chimphu','terma1','terma2','terma3','chimphu','stupa']
                assert areas==expected,areas
            print(probe,' → '.join(areas))
