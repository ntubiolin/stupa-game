"""Import original Blender figures before cooking the pilgrimage maps."""
from pathlib import Path
import unreal

def import_meshes():
    source = Path(__file__).resolve().parents[1] / "Assets" / "Figures"
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
    if len(tasks) != 9:
        raise RuntimeError(f"Expected nine generated figure meshes in {source}, found {len(tasks)}")
    assets.import_asset_tasks(tasks)
    for task in tasks:
        mesh = unreal.load_asset("/Game/Figures/" + Path(task.filename).stem)
        if not isinstance(mesh, unreal.StaticMesh):
            raise RuntimeError(f"Static mesh failed import: {task.filename}")
    unreal.EditorAssetLibrary.save_directory("/Game/Figures")

if __name__ == "__main__":
    import_meshes()
