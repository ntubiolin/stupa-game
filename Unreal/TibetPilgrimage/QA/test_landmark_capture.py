"""Regression checks for missing scene geometry during packaged landmark photography."""
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

import test_package as qa


class LandmarkTests(unittest.TestCase):
    def test_horizon_needs_horizontal_detail_in_the_play_area(self):
        with tempfile.TemporaryDirectory() as temp:
            image = Path(temp) / 'sample.bmp'
            width, height = 192, 120
            pitch = width * 3
            bitmap_header = struct.pack('<2sIHHI', b'BM', 54 + height*pitch, 0, 0, 54)
            dib_header = struct.pack('<IiiHHIIiiII', 40, width, -height, 1, 24, 0, height*pitch, 0, 0, 0, 0)
            for geometry in [False, True]:
                pixels = bytearray()
                for y in range(height):
                    for x in range(width):
                        base = 100 if y >= 50 else 170
                        if geometry and y >= 60:
                            base += 80 * ((x // 5) % 2)
                        pixels.extend([base,base,base])
                image.write_bytes(bitmap_header + dib_header + pixels)
                self.assertEqual(qa.landmark_detail(image) >= qa.MIN_LANDMARK_DETAIL, geometry)

    def test_retry_keeps_rejected_frames_out_of_the_selected_view(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            def capture(_, stage, dest, name, *unused):
                (dest / name).mkdir()
                (dest / name / 'capture.png').write_text(name)
            view = dict(id='stupa', ueEye=[0,0,0], ueLook=[1,0,0])
            with patch.object(qa, 'capture', side_effect=capture), \
                    patch.object(qa, 'landmark_detail', side_effect=[0.1, 3.5]):
                qa.capture_landmark(None, output, output, view, 'isolated')
            self.assertEqual((output/'stupa/capture.png').read_text(), 'stupa-attempt-2')
            self.assertTrue((output/'rejected/stupa/capture.png').is_file())


if __name__ == '__main__':
    unittest.main()
