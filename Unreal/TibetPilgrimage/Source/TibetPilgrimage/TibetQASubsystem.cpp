#include "TibetQASubsystem.h"
#include "TibetCameraSettings.h"
#include "TibetGameMode.h"
#include "TibetRitualEffect.h"
#include "EngineUtils.h"
#include "Components/StaticMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Engine/StaticMesh.h"
#include "TibetHUD.h"
#include "TibetPlayOverlay.h"
#include "Framework/Application/SlateApplication.h"
#include "GenericPlatform/GenericPlatformInputDeviceMapper.h"
#include "Widgets/SWindow.h"
#include "Input/HittestGrid.h"
#include "Widgets/Text/STextBlock.h"
#include "Engine/Texture2D.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "Engine/Engine.h"
#include "CollisionQueryParams.h"
#include "CollisionShape.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformMisc.h"
#include "HAL/PlatformTime.h"
#include "InputKeyEventArgs.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CommandLine.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "UnrealClient.h"

bool UTibetQASubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
#if UE_BUILD_SHIPPING
    return false;
#else
    const UWorld* World = Cast<UWorld>(Outer);
    FString TaskName, Path;
    return World && World->WorldType == EWorldType::Game &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQA="), TaskName) &&
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAOutput="), Path) && !FPaths::IsRelative(Path);
#endif
}

TStatId UTibetQASubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTibetQASubsystem, STATGROUP_Tickables);
}

void UTibetQASubsystem::Record(const FString& Line) const
{
    const FString File = Output / TEXT("events.tsv");
    FFileHelper::SaveStringToFile(Line + LINE_TERMINATOR, *File, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM,
        &IFileManager::Get(), FILEWRITE_Append);
}

void UTibetQASubsystem::Finish(bool bSuccess, const FString& Detail)
{
    bFinished = true;
    Record(FString::Printf(TEXT("%s\t%s"), bSuccess ? TEXT("pass") : TEXT("fail"), *Detail));
    FPlatformMisc::RequestExitWithStatus(false, bSuccess ? 0 : 1, TEXT("TibetQA"));
}

void UTibetQASubsystem::Tick(float)
{
    if (bFinished) return;
    UWorld* World = GetWorld();
    APlayerController* PC = World->GetFirstPlayerController();
    auto* Mode = World->GetAuthGameMode<ATibetGameMode>();
    if (!PC || !PC->GetPawn() || !PC->PlayerCameraManager || !Mode ||
        !GEngine || !GEngine->GameViewport || !GEngine->GameViewport->Viewport) return;
    if (Task.IsEmpty())
    {
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQA="), Task);
        FParse::Value(Args, TEXT("TibetQAOutput="), Output);
        FParse::Value(Args, TEXT("TibetQAStart="), StartMap);
        Began = FPlatformTime::Seconds();
    }
    if ((Task == TEXT("Play") || Task == TEXT("GroveEntry")) && World->GetMapName() != StartMap)
    {
        Finish(true, TEXT("transition\t") + World->GetMapName());
        return;
    }
    if (Task != TEXT("Campaign") && World->GetMapName() != StartMap) { Finish(false, TEXT("Unexpected map: ") + World->GetMapName()); return; }
    if (Task == TEXT("Courtyard") || Task == TEXT("CourtyardResume")) Courtyard(*PC,*Mode);
    else if (Task == TEXT("Arrival")) Arrival(*PC);
    else if (Task == TEXT("CameraFollow")) CameraFollow(*PC,*Mode);
    else if (Task == TEXT("Dialogue")) DialogueTest(*PC,*Mode);
    else if (Task == TEXT("PackJourney") || Task == TEXT("PackResume")) PackJourney(*PC,*Mode);
    else if (Task == TEXT("Journal")) Journal(*PC,*Mode);
    else if (Task == TEXT("Photo")) Photo(*PC);
    else if (Task == TEXT("Play") || Task == TEXT("Campaign") || Task == TEXT("GroveEntry") ||
             Task == TEXT("Skills") || Task == TEXT("Feedback")) Play(*PC, *Mode);
    else if (Task == TEXT("ScoreMix")) ScoreMix(*Mode);
    else if (Task == TEXT("LearnedSkills")) LearnedSkills(*PC, *Mode);
    else if (Task == TEXT("Resume"))
    {
        int32 Expected = INDEX_NONE;
        FParse::Value(FCommandLine::Get(), TEXT("TibetQAExpected="), Expected);
        Finish(Mode->GetStep() == Expected, FString::Printf(TEXT("resumedStep\t%d"),Mode->GetStep()));
    }
    else Finish(false, TEXT("Unknown task ") + Task);
}

void UTibetQASubsystem::Photo(APlayerController& PC)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 100) { Finish(false, TEXT("Photo timeout")); return; }
    if (!Camera)
    {
        FString EyeString, AtString;
        const TCHAR* Args = FCommandLine::Get();
        FParse::Value(Args, TEXT("TibetQAEye="), EyeString, false);
        FParse::Value(Args, TEXT("TibetQALook="), AtString, false);
        FVector Eye, At;
        if (!Eye.InitFromString(EyeString) || !At.InitFromString(AtString) || Eye.Equals(At))
        { Finish(false, TEXT("Invalid photograph camera")); return; }
        Camera = GetWorld()->SpawnActor<ACameraActor>(Eye,(At-Eye).Rotation());
        if (!Camera) { Finish(false, TEXT("Photo camera creation failed")); return; }
        const FIntPoint Size = GEngine->GameViewport->Viewport->GetSizeXY();
        const double Aspect = double(Size.X) / FMath::Max(1,Size.Y);
        auto* Lens = Camera->GetCameraComponent();
        Lens->bConstrainAspectRatio = false;
        Lens->bOverrideAspectRatioAxisConstraint = true;
        Lens->AspectRatioAxisConstraint = EAspectRatioAxisConstraint::AspectRatio_MaintainXFOV;
        Lens->SetFieldOfView(FMath::RadiansToDegrees(2.0 * FMath::Atan(Aspect * FMath::Tan(FMath::DegreesToRadians(27.5)))));
        PC.SetViewTarget(Camera);
        PC.GetPawn()->SetActorHiddenInGame(true);
        if (auto* HUD = PC.GetHUD()) HUD->bShowHUD = false;
        Record(FString::Printf(TEXT("view\t%s\t%s\t%s\t%d\t%d\t%s"),
            *StartMap,*Eye.ToCompactString(),*At.ToCompactString(),Size.X,Size.Y,*FPlatformMisc::GetPrimaryGPUBrand()));
        return;
    }
    if (PC.GetViewTarget() != Camera || !PC.PlayerCameraManager->GetCameraLocation().Equals(Camera->GetActorLocation(),1)) return;
    if (++Frames > 45 && Screenshot.IsEmpty()) FrameMs.Add((Now-LastFrame)*1000);
    LastFrame = Now;
    if (!Screenshot.IsEmpty())
    {
        if (!FScreenshotRequest::IsScreenshotRequested() && IFileManager::Get().FileSize(*Screenshot)>0)
            Finish(true, TEXT("photo"));
        return;
    }
    if (FrameMs.Num() == 60)
    {
        FrameMs.Sort();
        Record(FString::Printf(TEXT("frames\t60\t%.2f\t%.2f"),FrameMs[29],FrameMs[56]));
        Screenshot = Output / TEXT("capture.png");
        FScreenshotRequest::RequestScreenshot(Screenshot,false,false,false);
    }
}

