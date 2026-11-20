using UnrealBuildTool;

public class StupaPilgrimageEditorTarget : TargetRules
{
    public StupaPilgrimageEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_7;
        ExtraModuleNames.Add("StupaPilgrimage");
    }
}
