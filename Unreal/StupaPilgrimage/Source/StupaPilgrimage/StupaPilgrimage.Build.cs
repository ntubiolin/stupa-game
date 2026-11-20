using UnrealBuildTool;

public class StupaPilgrimage : ModuleRules
{
    public StupaPilgrimage(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core", "CoreUObject", "Engine", "InputCore", "UMG"
        });
        PrivateDependencyModuleNames.AddRange(new[]
        {
            "Json", "JsonUtilities", "Slate", "SlateCore"
        });
    }
}