namespace
{
void SendKey(APlayerController& PC, FKey Key, bool bDown)
{
    auto Input = FInputKeyEventArgs::CreateSimulated(Key, bDown ? IE_Pressed : IE_Released, bDown ? 1 : 0);
    PC.InputKey(Input);
}
}

namespace
{
TSharedPtr<SWidget> FindJournalButton(const TSharedRef<SWidget>& Root,FName Tag)
{
    if (Root->GetTag()==Tag) return Root;
    FChildren* Children=Root->GetChildren();
    for (int32 I=0;I<Children->Num();++I)
    {
        if (auto Match=FindJournalButton(Children->GetChildAt(I),Tag)) return Match;
    }
    return nullptr;
}

bool TapJournalButton(FName Tag)
{
    auto Window=GEngine->GameViewport->GetWindow();
    if (!Window) return false;
    auto Button=FindJournalButton(Window.ToSharedRef(),Tag);
    if (!Button) return false;
    const auto Geometry=Button->GetCachedGeometry();
    const auto ScreenSize=Geometry.GetAbsoluteSize();
    if (ScreenSize.GetMin()<Window->GetCachedGeometry().GetAbsoluteSize().Y*.095f) return false;
    const auto Center=Geometry.LocalToAbsolute(Geometry.GetLocalSize()*.5);
    auto& App=FSlateApplication::Get();
    auto& Mapper=IPlatformInputDeviceMapper::Get();
    App.OnTouchStarted(Window->GetNativeWindow(),Center,1,0,Mapper.GetPrimaryPlatformUser(),Mapper.GetDefaultInputDevice());
    App.OnTouchEnded(Center,0,Mapper.GetPrimaryPlatformUser(),Mapper.GetDefaultInputDevice());
    return true;
}
}

void UTibetQASubsystem::DialogueTest(APlayerController& PC, ATibetGameMode& Mode)
{
    const double Now = FPlatformTime::Seconds();
    if (Now-Began > 40) { Finish(false, FString::Printf(TEXT("Dialogue timeout at phase %d"),DialoguePhase)); return; }
    if (Now-Began < 1.5 || Now-LastAction < .8 || FScreenshotRequest::IsScreenshotRequested()) return;
    auto* HUD = Cast<ATibetHUD>(PC.GetHUD());
    APawn* Pawn = PC.GetPawn();
    if (!HUD || !Pawn) return;
    auto Move = [&](const FVector& Feet) {
        Pawn->SetActorLocation(Feet + FVector(0,0,90), false, nullptr, ETeleportType::TeleportPhysics);
        PC.SetControlRotation(FRotator(3,0,0));
    };
    auto Capture = [&](const TCHAR* Name) {
        FScreenshotRequest::RequestScreenshot(Output / (FString(Name)+TEXT(".png")),true,false,false);
    };
    FVector Anchor;
    if (DialoguePhase == 0)
    {
        if (Mode.IsEnglish() != FParse::Param(FCommandLine::Get(), TEXT("TibetQAEnglish"))) Mode.ChangeLanguage();
        if (Mode.GetStep() != 0) { Finish(false,TEXT("Dialogue QA needs a fresh slot")); return; }
        Move(Mode.GetObjectiveLocation() - FVector(520,0,0));
    }
    else if (DialoguePhase == 1)
    {
        if (Mode.GetInteractionCue(Anchor) || HUD->HasDrawnInteractionCue()) { Finish(false,TEXT("Distant resident cue")); return; }
        Move(Mode.GetObjectiveLocation() - FVector(165,0,0));
    }
    else if (DialoguePhase == 2 || DialoguePhase == 7)
    {
        if (!Mode.GetInteractionCue(Anchor) || !HUD->HasDrawnInteractionCue()) return;
        FVector2D Pixel;
        if (!PC.ProjectWorldLocationToScreen(Anchor,Pixel,true)) { Finish(false,TEXT("Anchor behind camera")); return; }
        Record(FString::Printf(TEXT("anchor\t%s\t%.0f\t%.0f\t%.0f"),DialoguePhase==2?TEXT("resident"):TEXT("gate"),Anchor.Z,Pixel.X,Pixel.Y));
        Capture(DialoguePhase==2?TEXT("resident-cue"):TEXT("gate-cue"));
    }
    else if (DialoguePhase == 3)
    {
        const FVector Target = Mode.GetObjectiveLocation();
        AActor* Wall = GetWorld()->SpawnActor<AActor>();
        auto* Box = NewObject<UBoxComponent>(Wall);
        Wall->SetRootComponent(Box);
        Box->SetBoxExtent(FVector(8,100,185));
        Box->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
        Box->SetCollisionResponseToAllChannels(ECR_Ignore);
        Box->SetCollisionResponseToChannel(ECC_Visibility,ECR_Block);
        Box->RegisterComponent();
        Wall->SetActorLocation((Pawn->GetActorLocation()+Target)*.5 + FVector(0,0,60));
        Mode.Interact();
        if (Mode.GetInteractionCue(Anchor) || Mode.GetStep() != 0) { Finish(false,TEXT("Interaction through wall")); return; }
        Box->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Wall->Destroy();
        Mode.Interact();
        if (Mode.GetStep()!=1 || Mode.GetInteractionCue(Anchor)) { Finish(false,TEXT("Completed resident remained interactive")); return; }
    }
    else if (DialoguePhase == 4)
    {
        if (!Mode.HasSpokenWord() || Mode.DialoguePage().IsEmpty()) return;
        auto Window=GEngine->GameViewport->GetWindow();
        if (!Window) return;
        auto Card=FindJournalButton(Window.ToSharedRef(),TEXT("TibetDialogue"));
        auto Bar=FindJournalButton(Window.ToSharedRef(),TEXT("TibetRitualBar"));
        if (!Card || !Bar) { Finish(false,TEXT("Subtitle or ritual bar missing")); return; }
        const auto C=Card->GetCachedGeometry().GetLayoutBoundingRect(), B=Bar->GetCachedGeometry().GetLayoutBoundingRect();
        if (C.Bottom > B.Top + 1 || C.Bottom <= C.Top) { Finish(false,TEXT("Dialogue overlaps ritual bar")); return; }
        Record(TEXT("playing\t")+Mode.DialogueSpeaker()+TEXT("\t")+Mode.DialoguePage());
        Capture(TEXT("dialogue"));
    }
    else if (DialoguePhase == 5)
    {
        HUD->ToggleJournal(ETibetPage::Controls);
        if (!PC.IsPaused()) { Finish(false,TEXT("Journal did not pause dialogue scene")); return; }
        Screenshot = Mode.DialoguePage();
    }
    else if (DialoguePhase == 6)
    {
        if (Mode.DialoguePage()!=Screenshot) { Finish(false,TEXT("Subtitle advanced during pause")); return; }
        HUD->CloseJournal();
        Mode.StopDialogue();
        if (!Mode.DialogueSpeaker().IsEmpty()) { Finish(false,TEXT("Skipped subtitle remained")); return; }
        Move(FVector(-1860-165,-480,0));
    }
    else if (DialoguePhase == 8)
    {
        Finish(true,TEXT("bilingual dialogue and interaction cues")); return;
    }
    ++DialoguePhase;
    LastAction=Now;
}

