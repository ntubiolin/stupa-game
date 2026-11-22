#include "Modules/ModuleManager.h"

#if PLATFORM_MAC
#include "GenericPlatform/GenericApplication.h"
#include "HAL/IConsoleManager.h"
#include "Misc/App.h"
#include "Misc/CommandLine.h"
#include "Misc/ConfigCacheIni.h"
#include "Misc/CoreMisc.h"
#include "Misc/Parse.h"
#include "UnrealEngine.h"
#endif

class FTibetPilgrimageModule final : public FDefaultGameModuleImpl
{
public:
    virtual void StartupModule() override
    {
        FDefaultGameModuleImpl::StartupModule();
#if PLATFORM_MAC
        // Runs after UGameUserSettings::PreloadResolutionSettings() and before GEngine->Init() / CreateGameWindow().
        // Avoids UE 5.8 FMacWindow::GetFullScreenInfo sign bug (MacWindow.cpp:243) in WindowedFullscreen/Fullscreen,
        // and avoids post-creation toggleFullScreen: Space transitions that leave Slate bAppIsActive false.
        if (!IsRunningCommandlet() && FApp::IsGame() && !GIsEditor &&
            !FParse::Param(FCommandLine::Get(), TEXT("RenderOffscreen")) &&
            !FParse::Param(FCommandLine::Get(), TEXT("ForceRes")))
        {
            FDisplayMetrics Metrics;
            FDisplayMetrics::RebuildDisplayMetrics(Metrics);
            const int32 WorkW = FMath::Max(1280, Metrics.PrimaryDisplayWorkAreaRect.Right - Metrics.PrimaryDisplayWorkAreaRect.Left);
            const int32 WorkH = FMath::Max(760, Metrics.PrimaryDisplayWorkAreaRect.Bottom - Metrics.PrimaryDisplayWorkAreaRect.Top);
            const int32 TargetW = FMath::Clamp(WorkW - 96, 1280, 1440);
            const int32 TargetH = FMath::Clamp(WorkH - 96, 760, 900);

            bool bFlushIni = false;
            if (GConfig && !GGameUserSettingsIni.IsEmpty())
            {
                const TCHAR* Section = TEXT("/Script/Engine.GameUserSettings");
                int32 ModeInt = int32(EWindowMode::Windowed);
                GConfig->GetInt(Section, TEXT("FullscreenMode"), ModeInt, GGameUserSettingsIni);
                if (ModeInt != int32(EWindowMode::Windowed) || GSystemResolution.WindowMode != EWindowMode::Windowed)
                {
                    GConfig->SetInt(Section, TEXT("Version"), 5, GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("FullscreenMode"), int32(EWindowMode::Windowed), GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("LastConfirmedFullscreenMode"), int32(EWindowMode::Windowed), GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("PreferredFullscreenMode"), int32(EWindowMode::Windowed), GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("ResolutionSizeX"), TargetW, GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("ResolutionSizeY"), TargetH, GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("LastUserConfirmedResolutionSizeX"), TargetW, GGameUserSettingsIni);
                    GConfig->SetInt(Section, TEXT("LastUserConfirmedResolutionSizeY"), TargetH, GGameUserSettingsIni);
                    bFlushIni = true;
                }
                if (!FApp::IsUnattended())
                {
                    int32 ResQuality = 100;
                    if (GConfig->GetInt(TEXT("ScalabilityGroups"), TEXT("sg.ResolutionQuality"), ResQuality, GGameUserSettingsIni) &&
                        ResQuality < 75)
                    {
                        GConfig->SetInt(TEXT("ScalabilityGroups"), TEXT("sg.ResolutionQuality"), 100, GGameUserSettingsIni);
                        bFlushIni = true;
                    }
                }
                if (bFlushIni)
                {
                    GConfig->Flush(false, GGameUserSettingsIni);
                }
            }
            if (GSystemResolution.WindowMode != EWindowMode::Windowed)
            {
                FSystemResolution::RequestResolutionChange(TargetW, TargetH, EWindowMode::Windowed);
                IConsoleManager::Get().CallAllConsoleVariableSinks();
            }
        }
#endif
    }
};

IMPLEMENT_PRIMARY_GAME_MODULE(FTibetPilgrimageModule, TibetPilgrimage, "TibetPilgrimage");
