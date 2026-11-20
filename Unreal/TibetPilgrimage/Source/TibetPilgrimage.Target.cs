using UnrealBuildTool;

public class TibetPilgrimageTarget : TargetRules
{
    public TibetPilgrimageTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.Add("TibetPilgrimage");
    }
}