void UTibetQASubsystem::PackJourney(APlayerController& PC, ATibetGameMode& Mode)
{
    auto* HUD = Cast<ATibetHUD>(PC.GetHUD());
    const double Now = FPlatformTime::Seconds();
    if (Now-Began>120) { Finish(false,FString::Printf(TEXT("Pack journey timed out at phase %d"),Frames)); return; }
    if (!HUD || Now-Began<2 || FScreenshotRequest::IsScreenshotRequested()) return;
    if (Tapped.IsValid()) { SendKey(PC,Tapped,false); Tapped=FKey(); }
    const auto Key=[&](FKey K){ Tapped=K; SendKey(PC,K,true); };
    const auto Shot=[&](const TCHAR* Name){ FScreenshotRequest::RequestScreenshot(Output/(FString(Name)+TEXT(".png")),true,false,false); };
    const auto Window=GEngine->GameViewport->GetWindow();
    if (!Window) return;
    const auto Find=[&](FName Tag){return FindJournalButton(Window.ToSharedRef(),Tag);};
    const auto Click=[&](FName Tag){
        auto Button=Find(Tag);
        if (!Button) return false;
        const auto Geometry=Button->GetCachedGeometry();
        const FVector2D At=Geometry.LocalToAbsolute(Geometry.GetLocalSize()*.5);
        auto& Slate=FSlateApplication::Get();
        const FWidgetPath Path(Window->GetHittestGrid().GetBubblePath(At,0,false,0));
        if (!Path.ContainsWidget(Button.Get())) return false;
        const TSet<FKey> Down={EKeys::LeftMouseButton}, Up;
        const bool Touch=FParse::Param(FCommandLine::Get(),TEXT("TibetTouch"));
        if (!Touch)
            Slate.RoutePointerMoveEvent(Path,FPointerEvent(0,At,At,Up,EKeys::Invalid,0,FModifierKeysState()),false);
        const auto Press=Touch ? FPointerEvent(0,0,At,At,1.f,true) :
            FPointerEvent(0,At,At,Down,EKeys::LeftMouseButton,0,FModifierKeysState());
        const auto Release=Touch ? FPointerEvent(0,0,At,At,0.f,false) :
            FPointerEvent(0,At,At,Up,EKeys::LeftMouseButton,0,FModifierKeysState());
        Slate.RoutePointerDownEvent(Path,Press);
        Slate.RoutePointerUpEvent(Path,Release);
        return true;
    };
    if (Frames==0)
    {
        if (Mode.IsEnglish()!=FParse::Param(FCommandLine::Get(),TEXT("TibetQAEnglish"))) Mode.ChangeLanguage();
        if (Task==TEXT("PackResume"))
        {
            if (Mode.QuickItem()!=ETibetItem::Map || !Mode.IsEquipped(ETibetItem::Bell) ||
                Mode.Pills()!=3 || Mode.GetMana()!=110)
            { Finish(false,TEXT("Saved quick item, charges or equipped benefit failed to restore")); return; }
            Key(EKeys::X); Frames=20; LastAction=Now; return;
        }
        if (Mode.OwnsItem(ETibetItem::Bell) || Mode.Pills()!=4 || Mode.GetHealth()!=100)
        { Finish(false,TEXT("Expected a fresh pilgrimage")); return; }
        Key(EKeys::X); Frames=1; return;
    }
    if (Now-LastAction<.28) return;
    if (Frames==1 || Frames==3 || Frames==6)
    {
        const FVector V=Mode.GetObjectiveLocation()-PC.GetPawn()->GetActorLocation();
        PC.SetControlRotation(V.Rotation());
        const bool Walk=V.Size2D()>(Mode.GetStep()==1?105.f:148.f);
        if (Walk!=bMoving) { SendKey(PC,EKeys::W,Walk); bMoving=Walk; }
        if (Frames==1)
        {
            if (Mode.Pills()!=4) { Finish(false,TEXT("Full-health use consumed a pill")); return; }
            if (Mode.GetHealth()<99) { Key(EKeys::X); Frames=2; LastAction=Now; }
            return;
        }
        if ((Frames==3 && Mode.OwnsItem(ETibetItem::Bell)) || (Frames==6 && Mode.OwnsItem(ETibetItem::Map)))
        {
            if (bMoving) {SendKey(PC,EKeys::W,false); bMoving=false;}
            Key(EKeys::I); ++Frames; LastAction=Now; return;
        }
        if (Mode.GetStep()==0 && V.Size2D()<750 && Now-LastAction>.42)
        { Key(Mode.GetSkillState(1).CooldownRemaining<=0 && Mode.GetMana()>=15?EKeys::R:EKeys::SpaceBar); LastAction=Now; }
        return;
    }
    LastAction=Now;
    switch (Frames)
    {
    case 2:
        if (Mode.Pills()!=3 || Mode.GetHealth()<99) { Finish(false,TEXT("Quick pill did not restore real injury")); return; }
        Record(TEXT("pill-used\t4->3")); ++Frames; break;
    case 4:
        if (HUD->GetJournalPage()!=ETibetPage::Pack || !Click(TEXT("TibetPackAction2"))) { Finish(false,TEXT("Bronze bell equip target missing")); return; }
        ++Frames; break;
    case 5:
        if (!Mode.IsEquipped(ETibetItem::Bell) || Mode.MaxMana()!=110) { Finish(false,TEXT("Equipped bell did not raise mantra")); return; }
        Record(TEXT("bell-equipped\t110")); Key(EKeys::Escape); ++Frames; break;
    case 7:
        if (HUD->GetJournalPage()!=ETibetPage::Pack || !Click(TEXT("TibetPackAction4"))) { Finish(false,TEXT("Map assignment target missing")); return; }
        ++Frames; break;
    case 8:
        if (Mode.QuickItem()!=ETibetItem::Map) { Finish(false,TEXT("Map assignment failed")); return; }
        Shot(TEXT("pack")); Record(TEXT("map-assigned")); ++Frames; break;
    case 9: Finish(true,TEXT("earned, equipped, healed and assigned")); break;
    case 20:
        if (HUD->GetJournalPage()!=ETibetPage::Map || !PC.IsPaused() ||
            !LoadObject<UTexture2D>(nullptr,TEXT("/Game/Journal/PilgrimageAtlas.PilgrimageAtlas")))
        { Finish(false,TEXT("Saved map shortcut did not open painted chart")); return; }
        {
            for (int32 Index=0;Index<9;++Index)
            {
                const auto Pin=Find(FName(*FString::Printf(TEXT("TibetAtlas%d"),Index)));
                if (!Pin) { Finish(false,TEXT("Missing atlas pin")); return; }
                const auto G=Pin->GetCachedGeometry();
                const auto At=G.LocalToAbsolute(G.GetLocalSize()*.5);
                const FWidgetPath Hit(Window->GetHittestGrid().GetBubblePath(At,0,false,0));
                if (!Hit.ContainsWidget(Pin.Get()))
                { Finish(false,FString::Printf(TEXT("Obscured atlas pin %d"),Index)); return; }
            }
            auto West=Find(TEXT("TibetAtlas0")), North=Find(TEXT("TibetAtlas7")), East=Find(TEXT("TibetAtlas6"));
            if (!West || !North || !East || East->GetCachedGeometry().GetAbsolutePosition().X<=West->GetCachedGeometry().GetAbsolutePosition().X ||
                North->GetCachedGeometry().GetAbsolutePosition().Y>=East->GetCachedGeometry().GetAbsolutePosition().Y ||
                !Click(TEXT("TibetAtlas6")))
            { Finish(false,TEXT("Route geography or Samye pin hit target failed")); return; }
        }
        ++Frames; break;
    case 21:
        {
            auto Header=StaticCastSharedPtr<STextBlock>(Find(TEXT("TibetAtlasSelection")));
            if (!Header || !Header->GetText().ToString().Contains(Mode.Local(TEXT("Samye"),TEXT("桑耶"))))
            { Finish(false,TEXT("Selecting Samye did not update its description")); return; }
        }
        Shot(TEXT("atlas")); Record(TEXT("quick-map\tSamye")); ++Frames; break;
    case 22: Key(EKeys::Escape); ++Frames; break;
    default: Finish(!HUD->IsJournalOpen() && !PC.IsPaused(),TEXT("restored pack and chart input")); break;
    }
}

