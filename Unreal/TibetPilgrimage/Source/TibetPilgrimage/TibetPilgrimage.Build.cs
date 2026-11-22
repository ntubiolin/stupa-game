using UnrealBuildTool;

public class TibetPilgrimage : ModuleRules
{
    public TibetPilgrimage(ReadOnlyTargetRules Target) : base(Target)
    {
        if (Target.Platform == UnrealTargetPlatform.Mac || Target.Platform == UnrealTargetPlatform.IOS)
            PublicFrameworks.Add("AVFoundation");
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core", "CoreUObject", "Engine", "InputCore", "UMG", "ApplicationCore"
        });
        PrivateDependencyModuleNames.AddRange(new[]
        {
            "Json", "JsonUtilities", "Slate", "SlateCore", "ProceduralMeshComponent"
        });
    }
}
