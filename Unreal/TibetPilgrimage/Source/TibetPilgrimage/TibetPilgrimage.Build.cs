using UnrealBuildTool;

public class TibetPilgrimage : ModuleRules
{
    public TibetPilgrimage(ReadOnlyTargetRules Target) : base(Target)
    {
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