bool UTibetQASubsystem::TapPlayControl(FName Tag,float XFraction)
{
    auto Window=GEngine->GameViewport->GetWindow();
    if(!Window) return false;
    auto Widget=FindJournalButton(Window.ToSharedRef(),Tag);
    if(!Widget || !Widget->GetVisibility().IsVisible())
    {UE_LOG(LogTemp,Display,TEXT("Courtyard control %s missing or collapsed"),*Tag.ToString()); return false;}
    const auto Geometry=Widget->GetCachedGeometry();
    const auto Size=Geometry.GetLocalSize();
    if(Size.GetMin()<4)
    {UE_LOG(LogTemp,Display,TEXT("Courtyard control %s has no layout"),*Tag.ToString()); return false;}
    const auto At=Geometry.LocalToAbsolute(FVector2D(Size.X*XFraction,Size.Y*.5));
    auto& App=FSlateApplication::Get();
    auto& Map=IPlatformInputDeviceMapper::Get();
    const bool bSlider=Tag==TEXT("TibetClockSlider");
    const auto Down=bSlider ? Geometry.LocalToAbsolute(FVector2D(Size.X*.15,Size.Y*.5)) : At;
    App.OnTouchStarted(Window->GetNativeWindow(),Down,1,0,Map.GetPrimaryPlatformUser(),Map.GetDefaultInputDevice());
    if(bSlider) App.OnTouchMoved(At,1,0,Map.GetPrimaryPlatformUser(),Map.GetDefaultInputDevice());
    App.OnTouchEnded(At,0,Map.GetPrimaryPlatformUser(),Map.GetDefaultInputDevice());
    return true;
}

void UTibetQASubsystem::Journal(APlayerController& PC,ATibetGameMode& Mode)
{
    auto* HUD=Cast<ATibetHUD>(PC.GetHUD());
    const double Now=FPlatformTime::Seconds();
    if (Now-Began>50) { Finish(false,TEXT("Journal timeout")); return; }
    if (!HUD || Now-Began<2 || Now-LastAction<.24 || FScreenshotRequest::IsScreenshotRequested()) return;
    LastAction=Now;
    auto Shot=[&](const TCHAR* Name){
        Screenshot=Output/(FString(Name)+TEXT(".png"));
        FScreenshotRequest::RequestScreenshot(Screenshot,true,false,false);
    };
    if (!Screenshot.IsEmpty() && IFileManager::Get().FileSize(*Screenshot)<=0) return;
    auto Tap=[&](FKey Key){SendKey(PC,Key,true);};
    const bool Touch=FParse::Param(FCommandLine::Get(),TEXT("TibetTouch"));
    switch (Frames++)
    {
    case 0:
        if (Mode.IsEnglish()!=FParse::Param(FCommandLine::Get(),TEXT("TibetQAEnglish"))) Mode.ChangeLanguage();
        break;
    case 1:
        if (HUD->IsJournalOpen()) { Finish(false,TEXT("Unexpected startup menu")); return; }
        Shot(TEXT("hud")); break;
    case 2:
        if (Touch) { if (!TapJournalButton(TEXT("TibetOpenMap"))) { Finish(false,TEXT("Map touch target missing")); return; } }
        else Tap(EKeys::M);
        break;
    case 3:
        if (HUD->GetJournalPage()!=ETibetPage::Map || !PC.IsPaused()) { Finish(false,TEXT("Map did not open and pause")); return; }
        SendKey(PC,EKeys::M,false); ArrivalPosition=PC.GetPawn()->GetActorLocation(); HeadingBeforeDrag=PC.GetControlRotation();
        Shot(TEXT("map")); break;
    case 4:
        SendKey(PC,EKeys::W,true); SendKey(PC,EKeys::R,true); SendKey(PC,EKeys::RightMouseButton,true);
        PC.InputKey(FInputKeyEventArgs::CreateSimulated(EKeys::MouseX,IE_Axis,18.f,1));
        break;
    case 5:
        if (!PC.GetPawn()->GetActorLocation().Equals(ArrivalPosition,.1) || !PC.GetControlRotation().Equals(HeadingBeforeDrag,.01)
            || Mode.GetSkillState(1).CooldownRemaining>0 || Mode.GetMana()!=100) { Finish(false,TEXT("Gameplay input crossed journal")); return; }
        SendKey(PC,EKeys::W,false); SendKey(PC,EKeys::R,false); SendKey(PC,EKeys::RightMouseButton,false);
        Tap(EKeys::K); break;
    case 6:
        SendKey(PC,EKeys::K,false);
        if (HUD->GetJournalPage()!=ETibetPage::Skills) { Finish(false,TEXT("Skills toggle failed")); return; }
        Shot(TEXT("skills")); break;
    case 7: Tap(EKeys::Escape); break;
    case 8:
        SendKey(PC,EKeys::Escape,false);
        if (HUD->IsJournalOpen() || PC.IsPaused()) { Finish(false,TEXT("Esc did not restore play")); return; }
        break;
    case 9: Tap(EKeys::Escape); break;
    case 10:
        SendKey(PC,EKeys::Escape,false);
        if (HUD->GetJournalPage()!=ETibetPage::Controls) { Finish(false,TEXT("Menu did not reopen")); return; }
        Shot(TEXT("controls")); break;
    case 11:
        if (Touch) { if (!TapJournalButton(TEXT("TibetCloseJournal"))) { Finish(false,TEXT("Return touch target missing")); return; } }
        else Tap(EKeys::Escape);
        break;
    case 12:
        SendKey(PC,EKeys::Escape,false);
        if (HUD->IsJournalOpen() || PC.IsPaused() || !PC.GetPawn()->GetActorLocation().Equals(ArrivalPosition,.1)
            || Mode.GetMana()!=100) { Finish(false,TEXT("Return leaked input")); return; }
        SendKey(PC,EKeys::W,true); break;
    default:
        SendKey(PC,EKeys::W,false);
        Finish(FVector::Dist2D(PC.GetPawn()->GetActorLocation(),ArrivalPosition)>5,TEXT("journal input and return"));
    }
}

