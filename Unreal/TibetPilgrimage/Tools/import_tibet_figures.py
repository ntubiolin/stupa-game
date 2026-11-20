"""Import original Blender figures before cooking the pilgrimage maps."""
import json
import sys
from pathlib import Path
import unreal

def import_meshes():
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from generate_effect_material import generate
    generate()
    source = Path(__file__).resolve().parents[1] / "Assets" / "Figures"
    counts = json.loads((source / "triangle-counts.json").read_text())
    mesh_editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    assets = unreal.AssetToolsHelpers.get_asset_tools()
    tasks = []
    for filename in sorted(source.glob("*.fbx")):
        task = unreal.AssetImportTask()
        task.filename = str(filename)
        task.destination_path = "/Game/Figures"
        task.destination_name = filename.stem
        task.automated = True
        task.replace_existing = True
        task.save = True
        options = unreal.FbxImportUI()
        options.import_as_skeletal = False
        options.import_materials = True
        options.import_textures = False
        options.static_mesh_import_data.combine_meshes = True
        options.static_mesh_import_data.auto_generate_collision = False
        task.options = options
        tasks.append(task)
    if len(tasks) != 13:
        raise RuntimeError(f"Expected thirteen generated figure meshes in {source}, found {len(tasks)}")
    assets.import_asset_tasks(tasks)
    for task in tasks:
        mesh = unreal.load_asset("/Game/Figures/" + Path(task.filename).stem)
        if not isinstance(mesh, unreal.StaticMesh):
            raise RuntimeError(f"Static mesh failed import: {task.filename}")
        before = mesh.get_num_triangles(0)
        settings = mesh_editor.get_nanite_settings(mesh)
        previous_nanite = settings.get_editor_property("enabled")
        settings.set_editor_property("enabled", False)
        settings.set_editor_property("fallback_relative_error", 0.0)
        settings.set_editor_property("fallback_percent_triangles", 1.0)
        mesh_editor.set_nanite_settings(mesh, settings, True)
        after = mesh.get_num_triangles(0)
        expected = counts[Path(task.filename).stem]
        unreal.log(f"TIBET_FIGURE {mesh.get_name()} Blender={expected} import={before} Nanite={previous_nanite} retained={after}")
        if after < expected * 0.95:
            raise RuntimeError(f"Figure {mesh.get_name()} lost detail: {after}/{expected}")
    unreal.EditorAssetLibrary.save_directory("/Game/Figures")

if __name__ == "__main__":
    import_meshes()