// Exercise the actual third-person view before the campaign driver starts steering the pawn.
void UTibetQASubsystem::Arrival(APlayerController& PC)
{
    const double Elapsed = FPlatformTime::Seconds() - Began;
    if (Elapsed > 30) { Finish(false, TEXT("Arrival timed out")); return; }
    if (Elapsed < 2) return;
    ++Frames;
    if (Frames == 1)
    {
        int32 Width, Height;
        PC.GetViewportSize(Width, Height);
        const FVector Landmarks[] = {{1750, 0, 110}, {3400, 0, 2640}, {-1320, 230, 155}};
        for (FVector Point : Landmarks)
        {
            FVector2D Screen;
            if (!PC.ProjectWorldLocationToScreen(Point, Screen) || Screen.X < Width * .025 ||
                Screen.X > Width * .975 || Screen.Y < Height * .025 || Screen.Y > Height * .975)
            { Finish(false, TEXT("Stupa or guide outside the arrival frame")); return; }
        }
        HeadingBeforeDrag = PC.GetControlRotation();
        ArrivalPosition = PC.GetPawn()->GetActorLocation();
        Screenshot = Output / TEXT("arrival.png");
        FScreenshotRequest::RequestScreenshot(Screenshot, true, false, false);
        Record(TEXT("arrival\t") + HeadingBeforeDrag.ToCompactString());
    }
    // Send both axes through PlayerInput while free, dragging, and released.
    if ((Frames >= 5 && Frames < 15) || (Frames >= 25 && Frames < 35) || (Frames >= 49 && Frames < 60))
    {
        PC.InputKey(FInputKeyEventArgs::CreateSimulated(EKeys::MouseX, IE_Axis, 6.f, 1));
        PC.InputKey(FInputKeyEventArgs::CreateSimulated(EKeys::MouseY, IE_Axis, 2.f, 1));
    }
    if (Frames == 20)
    {
        if (!PC.GetControlRotation().Equals(HeadingBeforeDrag, .05) ||
            !PC.PlayerCameraManager->GetCameraRotation().Equals(HeadingBeforeDrag, .05))
        { Finish(false, TEXT("Free mouse movement rotated the view")); return; }
        SendKey(PC, EKeys::RightMouseButton, true);
    }
    if (Frames == 42)
    {
        HeadingAfterDrag = PC.GetControlRotation();
        const FRotator Change = (HeadingAfterDrag - HeadingBeforeDrag).GetNormalized();
        const auto* Settings = GetDefault<UTibetCameraSettings>();
        const double Gain = Settings->GetSensitivity();
        const double ExpectedPitch = 1.7 * Gain * (Settings->IsVerticalInverted() ? -1. : 1.);
        if (!FMath::IsNearlyEqual(Change.Yaw, 6. * Gain, .05) ||
            !FMath::IsNearlyEqual(Change.Pitch, ExpectedPitch, .05))
        { Finish(false, TEXT("Right drag direction or sensitivity changed")); return; }
        Record(TEXT("right-drag\t") + HeadingAfterDrag.ToCompactString());
        SendKey(PC, EKeys::RightMouseButton, false);
        SendKey(PC, EKeys::D, true);
    }
    if (Frames >= 65 && FVector::Dist2D(ArrivalPosition, PC.GetPawn()->GetActorLocation()) > 35)
    {
        SendKey(PC, EKeys::D, false);
        Record(TEXT("released-walking\t") + PC.GetControlRotation().ToCompactString());
        // The steering basis and pitch stay fixed while the rendered yaw follows travel.
        const bool bStable = PC.GetControlRotation().Equals(HeadingAfterDrag, .05)
            && FMath::IsNearlyEqual(PC.PlayerCameraManager->GetCameraRotation().Pitch,HeadingAfterDrag.Pitch,.05);
        Finish(bStable && IFileManager::Get().FileSize(*Screenshot) > 0,
            bStable ? TEXT("arrival and mouse controls") : TEXT("Free mouse changed pitch or movement steering"));
    }
}

// Drive the real movement and E bindings. Observe the final rendered camera,
// rather than the controller yaw retained as the player's movement reference.
void UTibetQASubsystem::CameraFollow(APlayerController& PC,ATibetGameMode& Mode)
{
    const double Now=FPlatformTime::Seconds();
    if (Now-Began>35) { Finish(false,TEXT("Camera follow timed out")); return; }
    if (Now-Began<2.) return;
    APawn* Pawn=PC.GetPawn();
    const FVector Pos=Pawn->GetActorLocation(), Goal=Mode.GetObjectiveLocation();
    const FRotator CameraView=PC.PlayerCameraManager->GetCameraRotation();
    const auto Error=[&](double Target){return FRotator::NormalizeAxis(CameraView.Yaw-Target);};
    const auto Next=[&](){++Frames; LastAction=Now;};
    const auto Detail=[&](const TCHAR* Name){Record(FString::Printf(TEXT("%s\t%.2f\t%.2f\t%.2f"),
        Name,CameraView.Yaw,Pawn->GetActorRotation().Yaw,PC.GetControlRotation().Yaw));};
    const double Held=Now-LastAction;
    switch (Frames)
    {
    case 0:
        HeadingBeforeDrag=CameraView; ArrivalPosition=Pos;
        SendKey(PC,EKeys::D,true); Next(); break;
    case 1:
        // Move the free pointer throughout the strafe. Both the walked path and
        // the final rendered travel heading must survive these raw mouse events.
        PC.InputKey(FInputKeyEventArgs::CreateSimulated(EKeys::MouseX,IE_Axis,15,1));
        if (Held<1.15) break;
        Detail(TEXT("side-travel"));
        if (FVector::Dist2D(Pos,ArrivalPosition)<180 ||
            FMath::Abs(FRotator::NormalizeAxis((Pos-ArrivalPosition).Rotation().Yaw-HeadingBeforeDrag.Yaw-90))>5 ||
            FMath::Abs(Error(Pawn->GetVelocity().Rotation().Yaw))>8)
        { Finish(false,TEXT("Held strafe curved or camera failed to follow travel")); return; }
        SendKey(PC,EKeys::D,false);
        FScreenshotRequest::RequestScreenshot(Output/TEXT("travel.png"),true,false,false);
        Next(); break;
    case 2:
        if (Held<.5) break;
        HeadingBeforeDrag=CameraView;
        SendKey(PC,EKeys::Q,true); Next(); break;
    case 3:
        if (Held<.55) break;
        Detail(TEXT("orbit-left"));
        if (Error(HeadingBeforeDrag.Yaw)>-35 || Error(HeadingBeforeDrag.Yaw)<-85)
        { Finish(false,TEXT("Q did not orbit left")); return; }
        HeadingAfterDrag=CameraView;
        SendKey(PC,EKeys::Q,false); Next(); break;
    case 4:
        if (Held<.08) break;
        if (FMath::Abs(Error(HeadingBeforeDrag.Yaw))<3 || FMath::Abs(Error(HeadingAfterDrag.Yaw))<2)
        { Finish(false,TEXT("Q release snapped or failed to ease")); return; }
        Next(); break;
    case 5:
        if (Held<1.25) break;
        Detail(TEXT("return-left"));
        if (FMath::Abs(Error(Pawn->GetActorRotation().Yaw))>3)
        { Finish(false,TEXT("Idle Q release failed to return behind actor")); return; }
        PC.SetControlRotation((Goal-Pos).GetSafeNormal2D().Rotation());
        SendKey(PC,EKeys::W,true); Next(); break;
    case 6:
        if (FVector::Dist2D(Pos,Goal)>150) break;
        SendKey(PC,EKeys::W,false); Next(); break;
    case 7:
        if (Held<.5) break;
        HeadingBeforeDrag=CameraView;
        SendKey(PC,EKeys::E,true); Next(); break;
    case 8:
        if (Held<.72) break;
        Detail(TEXT("orbit-right"));
        if (Error(HeadingBeforeDrag.Yaw)<35 || Mode.GetStep()!=0)
        { Finish(false,TEXT("Held E did not orbit right or activated dialogue")); return; }
        FScreenshotRequest::RequestScreenshot(Output/TEXT("orbit.png"),true,false,false);
        SendKey(PC,EKeys::E,false); Next(); break;
    case 9:
        if (Held<1.5) break;
        if (FMath::Abs(Error(Pawn->GetActorRotation().Yaw))>3 || Mode.GetStep()!=0)
        { Finish(false,TEXT("E release failed to return or triggered interaction")); return; }
        HeadingBeforeDrag=CameraView;
        SendKey(PC,EKeys::E,true); Next(); break;
    case 10:
        SendKey(PC,EKeys::M,true); Next(); break;
    case 11:
        if (Held<.20) break;
        if (!PC.IsPaused() || Mode.GetStep()!=0) { Finish(false,TEXT("Menu did not cancel pending E interaction")); return; }
        SendKey(PC,EKeys::M,false); SendKey(PC,EKeys::E,false); SendKey(PC,EKeys::Q,true);
        PC.InputKey(FInputKeyEventArgs::CreateSimulated(EKeys::MouseX,IE_Axis,20,1)); Next(); break;
    case 12:
        if (Held<.25) break;
        if (!CameraView.Equals(HeadingBeforeDrag,.15)) { Finish(false,TEXT("Menu allowed camera input")); return; }
        SendKey(PC,EKeys::Q,false); SendKey(PC,EKeys::Escape,true); Next(); break;
    case 13:
        if (Held<.20) break;
        if (PC.IsPaused() || Mode.GetStep()!=0) { Finish(false,TEXT("Return from menu leaked interaction")); return; }
        SendKey(PC,EKeys::Escape,false); SendKey(PC,EKeys::E,true); Next(); break;
    case 14:
        SendKey(PC,EKeys::E,false); Next(); break;
    default:
        if (Held<.25 || FScreenshotRequest::IsScreenshotRequested()) break;
        Finish(Mode.GetStep()==1,TEXT("Camera follow and contextual tap")); break;
    }
}

// Search a local walkable grid only after the direct keyboard approach stalls. The
// pawn still moves through normal character collision between every waypoint.
bool UTibetQASubsystem::FindWalkingPath(APawn& Pawn, const FVector& Goal, double Reach)
{
    UWorld* World = GetWorld();
    const FVector Start = Pawn.GetActorLocation();
    const FCollisionQueryParams Query(SCENE_QUERY_STAT(TibetQAWalk),false,&Pawn);
    const FCollisionShape Body = FCollisionShape::MakeCapsule(38,65);
    const FIntPoint Directions[] = {{1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1}};
    const double Spacing = 88;
    const FVector2D Limit(FMath::Abs(Goal.X-Start.X)/Spacing+15,FMath::Abs(Goal.Y-Start.Y)/Spacing+15);
    TMap<FIntPoint,FIntPoint> Parent;
    TMap<FIntPoint,FVector> Points;
    TArray<FIntPoint> Queue = {FIntPoint::ZeroValue};
    Points.Add(Queue[0],Start);
    for (int32 I=0; I<Queue.Num() && I<9000; ++I)
    {
        const FIntPoint Key=Queue[I];
        const FVector From=Points[Key];
        if (FVector::Dist2D(From,Goal)<Reach && (Goal.Z<45 || FMath::Abs(From.Z-Goal.Z-88)<26))
        {
            for (FIntPoint At=Key; At!=FIntPoint::ZeroValue; At=Parent[At]) Waypoints.Add(Points[At]);
            return !Waypoints.IsEmpty();
        }
        for (FIntPoint Direction : Directions)
        {
            const FIntPoint Next=Key+Direction;
            if (FMath::Abs(Next.X)>Limit.X || FMath::Abs(Next.Y)>Limit.Y || Points.Contains(Next)) continue;
            FVector To(Start.X+Next.X*Spacing,Start.Y+Next.Y*Spacing,From.Z);
            FHitResult Floor;
            if (!World->LineTraceSingleByChannel(Floor,To+FVector(0,0,25),To-FVector(0,0,220),ECC_Visibility,Query)
                || Floor.ImpactNormal.Z<0.66) continue;
            To.Z=Floor.ImpactPoint.Z+89;
            if (FMath::Abs(To.Z-From.Z)>46) continue;
            if (World->SweepTestByChannel(From,To,FQuat::Identity,ECC_Pawn,Body,Query)) continue;
            Parent.Add(Next,Key); Points.Add(Next,To); Queue.Add(Next);
        }
    }
    return false;
}

void UTibetQASubsystem::Play(APlayerController& PC, ATibetGameMode& Mode)
{
    const double Now = FPlatformTime::Seconds();
    if (Now - Began > 240) { Finish(false, TEXT("Play timeout")); return; }
    if (Now - Began < 2.0) return;
    if (Tapped.IsValid()) { SendKey(PC,Tapped,false); Tapped = FKey(); }
    const int32 Step = Mode.GetStep(), Progress = Mode.GetStepProgress();
    const FName Kind = Mode.GetObjectiveKind();
    const FVector Pos = PC.GetPawn()->GetActorLocation();
    const FVector Goal = Task == TEXT("GroveEntry") ? FVector(-1860,-480,0) : Mode.GetObjectiveLocation();
    if (Step != PreviousStep || Progress != PreviousProgress)
    {
        if (Step != PreviousStep)
        {
            TArray<AActor*> Cast;
            UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("TibetResident"), Cast);
            UE_LOG(LogTemp, Display, TEXT("TIBET_CAST_SNAPSHOT step=%d"), Step);
            for (AActor* Actor : Cast)
            {
                const auto* Body = CastChecked<UStaticMeshComponent>(Actor->GetRootComponent());
                if (Actor->IsHidden() || !Body->IsVisible() || !Body->IsRegistered() || !Body->GetStaticMesh()) continue;
                UE_LOG(LogTemp, Display, TEXT("TIBET_CAST_VISIBLE actor=%u model=%s"), Actor->GetUniqueID(), *Body->GetStaticMesh()->GetName());
            }
        }
        if (GetWorld()->GetMapName() == TEXT("stupa") && (Kind == TEXT("Interact") || Step == 3))
        {
            TArray<AActor*> Flames;
            UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("StupaLampFlame"), Flames);
            const int32 Lit = Kind == TEXT("Interact") ? Progress : 3;
            if (Flames.Num() != Lit)
            { Finish(false, TEXT("Visible offering flames disagree with saved progress")); return; }
            for (int32 I = 0; I < Lit; ++I)
            {
                const FVector Wick(1430 + 70 * I, -360 + 320 * I, 126.5);
                if (!Flames.ContainsByPredicate([&Wick](const AActor* A){ return A->GetActorLocation().Equals(Wick, 2); }))
                { Finish(false, TEXT("Offering flame missing from its wick")); return; }
            }
        }
        Record(FString::Printf(TEXT("step\t%s\t%d\t%d\t%s\t%s\t%s"),*GetWorld()->GetMapName(),Step,Progress,*Kind.ToString(),
            *Pos.ToCompactString(),*Goal.ToCompactString()));
        if (Step != PreviousStep)
        {
            FString File = Output / FString::Printf(TEXT("%s-%03d.png"),*GetWorld()->GetMapName(),Step);
            if (FPaths::FileExists(File))
                File = Output / FString::Printf(TEXT("%s-return-%03d.png"),*GetWorld()->GetMapName(),Step);
            FScreenshotRequest::RequestScreenshot(File,true,false,false);
        }
        else if (GetWorld()->GetMapName() == TEXT("stupa") && Kind == TEXT("Interact"))
        {
            FScreenshotRequest::RequestScreenshot(Output / FString::Printf(TEXT("lamps-%d.png"), Progress),
                true, false, false);
        }
        PreviousStep = Step; PreviousProgress = Progress;
        Waypoints.Reset(); LastNavCheck=Now; LastNavPosition=Pos;
    }
    int32 StopStep = INDEX_NONE, StopProgress = INDEX_NONE;
    FParse::Value(FCommandLine::Get(),TEXT("TibetQAStopStep="),StopStep);
    FParse::Value(FCommandLine::Get(),TEXT("TibetQAStopProgress="),StopProgress);
    if (Step == StopStep && (StopProgress == INDEX_NONE || Progress == StopProgress)
        && !FScreenshotRequest::IsScreenshotRequested())
    { Finish(true,TEXT("checkpoint")); return; }
    if (Mode.IsCampaignComplete() && Task == TEXT("Campaign"))
    { Finish(true,TEXT("campaign completed")); return; }

    if (Task == TEXT("Feedback") && Kind == TEXT("Boss"))
    {
        PlayerFeedback(PC, Mode);
        return;
    }
    if (Task == TEXT("Skills") && (bTestingSkills || Kind == TEXT("Boss")))
    {
        bTestingSkills = true;
        SkillEncounter(PC, Mode);
        return;
    }
    const bool bFight = Kind == TEXT("Combat") || Kind == TEXT("Boss");
    const double Reach = bFight ? 320 : ((Kind == TEXT("Kora") || Kind == TEXT("Escort") || Kind == TEXT("Reach")) ? 105 : 170);
    if (FParse::Param(FCommandLine::Get(),TEXT("TibetQAGateEvidence")) &&
        (Kind == TEXT("Gate") || (StartMap == TEXT("chimphu") && Kind == TEXT("Reach"))) &&
        SurveyGate(PC, Goal)) return;
    const bool OnFloor = Goal.Z < 45 || FMath::Abs(Pos.Z-Goal.Z-88)<26;
    if (OnFloor && FVector::Dist2D(Pos,Goal)<Reach) Waypoints.Reset();
    if (Now-LastNavCheck>1.5)
    {
        if (bMoving && FVector::Dist2D(LastNavPosition,Pos)<22 && (!OnFloor || FVector::Dist2D(Pos,Goal)>Reach))
        {
            Waypoints.Reset();
            FindWalkingPath(*PC.GetPawn(),Goal,Reach);
            Record(FString::Printf(TEXT("detour\t%s\t%d\t%s\t%s\t%d"),
                *GetWorld()->GetMapName(),Step,*Pos.ToCompactString(),*Goal.ToCompactString(),Waypoints.Num()));
        }
        LastNavCheck=Now; LastNavPosition=Pos;
    }
    while (!Waypoints.IsEmpty() && FVector::Dist2D(Waypoints.Last(),Pos)<38) Waypoints.Pop();
    FVector Offset = (Waypoints.IsEmpty() ? Goal : Waypoints.Last())-Pos;
    Offset.Z = 0;
    if (!Offset.IsNearlyZero()) PC.SetControlRotation(Offset.Rotation());
    const bool bWalk = !Waypoints.IsEmpty() || Offset.Size2D() > Reach || !OnFloor;
    if (bWalk != bMoving) { SendKey(PC,EKeys::W,bWalk); bMoving=bWalk; }
    if (!bWalk && Now - LastAction >= 0.26 && !FScreenshotRequest::IsScreenshotRequested())
    {
        if (FParse::Param(FCommandLine::Get(),TEXT("TibetQAEncounters")) && CaptureEncounter(PC,Mode)) return;
        if (Kind == TEXT("Gate") && FParse::Param(FCommandLine::Get(),TEXT("TibetQAGateEvidence")))
            Record(FString::Printf(TEXT("enter\t%.1f\t%.1f\t%.1f"), Pos.Z-88, Goal.Z, FVector::Dist2D(Pos,Goal)));
        Tapped = bFight ? EKeys::SpaceBar : EKeys::E;
        SendKey(PC,Tapped,true);
        LastAction=Now;
    }
}


void UTibetQASubsystem::PlayerFeedback(APlayerController& PC, ATibetGameMode& Mode)
{
    const float Now = GetWorld()->GetTimeSeconds();
    const auto& Cue = Mode.GetPlayerFeedback();
    APawn* Pawn = PC.GetPawn();
    const FVector Towards = Mode.GetObjectiveLocation() - Pawn->GetActorLocation();
    if (FeedbackPhase == 0)
    {
        if (bMoving) { SendKey(PC,EKeys::W,false); bMoving=false; }
        if (Cue.ObjectivePulse(Now) < .65f || Cue.HurtOpacity(Now) != 0.f)
        { Finish(false,TEXT("Expected a new objective pulse and an unhurt player")); return; }
        Record(TEXT("objective-pulse"));
        Tapped = EKeys::Three;
        SendKey(PC,Tapped,true);
        FeedbackPhase = 1;
        return;
    }
    if (Towards.Size2D() > 153.f)
    {
        PC.SetControlRotation(Towards.Rotation());
        Pawn->AddMovementInput(Towards.GetSafeNormal2D());
    }
    if (FeedbackPhase == 1)
    {
        if (Mode.GetSkillState(4).ActiveRemaining <= 0.f)
        {
            if (GuardedContact < 0.f) { Finish(false,TEXT("Ward never protected contact")); return; }
            FeedbackPhase = 2;
            return;
        }
        if (Mode.GetHealth() != 100.f || Cue.HurtOpacity(Now) != 0.f)
        { Finish(false,TEXT("Ward incorrectly signalled a player injury")); return; }
        if (Towards.Size2D() < 180.f)
        {
            if (GuardedContact < 0.f) GuardedContact = Now;
            if (Now - GuardedContact > 1.6f && Screenshot.IsEmpty())
            {
                Record(TEXT("ward-contact"));
                Screenshot = Output / TEXT("ward.png");
                FScreenshotRequest::RequestScreenshot(Screenshot,true,false,false);
            }
        }
        return;
    }
    if (FeedbackPhase == 2 && Mode.GetHealth() < 100.f)
    {
        if (Cue.Loss != 16 || Mode.GetHealth() != 84.f || Cue.HurtOpacity(Now) < .8f)
        { Finish(false,TEXT("Unshielded boss hit did not match actual player health loss")); return; }
        const auto* Figure = FindObject<USceneComponent>(Pawn,TEXT("Pilgrim"));
        if (!Figure || FMath::Abs(Figure->GetRelativeRotation().Pitch) < 3.f) return;
        Record(TEXT("injury\t100\t84\t16"));
        FScreenshotRequest::RequestScreenshot(Output / TEXT("injury.png"),true,false,false);
        FeedbackPhase = 3;
        return;
    }
    if (FeedbackPhase == 3 && Cue.HurtOpacity(Now) == 0.f && !FScreenshotRequest::IsScreenshotRequested())
    {
        if (Cue.Flinch(Now) != 0.f || Cue.ObjectivePulse(Now) != 0.f)
        { Finish(false,TEXT("Injury or objective kept pulsing")); return; }
        FScreenshotRequest::RequestScreenshot(Output / TEXT("settled.png"),true,false,false);
        FeedbackPhase = 4;
        return;
    }
    if (FeedbackPhase == 4 && !FScreenshotRequest::IsScreenshotRequested())
        Finish(true,TEXT("ward, injury, recovery and objective"));
}

// Each invocation walks a fresh vault and casts into the same living guardian.
void UTibetQASubsystem::SkillEncounter(APlayerController& PC, ATibetGameMode& Mode)
{
    static const FKey Keys[] = {EKeys::SpaceBar,EKeys::R,EKeys::One,EKeys::Two,EKeys::Three,EKeys::Four,EKeys::T};
    static const int32 Power[] = {1,2,3,3,0,4,6};
    int32 Slot = 0;
    FParse::Value(FCommandLine::Get(), TEXT("TibetQASkillSlot="), Slot);
    const bool Miss = FParse::Param(FCommandLine::Get(), TEXT("TibetQAMiss"));
    const bool Finisher = FParse::Param(FCommandLine::Get(), TEXT("TibetQAFinisher"));
    if (Slot < 0 || Slot >= UE_ARRAY_COUNT(Keys)) { Finish(false, TEXT("Invalid skill probe")); return; }
    const float Time = GetWorld()->GetTimeSeconds();
    const FVector Pos = PC.GetPawn()->GetActorLocation(), Goal = Mode.GetObjectiveLocation();
    const float Dist = FVector::Dist2D(Pos, Goal);
    FTibetEnemyMeter Meter;
    if (SkillPhase == 0)
    {
        if (FScreenshotRequest::IsScreenshotRequested()) return;
        const bool Walk = Miss ? Dist < 940 : Dist > 380;
        if (Walk)
        {
            // The entrance corridor leads along the X axis and has already been walked.
            const FVector Direction = Miss ? FVector(-1,0,0) : (Goal-Pos).GetSafeNormal2D();
            PC.SetControlRotation(Direction.Rotation());
            if (!bMoving) { SendKey(PC,EKeys::W,true); bMoving = true; }
            return;
        }
        if (bMoving) { SendKey(PC,EKeys::W,false); bMoving = false; }
        if (!Mode.GetEnemyMeter(Meter) || Meter.Health <= 0) { Finish(false,TEXT("Expected living guardian")); return; }
        PC.SetControlRotation((Goal + FVector(0,0,85) - Pos).Rotation());
        SkillHealthBefore = Meter.Health;
        Tapped = Keys[Slot];
        SendKey(PC,Tapped,true);
        SkillGameTime = Time;
        SkillPhase = 1;
        return;
    }
    if (SkillPhase == 1)
    {
        if (Time - SkillGameTime < .16f || FScreenshotRequest::IsScreenshotRequested()) return;
        const int32 Damage = Miss ? 0 : FMath::Min(Power[Slot], SkillHealthBefore);
        const auto& Cues = Mode.GetDamageCues();
        const bool CorrectCue = Damage ? !Cues.IsEmpty() && Cues.Last().Amount == Damage : Cues.IsEmpty();
        if (!Mode.GetEnemyMeter(Meter) || Meter.Health != SkillHealthBefore - Damage ||
            Meter.Trailing < Meter.Health || (Damage && Meter.Trailing <= Meter.Health) ||
            !CorrectCue || Mode.GetSkillState(Slot).CooldownRemaining <= 0)
        { Finish(false,TEXT("Health, trailing bar, cooldown or damage cue disagrees with cast")); return; }
        int32 CastEffects = 0, Impacts = 0;
        for (TActorIterator<ATibetRitualEffect> Effect(GetWorld()); Effect; ++Effect)
        {
            if (Effect->GetEffectSlot() == Slot) ++CastEffects;
            if (Effect->GetEffectSlot() == 7) ++Impacts;
        }
        if (CastEffects != 1 || Impacts != (Damage > 0 ? 1 : 0))
        { Finish(false,TEXT("Expected cast and hit-only impact geometry")); return; }
        Record(FString::Printf(TEXT("combat\t%d\t%d\t%d\t%d\t%.2f\t%d\t%d"),
            Slot, SkillHealthBefore, Meter.Health, Damage, Meter.Trailing, CastEffects, Impacts));
        Screenshot = Output / FString::Printf(TEXT("skill-%d.png"),Slot);
        FScreenshotRequest::RequestScreenshot(Screenshot,true,false,false);
        SkillPhase = 2;
        return;
    }
    if (FScreenshotRequest::IsScreenshotRequested() || IFileManager::Get().FileSize(*Screenshot) <= 0) return;
    if (Finisher && SkillPhase == 2)
    {
        if (Time - SkillGameTime < 1.12f) return;
        if (!Mode.GetEnemyMeter(Meter) || Meter.Health != 3 || !Mode.GetDamageCues().IsEmpty())
        { Finish(false,TEXT("Expected three remaining health and expired first cue")); return; }
        SkillHealthBefore = Meter.Health;
        Tapped = EKeys::Four;
        SendKey(PC,Tapped,true);
        SkillGameTime = Time;
        SkillPhase = 3;
        return;
    }
    if (Finisher && SkillPhase == 3)
    {
        if (Time - SkillGameTime < .15f) return;
        const auto& Cues = Mode.GetDamageCues();
        if (!Mode.GetEnemyMeter(Meter) || Meter.Health != 0 || Meter.Trailing <= 0 ||
            Cues.Num() != 1 || Cues[0].Amount != SkillHealthBefore || Mode.GetObjectiveKind() == TEXT("Boss"))
        { Finish(false,TEXT("Finishing loss or objective transition incorrect")); return; }
        Record(FString::Printf(TEXT("finisher\t%d\t%d\t%d"), SkillHealthBefore, Meter.Health, Cues[0].Amount));
        Screenshot = Output / TEXT("finisher.png");
        FScreenshotRequest::RequestScreenshot(Screenshot,true,false,false);
        SkillPhase = 4;
        return;
    }
    Finish(true,TEXT("skill feedback"));
}

void UTibetQASubsystem::LearnedSkills(APlayerController& PC, ATibetGameMode& Mode)
{
    int32 Expected = 0;
    FParse::Value(FCommandLine::Get(), TEXT("TibetQALearnedMask="), Expected);
    int32 Learned = 0;
    for (int32 I = 0; I < 7; ++I)
        if (Mode.GetSkillState(I).bUnlocked) Learned |= 1 << I;
    if (Learned != Expected) { Finish(false, FString::Printf(TEXT("Expected learned mask %d, got %d"), Expected, Learned)); return; }
    const float Now = GetWorld()->GetTimeSeconds();
    if (SkillPhase == 0)
    {
        if (Now < 1.f) return;
        SendKey(PC,EKeys::T,true);
        SkillGameTime = Now;
        SkillPhase = 1;
        return;
    }
    if (SkillPhase == 1)
    {
        SendKey(PC,EKeys::T,false);
        SkillPhase = 2;
    }
    if (Now - SkillGameTime < .18f) return;
    const bool ShouldCast = (Expected & (1 << 6)) != 0;
    bool FoundEffect = false;
    for (TActorIterator<ATibetRitualEffect> Effect(GetWorld()); Effect; ++Effect)
        FoundEffect |= Effect->GetEffectSlot() == 6;
    if (FoundEffect != ShouldCast || (Mode.GetSkillState(6).CooldownRemaining > 0) != ShouldCast ||
        (Mode.GetMana() < 100) != ShouldCast || !Mode.GetDamageCues().IsEmpty())
    { Finish(false,TEXT("Actual Guru cast disagrees with learned state")); return; }
    Record(FString::Printf(TEXT("learned\t%d\t%d"), Learned, ShouldCast ? 1 : 0));
    Finish(true, TEXT("learned skills"));
}
